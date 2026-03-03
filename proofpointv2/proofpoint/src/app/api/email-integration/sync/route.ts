import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getValidEmailToken } from "@/lib/email-tokens";
import { NextRequest, NextResponse } from "next/server";

// ── POST: sync emails for a specific account ─────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { account_id } = body;

  if (!account_id) {
    return NextResponse.json({ error: "account_id is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Verify account belongs to user
  const { data: account } = await supabase
    .from("client_accounts")
    .select("id, company_name, user_id")
    .eq("id", account_id)
    .eq("user_id", userId)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Get contact emails for this account
  const { data: contacts } = await supabase
    .from("account_contacts")
    .select("email")
    .eq("account_id", account_id)
    .not("email", "is", null);

  const contactEmails = (contacts || [])
    .map((c) => c.email)
    .filter((e): e is string => !!e);

  if (contactEmails.length === 0) {
    return NextResponse.json({ error: "No contacts with emails found for this account" }, { status: 400 });
  }

  // Get valid email token
  const token = await getValidEmailToken(userId);
  if (!token) {
    return NextResponse.json({ error: "Email not connected or token expired. Please reconnect." }, { status: 401 });
  }

  let newEmailCount = 0;

  try {
    if (token.provider === "gmail") {
      newEmailCount = await syncGmailEmails(userId, account_id, contactEmails, token.accessToken, supabase);
    } else if (token.provider === "outlook") {
      newEmailCount = await syncOutlookEmails(userId, account_id, contactEmails, token.accessToken, supabase);
    }

    return NextResponse.json({ synced: newEmailCount, account_id });
  } catch (err) {
    console.error("Email sync error:", err);
    return NextResponse.json({ error: "Failed to sync emails" }, { status: 500 });
  }
}

// ── Gmail sync ───────────────────────────────────────────────────────────

async function syncGmailEmails(
  userId: string,
  accountId: string,
  contactEmails: string[],
  accessToken: string,
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<number> {
  let newCount = 0;

  // Build query: emails from OR to any contact email
  const emailQueries = contactEmails.map(
    (e) => `from:${e} OR to:${e}`
  );
  const query = emailQueries.join(" OR ");

  // Search for messages (last 30 days)
  const searchRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchRes.ok) {
    if (searchRes.status === 401) throw new Error("Gmail token expired");
    throw new Error(`Gmail search failed: ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  const messages = searchData.messages || [];

  // Fetch details for each message
  for (const msg of messages) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!detailRes.ok) continue;

    const detail = await detailRes.json();
    const headers = detail.payload?.headers || [];

    const from = headers.find((h: { name: string }) => h.name === "From")?.value || "";
    const to = headers.find((h: { name: string }) => h.name === "To")?.value || "";
    const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value || "";
    const dateStr = headers.find((h: { name: string }) => h.name === "Date")?.value || "";

    // Extract email addresses
    const fromEmail = extractEmail(from);
    const toEmails = to.split(",").map(extractEmail).filter(Boolean);

    // Determine direction
    const isFromContact = contactEmails.some(
      (ce) => fromEmail.toLowerCase() === ce.toLowerCase()
    );
    const direction = isFromContact ? "inbound" : "outbound";

    // Get snippet (first 200 chars)
    const snippet = (detail.snippet || "").substring(0, 200);

    // Upsert into email_sync_log
    const { error: insertErr } = await supabase
      .from("email_sync_log")
      .upsert(
        {
          user_id: userId,
          account_id: accountId,
          message_id: msg.id,
          thread_id: detail.threadId || null,
          from_email: fromEmail,
          to_emails: toEmails,
          subject,
          snippet,
          direction,
          sent_at: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        },
        { onConflict: "message_id", ignoreDuplicates: true }
      );

    if (!insertErr) {
      // Create account activity for new synced email
      await supabase.from("account_activities").insert({
        account_id: accountId,
        user_id: userId,
        activity_type: "email",
        title: `${direction === "inbound" ? "Received" : "Sent"}: ${subject}`,
        description: snippet,
        metadata: { message_id: msg.id, direction, from_email: fromEmail, synced: true },
      });
      newCount++;
    }
  }

  return newCount;
}

// ── Outlook sync ─────────────────────────────────────────────────────────

async function syncOutlookEmails(
  userId: string,
  accountId: string,
  contactEmails: string[],
  accessToken: string,
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<number> {
  let newCount = 0;

  // Build OData filter for contact emails
  const filters = contactEmails.flatMap((email) => [
    `from/emailAddress/address eq '${email}'`,
    `contains(toRecipients/any(r: r/emailAddress/address), '${email}')`,
  ]);
  // Use simpler search approach — search by email addresses
  const searchQuery = contactEmails.join(" OR ");

  const searchRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$search="${encodeURIComponent(searchQuery)}"&$top=50&$select=id,conversationId,from,toRecipients,subject,bodyPreview,sentDateTime,isRead&$orderby=sentDateTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchRes.ok) {
    if (searchRes.status === 401) throw new Error("Outlook token expired");
    throw new Error(`Outlook search failed: ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  const messages = searchData.value || [];

  for (const msg of messages) {
    const fromEmail = msg.from?.emailAddress?.address || "";
    const toEmails = (msg.toRecipients || []).map(
      (r: { emailAddress: { address: string } }) => r.emailAddress?.address || ""
    );

    // Check if this email involves any of our contacts
    const isRelevant = contactEmails.some(
      (ce) =>
        fromEmail.toLowerCase() === ce.toLowerCase() ||
        toEmails.some((t: string) => t.toLowerCase() === ce.toLowerCase())
    );

    if (!isRelevant) continue;

    const isFromContact = contactEmails.some(
      (ce) => fromEmail.toLowerCase() === ce.toLowerCase()
    );
    const direction = isFromContact ? "inbound" : "outbound";
    const snippet = (msg.bodyPreview || "").substring(0, 200);

    const { error: insertErr } = await supabase
      .from("email_sync_log")
      .upsert(
        {
          user_id: userId,
          account_id: accountId,
          message_id: msg.id,
          thread_id: msg.conversationId || null,
          from_email: fromEmail,
          to_emails: toEmails,
          subject: msg.subject || "",
          snippet,
          direction,
          sent_at: msg.sentDateTime || new Date().toISOString(),
        },
        { onConflict: "message_id", ignoreDuplicates: true }
      );

    if (!insertErr) {
      await supabase.from("account_activities").insert({
        account_id: accountId,
        user_id: userId,
        activity_type: "email",
        title: `${direction === "inbound" ? "Received" : "Sent"}: ${msg.subject || ""}`,
        description: snippet,
        metadata: { message_id: msg.id, direction, from_email: fromEmail, synced: true },
      });
      newCount++;
    }
  }

  return newCount;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function extractEmail(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/);
  return match ? match[1] : headerValue.trim();
}
