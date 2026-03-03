import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── GET: list support tickets with filters ──────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const source = url.searchParams.get("source");
  const search = url.searchParams.get("search");
  const accountId = url.searchParams.get("account_id");
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  try {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("support_tickets")
      .select("*, client_accounts(id, company_name)", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (status) {
      const statuses = status.split(",");
      query = query.in("status", statuses);
    }
    if (priority) {
      const priorities = priority.split(",");
      query = query.in("priority", priorities);
    }
    if (source) {
      query = query.eq("source", source);
    }
    if (search) {
      query = query.or(`subject.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
    }
    if (accountId) {
      query = query.eq("account_id", accountId);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      // If table doesn't exist yet, return empty array
      if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
        return NextResponse.json({ tickets: [], total: 0 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tickets: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error("Support tickets GET error:", err);
    return NextResponse.json({ error: "Failed to fetch support tickets" }, { status: 500 });
  }
}

// ── POST: create a support ticket manually ──────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    const { subject, description, customer_email, customer_name, priority, source, account_id } = body;

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    const validPriorities = ["urgent", "high", "medium", "low"];
    const validSources = ["manual", "zendesk", "intercom", "email", "chat"];

    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority. Must be one of: urgent, high, medium, low" }, { status: 400 });
    }

    if (source && !validSources.includes(source)) {
      return NextResponse.json({ error: "Invalid source. Must be one of: manual, zendesk, intercom, email, chat" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // If account_id provided, verify it belongs to the user
    if (account_id) {
      const { data: account } = await supabase
        .from("client_accounts")
        .select("id")
        .eq("id", account_id)
        .eq("user_id", userId)
        .single();

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: userId,
        subject: subject.trim(),
        description: description || null,
        customer_email: customer_email || null,
        customer_name: customer_name || null,
        priority: priority || "medium",
        source: source || "manual",
        status: "open",
        account_id: account_id || null,
      })
      .select("*, client_accounts(id, company_name)")
      .single();

    if (error) {
      console.error("Support ticket POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Support ticket POST error:", err);
    return NextResponse.json({ error: "Failed to create support ticket" }, { status: 500 });
  }
}
