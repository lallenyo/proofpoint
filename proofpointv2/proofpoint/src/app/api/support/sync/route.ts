import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type SyncSource = "zendesk" | "intercom";

interface SyncRequestBody {
  source: SyncSource;
  api_key: string;
  subdomain?: string;
}

// ── Zendesk ticket → support_tickets row ────────────────────────
function mapZendeskTicket(
  ticket: Record<string, unknown>,
  userId: string
): Record<string, unknown> {
  const priorityMap: Record<string, string> = {
    urgent: "urgent",
    high: "high",
    normal: "medium",
    low: "low",
  };

  const statusMap: Record<string, string> = {
    new: "open",
    open: "open",
    pending: "pending",
    hold: "pending",
    solved: "resolved",
    closed: "closed",
  };

  return {
    user_id: userId,
    external_id: `zendesk_${ticket.id}`,
    source: "zendesk",
    subject: (ticket.subject as string) || "No subject",
    description: (ticket.description as string) || null,
    status: statusMap[(ticket.status as string) || ""] || "open",
    priority: priorityMap[(ticket.priority as string) || ""] || "medium",
    customer_name: null, // Zendesk uses requester_id; name resolved separately if needed
    customer_email: null,
    external_url: (ticket.url as string) || null,
    external_created_at: (ticket.created_at as string) || null,
    external_updated_at: (ticket.updated_at as string) || null,
  };
}

// ── Intercom conversation → support_tickets row ─────────────────
function mapIntercomConversation(
  conversation: Record<string, unknown>,
  userId: string
): Record<string, unknown> {
  const source = conversation.source as Record<string, unknown> | undefined;
  const contacts = conversation.contacts as Record<string, unknown> | undefined;
  const contactList = (contacts?.contacts as Array<Record<string, unknown>>) || [];
  const firstContact = contactList[0];

  const stateMap: Record<string, string> = {
    open: "open",
    closed: "closed",
    snoozed: "pending",
  };

  // Intercom doesn't have a direct priority field; default to medium
  const priorityMap: Record<string, string> = {
    priority: "high",
    default: "medium",
  };

  const intercomPriority = conversation.priority as string | undefined;

  return {
    user_id: userId,
    external_id: `intercom_${conversation.id}`,
    source: "intercom",
    subject: (source?.subject as string) || (source?.body as string)?.slice(0, 120) || "Intercom conversation",
    description: (source?.body as string) || null,
    status: stateMap[(conversation.state as string) || ""] || "open",
    priority: priorityMap[intercomPriority || ""] || "medium",
    customer_name: (firstContact?.name as string) || null,
    customer_email: (firstContact?.email as string) || null,
    external_url: null,
    external_created_at: conversation.created_at
      ? new Date((conversation.created_at as number) * 1000).toISOString()
      : null,
    external_updated_at: conversation.updated_at
      ? new Date((conversation.updated_at as number) * 1000).toISOString()
      : null,
  };
}

// ── POST: sync tickets from external sources ────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: SyncRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { source, api_key, subdomain } = body;

  if (!source || !["zendesk", "intercom"].includes(source)) {
    return NextResponse.json(
      { error: "Invalid source. Must be 'zendesk' or 'intercom'" },
      { status: 400 }
    );
  }

  if (!api_key || !api_key.trim()) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    let newCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    if (source === "zendesk") {
      // ── Zendesk sync ────────────────────────────────────────────
      if (!subdomain || !subdomain.trim()) {
        return NextResponse.json(
          { error: "Subdomain is required for Zendesk sync" },
          { status: 400 }
        );
      }

      const zenUrl = `https://${subdomain}.zendesk.com/api/v2/tickets.json?sort_by=updated_at&sort_order=desc&per_page=100`;
      const zenRes = await fetch(zenUrl, {
        headers: {
          Authorization: `Bearer ${api_key}`,
          "Content-Type": "application/json",
        },
      });

      if (zenRes.status === 401) {
        return NextResponse.json(
          { error: "Zendesk authentication failed. Check your API key and subdomain." },
          { status: 401 }
        );
      }
      if (zenRes.status === 404) {
        return NextResponse.json(
          { error: `Zendesk subdomain '${subdomain}' not found. Check your subdomain.` },
          { status: 404 }
        );
      }
      if (zenRes.status === 429) {
        return NextResponse.json(
          { error: "Zendesk rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
      if (!zenRes.ok) {
        const errText = await zenRes.text().catch(() => "Unknown error");
        return NextResponse.json(
          { error: `Zendesk API error (${zenRes.status}): ${errText}` },
          { status: 502 }
        );
      }

      const zenData = await zenRes.json();
      const tickets = zenData.tickets || [];

      for (const ticket of tickets) {
        try {
          const mapped = mapZendeskTicket(ticket, userId);
          const externalId = mapped.external_id as string;

          // Check if ticket already exists
          const { data: existing } = await supabase
            .from("support_tickets")
            .select("id")
            .eq("user_id", userId)
            .eq("external_id", externalId)
            .single();

          if (existing) {
            // Update existing ticket
            await supabase
              .from("support_tickets")
              .update({
                subject: mapped.subject,
                description: mapped.description,
                status: mapped.status,
                priority: mapped.priority,
                external_updated_at: mapped.external_updated_at,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
            updatedCount++;
          } else {
            // Insert new ticket
            await supabase
              .from("support_tickets")
              .insert(mapped);
            newCount++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Zendesk ticket ${ticket.id}: ${msg}`);
        }
      }
    }

    if (source === "intercom") {
      // ── Intercom sync ───────────────────────────────────────────
      const intercomUrl = "https://api.intercom.io/conversations?per_page=50&order=updated_at&sort=desc";
      const intercomRes = await fetch(intercomUrl, {
        headers: {
          Authorization: `Bearer ${api_key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (intercomRes.status === 401) {
        return NextResponse.json(
          { error: "Intercom authentication failed. Check your API key." },
          { status: 401 }
        );
      }
      if (intercomRes.status === 429) {
        return NextResponse.json(
          { error: "Intercom rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
      if (!intercomRes.ok) {
        const errText = await intercomRes.text().catch(() => "Unknown error");
        return NextResponse.json(
          { error: `Intercom API error (${intercomRes.status}): ${errText}` },
          { status: 502 }
        );
      }

      const intercomData = await intercomRes.json();
      const conversations = intercomData.conversations || [];

      for (const conversation of conversations) {
        try {
          const mapped = mapIntercomConversation(conversation, userId);
          const externalId = mapped.external_id as string;

          // Check if conversation already exists
          const { data: existing } = await supabase
            .from("support_tickets")
            .select("id")
            .eq("user_id", userId)
            .eq("external_id", externalId)
            .single();

          if (existing) {
            // Update existing ticket
            await supabase
              .from("support_tickets")
              .update({
                subject: mapped.subject,
                description: mapped.description,
                status: mapped.status,
                priority: mapped.priority,
                customer_name: mapped.customer_name,
                customer_email: mapped.customer_email,
                external_updated_at: mapped.external_updated_at,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
            updatedCount++;
          } else {
            // Insert new ticket
            await supabase
              .from("support_tickets")
              .insert(mapped);
            newCount++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Intercom conversation ${conversation.id}: ${msg}`);
        }
      }
    }

    const total = newCount + updatedCount;

    return NextResponse.json({
      success: true,
      source,
      new_count: newCount,
      updated_count: updatedCount,
      total,
      ...(errors.length > 0 && { errors }),
    });
  } catch (err) {
    console.error(`Support sync (${source}) error:`, err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
