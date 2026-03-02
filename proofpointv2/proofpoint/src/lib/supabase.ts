import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-safe client (respects row-level security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-only admin client (bypasses RLS — only use in API routes)
export function getSupabaseAdmin() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Report = {
  id: string;
  user_id: string;
  company_name: string;
  report_type: string;
  input_data: Record<string, unknown>;
  generated_report: string;
  industry: string | null;
  mrr: number | null;
  created_at: string;
  updated_at: string;
};

export type ReportSummary = Pick<
  Report,
  "id" | "company_name" | "report_type" | "industry" | "mrr" | "created_at"
>;

// ─── Client Accounts ─────────────────────────────────────────────────────────

export type IndustryKey = "healthcare" | "fintech" | "hrtech" | "saas" | "realestate";

export type LifecycleStage =
  | "onboarding"
  | "active"
  | "renewal-due"
  | "renewed"
  | "expanded"
  | "at-risk"
  | "churned"
  | "paused";

export type HealthTrend = "improving" | "stable" | "declining";

export type ClientAccount = {
  id: string;
  org_id: string;
  user_id: string;
  company_name: string;
  domain: string | null;
  industry: IndustryKey | null;
  lifecycle_stage: LifecycleStage;
  mrr: number;
  arr: number;
  contract_start: string | null;
  contract_end: string | null;
  health_score: number;
  health_trend: HealthTrend;
  nps_score: number | null;
  last_contact_date: string | null;
  hubspot_company_id: string | null;
  custom_fields: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientAccountInsert = Omit<
  ClientAccount,
  "id" | "arr" | "created_at" | "updated_at" | "health_score" | "health_trend"
> & {
  health_score?: number;
  health_trend?: HealthTrend;
};

// ─── Account Contacts ────────────────────────────────────────────────────────

export type ContactRole = "champion" | "decision-maker" | "user" | "executive" | "detractor";

export type AccountContact = {
  id: string;
  account_id: string;
  name: string;
  email: string | null;
  title: string | null;
  role: ContactRole | null;
  is_primary: boolean;
  last_contacted: string | null;
  created_at: string;
};

// ─── Account Activities ──────────────────────────────────────────────────────

export type ActivityType =
  | "note"
  | "email"
  | "call"
  | "meeting"
  | "health-change"
  | "stage-change"
  | "report-generated";

export type AccountActivity = {
  id: string;
  account_id: string;
  user_id: string;
  activity_type: ActivityType;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

// ─── Health Score History ────────────────────────────────────────────────────

export type HealthFactors = {
  engagement: number;
  usage: number;
  nps: number;
  renewal_proximity: number;
  support_sentiment: number;
  expansion_potential: number;
  adoption_stage: number;
  competitive_risk: number;
};

export type HealthScoreRecord = {
  id: string;
  account_id: string;
  score: number;
  factors: HealthFactors | null;
  calculated_at: string;
};

// ─── Waitlist ────────────────────────────────────────────────────────────────

export type WaitlistEntry = {
  id: string;
  email: string;
  source: string;
  created_at: string;
};

// ─── Organizations ───────────────────────────────────────────────────────────

export type PlanTier = "trial" | "starter" | "growth" | "scale";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export type Organization = {
  id: string;
  name: string | null;
  owner_user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_tier: PlanTier;
  seats_purchased: number;
  billing_interval: "monthly" | "annual" | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  ai_actions_used: number;
  ai_actions_limit: number;
  onboarding_completed: boolean;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OrgMember = {
  org_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
};

// ─── Lifecycle stage display helpers ─────────────────────────────────────────

export const LIFECYCLE_COLORS: Record<LifecycleStage, string> = {
  onboarding: "#3b82f6",
  active: "#10b981",
  "renewal-due": "#f59e0b",
  renewed: "#06b6d4",
  expanded: "#8b5cf6",
  "at-risk": "#ef4444",
  churned: "#6b7280",
  paused: "#94a3b8",
};

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  onboarding: "Onboarding",
  active: "Active",
  "renewal-due": "Renewal Due",
  renewed: "Renewed",
  expanded: "Expanded",
  "at-risk": "At Risk",
  churned: "Churned",
  paused: "Paused",
};
