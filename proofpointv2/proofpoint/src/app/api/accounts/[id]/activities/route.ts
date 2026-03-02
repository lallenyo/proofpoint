import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Helper: verify account ownership
async function verifyOwnership(accountId: string, userId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("client_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

// ── GET: list activities for an account ─────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!(await verifyOwnership(params.id, userId))) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const typeFilter = url.searchParams.get("type");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("account_activities")
      .select("*")
      .eq("account_id", params.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (typeFilter) {
      const types = typeFilter.split(",");
      query = query.in("activity_type", types);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Activities GET error:", err);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

// ── POST: add an activity to an account ─────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!(await verifyOwnership(params.id, userId))) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const body = await req.json();
    const { activity_type, title, description, metadata } = body;

    if (!activity_type) {
      return NextResponse.json({ error: "activity_type is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Insert activity
    const { data, error } = await supabase
      .from("account_activities")
      .insert({
        account_id: params.id,
        user_id: userId,
        activity_type,
        title: title || null,
        description: description || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update last_contact_date on the account
    if (["note", "email", "call", "meeting"].includes(activity_type)) {
      await supabase
        .from("client_accounts")
        .update({ last_contact_date: new Date().toISOString() })
        .eq("id", params.id);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Activities POST error:", err);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
