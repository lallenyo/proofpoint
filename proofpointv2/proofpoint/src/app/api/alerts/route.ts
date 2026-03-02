import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { alertsLimiter } from "@/lib/rate-limit";

// ── GET: list alerts ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = alertsLimiter.check(userId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: alertsLimiter.headers(rl) });
  }

  try {
    const url = req.nextUrl;
    const unreadOnly = url.searchParams.get("unread") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("alerts")
      .select("*, client_accounts(id, company_name)")
      .eq("user_id", userId)
      .eq("is_dismissed", false);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    query = query.order("created_at", { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("Alerts GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Alerts GET error:", err);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

// ── PATCH: mark alerts read/dismissed ────────────────────────────────
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { alert_ids, action } = body;

    if (!alert_ids || !Array.isArray(alert_ids) || alert_ids.length === 0) {
      return NextResponse.json({ error: "alert_ids array is required" }, { status: 400 });
    }

    if (!["mark_read", "mark_unread", "dismiss"].includes(action)) {
      return NextResponse.json({ error: "action must be mark_read, mark_unread, or dismiss" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const update: Record<string, boolean> = {};

    if (action === "mark_read") update.is_read = true;
    else if (action === "mark_unread") update.is_read = false;
    else if (action === "dismiss") {
      update.is_dismissed = true;
      update.is_read = true;
    }

    const { error } = await supabase
      .from("alerts")
      .update(update)
      .in("id", alert_ids)
      .eq("user_id", userId);

    if (error) {
      console.error("Alerts PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: alert_ids.length });
  } catch (err) {
    console.error("Alerts PATCH error:", err);
    return NextResponse.json({ error: "Failed to update alerts" }, { status: 500 });
  }
}
