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

// ── GET: list contacts for an account ────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (!(await verifyOwnership(params.id, userId))) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("account_contacts")
      .select("*")
      .eq("account_id", params.id)
      .order("is_primary", { ascending: false })
      .order("name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Contacts GET error:", err);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

// ── POST: add a contact to an account ───────────────────────
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
    const { name, email, title, role, is_primary } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("account_contacts")
      .insert({
        account_id: params.id,
        name,
        email: email || null,
        title: title || null,
        role: role || null,
        is_primary: is_primary || false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Contacts POST error:", err);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
