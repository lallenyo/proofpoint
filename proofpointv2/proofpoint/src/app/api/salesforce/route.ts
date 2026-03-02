import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { checkFeatureAccess } from "@/lib/gate";

// ── GET: check Salesforce connection status ─────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gate to Scale tier
  const access = await checkFeatureAccess(userId, "api-access");
  if (!access.allowed) {
    return NextResponse.json(
      { error: "Salesforce integration requires Scale tier", upgrade: true },
      { status: 403 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("user_integrations")
      .select("salesforce_instance_url, salesforce_access_token")
      .eq("user_id", userId)
      .single();

    return NextResponse.json({
      connected: !!(data?.salesforce_instance_url && data?.salesforce_access_token),
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

// ── POST: search Salesforce accounts ────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await checkFeatureAccess(userId, "api-access");
  if (!access.allowed) {
    return NextResponse.json(
      { error: "Salesforce integration requires Scale tier", upgrade: true },
      { status: 403 }
    );
  }

  let body: { companyName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { companyName } = body;
  if (!companyName?.trim()) {
    return NextResponse.json({ error: "companyName is required" }, { status: 400 });
  }

  // Get stored Salesforce credentials
  const supabase = getSupabaseAdmin();
  const { data: creds } = await supabase
    .from("user_integrations")
    .select("salesforce_instance_url, salesforce_access_token")
    .eq("user_id", userId)
    .single();

  if (!creds?.salesforce_access_token || !creds?.salesforce_instance_url) {
    return NextResponse.json(
      { error: "Salesforce not connected. Please authorize via Settings." },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Bearer ${creds.salesforce_access_token}`,
    "Content-Type": "application/json",
  };
  const baseUrl = creds.salesforce_instance_url;

  try {
    // Search Account by name
    const query = encodeURIComponent(
      `SELECT Id, Name, Industry, AnnualRevenue, Website FROM Account WHERE Name LIKE '%${companyName.replace(/'/g, "\\'")}%' LIMIT 1`
    );
    const searchRes = await fetch(`${baseUrl}/services/data/v59.0/query?q=${query}`, { headers });

    if (searchRes.status === 401) {
      return NextResponse.json(
        { error: "Salesforce token expired. Please reconnect." },
        { status: 401 }
      );
    }
    if (!searchRes.ok) {
      return NextResponse.json({ error: "Salesforce search failed" }, { status: 502 });
    }

    const searchData = await searchRes.json();
    if (!searchData.records?.length) {
      return NextResponse.json({ error: `No account matching "${companyName}"` }, { status: 404 });
    }

    const account = searchData.records[0];

    // Fetch primary contact
    let contactName = "";
    let contactTitle = "";
    try {
      const contactQuery = encodeURIComponent(
        `SELECT Id, Name, Title, Email FROM Contact WHERE AccountId = '${account.Id}' LIMIT 1`
      );
      const contactRes = await fetch(`${baseUrl}/services/data/v59.0/query?q=${contactQuery}`, { headers });
      if (contactRes.ok) {
        const contactData = await contactRes.json();
        if (contactData.records?.length) {
          contactName = contactData.records[0].Name || "";
          contactTitle = contactData.records[0].Title || "";
        }
      }
    } catch { /* optional */ }

    // Fetch opportunities for MRR
    let mrr = "";
    let contractStart = "";
    try {
      const oppQuery = encodeURIComponent(
        `SELECT Id, Name, Amount, CloseDate, StageName FROM Opportunity WHERE AccountId = '${account.Id}' AND StageName = 'Closed Won' ORDER BY CloseDate DESC LIMIT 1`
      );
      const oppRes = await fetch(`${baseUrl}/services/data/v59.0/query?q=${oppQuery}`, { headers });
      if (oppRes.ok) {
        const oppData = await oppRes.json();
        if (oppData.records?.length) {
          const opp = oppData.records[0];
          if (opp.Amount) mrr = String(Math.round(opp.Amount / 12));
          if (opp.CloseDate) contractStart = opp.CloseDate;
        }
      }
    } catch { /* optional */ }

    return NextResponse.json({
      companyName: account.Name,
      industry: account.Industry || "",
      contactName,
      contactTitle,
      mrr,
      contractStart,
      salesforceAccountId: account.Id,
    });
  } catch (err) {
    console.error("Salesforce search error:", err);
    return NextResponse.json({ error: "Failed to search Salesforce" }, { status: 500 });
  }
}
