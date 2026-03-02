import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── GET: list tasks with filters ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = req.nextUrl;
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const accountId = url.searchParams.get("account_id");
    const dueBefore = url.searchParams.get("due_before");
    const dueAfter = url.searchParams.get("due_after");
    const sortBy = url.searchParams.get("sort_by") || "due_date";
    const sortDir = url.searchParams.get("sort_dir") === "desc" ? false : true;
    const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("tasks")
      .select("*, client_accounts(id, company_name)")
      .eq("user_id", userId);

    if (status) {
      const statuses = status.split(",");
      query = query.in("status", statuses);
    }
    if (priority) {
      const priorities = priority.split(",");
      query = query.in("priority", priorities);
    }
    if (accountId) {
      query = query.eq("account_id", accountId);
    }
    if (dueBefore) {
      query = query.lte("due_date", dueBefore);
    }
    if (dueAfter) {
      query = query.gte("due_date", dueAfter);
    }

    query = query.order(sortBy, { ascending: sortDir }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("Tasks GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Tasks GET error:", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// ── POST: create task ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const validPriorities = ["urgent", "high", "medium", "low"];
    const validStatuses = ["pending", "in_progress", "completed", "skipped"];
    const validSources = ["manual", "playbook", "ai-suggestion", "health-alert"];

    const insert: Record<string, unknown> = {
      user_id: userId,
      title: body.title.trim(),
      description: body.description || null,
      priority: validPriorities.includes(body.priority) ? body.priority : "medium",
      status: validStatuses.includes(body.status) ? body.status : "pending",
      due_date: body.due_date || null,
      source: validSources.includes(body.source) ? body.source : "manual",
      account_id: body.account_id || null,
    };

    if (insert.status === "completed") {
      insert.completed_at = new Date().toISOString();
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tasks")
      .insert(insert)
      .select("*, client_accounts(id, company_name)")
      .single();

    if (error) {
      console.error("Tasks POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Tasks POST error:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
