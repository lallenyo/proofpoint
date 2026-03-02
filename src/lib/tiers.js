// ═══════════════════════════════════════════════════════════════════════════
// PROOFPOINT — Tier Configuration (Single Source of Truth)
// ═══════════════════════════════════════════════════════════════════════════
// Every file that needs tier info imports from here. Never hardcode tier
// limits, pricing, or feature flags elsewhere.

export const TIERS = {
  trial: {
    id: "trial",
    name: "Free Trial",
    tagline: "Full Scale-tier access for 30 days",
    pricing: { monthly: 0, annual: 0 },
    minSeats: 1,
    maxSeats: 25,
    maxClientAccounts: null,
    actionsPerSeat: 2000,
    models: {
      simple: "claude-haiku-4-5-20251001",
      moderate: "claude-sonnet-4-20250514",
      complex: "claude-sonnet-4-20250514",
    },
    features: {
      custom_dashboard: true,
      health_score_basic: true,
      health_score_advanced: true,
      playbook_templates_basic: true,
      playbook_templates_advanced: true,
      email_templates_basic: true,
      email_templates_advanced: true,
      meeting_intelligence: true,
      nps_csat: true,
      qbr_decks: true,
      stakeholder_mapping: true,
      roi_calculator: true,
      renewal_pipeline: true,
      ai_agents: true,
      coaching_analytics: true,
      integrations_basic: true,
      integrations_advanced: true,
      api_access: true,
      churn_prediction: true,
      success_plans: true,
      activity_timeline: true,
      lifecycle_tracker: true,
      team_performance: true,
      revenue_dashboard: true,
      anomaly_alerts: true,
      customer_360: true,
      admin_panel: true,
      report_generator: true,
      next_action: true,
    },
    support: "priority_chat",
  },

  starter: {
    id: "starter",
    name: "Starter",
    tagline: "For individual CSMs",
    pricing: { monthly: 39, annual: 33 },
    minSeats: 1,
    maxSeats: 5,
    maxClientAccounts: 100,
    actionsPerSeat: 500,
    models: {
      simple: "claude-haiku-4-5-20251001",
      moderate: "claude-haiku-4-5-20251001",
      complex: "claude-haiku-4-5-20251001",
    },
    features: {
      custom_dashboard: true,
      health_score_basic: true,
      health_score_advanced: false,
      playbook_templates_basic: true,
      playbook_templates_advanced: false,
      email_templates_basic: true,
      email_templates_advanced: false,
      meeting_intelligence: false,
      nps_csat: false,
      qbr_decks: false,
      stakeholder_mapping: false,
      roi_calculator: true,
      renewal_pipeline: true,
      ai_agents: false,
      coaching_analytics: false,
      integrations_basic: true,
      integrations_advanced: false,
      api_access: false,
      churn_prediction: false,
      success_plans: false,
      activity_timeline: true,
      lifecycle_tracker: true,
      team_performance: false,
      revenue_dashboard: false,
      anomaly_alerts: false,
      customer_360: false,
      admin_panel: true,
      report_generator: true,
      next_action: true,
    },
    support: "email",
  },

  growth: {
    id: "growth",
    name: "Growth",
    tagline: "For growing CS teams",
    popular: true,
    pricing: { monthly: 79, annual: 67 },
    minSeats: 5,
    maxSeats: 15,
    maxClientAccounts: 300,
    actionsPerSeat: 1000,
    models: {
      simple: "claude-haiku-4-5-20251001",
      moderate: "claude-sonnet-4-20250514",
      complex: "claude-sonnet-4-20250514",
    },
    features: {
      custom_dashboard: true,
      health_score_basic: true,
      health_score_advanced: true,
      playbook_templates_basic: true,
      playbook_templates_advanced: true,
      email_templates_basic: true,
      email_templates_advanced: true,
      meeting_intelligence: true,
      nps_csat: true,
      qbr_decks: true,
      stakeholder_mapping: true,
      roi_calculator: true,
      renewal_pipeline: true,
      ai_agents: false,
      coaching_analytics: true,
      integrations_basic: true,
      integrations_advanced: true,
      api_access: false,
      churn_prediction: true,
      success_plans: true,
      activity_timeline: true,
      lifecycle_tracker: true,
      team_performance: true,
      revenue_dashboard: true,
      anomaly_alerts: true,
      customer_360: true,
      admin_panel: true,
      report_generator: true,
      next_action: true,
    },
    support: "priority_chat",
  },

  scale: {
    id: "scale",
    name: "Scale",
    tagline: "For enterprise CS organizations",
    pricing: { monthly: 119, annual: 99 },
    minSeats: 10,
    maxSeats: null,
    maxClientAccounts: null,
    actionsPerSeat: 2000,
    models: {
      simple: "claude-haiku-4-5-20251001",
      moderate: "claude-sonnet-4-20250514",
      complex: "claude-sonnet-4-20250514",
    },
    features: {
      custom_dashboard: true,
      health_score_basic: true,
      health_score_advanced: true,
      playbook_templates_basic: true,
      playbook_templates_advanced: true,
      email_templates_basic: true,
      email_templates_advanced: true,
      meeting_intelligence: true,
      nps_csat: true,
      qbr_decks: true,
      stakeholder_mapping: true,
      roi_calculator: true,
      renewal_pipeline: true,
      ai_agents: true,
      coaching_analytics: true,
      integrations_basic: true,
      integrations_advanced: true,
      api_access: true,
      churn_prediction: true,
      success_plans: true,
      activity_timeline: true,
      lifecycle_tracker: true,
      team_performance: true,
      revenue_dashboard: true,
      anomaly_alerts: true,
      customer_360: true,
      admin_panel: true,
      report_generator: true,
      next_action: true,
    },
    support: "dedicated_csm",
  },
};

// Maps nav panel IDs to the feature key required to access them
export const PANEL_FEATURE_MAP = {
  "custom-dash": "custom_dashboard",
  "dashboard": null,
  "health-score": "health_score_basic",
  "playbooks": "playbook_templates_basic",
  "meetings": "meeting_intelligence",
  "surveys": "nps_csat",
  "stakeholders": "stakeholder_mapping",
  "qbr-deck": "qbr_decks",
  "email-center": "email_templates_basic",
  "generator": "report_generator",
  "next-action": "next_action",
  "roi-calc": "roi_calculator",
  "crm-hub": "integrations_advanced",
  "churn-ai": "churn_prediction",
  "success-plans": "success_plans",
  "activity-timeline": "activity_timeline",
  "renewal-pipeline": "renewal_pipeline",
  "lifecycle": "lifecycle_tracker",
  "team-perf": "team_performance",
  "revenue": "revenue_dashboard",
  "anomaly-alerts": "anomaly_alerts",
  "customer-360": "customer_360",
  "admin": "admin_panel",
  "billing": null,
};

// Maps action_type strings to complexity levels
export const TASK_COMPLEXITY = {
  client_lookup: "simple",
  email_draft: "simple",
  quick_summary: "simple",
  note_generation: "simple",
  onboarding_chat: "simple",
  health_score: "moderate",
  meeting_prep: "moderate",
  meeting_analysis: "moderate",
  churn_analysis: "moderate",
  playbook_step: "moderate",
  stakeholder_analysis: "moderate",
  nps_analysis: "moderate",
  survey_analysis: "moderate",
  next_action: "moderate",
  roi_report: "moderate",
  report_generation: "complex",
  qbr_report: "complex",
  onboarding_playbook: "complex",
  predictive_churn: "complex",
  coaching_recommendation: "complex",
  autonomous_agent: "complex",
  revenue_forecast: "complex",
};

// ─── Helper Functions ───────────────────────────────────────────────────

export function getTierConfig(tierId) {
  return TIERS[tierId] || TIERS.trial;
}

export function hasFeature(tierId, featureKey) {
  if (!featureKey) return true;
  const tier = getTierConfig(tierId);
  return tier.features[featureKey] === true;
}

export function getTaskComplexity(actionType) {
  return TASK_COMPLEXITY[actionType] || "moderate";
}

export function getModelForTask(tierId, actionType) {
  const tier = getTierConfig(tierId);
  const complexity = getTaskComplexity(actionType);
  return tier.models[complexity];
}

export function getMonthlyActionLimit(tierId, seatCount = 1) {
  const tier = getTierConfig(tierId);
  return tier.actionsPerSeat * seatCount;
}

// Find the minimum paid tier that has a given feature
export function getRequiredTier(featureKey) {
  const paidTiers = ["starter", "growth", "scale"];
  for (const id of paidTiers) {
    if (TIERS[id].features[featureKey]) return TIERS[id];
  }
  return TIERS.scale;
}

// Display-friendly feature labels for the comparison table
export const FEATURE_DISPLAY = [
  { key: "health_score_basic", label: "Health Scoring", starter: "Basic", growth: "Advanced", scale: "Predictive AI" },
  { key: "custom_dashboard", label: "Dashboard Widgets", starter: "3 widgets", growth: "9 widgets", scale: "Unlimited" },
  { key: "playbook_templates_basic", label: "Playbook Templates", starter: "3 templates", growth: "6+ templates", scale: "Custom builder" },
  { key: "email_templates_basic", label: "Email Templates", starter: "3 templates", growth: "All 8", scale: "All + custom" },
  { key: "meeting_intelligence", label: "Meeting Intelligence", starter: false, growth: "Full", scale: "Full + coaching" },
  { key: "nps_csat", label: "NPS / CSAT Surveys", starter: false, growth: "Multi-language", scale: "Full VoC" },
  { key: "qbr_decks", label: "QBR Deck Generation", starter: false, growth: true, scale: true },
  { key: "stakeholder_mapping", label: "Stakeholder Mapping", starter: false, growth: "Visual", scale: "AI sentiment" },
  { key: "roi_calculator", label: "ROI Calculator", starter: "Basic", growth: "Full", scale: "Full" },
  { key: "renewal_pipeline", label: "Renewal Pipeline", starter: true, growth: true, scale: true },
  { key: "churn_prediction", label: "Churn Prediction AI", starter: false, growth: true, scale: true },
  { key: "success_plans", label: "Success Plans", starter: false, growth: true, scale: true },
  { key: "team_performance", label: "Team Performance", starter: false, growth: true, scale: true },
  { key: "revenue_dashboard", label: "Revenue Dashboard", starter: false, growth: true, scale: true },
  { key: "anomaly_alerts", label: "Smart Alerts", starter: false, growth: true, scale: true },
  { key: "customer_360", label: "Customer 360", starter: false, growth: true, scale: true },
  { key: "integrations_advanced", label: "CRM Integrations", starter: "CSV import", growth: "Unlimited", scale: "Unlimited + API" },
  { key: "ai_agents", label: "AI Agents", starter: false, growth: false, scale: true },
  { key: "api_access", label: "API Access", starter: false, growth: false, scale: true },
];
