import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── GET: fetch stored HubSpot token for current user ──────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("user_integrations")
    .select("hubspot_token")
    .eq("user_id", userId)
    .single();

  // Return whether a token is stored, but not the token itself
  return NextResponse.json({ connected: !!data?.hubspot_token });
}

// ── POST: search HubSpot for a company ────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyName, token: tokenFromRequest, saveToken } = await req.json();

  // Resolve token: use request token, or fall back to stored token
  let token = tokenFromRequest;
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
    return NextResponse.json({ error: "No HubSpot token provided or stored" }, { status: 400 });
  }

  // Optionally save the token for future requests
  if (saveToken && tokenFromRequest) {
    const supabase = getSupabaseAdmin();
    await supabase.from("user_integrations").upsert({
      user_id: userId,
      hubspot_token: tokenFromRequest,
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    // 1. Search for company
    const companyRes = await fetch("https://api.hubapi.com/crm/v3/objects/companies/search", {
      method: "POST",
      headers,
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName: "name", operator: "CONTAINS_TOKEN", value: companyName }],
        }],
        properties: ["name", "domain", "industry", "annualrevenue", "numberofemployees"],
        limit: 1,
      }),
    });
    const companyData = await companyRes.json();

    if (!companyData.results?.length) {
      return NextResponse.json(
        { error: `No company found matching "${companyName}"` },
        { status: 404 }
      );
    }

    const company = companyData.results[0];
    const companyId = company.id;
    const companyProps = company.properties;

    // 2. Get associated contacts
    let contactName = "";
    let contactTitle = "";
    try {
      const contactAssocRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/companies/${companyId}/associations/contacts`,
        { headers }
      );
      const contactAssoc = await contactAssocRes.json();
      if (contactAssoc.results?.length) {
        const firstContactId = contactAssoc.results[0].id;
        const cDetailRes = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${firstContactId}?properties=firstname,lastname,jobtitle`,
          { headers }
        );
        const cDetail = await cDetailRes.json();
        const cp = cDetail.properties || {};
        contactName = [cp.firstname, cp.lastname].filter(Boolean).join(" ");
        contactTitle = cp.jobtitle || "";
      }
    } catch { /* contacts are optional */ }

    // 3. Get associated deals for MRR
    let mrr = "";
    let contractStart = "";
    try {
      const dealAssocRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/companies/${companyId}/associations/deals`,
        { headers }
      );
      const dealAssoc = await dealAssocRes.json();
      if (dealAssoc.results?.length) {
        const dealIds = dealAssoc.results.slice(0, 5).map((d: { id: string }) => d.id);
        const dealDetailRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals/batch/read", {
          method: "POST",
          headers,
          body: JSON.stringify({
            inputs: dealIds.map((id: string) => ({ id })),
            properties: ["dealname", "amount", "hs_mrr", "closedate", "dealstage"],
          }),
        });
        const dealDetails = await dealDetailRes.json();
        const closedWon = dealDetails.results?.find(
          (d: { properties?: { dealstage?: string } }) => d.properties?.dealstage === "closedwon"
        );
        const bestDeal = closedWon || dealDetails.results?.[0];
        if (bestDeal?.properties) {
          const dp = bestDeal.properties;
          const rawMrr = dp.hs_mrr || (dp.amount ? (parseFloat(dp.amount) / 12).toFixed(0) : "");
          mrr = rawMrr ? String(Math.round(parseFloat(rawMrr))) : "";
          if (dp.closedate) contractStart = dp.closedate.split("T")[0];
        }
      }
    } catch { /* deals are optional */ }

    return NextResponse.json({
      companyName: companyProps.name || companyName,
      contactName,
      contactTitle,
      mrr,
      contractStart,
    });
  } catch (err) {
    console.error("HubSpot proxy error:", err);
    return NextResponse.json({ error: "HubSpot fetch failed" }, { status: 500 });
  }
}
