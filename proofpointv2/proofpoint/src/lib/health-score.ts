// ═══════════════════════════════════════════════════════════════════════════
// Health Score Engine — 8-factor weighted scoring for customer accounts
// ═══════════════════════════════════════════════════════════════════════════

import type { ClientAccount, AccountActivity, HealthFactors, HealthTrend } from "./supabase";

// ── Default weights (must sum to 100) ────────────────────────────────────
export interface HealthWeights {
  engagement: number;
  usage: number;
  nps: number;
  renewal_proximity: number;
  support_sentiment: number;
  expansion_potential: number;
  adoption_stage: number;
  competitive_risk: number;
}

export const DEFAULT_WEIGHTS: HealthWeights = {
  engagement: 15,
  usage: 15,
  nps: 15,
  renewal_proximity: 15,
  support_sentiment: 10,
  expansion_potential: 10,
  adoption_stage: 10,
  competitive_risk: 10,
};

// ── Factor calculators ───────────────────────────────────────────────────

/** Engagement: activity count in last 30 days */
function scoreEngagement(activities: AccountActivity[]): number {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentCount = activities.filter((a) => {
    const contactTypes = ["note", "email", "call", "meeting"];
    return contactTypes.includes(a.activity_type) && new Date(a.created_at) >= thirtyDaysAgo;
  }).length;

  if (recentCount === 0) return 0;
  if (recentCount <= 2) return 40;
  if (recentCount <= 5) return 70;
  return 100;
}

/** Usage/Adoption: from custom_fields.adoption_rate or manual input */
function scoreUsage(account: ClientAccount): number {
  const rate = account.custom_fields?.adoption_rate;
  if (rate === undefined || rate === null) return 50; // default if not set
  const num = typeof rate === "number" ? rate : parseFloat(String(rate));
  if (isNaN(num)) return 50;
  return Math.max(0, Math.min(100, num));
}

/** NPS: map NPS score to 0-100 */
function scoreNps(account: ClientAccount): number {
  if (account.nps_score === null || account.nps_score === undefined) return 50;
  const nps = account.nps_score;
  // NPS ranges: -100 to 100
  // Detractor (-100 to -1) → 20
  // Passive (0 to 6) → 60
  // Promoter (7 to 10 on 0-10 scale or positive NPS) → 90
  if (nps < 0) return 20;
  if (nps <= 6) return 60;
  return 90;
}

/** Renewal Proximity: days until contract end */
function scoreRenewalProximity(account: ClientAccount): number {
  if (!account.contract_end) return 70; // No contract end → assume mid-range
  const daysUntil = Math.ceil(
    (new Date(account.contract_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntil < 0) return 0; // Overdue
  if (daysUntil < 30) return 20;
  if (daysUntil < 90) return 50;
  if (daysUntil <= 180) return 80;
  return 100;
}

/** Support Sentiment: from custom_fields.support_tickets count */
function scoreSupportSentiment(account: ClientAccount): number {
  const tickets = account.custom_fields?.support_tickets;
  if (tickets === undefined || tickets === null) return 80; // default if not tracked
  const num = typeof tickets === "number" ? tickets : parseInt(String(tickets));
  if (isNaN(num)) return 80;
  if (num === 0) return 100;
  if (num <= 3) return 80;
  if (num <= 6) return 50;
  return 20;
}

/** Expansion Potential: from custom_fields.expansion_potential (0-100) */
function scoreExpansionPotential(account: ClientAccount): number {
  const potential = account.custom_fields?.expansion_potential;
  if (potential === undefined || potential === null) return 50;
  const num = typeof potential === "number" ? potential : parseFloat(String(potential));
  if (isNaN(num)) return 50;
  return Math.max(0, Math.min(100, num));
}

/** Adoption Stage: from lifecycle_stage mapping */
function scoreAdoptionStage(account: ClientAccount): number {
  const stageMap: Record<string, number> = {
    onboarding: 50,
    active: 80,
    "renewal-due": 60,
    renewed: 85,
    expanded: 100,
    "at-risk": 30,
    churned: 0,
    paused: 40,
  };
  return stageMap[account.lifecycle_stage] ?? 50;
}

/** Competitive Risk: from custom_fields.competitive_risk (0-100, inverted) */
function scoreCompetitiveRisk(account: ClientAccount): number {
  const risk = account.custom_fields?.competitive_risk;
  if (risk === undefined || risk === null) return 70; // default: assume low risk
  const num = typeof risk === "number" ? risk : parseFloat(String(risk));
  if (isNaN(num)) return 70;
  // Invert: high risk (100) = low score (0)
  return Math.max(0, Math.min(100, 100 - num));
}

// ── Main calculation ─────────────────────────────────────────────────────

export interface HealthScoreResult {
  score: number;
  factors: HealthFactors;
  trend: HealthTrend;
}

export function calculateHealthScore(
  account: ClientAccount,
  activities: AccountActivity[],
  previousScore?: number,
  weights: HealthWeights = DEFAULT_WEIGHTS
): HealthScoreResult {
  const factors: HealthFactors = {
    engagement: scoreEngagement(activities),
    usage: scoreUsage(account),
    nps: scoreNps(account),
    renewal_proximity: scoreRenewalProximity(account),
    support_sentiment: scoreSupportSentiment(account),
    expansion_potential: scoreExpansionPotential(account),
    adoption_stage: scoreAdoptionStage(account),
    competitive_risk: scoreCompetitiveRisk(account),
  };

  // Weighted average
  const score = Math.round(
    (factors.engagement * weights.engagement +
      factors.usage * weights.usage +
      factors.nps * weights.nps +
      factors.renewal_proximity * weights.renewal_proximity +
      factors.support_sentiment * weights.support_sentiment +
      factors.expansion_potential * weights.expansion_potential +
      factors.adoption_stage * weights.adoption_stage +
      factors.competitive_risk * weights.competitive_risk) /
      100
  );

  // Determine trend based on previous score
  let trend: HealthTrend = "stable";
  if (previousScore !== undefined) {
    const delta = score - previousScore;
    if (delta >= 5) trend = "improving";
    else if (delta <= -5) trend = "declining";
  }

  return { score: Math.max(0, Math.min(100, score)), factors, trend };
}

// ── Display helpers ──────────────────────────────────────────────────────

export function getHealthColor(score: number): string {
  if (score >= 70) return "#10b981"; // green
  if (score >= 40) return "#f59e0b"; // yellow
  return "#ef4444"; // red
}

export function getHealthLabel(score: number): string {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "Needs Attention";
  if (score >= 20) return "At Risk";
  return "Critical";
}

export const FACTOR_LABELS: Record<keyof HealthFactors, string> = {
  engagement: "Engagement Frequency",
  usage: "Usage / Adoption",
  nps: "NPS / CSAT",
  renewal_proximity: "Renewal Proximity",
  support_sentiment: "Support Sentiment",
  expansion_potential: "Expansion Potential",
  adoption_stage: "Adoption Stage",
  competitive_risk: "Competitive Risk",
};
