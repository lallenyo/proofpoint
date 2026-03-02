import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ClientAccount, AccountActivity } from "@/lib/supabase";
import { calculateHealthScore } from "@/lib/health-score";
import { NextRequest, NextResponse } from "next/server";

// ── GET: latest health score with all factors ────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: account } = await supabase
      .from("client_accounts")
      .select("id, health_score, health_trend")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get latest health score history
    const { data: history } = await supabase
      .from("health_score_history")
      .select("*")
      .eq("account_id", params.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      score: account.health_score,
      trend: account.health_trend,
      factors: history?.factors || null,
      calculated_at: history?.calculated_at || null,
    });
  } catch (err) {
    console.error("Health GET error:", err);
    return NextResponse.json({ error: "Failed to fetch health score" }, { status: 500 });
  }
}

// ── POST: recalculate health score ──────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();

    // Fetch account
    const { data: account, error: accErr } = await supabase
      .from("client_accounts")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Fetch activities
    const { data: activities } = await supabase
      .from("account_activities")
      .select("*")
      .eq("account_id", params.id);

    // Calculate
    const previousScore = account.health_score;
    const { score, factors, trend } = calculateHealthScore(
      account as ClientAccount,
      (activities || []) as AccountActivity[],
      previousScore
    );

    // Save to history
    const { data: historyEntry, error: histErr } = await supabase
      .from("health_score_history")
      .insert({
        account_id: params.id,
        score,
        factors,
      })
      .select()
      .single();

    if (histErr) {
      console.error("Health history insert error:", histErr);
    }

    // Update account
    const { error: updateErr } = await supabase
      .from("client_accounts")
      .update({ health_score: score, health_trend: trend })
      .eq("id", params.id);

    if (updateErr) {
      console.error("Account health update error:", updateErr);
    }

    // Log health change activity if significant
    const delta = Math.abs(score - previousScore);
    if (delta >= 5) {
      await supabase.from("account_activities").insert({
        account_id: params.id,
        user_id: userId,
        activity_type: "health-change",
        title: `Health score ${trend === "improving" ? "improved" : "declined"} to ${score}`,
        description: `Score changed from ${previousScore} to ${score}`,
        metadata: { previous_score: previousScore, new_score: score, factors },
      });
    }

    return NextResponse.json({
      score,
      factors,
      trend,
      calculated_at: historyEntry?.calculated_at || new Date().toISOString(),
      previous_score: previousScore,
    });
  } catch (err) {
    console.error("Health POST error:", err);
    return NextResponse.json({ error: "Failed to recalculate health score" }, { status: 500 });
  }
}
