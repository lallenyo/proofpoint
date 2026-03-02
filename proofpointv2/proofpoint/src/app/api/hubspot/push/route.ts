import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── POST: push health scores back to HubSpot ────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
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

    // Ensure custom properties exist in HubSpot
    const propertiesToCreate = [
      { name: "proofpoint_health_score", label: "Proofpoint Health Score", type: "number", fieldType: "number", groupName: "companyinformation" },
      { name: "proofpoint_lifecycle_stage", label: "Proofpoint Lifecycle Stage", type: "string", fieldType: "text", groupName: "companyinformation" },
      { name: "proofpoint_last_health_update", label: "Proofpoint Last Health Update", type: "date", fieldType: "date", groupName: "companyinformation" },
    ];

    for (const prop of propertiesToCreate) {
      try {
        await fetch("https://api.hubapi.com/crm/v3/properties/companies", {
          method: "POST",
          headers,
          body: JSON.stringify(prop),
        });
        // 409 = already exists, that's fine
      } catch {
        // Property creation failed — continue anyway
      }
    }

    // Fetch all accounts with HubSpot IDs
    const supabase = getSupabaseAdmin();
    const { data: accounts, error: accErr } = await supabase
      .from("client_accounts")
      .select("hubspot_company_id, health_score, lifecycle_stage")
      .eq("user_id", userId)
      .not("hubspot_company_id", "is", null);

    if (accErr || !accounts) {
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
    }

    let pushed = 0;
    const errors: string[] = [];

    // Batch update (HubSpot supports batch of up to 100)
    const batches: typeof accounts[] = [];
    for (let i = 0; i < accounts.length; i += 100) {
      batches.push(accounts.slice(i, i + 100));
    }

    for (const batch of batches) {
      const inputs = batch.map((acc) => ({
        id: acc.hubspot_company_id,
        properties: {
          proofpoint_health_score: String(acc.health_score),
          proofpoint_lifecycle_stage: acc.lifecycle_stage,
          proofpoint_last_health_update: new Date().toISOString().split("T")[0],
        },
      }));

      try {
        const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies/batch/update", {
          method: "POST",
          headers,
          body: JSON.stringify({ inputs }),
        });

        if (res.status === 401) {
          return NextResponse.json(
            { error: "HubSpot token is invalid or expired.", pushed, errors },
            { status: 401 }
          );
        }
        if (res.status === 429) {
          return NextResponse.json(
            { error: "HubSpot rate limit. Try again later.", pushed, errors },
            { status: 429 }
          );
        }

        if (res.ok) {
          pushed += batch.length;
        } else {
          const errBody = await res.json().catch(() => ({}));
          errors.push(`Batch update failed: ${JSON.stringify(errBody).substring(0, 200)}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Batch error: ${msg}`);
      }
    }

    return NextResponse.json({ pushed, total: accounts.length, errors });
  } catch (err) {
    console.error("HubSpot push error:", err);
    return NextResponse.json({ error: "Push failed" }, { status: 500 });
  }
}
