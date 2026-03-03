import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── GET: single ticket with conversation thread ─────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();

    // Fetch the ticket with linked account info
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*, client_accounts(id, company_name)")
      .eq("id", params.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Fetch conversation thread for this ticket
    let thread: unknown[] = [];
    try {
      const { data: messages, error: threadError } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", params.id)
        .order("created_at", { ascending: true });

      if (!threadError && messages) {
        thread = messages;
      }
    } catch {
      // Thread table may not exist yet; return empty
    }

    return NextResponse.json({ ...ticket, thread });
  } catch (err) {
    console.error("Support ticket GET error:", err);
    return NextResponse.json({ error: "Failed to fetch support ticket" }, { status: 500 });
  }
}

// ── PATCH: update ticket ────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    const validStatuses = ["open", "pending", "in_progress", "resolved", "closed"];
    const validPriorities = ["urgent", "high", "medium", "low"];

    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: open, pending, in_progress, resolved, closed" },
        { status: 400 }
      );
    }

    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: "Invalid priority. Must be one of: urgent, high, medium, low" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Build the update payload with only allowed fields
    const updatePayload: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updatePayload.status = body.status;
      // Set resolved_at when marking as resolved or closed
      if (body.status === "resolved" || body.status === "closed") {
        updatePayload.resolved_at = new Date().toISOString();
      }
    }
    if (body.priority !== undefined) updatePayload.priority = body.priority;
    if (body.assignee !== undefined) updatePayload.assignee = body.assignee;
    if (body.account_id !== undefined) {
      // If linking to an account, verify it belongs to the user
      if (body.account_id) {
        const { data: account } = await supabase
          .from("client_accounts")
          .select("id")
          .eq("id", body.account_id)
          .eq("user_id", userId)
          .single();

        if (!account) {
          return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }
      }
      updatePayload.account_id = body.account_id || null;
    }

    if (Object.keys(updatePayload).length === 0 && !body.internal_note) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Update the ticket if there are fields to update
    let ticket = null;
    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("support_tickets")
        .update(updatePayload)
        .eq("id", params.id)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .select("*, client_accounts(id, company_name)")
        .single();

      if (error) {
        console.error("Support ticket PATCH error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      ticket = data;
    }

    // Add internal note as a thread message if provided
    if (body.internal_note) {
      try {
        await supabase.from("support_ticket_messages").insert({
          ticket_id: params.id,
          sender_type: "internal",
          sender_name: body.assignee || "Agent",
          body: body.internal_note,
          is_internal: true,
        });
      } catch {
        // Thread table may not exist yet; silently skip
      }
    }

    // If we only added an internal note, refetch the ticket
    if (!ticket) {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, client_accounts(id, company_name)")
        .eq("id", params.id)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      ticket = data;
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("Support ticket PATCH error:", err);
    return NextResponse.json({ error: "Failed to update support ticket" }, { status: 500 });
  }
}

// ── DELETE: soft delete ticket ──────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("support_tickets")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      console.error("Support ticket DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Support ticket DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete support ticket" }, { status: 500 });
  }
}
