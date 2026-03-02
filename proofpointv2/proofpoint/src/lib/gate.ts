// ═══════════════════════════════════════════════════════════════════════════
// Feature Gating & Usage Tracking
// ═══════════════════════════════════════════════════════════════════════════

import { getSupabaseAdmin } from "./supabase";
import type { Organization } from "./supabase";
import { TIER_CONFIG, type Feature } from "./tiers";

// ── Get the user's organization ──────────────────────────────────────────
export async function getUserOrg(userId: string): Promise<Organization | null> {
  const supabase = getSupabaseAdmin();

  // First check if user owns an org
  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_user_id", userId)
    .single();

  if (ownedOrg) return ownedOrg as Organization;

  // Check if user is a member of an org
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .single();

  if (membership) {
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.org_id)
      .single();
    return (org as Organization) || null;
  }

  return null;
}

// ── Check if a user has access to a feature ──────────────────────────────
export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  upgradeUrl?: string;
  currentTier?: string;
}

export async function checkFeatureAccess(
  userId: string,
  feature: Feature
): Promise<FeatureAccessResult> {
  const org = await getUserOrg(userId);

  if (!org) {
    // No org = treat as trial
    const trialConfig = TIER_CONFIG.trial;
    if (trialConfig.features.includes(feature)) {
      return { allowed: true, currentTier: "trial" };
    }
    return {
      allowed: false,
      reason: "This feature requires a subscription.",
      upgradeUrl: "/pricing",
      currentTier: "trial",
    };
  }

  // Check subscription status
  if (org.subscription_status === "canceled") {
    return {
      allowed: false,
      reason: "Your subscription has been canceled. Please resubscribe to access this feature.",
      upgradeUrl: "/pricing",
      currentTier: org.plan_tier,
    };
  }

  // Check trial expiry
  if (org.plan_tier === "trial" && org.trial_ends_at) {
    if (new Date(org.trial_ends_at) < new Date()) {
      return {
        allowed: false,
        reason: "Your free trial has expired. Upgrade to continue using ProofPoint.",
        upgradeUrl: "/pricing",
        currentTier: "trial",
      };
    }
  }

  const tierConfig = TIER_CONFIG[org.plan_tier] || TIER_CONFIG.trial;
  if (tierConfig.features.includes(feature)) {
    return { allowed: true, currentTier: org.plan_tier };
  }

  return {
    allowed: false,
    reason: `This feature requires an upgrade from your current ${org.plan_tier} plan.`,
    upgradeUrl: "/pricing",
    currentTier: org.plan_tier,
  };
}

// ── Check AI quota ──────────────────────────────────────────────────────
export interface AiQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetDate: Date;
}

export async function checkAiQuota(userId: string): Promise<AiQuotaResult> {
  const org = await getUserOrg(userId);

  if (!org) {
    // No org = trial with generous limits
    return { allowed: true, used: 0, limit: 2000, resetDate: new Date() };
  }

  const used = org.ai_actions_used;
  const limit = org.ai_actions_limit;
  const resetDate = org.current_period_end
    ? new Date(org.current_period_end)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return {
    allowed: used < limit,
    used,
    limit,
    resetDate,
  };
}

// ── Increment AI usage ──────────────────────────────────────────────────
export async function incrementAiUsage(userId: string): Promise<void> {
  const org = await getUserOrg(userId);
  if (!org) return;

  const supabase = getSupabaseAdmin();
  await supabase
    .from("organizations")
    .update({ ai_actions_used: org.ai_actions_used + 1 })
    .eq("id", org.id);
}

// ── Get AI model for user's tier ────────────────────────────────────────
export interface AiModelConfig {
  model: string;
  maxTokens: number;
}

export async function getAiModel(userId: string): Promise<AiModelConfig> {
  const org = await getUserOrg(userId);
  const tier = org?.plan_tier || "trial";
  const config = TIER_CONFIG[tier] || TIER_CONFIG.trial;

  return {
    model: config.aiModel,
    maxTokens: config.maxTokens,
  };
}
