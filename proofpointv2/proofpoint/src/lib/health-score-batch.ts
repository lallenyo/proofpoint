// ═══════════════════════════════════════════════════════════════════════════
// Health Score Batch Recalculation
// Recalculates health scores for all accounts owned by a user
// ═══════════════════════════════════════════════════════════════════════════

import { getSupabaseAdmin } from "./supabase";
import type { ClientAccount, AccountActivity } from "./supabase";
import { calculateHealthScore } from "./health-score";

export interface BatchResult {
  total: number;
  updated: number;
  errors: string[];
}

export async function recalculateAllHealthScores(userId: string): Promise<BatchResult> {
  const supabase = getSupabaseAdmin();
  const result: BatchResult = { total: 0, updated: 0, errors: [] };

  try {
    // Fetch all accounts for the user
    const { data: accounts, error: accountsErr } = await supabase
      .from("client_accounts")
      .select("*")
      .eq("user_id", userId);

    if (accountsErr || !accounts) {
      result.errors.push(`Failed to fetch accounts: ${accountsErr?.message || "no data"}`);
      return result;
    }

    result.total = accounts.length;

    for (const account of accounts as ClientAccount[]) {
      try {
        // Fetch activities for this account
        const { data: activities } = await supabase
          .from("account_activities")
          .select("*")
          .eq("account_id", account.id);

        // Get previous score for trend calculation
        const previousScore = account.health_score;

        // Calculate new score
        const { score, factors, trend } = calculateHealthScore(
          account,
          (activities || []) as AccountActivity[],
          previousScore
        );

        // Save to health_score_history
        await supabase.from("health_score_history").insert({
          account_id: account.id,
          score,
          factors,
        });

        // Update the account
        await supabase
          .from("client_accounts")
          .update({
            health_score: score,
            health_trend: trend,
          })
          .eq("id", account.id);

        // Log the health change as an activity if score changed significantly
        const delta = Math.abs(score - previousScore);
        if (delta >= 5) {
          await supabase.from("account_activities").insert({
            account_id: account.id,
            user_id: userId,
            activity_type: "health-change",
            title: `Health score ${trend === "improving" ? "improved" : "declined"} to ${score}`,
            description: `Score changed from ${previousScore} to ${score} (${delta > 0 ? "+" : ""}${score - previousScore})`,
            metadata: { previous_score: previousScore, new_score: score, factors },
          });
        }

        result.updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Account ${account.company_name}: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Batch error: ${msg}`);
  }

  return result;
}
