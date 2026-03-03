// ═══════════════════════════════════════════════════════════════════════════
// Tier Configuration — single source of truth for plan restrictions
// ═══════════════════════════════════════════════════════════════════════════

export type Feature =
  | "generator"
  | "next-action"
  | "roi-calculator"
  | "cs-roi"
  | "portfolio"
  | "health-scores"
  | "accounts"
  | "playbooks-basic"
  | "playbooks-advanced"
  | "email-templates"
  | "qbr-generation"
  | "stakeholder-mapping"
  | "api-access"
  | "email-integration";

export type ExportFormat = "markdown" | "pdf" | "pptx";
export type Integration = "hubspot" | "salesforce" | "gmail" | "outlook";

export interface TierConfig {
  aiActionsPerSeat: number;
  maxSeats: number;
  features: Feature[];
  aiModel: string;
  maxTokens: number;
  reportTemplates: "all" | string[];
  integrations: Integration[];
  exportFormats: ExportFormat[];
}

export const TIER_CONFIG: Record<string, TierConfig> = {
  trial: {
    aiActionsPerSeat: 2000,
    maxSeats: 5,
    features: [
      "generator", "next-action", "roi-calculator", "cs-roi",
      "portfolio", "health-scores", "accounts",
      "playbooks-basic", "email-templates", "qbr-generation", "stakeholder-mapping",
    ],
    aiModel: "claude-sonnet-4-20250514",
    maxTokens: 2000,
    reportTemplates: "all",
    integrations: ["hubspot"],
    exportFormats: ["markdown", "pdf"],
  },
  starter: {
    aiActionsPerSeat: 500,
    maxSeats: 3,
    features: [
      "generator", "next-action", "roi-calculator", "cs-roi",
      "portfolio", "health-scores", "accounts",
    ],
    aiModel: "claude-haiku-4-5-20251001",
    maxTokens: 1000,
    reportTemplates: ["executive", "email"],
    integrations: ["hubspot"],
    exportFormats: ["markdown"],
  },
  growth: {
    aiActionsPerSeat: 1000,
    maxSeats: 10,
    features: [
      "generator", "next-action", "roi-calculator", "cs-roi",
      "portfolio", "health-scores", "accounts",
      "playbooks-basic", "email-templates", "email-integration",
    ],
    aiModel: "claude-sonnet-4-20250514",
    maxTokens: 2000,
    reportTemplates: "all",
    integrations: ["hubspot", "gmail", "outlook"],
    exportFormats: ["markdown", "pdf"],
  },
  scale: {
    aiActionsPerSeat: 2000,
    maxSeats: 50,
    features: [
      "generator", "next-action", "roi-calculator", "cs-roi",
      "portfolio", "health-scores", "accounts",
      "playbooks-basic", "playbooks-advanced", "email-templates",
      "qbr-generation", "stakeholder-mapping", "api-access", "email-integration",
    ],
    aiModel: "claude-sonnet-4-20250514",
    maxTokens: 4000,
    reportTemplates: "all",
    integrations: ["hubspot", "salesforce", "gmail", "outlook"],
    exportFormats: ["markdown", "pdf", "pptx"],
  },
};

// ── Plan display info ────────────────────────────────────────────────────
export const PLAN_LABELS: Record<string, string> = {
  trial: "Free Trial",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

export const PLAN_PRICES: Record<string, number> = {
  trial: 0,
  starter: 39,
  growth: 79,
  scale: 119,
};
