// ═══════════════════════════════════════════════════════════════════════════
// Shared constants for Proofpoint tools — benchmarks, prompts, formats
// ═══════════════════════════════════════════════════════════════════════════

// ── Benchmark metric shape ────────────────────────────────────────────────
export interface BenchmarkMetric {
  label: string;
  unit: string;
  direction: "lower_is_better" | "higher_is_better";
  industry: number;
  topQuartile: number;
  warning: number;
  source: string;
}

export interface IndustryBenchmark {
  label: string;
  icon: string;
  color: string;
  metrics: Record<string, BenchmarkMetric>;
}

// ── Industry benchmarks (2024–2026 sources) ───────────────────────────────
export const BENCHMARKS: Record<string, IndustryBenchmark> = {
  healthcare: {
    label: "Healthcare SaaS",
    icon: "\u{1F3E5}",
    color: "#06b6d4",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 5.0, topQuartile: 2.5, warning: 10.0, source: "ProProfs / Genesys Growth 2025" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 58, topQuartile: 75, warning: 35, source: "Recurly 2025 / Contentsquare" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 18, topQuartile: 8, warning: 35, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 104, topQuartile: 118, warning: 90, source: "ChartMogul 2024 / Optifai 2026" },
    },
  },
  fintech: {
    label: "Fintech SaaS",
    icon: "\u{1F4B3}",
    color: "#8b5cf6",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 12.0, topQuartile: 6.0, warning: 24.0, source: "WeAreFounders / Genesys 2025" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 62, topQuartile: 80, warning: 40, source: "Benchmarkit 2025" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 14, topQuartile: 6, warning: 28, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 108, topQuartile: 125, warning: 95, source: "Optifai 2026 / ChartMogul 2024" },
    },
  },
  hrtech: {
    label: "HR Tech SaaS",
    icon: "\u{1F465}",
    color: "#f59e0b",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 6.5, topQuartile: 3.0, warning: 12.0, source: "Genesys / HubiFi 2025" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 65, topQuartile: 82, warning: 40, source: "Benchmarkit 2025" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 12, topQuartile: 5, warning: 25, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 108, topQuartile: 122, warning: 92, source: "Benchmarkit 2025" },
    },
  },
  saas: {
    label: "General B2B SaaS",
    icon: "\u2601\uFE0F",
    color: "#10b981",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 4.9, topQuartile: 2.0, warning: 10.0, source: "Recurly 2025 / Vena Solutions" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 60, topQuartile: 80, warning: 30, source: "ProductLed 2025" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 15, topQuartile: 6, warning: 30, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 106, topQuartile: 120, warning: 90, source: "ChartMogul 2024 / ChurnZero 2025" },
    },
  },
  realestate: {
    label: "Real Estate Tech",
    icon: "\u{1F3E2}",
    color: "#ef4444",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 8.0, topQuartile: 3.5, warning: 15.0, source: "Growth-onomics 2025" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 55, topQuartile: 75, warning: 30, source: "ProductLed 2025" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 16, topQuartile: 7, warning: 30, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 102, topQuartile: 115, warning: 88, source: "ChartMogul 2024 / Optifai 2026" },
    },
  },
};

// ── Industry-specific system prompts for Claude ───────────────────────────
export const INDUSTRY_PROMPTS: Record<string, string> = {
  healthcare: "You are an expert healthcare technology Customer Success storyteller. Speak the language of healthcare executives: operational efficiency, patient outcomes, claim acceptance rates, days in AR, HIPAA risk reduction, staff burnout, and revenue cycle optimization. Turn \"time saved\" into \"clinical hours returned to patient care.\" Write in board-room-ready prose.",
  fintech: "You are an expert fintech Customer Success storyteller. Speak the language of fintech executives: transaction volume, basis points, compliance risk, fraud reduction, time-to-market, regulatory burden, and audit readiness. Write in precise, data-forward prose. Every claim should feel auditable.",
  hrtech: "You are an expert HR technology Customer Success storyteller. Speak the language of HR and People leaders: retention rates, time-to-hire, employee experience, compliance risk, and the cost of turnover. Balance business rigor with the human story.",
  saas: "You are an expert B2B SaaS Customer Success storyteller. Write executive-ready ROI reports that transform raw metrics into compelling business narratives. Make renewal justification effortless and memorable.",
  realestate: "You are an expert real estate technology Customer Success storyteller. Speak the language of real estate executives: transaction volume, agent productivity, days on market, conversion rates, and GCI impact. Write in direct, results-forward prose.",
};

// ── Report format templates ───────────────────────────────────────────────
export interface ReportFormat {
  label: string;
  icon: string;
  prompt: string;
}

export const REPORT_FORMATS: Record<string, ReportFormat> = {
  executive: {
    label: "Executive Summary",
    icon: "\u{1F4CB}",
    prompt: "Generate a concise executive ROI summary. Use these exact section headers with ## markdown:\n## Executive Summary\n## Value Delivered\n## How You Compare to Industry\n## Strategic Progress\n## Recommended Next Steps\n\nIn \"How You Compare to Industry\", reference specific benchmark comparisons with source citations. Keep each section tight \u2014 read time under 3 minutes.",
  },
  qbr: {
    label: "QBR Narrative",
    icon: "\u{1F4CA}",
    prompt: "Generate a comprehensive Quarterly Business Review narrative. Use these headers:\n## Quarter in Review\n## Business Impact & ROI\n## Industry Peer Comparison\n## Adoption & Engagement\n## Challenges & Solutions\n## Goals Progress\n## Next Quarter Priorities\n## Partnership Recommendations\n\nUse benchmark comparisons with source citations. This is a 45-minute meeting narrative.",
  },
  email: {
    label: "Follow-up Email",
    icon: "\u2709\uFE0F",
    prompt: "Generate a professional follow-up email from a CSM to their primary contact. Format:\n\nSubject: [compelling subject line]\n\n[Email body \u2014 warm, specific, under 220 words]\n\nInclude ONE benchmark comparison with source. Lead naturally into renewal conversation. No markdown headers \u2014 plain paragraphs only.",
  },
};

// ── Benchmark scoring ─────────────────────────────────────────────────────
export type TierKey = "top" | "good" | "average" | "risk";

export interface TierInfo {
  label: string;
  color: string;
  phrase: string;
}

export const TIER_LABELS: Record<TierKey, TierInfo> = {
  top: { label: "Top Quartile", color: "#10b981", phrase: "places them in the top quartile" },
  good: { label: "Above Average", color: "#6ee7b7", phrase: "puts them above the industry average" },
  average: { label: "Average", color: "#f59e0b", phrase: "falls within the average range" },
  risk: { label: "Below Average", color: "#ef4444", phrase: "falls below industry expectations" },
};

export function scoreTier(value: string | number, metric: BenchmarkMetric): TierKey | null {
  const num = parseFloat(String(value));
  if (isNaN(num) || String(value) === "") return null;
  const { industry, topQuartile, warning, direction } = metric;
  if (direction === "higher_is_better") {
    if (num >= topQuartile) return "top";
    if (num >= industry) return "good";
    if (num >= warning) return "average";
    return "risk";
  } else {
    if (num <= topQuartile) return "top";
    if (num <= industry) return "good";
    if (num <= warning) return "average";
    return "risk";
  }
}

export function buildBenchmarkContext(industry: string, formData: Record<string, string>): string {
  const ind = BENCHMARKS[industry];
  if (!ind) return "";
  const lines = [`INDUSTRY BENCHMARK COMPARISONS FOR ${ind.label.toUpperCase()}:`, "(Weave these into the report with source citations)\n"];
  const fieldMap: Record<string, string> = {
    annualChurn: formData.annualChurn,
    adoptionRate: formData.adoptionRate,
    supportTickets: formData.supportTickets,
    nrr: formData.nrr,
  };
  Object.entries(ind.metrics).forEach(([key, metric]) => {
    const val = fieldMap[key];
    if (!val || val === "") return;
    const num = parseFloat(val);
    const tier = scoreTier(val, metric);
    if (!tier) return;
    const tierInfo = TIER_LABELS[tier];
    const comparison =
      metric.direction === "higher_is_better"
        ? num >= metric.industry
          ? `${(num - metric.industry).toFixed(1)}${metric.unit} above`
          : `${(metric.industry - num).toFixed(1)}${metric.unit} below`
        : num <= metric.industry
          ? `${(metric.industry - num).toFixed(1)}${metric.unit} better than`
          : `${(num - metric.industry).toFixed(1)}${metric.unit} worse than`;
    lines.push(`\u2022 ${metric.label}: Customer at ${val}${metric.unit} \u2014 ${tierInfo.label.toUpperCase()}`);
    lines.push(`  Industry avg: ${metric.industry}${metric.unit} | Top quartile: ${metric.topQuartile}${metric.unit}`);
    lines.push(`  This ${tierInfo.phrase}. They are ${comparison} the ${ind.label} average.`);
    lines.push(`  SOURCE: "${metric.source}"\n`);
  });
  lines.push("INSTRUCTIONS: Reference benchmarks in prose (not tables). Include source in parentheses. Lead with strongest comparison. Frame below-average constructively.");
  return lines.join("\n");
}
