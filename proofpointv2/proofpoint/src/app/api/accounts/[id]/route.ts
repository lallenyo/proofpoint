import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── GET: single account ─────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("client_accounts")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Account GET error:", err);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}

// ── PATCH: update account ───────────────────────────────────
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
    delete body.arr;
    delete body.created_at;
    delete body.updated_at;
    delete body.user_id;
    delete body.org_id;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("client_accounts")
      .update(body)
      .eq("id", params.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Account PATCH error:", err);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

// ── DELETE: delete account ──────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("client_accounts")
      .delete()
      .eq("id", params.id)
      .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
