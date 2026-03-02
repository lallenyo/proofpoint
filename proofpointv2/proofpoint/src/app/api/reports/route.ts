import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── GET: list all reports for current user ────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reports")
    .select("id, company_name, report_type, industry, mrr, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// ── POST: save a new report ───────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { companyName, format, form, report, industry, mrr } = body;

  if (!companyName || !report) {
    return NextResponse.json({ error: "companyName and report are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: userId,
      company_name: companyName,
      report_type: format ?? "executive",
      input_data: form ?? {},
      generated_report: report,
      industry: industry ?? null,
      mrr: mrr ? parseFloat(mrr) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
