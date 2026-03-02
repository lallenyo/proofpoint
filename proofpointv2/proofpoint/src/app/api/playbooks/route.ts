import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── System playbook templates seed data ──────────────────────────────
const SYSTEM_PLAYBOOKS = [
  {
    name: "New Customer Onboarding",
    description: "Complete onboarding sequence for new accounts — from welcome to first QBR.",
    trigger_type: "new_account",
    trigger_config: {},
    is_system: true,
    is_active: true,
    steps: [
      { day_offset: 0, action: "create_task", config: { title: "Send welcome email", priority: "high", description: "Send personalized welcome with onboarding timeline and key contacts." } },
      { day_offset: 1, action: "create_task", config: { title: "Schedule kickoff call", priority: "high", description: "30-min kickoff to align on goals, timeline, and success criteria." } },
      { day_offset: 7, action: "create_task", config: { title: "Check initial setup progress", priority: "medium", description: "Verify integrations are live and key features are configured." } },
      { day_offset: 14, action: "create_task", config: { title: "First check-in call", priority: "medium", description: "Two-week pulse check on adoption and any early blockers." } },
      { day_offset: 30, action: "create_task", config: { title: "30-day health check — calculate first health score", priority: "high", description: "Run health scoring and document baseline engagement metrics." } },
      { day_offset: 60, action: "create_task", config: { title: "60-day review — assess adoption metrics", priority: "medium", description: "Review feature adoption, usage trends, and NPS if available." } },
      { day_offset: 90, action: "create_task", config: { title: "First QBR prep — generate executive report", priority: "high", description: "Prepare and generate executive summary report for first QBR." } },
    ],
  },
  {
    name: "Renewal Prep",
    description: "90-day renewal preparation sequence — ensure smooth renewal with data-driven justification.",
    trigger_type: "renewal_approaching",
    trigger_config: { days_before: 90 },
    is_system: true,
    is_active: true,
    steps: [
      { day_offset: -90, action: "create_task", config: { title: "Review account health and usage trends", priority: "high", description: "Analyze health score history, usage trends, and engagement patterns." } },
      { day_offset: -60, action: "create_task", config: { title: "Schedule renewal discussion with champion", priority: "high", description: "Set up meeting with internal champion to discuss renewal timeline." } },
      { day_offset: -45, action: "create_task", config: { title: "Generate ROI report for renewal justification", priority: "medium", description: "Build ROI narrative showing value delivered during the contract period." } },
      { day_offset: -30, action: "create_task", config: { title: "Send renewal proposal", priority: "urgent", description: "Deliver formal renewal proposal with pricing and expansion options." } },
      { day_offset: -14, action: "create_task", config: { title: "Follow up on renewal decision", priority: "high", description: "Check in on proposal status and address any remaining concerns." } },
      { day_offset: -7, action: "create_task", config: { title: "Final renewal check — escalate if unsigned", priority: "urgent", description: "Last check before contract expiry. Escalate to leadership if needed." } },
    ],
  },
  {
    name: "At-Risk Intervention",
    description: "Rapid response playbook for accounts with declining health scores below threshold.",
    trigger_type: "health_drop",
    trigger_config: { threshold: 40 },
    is_system: true,
    is_active: true,
    steps: [
      { day_offset: 0, action: "create_task", config: { title: "Investigate health score drop — review recent activities", priority: "urgent", description: "Deep-dive into what caused the score decline: support tickets, usage drops, NPS changes." } },
      { day_offset: 0, action: "create_task", config: { title: "Schedule emergency call with primary contact", priority: "urgent", description: "Get on a call ASAP to understand their perspective and concerns." } },
      { day_offset: 1, action: "create_task", config: { title: "Create recovery plan with specific action items", priority: "high", description: "Document concrete steps to address root causes and rebuild confidence." } },
      { day_offset: 3, action: "create_task", config: { title: "Executive outreach — loop in their leadership if needed", priority: "high", description: "Engage executive sponsors on both sides if situation warrants." } },
      { day_offset: 7, action: "create_task", config: { title: "Progress check on recovery plan", priority: "medium", description: "Review completion of recovery actions and assess early improvements." } },
      { day_offset: 14, action: "create_task", config: { title: "Reassess health score — evaluate if intervention working", priority: "high", description: "Recalculate health score and compare to pre-intervention baseline." } },
    ],
  },
  {
    name: "Expansion Opportunity",
    description: "Structured approach to identify and close expansion/upsell opportunities.",
    trigger_type: "manual",
    trigger_config: {},
    is_system: true,
    is_active: true,
    steps: [
      { day_offset: 0, action: "create_task", config: { title: "Identify expansion signals in account data", priority: "medium", description: "Look for high usage, team growth, feature requests, and positive NPS trends." } },
      { day_offset: 3, action: "create_task", config: { title: "Generate expansion ROI analysis", priority: "medium", description: "Build business case showing projected ROI of expanded engagement." } },
      { day_offset: 7, action: "create_task", config: { title: "Schedule upsell conversation with decision-maker", priority: "high", description: "Set up meeting with economic buyer to present expansion opportunity." } },
      { day_offset: 14, action: "create_task", config: { title: "Send expansion proposal", priority: "high", description: "Deliver formal expansion proposal with pricing tiers and implementation timeline." } },
      { day_offset: 21, action: "create_task", config: { title: "Follow up on expansion decision", priority: "medium", description: "Check in on proposal and address any remaining questions or concerns." } },
    ],
  },
];

// ── GET: list playbooks (with run counts) ────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();

    // Ensure system playbooks exist (idempotent seed)
    const { data: existing } = await supabase
      .from("playbook_templates")
      .select("name")
      .eq("is_system", true);

    const existingNames = new Set((existing || []).map((p: { name: string }) => p.name));
    const toInsert = SYSTEM_PLAYBOOKS.filter((p) => !existingNames.has(p.name)).map((p) => ({
      ...p,
      org_id: userId,
    }));

    if (toInsert.length > 0) {
      await supabase.from("playbook_templates").insert(toInsert);
    }

    // Fetch all playbooks
    const { data: playbooks, error } = await supabase
      .from("playbook_templates")
      .select("*")
      .order("is_system", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch active run counts
    const { data: runs } = await supabase
      .from("playbook_runs")
      .select("playbook_id, status")
      .eq("user_id", userId);

    const runCounts: Record<string, { active: number; completed: number }> = {};
    for (const r of runs || []) {
      if (!runCounts[r.playbook_id]) runCounts[r.playbook_id] = { active: 0, completed: 0 };
      if (r.status === "active") runCounts[r.playbook_id].active++;
      else if (r.status === "completed") runCounts[r.playbook_id].completed++;
    }

    const enriched = (playbooks || []).map((p: Record<string, unknown>) => ({
      ...p,
      run_counts: runCounts[p.id as string] || { active: 0, completed: 0 },
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("Playbooks GET error:", err);
    return NextResponse.json({ error: "Failed to fetch playbooks" }, { status: 500 });
  }
}

// ── POST: create custom playbook ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("playbook_templates")
      .insert({
        org_id: userId,
        name: body.name.trim(),
        description: body.description || null,
        trigger_type: body.trigger_type || "manual",
        trigger_config: body.trigger_config || {},
        steps: body.steps || [],
        is_system: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Playbooks POST error:", err);
    return NextResponse.json({ error: "Failed to create playbook" }, { status: 500 });
  }
}
