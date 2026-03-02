import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Normalize HubSpot industry to our 5 categories
function normalizeIndustry(hsIndustry: string | null): string | null {
  if (!hsIndustry) return null;
  const lower = hsIndustry.toLowerCase();
  if (lower.includes("health") || lower.includes("medical") || lower.includes("pharma")) return "healthcare";
  if (lower.includes("fin") || lower.includes("bank") || lower.includes("insurance") || lower.includes("payment")) return "fintech";
  if (lower.includes("hr") || lower.includes("human") || lower.includes("recruit") || lower.includes("talent")) return "hrtech";
  if (lower.includes("real estate") || lower.includes("property") || lower.includes("realestate")) return "realestate";
  return "saas"; // default
}

// ── POST: sync companies from HubSpot into client_accounts ───
export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Resolve token
    let body: { hubspotToken?: string } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    let token = body.hubspotToken;
    if (!token) {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("user_integrations")
        .select("hubspot_token")
        .eq("user_id", userId)
        .single();
      token = data?.hubspot_token;
    }

    if (!token) {
      return NextResponse.json(
        { error: "No HubSpot token. Please connect HubSpot first." },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const supabase = getSupabaseAdmin();
    let synced = 0;
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    let after: string | undefined;

    // Paginate through all HubSpot companies
    do {
      const url = new URL("https://api.hubapi.com/crm/v3/objects/companies");
      url.searchParams.set("limit", "100");
      url.searchParams.set("properties", "name,domain,industry,annualrevenue,numberofemployees");
      if (after) url.searchParams.set("after", after);

      const res = await fetch(url.toString(), { headers });

      if (res.status === 401) {
        return NextResponse.json(
          { error: "HubSpot token is invalid or expired." },
          { status: 401 }
        );
      }
      if (res.status === 429) {
        return NextResponse.json(
          { error: "HubSpot rate limit. Try again later.", synced, created, updated, errors },
          { status: 429 }
        );
      }
      if (!res.ok) {
        errors.push(`HubSpot API error: ${res.status}`);
        break;
      }

      const data = await res.json();
      const companies = data.results || [];

      for (const company of companies) {
        try {
          const props = company.properties || {};
          const companyName = props.name;
          if (!companyName) continue;

          const hubspotId = company.id;
          const domain = props.domain || null;
          const industry = normalizeIndustry(props.industry);
          const annualRevenue = props.annualrevenue ? parseFloat(props.annualrevenue) : 0;
          const mrr = annualRevenue > 0 ? annualRevenue / 12 : 0;

          // Fetch contacts for this company
          let contacts: Array<{ name: string; email: string | null; title: string | null }> = [];
          try {
            const contactRes = await fetch(
              `https://api.hubapi.com/crm/v3/objects/companies/${hubspotId}/associations/contacts`,
              { headers }
            );
            if (contactRes.ok) {
              const contactAssoc = await contactRes.json();
              const contactIds = (contactAssoc.results || []).slice(0, 5).map((c: { id: string }) => c.id);

              for (const cId of contactIds) {
                try {
                  const cRes = await fetch(
                    `https://api.hubapi.com/crm/v3/objects/contacts/${cId}?properties=firstname,lastname,email,jobtitle`,
                    { headers }
                  );
                  if (cRes.ok) {
                    const cData = await cRes.json();
                    const cp = cData.properties || {};
                    contacts.push({
                      name: [cp.firstname, cp.lastname].filter(Boolean).join(" ") || "Unknown",
                      email: cp.email || null,
                      title: cp.jobtitle || null,
                    });
                  }
                } catch { /* skip contact */ }
              }
            }
          } catch { /* contacts optional */ }

          // Upsert the account
          const { data: existing } = await supabase
            .from("client_accounts")
            .select("id")
            .eq("user_id", userId)
            .eq("hubspot_company_id", hubspotId)
            .single();

          if (existing) {
            // Update
            await supabase
              .from("client_accounts")
              .update({
                company_name: companyName,
                domain,
                industry,
                mrr: mrr || undefined,
              })
              .eq("id", existing.id);
            updated++;
          } else {
            // Create
            const { data: newAccount } = await supabase
              .from("client_accounts")
              .insert({
                org_id: orgId || userId,
                user_id: userId,
                company_name: companyName,
                domain,
                industry,
                mrr,
                hubspot_company_id: hubspotId,
                lifecycle_stage: "onboarding",
              })
              .select("id")
              .single();

            if (newAccount) {
              created++;
              // Insert contacts
              for (const contact of contacts) {
                await supabase.from("account_contacts").insert({
                  account_id: newAccount.id,
                  name: contact.name,
                  email: contact.email,
                  title: contact.title,
                  is_primary: contacts.indexOf(contact) === 0,
                });
              }
            }
          }
          synced++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Company ${company.properties?.name || company.id}: ${msg}`);
        }
      }

      after = data.paging?.next?.after;
    } while (after);

    return NextResponse.json({ synced, created, updated, errors });
  } catch (err) {
    console.error("HubSpot sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
