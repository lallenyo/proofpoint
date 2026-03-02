import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── PATCH: update task ───────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Remove read-only fields
    delete body.id;
    delete body.user_id;
    delete body.created_at;

    // If marking as completed, set completed_at
    if (body.status === "completed" && !body.completed_at) {
      body.completed_at = new Date().toISOString();
    }

    // If un-completing, clear completed_at
    if (body.status && body.status !== "completed") {
      body.completed_at = null;
    }

    const validPriorities = ["urgent", "high", "medium", "low"];
    const validStatuses = ["pending", "in_progress", "completed", "skipped"];

    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tasks")
      .update(body)
      .eq("id", params.id)
      .eq("user_id", userId)
      .select("*, client_accounts(id, company_name)")
      .single();

    if (error) {
      console.error("Task PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Task PATCH error:", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

// ── DELETE: delete task ──────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", params.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Task DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Task DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
