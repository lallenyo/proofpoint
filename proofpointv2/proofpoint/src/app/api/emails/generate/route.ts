import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

function getCurrentQuarter(): string {
  return String(Math.ceil((new Date().getMonth() + 1) / 3));
}

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return String(diff);
}

function fillPlaceholders(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

// ── POST: generate personalized email ────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { template_id, account_id, contact_name, csm_name, ai_enhance } = body;

    if (!template_id) {
      return NextResponse.json({ error: "template_id is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch template
    const { data: template, error: tErr } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (tErr || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Fetch account data if provided
    let accountData: Record<string, string> = {};
    let recentActivities: string[] = [];

    if (account_id) {
      const { data: account } = await supabase
        .from("client_accounts")
        .select("*")
        .eq("id", account_id)
        .eq("user_id", userId)
        .single();

      if (account) {
        // Get primary contact
        const { data: contacts } = await supabase
          .from("account_contacts")
          .select("name, title")
          .eq("account_id", account_id)
          .eq("is_primary", true)
          .limit(1);

        const primaryContact = contacts?.[0];

        accountData = {
          company_name: account.company_name || "",
          contact_name: contact_name || primaryContact?.name || "there",
          contact_title: primaryContact?.title || "",
          mrr: String(account.mrr || 0),
          health_score: String(account.health_score || 50),
          days_to_renewal: daysUntil(account.contract_end),
          industry: account.industry || "technology",
          csm_name: csm_name || "Your CSM",
          quarter: getCurrentQuarter(),
        };

        // Fetch recent activities for AI context
        const { data: activities } = await supabase
          .from("account_activities")
          .select("activity_type, title, created_at")
          .eq("account_id", account_id)
          .order("created_at", { ascending: false })
          .limit(5);

        recentActivities = (activities || []).map(
          (a: { activity_type: string; title: string | null; created_at: string }) =>
            `${a.activity_type}: ${a.title || "No title"} (${new Date(a.created_at).toLocaleDateString()})`
        );
      }
    } else {
      accountData = {
        company_name: body.company_name || "{{company_name}}",
        contact_name: contact_name || "{{contact_name}}",
        contact_title: body.contact_title || "{{contact_title}}",
        mrr: body.mrr || "{{mrr}}",
        health_score: body.health_score || "{{health_score}}",
        days_to_renewal: body.days_to_renewal || "{{days_to_renewal}}",
        industry: body.industry || "{{industry}}",
        csm_name: csm_name || "{{csm_name}}",
        quarter: getCurrentQuarter(),
      };
    }

    // Fill placeholders
    const subject = fillPlaceholders(template.subject_template || "", accountData);
    const bodyText = fillPlaceholders(template.body_template || "", accountData);

    // AI Enhancement (optional)
    let enhancedBody = bodyText;
    if (ai_enhance && account_id) {
      try {
        const systemPrompt = `You are an expert Customer Success Manager email writer. You will receive a draft email and account context. Your job is to enhance and personalize the email while maintaining its core structure and message.

Rules:
- Keep the overall format and intent of the email
- Add specific, relevant details based on the account data and recent activities
- Use a warm, professional tone appropriate for B2B SaaS customer success
- Make it feel personal and informed, not generic
- Keep the length similar to the original
- Do not add signature blocks — the CSM name is already included
- Return ONLY the enhanced email body, no subject line or additional commentary`;

        const contextMessage = `Account Context:
- Company: ${accountData.company_name}
- Industry: ${accountData.industry}
- MRR: $${accountData.mrr}/mo
- Health Score: ${accountData.health_score}/100
- Days to Renewal: ${accountData.days_to_renewal}
- Recent Activities: ${recentActivities.length > 0 ? recentActivities.join("; ") : "No recent activities"}

Draft Email:
${bodyText}

Please enhance this email with personalized details based on the account context above.`;

        const aiRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/anthropic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: systemPrompt,
            messages: [{ role: "user", content: contextMessage }],
            max_tokens: 2000,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          if (aiData.content?.[0]?.text) {
            enhancedBody = aiData.content[0].text;
          }
        }
      } catch (aiErr) {
        console.error("AI enhance error:", aiErr);
        // Fallback to non-enhanced version
      }
    }

    return NextResponse.json({
      subject,
      body: ai_enhance ? enhancedBody : bodyText,
      template_name: template.name,
      account_data: accountData,
      ai_enhanced: !!ai_enhance && enhancedBody !== bodyText,
    });
  } catch (err) {
    console.error("Email generate error:", err);
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 });
  }
}
