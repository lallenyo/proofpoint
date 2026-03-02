import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { tasksLimiter } from "@/lib/rate-limit";
import { createTaskSchema } from "@/lib/validations";

// ── GET: list tasks with filters ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = tasksLimiter.check(userId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: tasksLimiter.headers(rl) });
  }

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

  const rl = tasksLimiter.check(userId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: tasksLimiter.headers(rl) });
  }

  try {
    const body = await req.json();

    // Zod validation
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const insert: Record<string, unknown> = {
      user_id: userId,
      title: parsed.data.title.trim(),
      description: parsed.data.description || null,
      priority: parsed.data.priority || "medium",
      status: parsed.data.status || "pending",
      due_date: parsed.data.due_date || null,
      source: parsed.data.source || "manual",
      account_id: parsed.data.account_id || null,
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
