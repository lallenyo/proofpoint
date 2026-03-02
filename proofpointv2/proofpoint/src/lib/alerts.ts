import { getSupabaseAdmin } from "@/lib/supabase";
import type { ClientAccount } from "@/lib/supabase";

// ── Alert check functions ────────────────────────────────────────────

export async function checkHealthDropAlert(
  userId: string,
  account: ClientAccount,
  previousScore: number,
  newScore: number
): Promise<void> {
  const drop = previousScore - newScore;
  if (drop < 15) return;

  const severity = drop >= 30 ? "critical" : "warning";
  const supabase = getSupabaseAdmin();

  // Don't create duplicate alerts for the same account within 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("alerts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", account.id)
    .eq("alert_type", "health_drop")
    .gte("created_at", oneDayAgo)
    .limit(1);

  if (existing && existing.length > 0) return;

  await supabase.from("alerts").insert({
    user_id: userId,
    account_id: account.id,
    alert_type: "health_drop",
    severity,
    title: `Health score dropped ${drop} points for ${account.company_name}`,
    description: `Health score fell from ${previousScore} to ${newScore}. This ${drop >= 30 ? "critical" : "significant"} decline requires immediate attention.`,
    metadata: {
      previous_score: previousScore,
      new_score: newScore,
      drop,
      company_name: account.company_name,
    },
  });
}

export async function checkChurnRiskAlert(
  userId: string,
  account: ClientAccount
): Promise<void> {
  if (account.health_score >= 30) return;
  if (account.lifecycle_stage === "churned") return;

  const supabase = getSupabaseAdmin();

  // Don't duplicate within 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("alerts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", account.id)
    .eq("alert_type", "churn_risk")
    .gte("created_at", weekAgo)
    .limit(1);

  if (existing && existing.length > 0) return;

  const severity = account.health_score < 15 ? "critical" : "warning";

  await supabase.from("alerts").insert({
    user_id: userId,
    account_id: account.id,
    alert_type: "churn_risk",
    severity,
    title: `Churn risk: ${account.company_name} at ${account.health_score}/100`,
    description: `${account.company_name} health score is critically low at ${account.health_score}. At-risk of churning — intervention recommended.`,
    metadata: {
      health_score: account.health_score,
      mrr: account.mrr,
      lifecycle_stage: account.lifecycle_stage,
      company_name: account.company_name,
    },
  });
}

export async function checkRenewalOverdueAlert(
  userId: string,
  account: ClientAccount
): Promise<void> {
  if (!account.contract_end) return;

  const today = new Date().toISOString().split("T")[0];
  if (account.contract_end >= today) return;
  if (account.lifecycle_stage === "renewed" || account.lifecycle_stage === "churned") return;

  const supabase = getSupabaseAdmin();

  // Don't duplicate within 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("alerts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", account.id)
    .eq("alert_type", "renewal_overdue")
    .gte("created_at", weekAgo)
    .limit(1);

  if (existing && existing.length > 0) return;

  const daysOverdue = Math.ceil(
    (Date.now() - new Date(account.contract_end).getTime()) / (1000 * 60 * 60 * 24)
  );

  await supabase.from("alerts").insert({
    user_id: userId,
    account_id: account.id,
    alert_type: "renewal_overdue",
    severity: daysOverdue > 14 ? "critical" : "warning",
    title: `Renewal overdue: ${account.company_name} (${daysOverdue} days)`,
    description: `Contract for ${account.company_name} expired ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} ago and has not been renewed. MRR at risk: $${account.mrr.toLocaleString()}/mo.`,
    metadata: {
      contract_end: account.contract_end,
      days_overdue: daysOverdue,
      mrr: account.mrr,
      company_name: account.company_name,
    },
  });
}

export async function checkNoContactAlert(
  userId: string,
  account: ClientAccount
): Promise<void> {
  if (!account.last_contact_date) return;
  if (account.lifecycle_stage === "churned") return;

  const daysSinceContact = Math.ceil(
    (Date.now() - new Date(account.last_contact_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceContact < 30) return;

  const supabase = getSupabaseAdmin();

  // Don't duplicate within 14 days
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("alerts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", account.id)
    .eq("alert_type", "no_contact")
    .gte("created_at", twoWeeksAgo)
    .limit(1);

  if (existing && existing.length > 0) return;

  await supabase.from("alerts").insert({
    user_id: userId,
    account_id: account.id,
    alert_type: "no_contact",
    severity: daysSinceContact > 60 ? "warning" : "info",
    title: `No contact in ${daysSinceContact} days: ${account.company_name}`,
    description: `${account.company_name} hasn't been contacted in ${daysSinceContact} days. Consider scheduling a check-in to maintain the relationship.`,
    metadata: {
      last_contact_date: account.last_contact_date,
      days_since_contact: daysSinceContact,
      company_name: account.company_name,
    },
  });
}

// ── Run all alert checks for an account ──────────────────────────────

export async function runAlertChecks(
  userId: string,
  account: ClientAccount,
  previousScore?: number
): Promise<void> {
  const promises: Promise<void>[] = [];

  if (previousScore !== undefined) {
    promises.push(checkHealthDropAlert(userId, account, previousScore, account.health_score));
  }

  promises.push(checkChurnRiskAlert(userId, account));
  promises.push(checkRenewalOverdueAlert(userId, account));
  promises.push(checkNoContactAlert(userId, account));

  await Promise.allSettled(promises);
}
