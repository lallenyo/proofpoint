import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { checkFeatureAccess } from "@/lib/gate";

// ── POST: bi-directional sync between Salesforce and ProofPoint ──
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await checkFeatureAccess(userId, "api-access");
  if (!access.allowed) {
    return NextResponse.json(
      { error: "Salesforce sync requires Scale tier", upgrade: true },
      { status: 403 }
    );
  }

  let body: { direction?: "import" | "export"; accountId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const direction = body.direction || "import";

  // Get Salesforce credentials
  const supabase = getSupabaseAdmin();
  const { data: creds } = await supabase
    .from("user_integrations")
    .select("salesforce_instance_url, salesforce_access_token")
    .eq("user_id", userId)
    .single();

  if (!creds?.salesforce_access_token) {
    return NextResponse.json({ error: "Salesforce not connected" }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${creds.salesforce_access_token}`,
    "Content-Type": "application/json",
  };
  const baseUrl = creds.salesforce_instance_url;

  try {
    if (direction === "import") {
      // Import: Pull Salesforce Accounts → client_accounts
      const query = encodeURIComponent(
        "SELECT Id, Name, Industry, AnnualRevenue, Website FROM Account ORDER BY LastModifiedDate DESC LIMIT 50"
      );
      const res = await fetch(`${baseUrl}/services/data/v59.0/query?q=${query}`, { headers });

      if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch Salesforce accounts" }, { status: 502 });
      }

      const data = await res.json();
      let imported = 0;
      let skipped = 0;

      for (const acct of data.records || []) {
        // Check if already imported (by salesforce_account_id in custom_fields)
        const { data: existing } = await supabase
          .from("client_accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("custom_fields->>salesforce_account_id", acct.Id)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        const industryMap: Record<string, string> = {
          Healthcare: "healthcare",
          "Financial Services": "fintech",
          Technology: "saas",
          "Real Estate": "realestate",
        };

        await supabase.from("client_accounts").insert({
          user_id: userId,
          org_id: userId,
          company_name: acct.Name,
          domain: acct.Website || null,
          industry: industryMap[acct.Industry] || "saas",
          mrr: acct.AnnualRevenue ? Math.round(acct.AnnualRevenue / 12) : 0,
          lifecycle_stage: "active",
          custom_fields: { salesforce_account_id: acct.Id },
        });
        imported++;
      }

      return NextResponse.json({
        success: true,
        imported,
        skipped,
        total: data.records?.length || 0,
      });
    }

    if (direction === "export" && body.accountId) {
      // Export: Push ProofPoint account → Salesforce
      const { data: account } = await supabase
        .from("client_accounts")
        .select("*")
        .eq("id", body.accountId)
        .eq("user_id", userId)
        .single();

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const sfAccountId = account.custom_fields?.salesforce_account_id;
      if (!sfAccountId) {
        return NextResponse.json(
          { error: "Account not linked to Salesforce" },
          { status: 400 }
        );
      }

      // Update Salesforce Account with ProofPoint data
      const updateRes = await fetch(
        `${baseUrl}/services/data/v59.0/sobjects/Account/${sfAccountId}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            Description: `ProofPoint Health Score: ${account.health_score || "N/A"} | MRR: $${account.mrr?.toLocaleString() || "0"}`,
          }),
        }
      );

      if (!updateRes.ok) {
        return NextResponse.json({ error: "Failed to update Salesforce" }, { status: 502 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid sync direction" }, { status: 400 });
  } catch (err) {
    console.error("Salesforce sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
