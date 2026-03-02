import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── POST: start a playbook run ───────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { account_id } = body;

    if (!account_id) {
      return NextResponse.json({ error: "account_id is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify the playbook exists
    const { data: playbook, error: pbError } = await supabase
      .from("playbook_templates")
      .select("*")
      .eq("id", params.id)
      .single();

    if (pbError || !playbook) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }

    // Verify the account belongs to the user
    const { data: account, error: accError } = await supabase
      .from("client_accounts")
      .select("id, company_name")
      .eq("id", account_id)
      .eq("user_id", userId)
      .single();

    if (accError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Create the playbook run
    const { data: run, error: runError } = await supabase
      .from("playbook_runs")
      .insert({
        playbook_id: params.id,
        account_id,
        user_id: userId,
        status: "active",
        current_step: 0,
      })
      .select()
      .single();

    if (runError) {
      return NextResponse.json({ error: runError.message }, { status: 500 });
    }

    // Create tasks from playbook steps
    const steps = Array.isArray(playbook.steps) ? playbook.steps : [];
    const today = new Date();
    const tasksToCreate = [];

    for (const step of steps) {
      if (step.action === "create_task" && step.config) {
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + (step.day_offset || 0));

        tasksToCreate.push({
          user_id: userId,
          account_id,
          title: step.config.title || "Playbook task",
          description: step.config.description || null,
          priority: step.config.priority || "medium",
          status: "pending",
          due_date: dueDate.toISOString().split("T")[0],
          source: "playbook",
        });
      }
    }

    if (tasksToCreate.length > 0) {
      const { error: taskError } = await supabase.from("tasks").insert(tasksToCreate);
      if (taskError) {
        console.error("Error creating playbook tasks:", taskError);
        // Don't fail the run, just log
      }
    }

    return NextResponse.json({
      run,
      tasks_created: tasksToCreate.length,
      account_name: account.company_name,
      playbook_name: playbook.name,
    }, { status: 201 });
  } catch (err) {
    console.error("Playbook run error:", err);
    return NextResponse.json({ error: "Failed to start playbook" }, { status: 500 });
  }
}

// ── GET: list runs for a playbook ────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("playbook_runs")
      .select("*, client_accounts(id, company_name)")
      .eq("playbook_id", params.id)
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Playbook runs GET error:", err);
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 });
  }
}
