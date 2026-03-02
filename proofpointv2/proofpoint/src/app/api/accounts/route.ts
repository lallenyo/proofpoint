import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── GET: list all accounts for current user ──────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");
  const industry = url.searchParams.get("industry");
  const healthMin = url.searchParams.get("healthMin");
  const healthMax = url.searchParams.get("healthMax");
  const search = url.searchParams.get("search");
  const sortBy = url.searchParams.get("sortBy") || "company_name";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? false : true;
  const contractEndBefore = url.searchParams.get("contract_end_before");
  const contractEndAfter = url.searchParams.get("contract_end_after");

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("client_accounts")
      .select("*")
      .eq("user_id", userId);

    if (stage) {
      const stages = stage.split(",");
      query = query.in("lifecycle_stage", stages);
    }
    if (industry) query = query.eq("industry", industry);
    if (healthMin) query = query.gte("health_score", parseInt(healthMin));
    if (healthMax) query = query.lte("health_score", parseInt(healthMax));
    if (search) query = query.ilike("company_name", `%${search}%`);
    if (contractEndBefore) query = query.lte("contract_end", contractEndBefore);
    if (contractEndAfter) query = query.gte("contract_end", contractEndAfter);

    query = query.order(sortBy, { ascending: sortDir });

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Accounts GET error:", err);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

// ── POST: create a new account ──────────────────────────────
export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      company_name,
      domain,
      industry,
      lifecycle_stage,
      mrr,
      contract_start,
      contract_end,
      nps_score,
      hubspot_company_id,
      notes,
      custom_fields,
    } = body;

    if (!company_name) {
      return NextResponse.json({ error: "company_name is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("client_accounts")
      .insert({
        org_id: orgId || userId,
        user_id: userId,
        company_name,
        domain: domain || null,
        industry: industry || null,
        lifecycle_stage: lifecycle_stage || "onboarding",
        mrr: mrr || 0,
        contract_start: contract_start || null,
        contract_end: contract_end || null,
        nps_score: nps_score ?? null,
        hubspot_company_id: hubspot_company_id || null,
        notes: notes || null,
        custom_fields: custom_fields || {},
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Accounts POST error:", err);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
