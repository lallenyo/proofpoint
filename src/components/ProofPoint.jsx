"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { TierProvider, useTier } from "./TierContext";
import FeatureGate from "./FeatureGate";
import UsageMeter from "./UsageMeter";
import TrialBanner from "./TrialBanner";
import BillingSettings from "./BillingSettings";
import { PANEL_FEATURE_MAP } from "@/lib/tiers";

// ═══════════════════════════════════════════════════════════════════════════
// PROOFPOINT — Unified Customer Success Platform (Single-Frame App)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Design Tokens ───────────────────────────────────────────────────────
const T = {
  green: "#10b981", greenDim: "#064e3b", greenLight: "#34d399",
  bg: "#050b18", surface: "#0a1628", surface2: "#0f172a", surface3: "#131d33",
  border: "#1e293b", borderLight: "#273548",
  text: "#f1f5f9", muted: "#64748b", subtle: "#94a3b8",
  error: "#ef4444", warning: "#f59e0b", info: "#06b6d4",
  accent: "#10b981", purple: "#8b5cf6",
  amber: "#f59e0b", amberDim: "#78350f",
};

// ─── Account Status Configuration ────────────────────────────────────────
// Based on standard B2B SaaS Customer Success lifecycle terminology
// (Gainsight, ChurnZero, Planhat, Vitally conventions)
const ACCOUNT_STATUSES = {
  onboarding:    { label: "Onboarding",     color: "#06b6d4", bg: "rgba(6,182,212,0.10)",  icon: "🚀", description: "New account, implementation in progress" },
  active:        { label: "Active",         color: "#10b981", bg: "rgba(16,185,129,0.10)", icon: "✦",  description: "Healthy and engaged" },
  "renewal-due": { label: "Renewal Due",    color: "#f59e0b", bg: "rgba(245,158,11,0.10)", icon: "⏳", description: "Approaching renewal window" },
  renewed:       { label: "Renewed",        color: "#10b981", bg: "rgba(16,185,129,0.10)", icon: "✓",  description: "Successfully renewed contract" },
  expanded:      { label: "Expanded",       color: "#8b5cf6", bg: "rgba(139,92,246,0.10)", icon: "▲",  description: "Upsell or cross-sell completed" },
  "at-risk":     { label: "At Risk",        color: "#ef4444", bg: "rgba(239,68,68,0.10)",  icon: "⚠",  description: "Churn signals detected" },
  churned:       { label: "Churned",        color: "#6b7280", bg: "rgba(107,114,128,0.10)",icon: "✕",  description: "Account lost" },
  paused:        { label: "Paused",         color: "#94a3b8", bg: "rgba(148,163,184,0.10)",icon: "⏸",  description: "Temporarily inactive" },
};

// ─── Team Members (demo) ─────────────────────────────────────────────────
const TEAM_MEMBERS = [
  { id: "sr", name: "Sarah R.", initials: "SR", role: "Senior CSM", color: T.green },
  { id: "mk", name: "Marcus K.", initials: "MK", role: "CSM", color: T.info },
  { id: "jl", name: "Jamie L.", initials: "JL", role: "CSM", color: T.warning },
  { id: "ap", name: "Alex P.", initials: "AP", role: "CS Manager", color: T.purple },
  { id: "unassigned", name: "Unassigned", initials: "—", role: "", color: T.muted },
];

// ─── Benchmark Data ──────────────────────────────────────────────────────
const BENCHMARKS = {
  healthcare: {
    label: "Healthcare SaaS", icon: "🏥", color: "#06b6d4",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 5.0, topQuartile: 2.5, warning: 10.0, source: "ProProfs / Genesys Growth 2025" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 58, topQuartile: 75, warning: 35, source: "Recurly 2025 / Contentsquare" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 18, topQuartile: 8, warning: 35, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 104, topQuartile: 118, warning: 90, source: "ChartMogul 2024 / Optifai 2026" },
    },
  },
  fintech: {
    label: "Fintech SaaS", icon: "💳", color: "#8b5cf6",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 12.0, topQuartile: 6.0, warning: 24.0, source: "WeAreFounders / Genesys 2025" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 62, topQuartile: 80, warning: 40, source: "Benchmarkit 2025" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 14, topQuartile: 6, warning: 28, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 108, topQuartile: 125, warning: 95, source: "Optifai 2026 / ChartMogul 2024" },
    },
  },
  hrtech: {
    label: "HR Tech SaaS", icon: "👥", color: "#f59e0b",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 6.5, topQuartile: 3.0, warning: 12.0, source: "Genesys / HubiFi 2025" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 65, topQuartile: 82, warning: 40, source: "Benchmarkit 2025" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 12, topQuartile: 5, warning: 25, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 108, topQuartile: 122, warning: 92, source: "Benchmarkit 2025" },
    },
  },
  saas: {
    label: "General B2B SaaS", icon: "☁️", color: "#10b981",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 4.9, topQuartile: 2.0, warning: 10.0, source: "Recurly 2025 / Vena Solutions" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 60, topQuartile: 80, warning: 30, source: "ProductLed 2025" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 15, topQuartile: 6, warning: 30, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 106, topQuartile: 120, warning: 90, source: "ChartMogul 2024 / ChurnZero 2025" },
    },
  },
  realestate: {
    label: "Real Estate Tech", icon: "🏢", color: "#ef4444",
    metrics: {
      annualChurn: { label: "Annual Churn Rate", unit: "%", direction: "lower_is_better", industry: 8.0, topQuartile: 3.5, warning: 15.0, source: "Growth-onomics 2025" },
      adoptionRate: { label: "User Adoption Rate", unit: "%", direction: "higher_is_better", industry: 55, topQuartile: 75, warning: 30, source: "ProductLed 2025" },
      supportTickets: { label: "Support Tickets / 90d", unit: "", direction: "lower_is_better", industry: 16, topQuartile: 7, warning: 30, source: "TSIA 2025" },
      nrr: { label: "Net Revenue Retention", unit: "%", direction: "higher_is_better", industry: 102, topQuartile: 115, warning: 88, source: "ChartMogul 2024 / Optifai 2026" },
    },
  },
};

const INDUSTRY_PROMPTS = {
  healthcare: `You are an expert healthcare technology Customer Success storyteller. Speak the language of healthcare executives: operational efficiency, patient outcomes, claim acceptance rates, days in AR, HIPAA risk reduction, staff burnout, and revenue cycle optimization. Turn "time saved" into "clinical hours returned to patient care." Write in board-room-ready prose.`,
  fintech: `You are an expert fintech Customer Success storyteller. Speak the language of fintech executives: transaction volume, basis points, compliance risk, fraud reduction, time-to-market, regulatory burden, and audit readiness. Write in precise, data-forward prose. Every claim should feel auditable.`,
  hrtech: `You are an expert HR technology Customer Success storyteller. Speak the language of HR and People leaders: retention rates, time-to-hire, employee experience, compliance risk, and the cost of turnover. Balance business rigor with the human story.`,
  saas: `You are an expert B2B SaaS Customer Success storyteller. Write executive-ready ROI reports that transform raw metrics into compelling business narratives. Make renewal justification effortless and memorable.`,
  realestate: `You are an expert real estate technology Customer Success storyteller. Speak the language of real estate executives: transaction volume, agent productivity, days on market, conversion rates, and GCI impact. Write in direct, results-forward prose.`,
};

const FORMAT_PROMPTS = {
  executive: { label: "Executive Summary", icon: "📋", prompt: `Generate a concise executive ROI summary. Use these exact section headers with ## markdown:\n## Executive Summary\n## Value Delivered\n## How You Compare to Industry\n## Strategic Progress\n## Recommended Next Steps\n\nIn "How You Compare to Industry", reference specific benchmark comparisons with source citations. Keep each section tight — read time under 3 minutes.` },
  qbr: { label: "QBR Narrative", icon: "📊", prompt: `Generate a comprehensive Quarterly Business Review narrative. Use these headers:\n## Quarter in Review\n## Business Impact & ROI\n## Industry Peer Comparison\n## Adoption & Engagement\n## Challenges & Solutions\n## Goals Progress\n## Next Quarter Priorities\n## Partnership Recommendations\n\nUse benchmark comparisons with source citations. This is a 45-minute meeting narrative.` },
  email: { label: "Follow-up Email", icon: "✉️", prompt: `Generate a professional follow-up email from a CSM to their primary contact. Format:\n\nSubject: [compelling subject line]\n\n[Email body — warm, specific, under 220 words]\n\nInclude ONE benchmark comparison with source. Lead naturally into renewal conversation. No markdown headers — plain paragraphs only.` },
};

// ─── Utilities ──────────────────────────────────────────────────────────
const hexToRgb = (hex) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)].join(",");

function scoreTier(value, metric) {
  const num = parseFloat(value);
  if (isNaN(num) || value === "") return null;
  const { industry, topQuartile, warning, direction } = metric;
  if (direction === "higher_is_better") { if (num >= topQuartile) return "top"; if (num >= industry) return "good"; if (num >= warning) return "average"; return "risk"; }
  else { if (num <= topQuartile) return "top"; if (num <= industry) return "good"; if (num <= warning) return "average"; return "risk"; }
}

const TIER_LABELS = {
  top: { label: "Top Quartile", color: "#10b981", phrase: "places them in the top quartile" },
  good: { label: "Above Average", color: "#06b6d4", phrase: "is above the industry average" },
  average: { label: "Industry Average", color: "#f59e0b", phrase: "is at the industry average" },
  risk: { label: "Below Average", color: "#ef4444", phrase: "is below the industry average — an area to address" },
};

function buildBenchmarkContext(industry, formData) {
  const ind = BENCHMARKS[industry];
  const lines = [`INDUSTRY BENCHMARK COMPARISONS FOR ${ind.label.toUpperCase()}:`, `(Weave these into the report with source citations)\n`];
  const fieldMap = { annualChurn: formData.annualChurn, adoptionRate: formData.adoptionRate, supportTickets: formData.supportTickets, nrr: formData.nrr };
  Object.entries(ind.metrics).forEach(([key, metric]) => {
    const val = fieldMap[key];
    if (!val || val === "") return;
    const num = parseFloat(val);
    const tier = scoreTier(val, metric);
    const tierInfo = TIER_LABELS[tier];
    const comparison = metric.direction === "higher_is_better"
      ? num >= metric.industry ? `${(num - metric.industry).toFixed(1)}${metric.unit} above` : `${(metric.industry - num).toFixed(1)}${metric.unit} below`
      : num <= metric.industry ? `${(metric.industry - num).toFixed(1)}${metric.unit} better than` : `${(num - metric.industry).toFixed(1)}${metric.unit} worse than`;
    lines.push(`• ${metric.label}: Customer at ${val}${metric.unit} — ${tierInfo.label.toUpperCase()}`);
    lines.push(`  Industry avg: ${metric.industry}${metric.unit} | Top quartile: ${metric.topQuartile}${metric.unit}`);
    lines.push(`  This ${tierInfo.phrase}. They are ${comparison} the ${ind.label} average.`);
    lines.push(`  SOURCE: "${metric.source}"\n`);
  });
  lines.push(`INSTRUCTIONS: Reference benchmarks in prose (not tables). Include source in parentheses. Lead with strongest comparison. Frame below-average constructively.`);
  return lines.join("\n");
}

function renderMarkdown(text) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h3 key={i} style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.green, fontWeight: 700, margin: "22px 0 8px", borderBottom: `1px solid ${T.border}`, paddingBottom: 6 }}>{line.replace("## ", "")}</h3>;
    if (line.startsWith("Subject:")) return <div key={i} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}><span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", fontWeight: 600 }}>Subject: </span><span style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{line.replace("Subject: ", "")}</span></div>;
    if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
    const parts = line.split(/(\([^)]*\d{4}[^)]*\))/g);
    return <p key={i} style={{ fontSize: 13.5, color: "#cbd5e1", lineHeight: 1.8, margin: "0 0 2px" }}>{parts.map((part, j) => /\([^)]*\d{4}[^)]*\)/.test(part) ? <span key={j} style={{ color: T.green, fontWeight: 600, fontSize: 11.5 }}>{part}</span> : part)}</p>;
  });
}

async function callClaude(system, userMessage, maxTokens = 1500, { action_type = "general", tier = null } = {}) {
  // Routes through Next.js API endpoint — never expose API key client-side
  // Server determines the model based on tier + action_type
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system, messages: [{ role: "user", content: userMessage }], action_type, tier }),
  });
  const data = await response.json();
  return data.content?.map(b => b.text || "").join("") || "";
}

// ─── Shared Components ──────────────────────────────────────────────────
const inputStyle = { width: "100%", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 13px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#e2e8f0", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 };

function Field({ label, name, value, onChange, type = "text", placeholder, span = 1, labelColor }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={{ ...labelStyle, color: labelColor || T.muted }}>{label}</label>
      {type === "textarea"
        ? <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        : <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} style={inputStyle} />
      }
    </div>
  );
}

function BenchmarkScorecard({ industry, formData }) {
  const ind = BENCHMARKS[industry];
  const fieldMap = { annualChurn: formData.annualChurn, adoptionRate: formData.adoptionRate, supportTickets: formData.supportTickets, nrr: formData.nrr };
  const entries = Object.entries(ind.metrics).filter(([k]) => fieldMap[k] && fieldMap[k] !== "");
  if (entries.length === 0) return null;
  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{ind.icon} Benchmark Snapshot — {ind.label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        {entries.map(([key, metric]) => {
          const val = fieldMap[key]; const tier = scoreTier(val, metric); const tc = tier ? TIER_LABELS[tier] : null;
          return (
            <div key={key} style={{ background: T.bg, borderRadius: 8, padding: "9px 11px", border: `1px solid ${tc ? tc.color + "33" : T.border}` }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>{metric.label}</div>
              <div style={{ fontSize: 17, fontFamily: "'Playfair Display', serif", color: tc?.color || T.text, fontWeight: 700 }}>{val}{metric.unit}</div>
              {tc && <div style={{ fontSize: 9, color: tc.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{tc.label}</div>}
              <div style={{ fontSize: 9, color: "#334155", marginTop: 2 }}>Avg: {metric.industry}{metric.unit}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Slide Deck Prompt Generator ─────────────────────────────────────────
function buildDeckPrompt({ type, companyName, industry, reportContent, metrics }) {
  const industryLabel = BENCHMARKS[industry]?.label || "B2B SaaS";
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (type === "client-report") {
    const metricLines = metrics?.filter(m => m.value)
      .map(m => `  - ${m.label}: ${m.value}`)
      .join("\n") || "  (see report content below)";

    return `Create a professional slide deck presentation for ${companyName} based on the ROI report below.

BRANDING REQUIREMENTS:
- Look up ${companyName}'s logo and brand identity online
- Match their primary and secondary brand colors throughout the deck
- Use their logo on the title slide and footer of every slide
- If you cannot find their brand, use a clean dark navy + accent green (#10b981) palette
- Typography: use a modern sans-serif like Inter, DM Sans, or the closest match to their brand font

SLIDE STRUCTURE (8-10 slides):
1. TITLE SLIDE — "${companyName} — Partnership Impact Report" with the date ${today}, their logo, and a subtitle: "Prepared by [Your Company]"
2. EXECUTIVE SUMMARY — 3-4 bullet points capturing the top-line value delivered. Lead with the single most impressive metric.
3. KEY METRICS DASHBOARD — Display these figures as a visual dashboard with large numbers, icons, and comparison indicators:
${metricLines}
4. INDUSTRY BENCHMARKS — Show how ${companyName} compares to ${industryLabel} averages. Use a horizontal bar chart or comparison visual. Cite the benchmark sources in small text.
5. VALUE DELIVERED — A narrative slide expanding on the specific business outcomes achieved. Use 2-3 short paragraphs, not bullets.
6. BEFORE & AFTER — A two-column comparison showing the state before the partnership vs. current performance. Use contrasting colors (red/muted for before, green/bold for after).
7. STRATEGIC PROGRESS — Timeline or milestone visual showing what was accomplished and what's ahead.
8. WHAT'S NEXT — Forward-looking recommendations for the next quarter. Frame as mutual opportunities, not asks.
9. THE BOTTOM LINE — Single-slide summary: one bold statement of ROI, one key figure, one forward commitment.
10. THANK YOU / CONTACT — Clean closing slide with contact information and next steps.

DESIGN PRINCIPLES:
- Maximum 20 words per bullet point — executives scan, they don't read
- Every data point gets a visual: chart, icon, or large formatted number
- Use ${companyName}'s brand colors for positive metrics, muted grays for industry averages
- White space is mandatory — no crowded slides
- Include source citations for all benchmark data in 8pt footer text

REPORT CONTENT TO BASE THE DECK ON:
---
${reportContent}
---

Generate the complete slide deck with all content filled in. Do not use placeholder text.`;
  }

  // CS ROI Calculator version
  return `Create a professional internal slide deck presenting our Customer Success program's ROI to the executive team / board.

BRANDING REQUIREMENTS:
- Use our company branding — clean and modern
- Primary palette: dark navy (#0f172a), emerald green (#10b981), white
- If I provide a company name or logo, match that branding instead
- Typography: modern sans-serif (Inter, DM Sans, or similar)

SLIDE STRUCTURE (8-10 slides):
1. TITLE SLIDE — "Customer Success Program — ROI & Impact Report" with date ${today}
2. PROGRAM OVERVIEW — Team size, portfolio size, and investment summary as a clean visual.
3. THE ROI HEADLINE — One massive number showing the ROI multiple, centered on the slide with a brief supporting sentence.
${metrics?.filter(m => m.value).map(m => `4. ${m.label.toUpperCase()} — Large formatted number: ${m.value}. Include a brief insight beneath.`).join("\n") || "4-6. KEY METRICS — One slide per major metric with large visuals."}
7. REVENUE PROTECTION — Visual showing total ARR protected and expansion revenue driven by CS. Use a waterfall or stacked bar chart.
8. EFFICIENCY METRICS — Customers per CSM, cost per $1 retained, and how these compare to industry benchmarks. Use comparison bars.
9. STRATEGIC RECOMMENDATIONS — 3-4 forward-looking investments or changes to amplify CS program impact.
10. BOARD-LEVEL SUMMARY — One slide that a CEO could present in 60 seconds: investment, return, multiplier, recommendation.

DESIGN PRINCIPLES:
- Board audiences need charts, not bullets — visualize every metric
- Maximum 15 words per bullet, maximum 4 bullets per slide
- Use green for positive/growth metrics, amber for watch items, red for risk
- Every claim backed by a number — no vague statements
- Generous white space — these slides will be projected on large screens

REPORT CONTENT TO BASE THE DECK ON:
---
${reportContent}
---

Generate the complete slide deck with all content filled in. Do not use placeholder text.`;
}

function DeckPromptBox({ type, companyName, industry, reportContent, metrics }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = buildDeckPrompt({ type, companyName, industry, reportContent, metrics });

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ marginTop: 14, background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: 12, overflow: "hidden", transition: "all 0.2s ease" }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🎨</div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Generate Slide Deck</div>
            <div style={{ fontSize: 11, color: "#7c6faa" }}>Copy a ready-made prompt for Copilot, Genspark, Gamma, or any AI deck tool</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!expanded && <span onClick={handleCopy} style={{ fontSize: 11, fontWeight: 600, color: copied ? T.green : "#8b5cf6", background: copied ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.1)", padding: "5px 12px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>{copied ? "✓ Copied!" : "Quick Copy"}</span>}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6faa" strokeWidth="2" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </button>
      {expanded && (
        <div style={{ padding: "0 16px 16px", animation: "panelIn 0.2s ease" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {[
              { name: "Microsoft Copilot", icon: "🟦", tip: "Paste into Copilot → Create a presentation" },
              { name: "Gamma", icon: "🟪", tip: "Paste into Gamma → Generate" },
              { name: "Genspark", icon: "⚡", tip: "Paste into Genspark Slides" },
              { name: "ChatGPT", icon: "🟩", tip: "Ask GPT to build a slide outline" },
              { name: "Google Slides + Gemini", icon: "🔵", tip: "Use Gemini to help build in Slides" },
            ].map(tool => (
              <span key={tool.name} title={tool.tip} style={{ fontSize: 10, color: "#7c6faa", background: "rgba(139,92,246,0.08)", padding: "3px 9px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 4, cursor: "default" }}>
                <span style={{ fontSize: 11 }}>{tool.icon}</span> {tool.name}
              </span>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <pre style={{
              background: "#0a0f1e", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 10,
              padding: "16px 18px", fontSize: 11.5, color: "#a5b4cc", lineHeight: 1.65,
              whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 320, overflowY: "auto",
              fontFamily: "'DM Mono', 'Fira Code', monospace",
            }}>{prompt}</pre>
            <button onClick={handleCopy} style={{
              position: "sticky", bottom: 10, left: "100%", transform: "translateX(-100%)", float: "right",
              background: copied ? T.green : "#8b5cf6", color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              marginTop: 8,
            }}>{copied ? "✓ Prompt Copied!" : "📋 Copy Full Prompt"}</button>
          </div>
          <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(139,92,246,0.06)", borderRadius: 8 }}>
            <p style={{ fontSize: 11, color: "#7c6faa", lineHeight: 1.6 }}>
              <strong style={{ color: "#a78bfa" }}>How to use:</strong> Copy this prompt and paste it directly into any AI presentation tool. The prompt tells the AI to look up <strong style={{ color: "#e2e8f0" }}>{companyName || "the company"}'s</strong> logo and brand colors automatically, then build a complete deck with your data pre-filled. Works best with Gamma, Microsoft Copilot, and Genspark.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feature Explainer (dismissable + restorable) ────────────────────────
function FeatureExplainer({ icon, title, color, bullets, workflow, outputLabel, outputItems, audienceLabel, audience }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return (
    <button onClick={() => setDismissed(false)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `rgba(${hexToRgb(color)},0.04)`, border: `1px solid rgba(${hexToRgb(color)},0.12)`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 18, transition: "all 0.15s" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span style={{ fontSize: 12, color: color, fontWeight: 500 }}>How does {title} work?</span>
    </button>
  );
  return (
    <div style={{ background: `rgba(${hexToRgb(color)},0.03)`, border: `1px solid rgba(${hexToRgb(color)},0.14)`, borderRadius: 14, marginBottom: 22, overflow: "hidden", animation: "panelIn 0.3s ease" }}>
      <div style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `rgba(${hexToRgb(color)},0.12)`, border: `1px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon}</div>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.text, fontWeight: 700 }}>{title}</h3>
            </div>
          </div>
          <button onClick={() => setDismissed(true)} title="Hide — click the help button to bring this back" style={{ background: "none", border: `1px solid rgba(${hexToRgb(color)},0.15)`, borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
              <span style={{ color, fontSize: 9, marginTop: 4, flexShrink: 0 }}>●</span>
              <span style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.55 }}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div style={{ background: `rgba(${hexToRgb(color)},0.04)`, borderRadius: 10, padding: "11px 13px", border: `1px solid rgba(${hexToRgb(color)},0.08)` }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>How It Works</div>
            {workflow.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: color, minWidth: 14, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: 11, color: "#7c8da5", lineHeight: 1.45 }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ background: `rgba(${hexToRgb(color)},0.04)`, borderRadius: 10, padding: "11px 13px", border: `1px solid rgba(${hexToRgb(color)},0.08)` }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>{outputLabel}</div>
            {outputItems.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11 }}>{o.icon}</span>
                <span style={{ fontSize: 11, color: "#7c8da5" }}>{o.text}</span>
              </div>
            ))}
          </div>
          <div style={{ background: `rgba(${hexToRgb(color)},0.04)`, borderRadius: 10, padding: "11px 13px", border: `1px solid rgba(${hexToRgb(color)},0.08)` }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>{audienceLabel}</div>
            {audience.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11 }}>{a.icon}</span>
                <span style={{ fontSize: 11, color: "#7c8da5" }}>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pill for status badges ──────────────────────────────────────────────
function StatusBadge({ status, small }) {
  const cfg = ACCOUNT_STATUSES[status] || ACCOUNT_STATUSES.active;
  return (
    <span style={{
      fontSize: small ? 9 : 10, fontWeight: 700, color: cfg.color, background: cfg.bg,
      padding: small ? "2px 7px" : "3px 10px", borderRadius: 20,
      textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <span style={{ fontSize: small ? 8 : 10 }}>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

// ─── Status Picker Dropdown ──────────────────────────────────────────────
function StatusPicker({ current, onChange, style: outerStyle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", ...outerStyle }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
        <StatusBadge status={current} small />
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "6px", zIndex: 100, minWidth: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          {Object.entries(ACCOUNT_STATUSES).map(([key, cfg]) => (
            <button key={key} onClick={() => { onChange(key); setOpen(false); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              background: current === key ? `rgba(${hexToRgb(cfg.color)},0.08)` : "transparent",
              fontFamily: "'DM Sans', sans-serif", textAlign: "left",
            }}>
              <span style={{ fontSize: 14 }}>{cfg.icon}</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: current === key ? cfg.color : T.text }}>{cfg.label}</div>
                <div style={{ fontSize: 10.5, color: "#475569" }}>{cfg.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Team Member Picker ──────────────────────────────────────────────────
function AssignPicker({ current, onChange, style: outerStyle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const member = TEAM_MEMBERS.find(m => m.id === current) || TEAM_MEMBERS[TEAM_MEMBERS.length - 1];
  return (
    <div ref={ref} style={{ position: "relative", ...outerStyle }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: `rgba(${hexToRgb(member.color)},0.15)`, border: `1px solid ${member.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: member.color }}>{member.initials}</div>
        <span style={{ fontSize: 12, color: T.subtle }}>{member.name}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "6px", zIndex: 100, minWidth: 210, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          {TEAM_MEMBERS.map(m => (
            <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              background: current === m.id ? `rgba(${hexToRgb(m.color)},0.08)` : "transparent",
              fontFamily: "'DM Sans', sans-serif", textAlign: "left",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `rgba(${hexToRgb(m.color)},0.15)`, border: `1px solid ${m.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: m.color }}>{m.initials}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: current === m.id ? m.color : T.text }}>{m.name}</div>
                {m.role && <div style={{ fontSize: 10.5, color: "#475569" }}>{m.role}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CSV Import Modal ────────────────────────────────────────────────────
function CSVImportModal({ onClose, onImport }) {
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) { setError("CSV must have a header row and at least one data row."); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const required = ["company"];
    const missing = required.filter(r => !headers.some(h => h.includes(r)));
    if (missing.length) { setError(`Missing required column: ${missing.join(", ")}. CSV must include at minimum a "company" column.`); return; }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
      if (vals.length < 2 && !vals[0]) continue;
      const row = {};
      headers.forEach((h, j) => { row[h] = vals[j] || ""; });
      rows.push(row);
    }
    if (rows.length === 0) { setError("No data rows found in CSV."); return; }
    setError(""); setParsed({ headers, rows });
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".tsv")) { setError("Please upload a .csv file"); return; }
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target.result);
    reader.readAsText(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };
  const handleConfirm = () => {
    if (!parsed) return;
    const accounts = parsed.rows.map((row, i) => {
      const companyKey = parsed.headers.find(h => h.includes("company")) || "company";
      const industryKey = parsed.headers.find(h => h.includes("industry")) || "";
      const mrrKey = parsed.headers.find(h => h.includes("mrr") || h.includes("revenue") || h.includes("arr")) || "";
      const contactKey = parsed.headers.find(h => h.includes("contact") || h.includes("name")) || "";
      const statusKey = parsed.headers.find(h => h.includes("status")) || "";

      let industry = (row[industryKey] || "saas").toLowerCase();
      if (!BENCHMARKS[industry]) {
        if (industry.includes("health")) industry = "healthcare";
        else if (industry.includes("fin")) industry = "fintech";
        else if (industry.includes("hr") || industry.includes("people")) industry = "hrtech";
        else if (industry.includes("real") || industry.includes("property")) industry = "realestate";
        else industry = "saas";
      }

      let status = (row[statusKey] || "active").toLowerCase().replace(/\s+/g, "-");
      if (!ACCOUNT_STATUSES[status]) status = "active";

      return {
        id: `csv-${Date.now()}-${i}`,
        company: row[companyKey] || `Account ${i+1}`,
        industry,
        format: "executive",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        mrr: row[mrrKey] ? `$${row[mrrKey].replace(/[$,]/g, "")}` : "$—",
        metric: "Imported",
        renewalIn: 90,
        status,
        assignedTo: "unassigned",
        preview: `Imported from CSV — ${row[companyKey] || "Account"}`,
        contact: row[contactKey] || "",
      };
    });
    onImport(accounts);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "auto", animation: "panelIn 0.25s ease" }}>
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: T.text }}>Import Client Accounts</h2>
            <p style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Upload a CSV to add multiple accounts at once</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: "22px 28px" }}>
          {!parsed ? (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? T.green : T.border}`,
                  borderRadius: 14, padding: "44px 24px", textAlign: "center", cursor: "pointer",
                  background: dragOver ? "rgba(16,185,129,0.04)" : "transparent",
                  transition: "all 0.2s ease", marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Drop your CSV file here</div>
                <div style={{ fontSize: 12.5, color: "#475569" }}>or click to browse</div>
                <input ref={fileRef} type="file" accept=".csv,.tsv" onChange={e => handleFile(e.target.files[0])} style={{ display: "none" }} />
              </div>

              {/* Expected Format */}
              <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Expected CSV Format</div>
                <code style={{ display: "block", fontSize: 11.5, color: T.green, lineHeight: 1.8, fontFamily: "monospace" }}>
                  company, industry, mrr, contact, status<br/>
                  Acme Health, healthcare, 12500, Sarah J., active<br/>
                  PinPoint Finance, fintech, 28000, Marcus K., renewal-due
                </code>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 10, lineHeight: 1.6 }}>
                  Only <strong style={{ color: T.text }}>company</strong> is required. Industry auto-maps to healthcare, fintech, hrtech, realestate, or saas. Status maps to: onboarding, active, renewal-due, renewed, expanded, at-risk, churned, paused.
                </div>
              </div>
              {error && <p style={{ fontSize: 13, color: T.error, marginTop: 12 }}>{error}</p>}
            </>
          ) : (
            <>
              {/* Preview */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8 }}>
                <span style={{ fontSize: 18 }}>✓</span>
                <span style={{ fontSize: 13, color: T.greenLight }}><strong>{parsed.rows.length}</strong> accounts found · Ready to import</span>
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {parsed.headers.slice(0, 5).map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: `1px solid ${T.border}`, color: "#475569", fontWeight: 600, textTransform: "capitalize", background: T.surface2, position: "sticky", top: 0 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((row, i) => (
                      <tr key={i}>
                        {parsed.headers.slice(0, 5).map(h => (
                          <td key={h} style={{ padding: "7px 12px", borderBottom: `1px solid ${T.border}`, color: T.subtle }}>{row[h] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setParsed(null)} style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px", fontSize: 13, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Upload Different File</button>
                <button onClick={handleConfirm} style={{ flex: 1, background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Import {parsed.rows.length} Accounts</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Account Menu ────────────────────────────────────────────────────────
function AccountMenu({ onLogout, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { tierConfig } = useTier();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(${hexToRgb(T.green)},0.15)`, border: `1px solid ${T.green}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.green }}>SR</div>
        <div style={{ textAlign: "left", flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>Sarah R.</div>
          <div style={{ fontSize: 11, color: "#334155" }}>{tierConfig.name} Plan</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 8,
          background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12,
          padding: "4px", zIndex: 100, boxShadow: "0 -8px 30px rgba(0,0,0,0.4)",
        }}>
          <button onClick={() => { setOpen(false); onNavigate && onNavigate("admin"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1"/></svg>
            <span style={{ fontSize: 12.5, color: T.subtle }}>Account Settings</span>
          </button>
          <button onClick={() => { setOpen(false); onNavigate && onNavigate("admin"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <span style={{ fontSize: 12.5, color: T.subtle }}>Preferences</span>
          </button>
          <div style={{ height: 1, background: T.border, margin: "3px 8px" }} />
          <button onClick={() => { setOpen(false); onLogout(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span style={{ fontSize: 12.5, color: T.error }}>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY TIMELINE PANEL (Blueprint §3.12 — P0 Critical)
// Multi-channel activity feed across all accounts and interactions
// ═══════════════════════════════════════════════════════════════════════════

const ACTIVITY_TYPES = {
  email_sent:      { label: "Email Sent",        icon: "✉️", color: "#8b5cf6", bgTint: "rgba(139,92,246,0.08)",  borderTint: "rgba(139,92,246,0.20)" },
  email_received:  { label: "Email Received",    icon: "📨", color: "#a78bfa", bgTint: "rgba(167,139,250,0.08)", borderTint: "rgba(167,139,250,0.20)" },
  meeting:         { label: "Meeting",           icon: "🎙️", color: "#06b6d4", bgTint: "rgba(6,182,212,0.08)",   borderTint: "rgba(6,182,212,0.20)" },
  call:            { label: "Phone Call",         icon: "📞", color: "#14b8a6", bgTint: "rgba(20,184,166,0.08)",  borderTint: "rgba(20,184,166,0.20)" },
  support_ticket:  { label: "Support Ticket",    icon: "🎧", color: "#f59e0b", bgTint: "rgba(245,158,11,0.08)",  borderTint: "rgba(245,158,11,0.20)" },
  nps_response:    { label: "NPS Response",      icon: "📊", color: "#10b981", bgTint: "rgba(16,185,129,0.08)",  borderTint: "rgba(16,185,129,0.20)" },
  slack_message:   { label: "Slack Message",     icon: "💬", color: "#e11d48", bgTint: "rgba(225,29,72,0.08)",   borderTint: "rgba(225,29,72,0.20)" },
  crm_update:      { label: "CRM Update",        icon: "🔄", color: "#64748b", bgTint: "rgba(100,116,139,0.08)", borderTint: "rgba(100,116,139,0.20)" },
  playbook_action: { label: "Playbook Action",   icon: "⚡", color: "#2D8CFF", bgTint: "rgba(45,140,255,0.08)",  borderTint: "rgba(45,140,255,0.20)" },
  csm_note:        { label: "CSM Note",          icon: "📝", color: "#f97316", bgTint: "rgba(249,115,22,0.08)",  borderTint: "rgba(249,115,22,0.20)" },
  billing_event:   { label: "Billing Event",     icon: "💰", color: "#eab308", bgTint: "rgba(234,179,8,0.08)",   borderTint: "rgba(234,179,8,0.20)" },
  usage_milestone: { label: "Usage Milestone",   icon: "🏆", color: "#ec4899", bgTint: "rgba(236,72,153,0.08)",  borderTint: "rgba(236,72,153,0.20)" },
};

const TIMELINE_DEMO_ACCOUNTS = [
  { id: "d1", company: "Acme Health", industry: "healthcare" },
  { id: "d2", company: "PinPoint Financial", industry: "fintech" },
  { id: "d3", company: "TalentForge", industry: "hrtech" },
  { id: "d4", company: "MetroPlex Realty", industry: "realestate" },
  { id: "d5", company: "CloudSync Pro", industry: "saas" },
  { id: "d6", company: "Nextera Billing", industry: "fintech" },
];

function generateDemoActivities() {
  const activities = [
    { id: "a001", accountId: "d1", type: "meeting", title: "QBR Prep Call with Sarah Johnson", description: "Discussed Q1 adoption metrics, upcoming renewal strategy, and competitor concerns. Sarah requested a formal ROI document for the CFO before the renewal committee meeting on March 15th.", metadata: { summary: "QBR prep focusing on renewal justification", attendees: ["Sarah Johnson (VP Ops)", "Marcus K. (CSM)", "Dr. Patel (CMO)"], duration_min: 45, action_items: ["Send ROI summary by March 1", "Schedule CFO intro call", "Prepare competitor comparison"] }, source: "zoom", createdBy: "Marcus K.", createdAt: "2026-02-28T14:30:00Z", pinned: false },
    { id: "a002", accountId: "d1", type: "email_sent", title: "Follow-up: ROI Summary for Renewal Committee", description: "Sent the benchmark-driven ROI report highlighting $1.2M in recovered operational capacity, 34% reduction in claims processing time, and top-quartile positioning vs healthcare SaaS peers.", metadata: { subject: "Acme Health — ROI Summary for March 15 Committee", recipients: ["sarah.johnson@acmehealth.com", "cfo@acmehealth.com"], open_status: "opened", click_status: "clicked" }, source: "proofpoint", createdBy: "Marcus K.", createdAt: "2026-02-27T10:15:00Z", pinned: true },
    { id: "a003", accountId: "d1", type: "nps_response", title: "NPS Survey Response: Score 8", description: "Sarah Johnson submitted NPS score of 8. Comment: 'The platform has genuinely improved our operations team efficiency. Would love to see more HIPAA-specific reporting templates.'", metadata: { score: 8, comment: "The platform has genuinely improved our operations team efficiency. Would love to see more HIPAA-specific reporting templates.", survey_id: "nps-q1-2026", segment: "healthcare" }, source: "proofpoint-surveys", createdBy: null, createdAt: "2026-02-25T16:00:00Z", pinned: false },
    { id: "a004", accountId: "d1", type: "support_ticket", title: "Ticket #512: HIPAA Export Formatting", description: "Reported that PDF exports don't include required HIPAA disclaimer footer. Priority: Medium. Currently being addressed by engineering — fix expected in v2.4.1.", metadata: { ticket_id: "#512", priority: "medium", status: "in_progress", category: "compliance", resolution: null }, source: "zendesk", createdBy: "Sarah Johnson", createdAt: "2026-02-23T09:45:00Z", pinned: false },
    { id: "a005", accountId: "d1", type: "billing_event", title: "Invoice #INV-2026-0187 Paid", description: "Monthly subscription payment of $12,500 processed successfully. Payment method: ACH transfer ending in 4821.", metadata: { event_type: "payment_received", amount: 12500, currency: "USD", invoice_id: "INV-2026-0187" }, source: "stripe", createdBy: null, createdAt: "2026-02-20T00:00:00Z", pinned: false },
    { id: "a006", accountId: "d1", type: "playbook_action", title: "Renewal Prep Playbook — Step 3: Send ROI Deck", description: "Automated playbook triggered the ROI deck generation and delivery step. Email sent to primary contact with personalized ROI data.", metadata: { playbook_name: "Renewal Prep (Healthcare)", step_name: "Send ROI Deck", action_type: "send_email", result: "success" }, source: "proofpoint-playbooks", createdBy: null, createdAt: "2026-02-19T08:00:00Z", pinned: false },
    { id: "a007", accountId: "d1", type: "usage_milestone", title: "90% Feature Adoption Reached", description: "Acme Health has activated 90% of available platform features, up from 72% last quarter. This places them in the top 5% of healthcare accounts by adoption.", metadata: { milestone: "90% feature adoption", metric_name: "feature_adoption_rate", metric_value: 90, threshold: 85 }, source: "proofpoint-analytics", createdBy: null, createdAt: "2026-02-17T12:00:00Z", pinned: true },
    { id: "a008", accountId: "d1", type: "crm_update", title: "Account Status Changed: Active → Renewal Due", description: "HubSpot lifecycle stage automatically updated as the renewal date falls within the 30-day window.", metadata: { field_changed: "lifecycle_stage", old_value: "Active", new_value: "Renewal Due", changed_by: "automation" }, source: "hubspot", createdBy: null, createdAt: "2026-02-15T06:00:00Z", pinned: false },
    { id: "a009", accountId: "d1", type: "csm_note", title: "Internal: CFO Approval Risk", description: "Spoke with Sarah off-the-record. She's confident in the product but the new CFO (joined in January) is reviewing all renewals above $10K. We need to front-load the ROI narrative heavily. Consider offering a 3% early-renewal discount as a commitment incentive.", metadata: { note_text: "CFO reviewing all renewals >$10K. Front-load ROI narrative. Consider 3% early-renewal discount.", tags: ["renewal-risk", "executive-stakeholder", "pricing"], is_rich_text: false }, source: "manual", createdBy: "Marcus K.", createdAt: "2026-02-14T17:30:00Z", pinned: true },
    { id: "a010", accountId: "d1", type: "call", title: "Quick Sync: Renewal Timeline", description: "15-minute call with Sarah. She confirmed the renewal committee meets March 15th. Needs all documentation by March 8th at the latest. Tone was positive but slightly stressed about internal politics.", metadata: { duration_min: 15, direction: "outbound", outcome: "positive", notes: "Deadline March 8 for all docs. Committee March 15." }, source: "aircall", createdBy: "Marcus K.", createdAt: "2026-02-12T11:00:00Z", pinned: false },
    { id: "a011", accountId: "d1", type: "slack_message", title: "Slack: #acme-health — Health score alert shared", description: "Automated alert posted to dedicated Slack channel about health score trending up to 78 (from 71 last month).", metadata: { channel: "#acme-health", message_text: "📈 Acme Health health score is now 78 (+7 from last month). Trending positively ahead of renewal.", is_reply: false }, source: "slack", createdBy: null, createdAt: "2026-02-10T09:00:00Z", pinned: false },
    { id: "a012", accountId: "d1", type: "meeting", title: "Monthly Check-in with Operations Team", description: "Broader team meeting with 6 attendees from Acme Health operations. Covered new feature rollout, training schedule, and collected feedback on workflow automation. High engagement throughout.", metadata: { summary: "Team check-in: feature rollout, training, workflow feedback", attendees: ["Sarah Johnson", "Tom Lee", "Priya Mehta", "James Chen", "Lisa Wong", "Dr. Patel"], duration_min: 60, action_items: ["Schedule training for new reporting module", "Send workflow automation guide"] }, source: "zoom", createdBy: "Marcus K.", createdAt: "2026-02-05T15:00:00Z", pinned: false },
    { id: "a020", accountId: "d2", type: "meeting", title: "QBR — Q4 2025 Review", description: "Comprehensive quarterly review covering 62% fraud reduction achievement, compliance audit results, and expansion discussion for APAC markets. David expressed strong interest in the AI triage module.", metadata: { summary: "Q4 QBR: fraud reduction metrics, compliance, APAC expansion", attendees: ["David Chen (CTO)", "Wei Zhang (VP Engineering)", "Jamie L. (CSM)"], duration_min: 75, recording_url: "https://zoom.us/rec/share/abc123", action_items: ["Send APAC pricing proposal", "Schedule AI triage demo", "Prepare Q1 success plan"] }, source: "zoom", createdBy: "Jamie L.", createdAt: "2026-02-26T10:00:00Z", pinned: true },
    { id: "a021", accountId: "d2", type: "email_received", title: "RE: APAC Expansion Pricing", description: "David responded to the APAC pricing proposal. Key quote: 'Numbers look reasonable. Need to run it by our board next Tuesday. Can you prepare a one-pager on expected ROI for APAC deployment?'", metadata: { subject: "RE: APAC Expansion Pricing", from: "david.chen@pinpointfin.com", body_preview: "Numbers look reasonable. Need to run it by our board next Tuesday...", has_attachment: false }, source: "gmail", createdBy: "David Chen", createdAt: "2026-02-24T18:20:00Z", pinned: false },
    { id: "a022", accountId: "d2", type: "support_ticket", title: "Ticket #498: API Rate Limit Errors", description: "Engineering team reported intermittent 429 errors during peak trading hours (9-10am EST). Affects transaction monitoring pipeline. Investigating server-side throttling configuration.", metadata: { ticket_id: "#498", priority: "high", status: "resolved", category: "api", resolution: "Increased rate limit from 1000 to 5000 req/min for enterprise tier" }, source: "zendesk", createdBy: "Wei Zhang", createdAt: "2026-02-22T08:30:00Z", pinned: false },
    { id: "a023", accountId: "d2", type: "billing_event", title: "Expansion: Added 3 Additional Seats", description: "David added 3 compliance analyst seats to the account, increasing MRR from $25,000 to $28,000. Upgrade processed immediately.", metadata: { event_type: "expansion", amount: 3000, currency: "USD", invoice_id: "INV-2026-0201" }, source: "stripe", createdBy: "David Chen", createdAt: "2026-02-18T14:00:00Z", pinned: true },
    { id: "a024", accountId: "d2", type: "nps_response", title: "NPS Survey Response: Score 9", description: "David Chen scored 9/10. Comment: 'Fraud detection accuracy is best-in-class. API docs could use more examples for edge cases.'", metadata: { score: 9, comment: "Fraud detection accuracy is best-in-class. API docs could use more examples for edge cases.", survey_id: "nps-q1-2026", segment: "fintech" }, source: "proofpoint-surveys", createdBy: null, createdAt: "2026-02-15T11:00:00Z", pinned: false },
    { id: "a025", accountId: "d2", type: "playbook_action", title: "Expansion Opportunity Playbook — Step 1: Identify Signal", description: "AI detected expansion signal: usage at 87% of plan limits + positive NPS trend + multi-stakeholder engagement. Auto-created expansion opportunity.", metadata: { playbook_name: "Expansion Opportunity Detection", step_name: "Identify Signal", action_type: "create_opportunity", result: "success" }, source: "proofpoint-playbooks", createdBy: null, createdAt: "2026-02-14T06:00:00Z", pinned: false },
    { id: "a026", accountId: "d2", type: "usage_milestone", title: "Transaction Volume Exceeded 1M/month", description: "PinPoint Financial processed over 1 million monitored transactions this month, a 34% increase from Q4. This triggers the volume-based pricing review clause.", metadata: { milestone: "1M transactions/month", metric_name: "monthly_transactions", metric_value: 1042000, threshold: 1000000 }, source: "proofpoint-analytics", createdBy: null, createdAt: "2026-02-10T00:00:00Z", pinned: false },
    { id: "a030", accountId: "d3", type: "email_sent", title: "6-Month Success Celebration Email", description: "Sent personalized celebration email highlighting 31% faster hiring metric, 2,400 hours saved, and comparison to HR Tech industry benchmarks. Included case study invitation.", metadata: { subject: "TalentForge — 6 months of results worth celebrating", recipients: ["marcus.williams@talentforge.com"], open_status: "opened", click_status: "clicked" }, source: "proofpoint", createdBy: "Jin L.", createdAt: "2026-02-25T09:00:00Z", pinned: false },
    { id: "a031", accountId: "d3", type: "meeting", title: "Training Session: Advanced Reporting", description: "Conducted 30-minute training on the new cohort analysis and DEI reporting modules. Marcus and 4 recruiters attended. High engagement — they immediately started building custom reports.", metadata: { summary: "Advanced reporting training: cohort analysis + DEI modules", attendees: ["Marcus Williams", "Ava Robbins", "Derek Lim", "Nadia Costa", "Sam Park"], duration_min: 30, action_items: ["Send recording link", "Create template library for their use cases"] }, source: "zoom", createdBy: "Jin L.", createdAt: "2026-02-20T14:00:00Z", pinned: false },
    { id: "a032", accountId: "d3", type: "crm_update", title: "Account Status Changed: Active → Renewed", description: "Contract renewed for 12 months with a 15% price increase accepted. Marcus signed without negotiation after reviewing the ROI summary.", metadata: { field_changed: "lifecycle_stage", old_value: "Active", new_value: "Renewed", changed_by: "Jin L." }, source: "hubspot", createdBy: "Jin L.", createdAt: "2026-02-18T16:30:00Z", pinned: true },
    { id: "a033", accountId: "d3", type: "slack_message", title: "Slack: Marcus shared platform win internally", description: "Marcus posted in their #talent-ops channel: 'Just renewed our CS platform — the ROI numbers speak for themselves. 31% faster time-to-hire is real.' (Shared by their Slack admin with permission.)", metadata: { channel: "#talent-ops (customer)", message_text: "Just renewed our CS platform — the ROI numbers speak for themselves. 31% faster time-to-hire is real.", is_reply: false }, source: "slack", createdBy: "Marcus Williams", createdAt: "2026-02-18T17:00:00Z", pinned: false },
    { id: "a034", accountId: "d3", type: "nps_response", title: "NPS Survey Response: Score 10", description: "Marcus Williams scored 10/10. Comment: 'Absolutely indispensable for our recruiting ops. The benchmark comparisons alone justify the cost. Would recommend to any HR leader.'", metadata: { score: 10, comment: "Absolutely indispensable for our recruiting ops. The benchmark comparisons alone justify the cost.", survey_id: "nps-q1-2026", segment: "hrtech" }, source: "proofpoint-surveys", createdBy: null, createdAt: "2026-02-12T10:00:00Z", pinned: false },
    { id: "a040", accountId: "d4", type: "support_ticket", title: "Ticket #471: Mobile App Crashes During Showings", description: "Linda Park's team reported the app crashing 3-4 times daily during property showings. Critical impact — agents are losing deals. Escalated to P1 engineering priority.", metadata: { ticket_id: "#471", priority: "critical", status: "escalated", category: "mobile", resolution: null }, source: "zendesk", createdBy: "Linda Park", createdAt: "2026-02-27T11:00:00Z", pinned: true },
    { id: "a041", accountId: "d4", type: "meeting", title: "Escalation Call: Mobile Stability Issues", description: "Emergency call with Linda and their CTO. Strong frustration expressed about mobile reliability. They've given us until March 7th to resolve or they'll begin evaluating alternatives. Engineering has committed to a hotfix by March 3rd.", metadata: { summary: "Escalation: mobile crashes affecting agent productivity", attendees: ["Linda Park (VP Sales)", "Robert Kim (CTO)", "Sarah R. (CSM)", "Alex P. (CS Manager)"], duration_min: 35, action_items: ["Hotfix by March 3", "Daily status updates to Linda", "Prepare service credit proposal"] }, source: "zoom", createdBy: "Sarah R.", createdAt: "2026-02-26T16:00:00Z", pinned: true },
    { id: "a042", accountId: "d4", type: "csm_note", title: "Internal: MetroPlex Churn Risk Assessment", description: "High churn risk. Linda is the decision-maker and she's personally frustrated. The CTO (Robert Kim) is already reviewing competitor demos. Our saving grace: they've closed 22 more deals since adopting us, and switching cost is high. Strategy: fix the bug fast, offer service credits, and double down on the ROI story.", metadata: { note_text: "High churn risk. Fix bug by March 3, offer credits, reinforce ROI. Switching cost is our advantage.", tags: ["churn-risk", "escalation", "mobile-bug", "service-credit"], is_rich_text: false }, source: "manual", createdBy: "Sarah R.", createdAt: "2026-02-26T17:30:00Z", pinned: true },
    { id: "a043", accountId: "d4", type: "nps_response", title: "NPS Survey Response: Score 3", description: "Linda Park scored 3/10. Comment: 'The mobile app is costing us business. Fix it or we're out.'", metadata: { score: 3, comment: "The mobile app is costing us business. Fix it or we're out.", survey_id: "nps-q1-2026", segment: "realestate" }, source: "proofpoint-surveys", createdBy: null, createdAt: "2026-02-24T09:00:00Z", pinned: false },
    { id: "a044", accountId: "d4", type: "call", title: "Follow-up: Engineering Status Update", description: "Called Linda to provide engineering update. Hotfix is in QA, expected deployment March 2nd (one day early). She appreciated the proactive communication but said trust needs to be rebuilt.", metadata: { duration_min: 12, direction: "outbound", outcome: "cautiously_positive", notes: "Hotfix in QA. Deploy March 2. Trust rebuilding needed." }, source: "aircall", createdBy: "Sarah R.", createdAt: "2026-02-28T10:00:00Z", pinned: false },
    { id: "a045", accountId: "d4", type: "crm_update", title: "Health Score Dropped: 52 → 34", description: "Automated health score recalculation triggered by: critical support ticket, NPS drop to 3, and reduced login frequency over the past 2 weeks.", metadata: { field_changed: "health_score", old_value: "52", new_value: "34", changed_by: "automation" }, source: "proofpoint", createdBy: null, createdAt: "2026-02-25T06:00:00Z", pinned: false },
    { id: "a050", accountId: "d5", type: "billing_event", title: "Plan Upgrade: Growth → Enterprise", description: "CloudSync Pro upgraded from Growth ($14,200/mo) to Enterprise ($18,400/mo) plan. Includes SSO, advanced analytics, and priority support. Tom Reed signed the expansion agreement.", metadata: { event_type: "plan_upgrade", amount: 4200, currency: "USD", invoice_id: "INV-2026-0195" }, source: "stripe", createdBy: "Tom Reed", createdAt: "2026-02-22T10:00:00Z", pinned: true },
    { id: "a051", accountId: "d5", type: "meeting", title: "Enterprise Onboarding Kickoff", description: "Kickoff meeting for enterprise tier features. Covered SSO setup, advanced analytics configuration, API rate limit increases, and dedicated support channel setup. Tom brought their entire DevOps team.", metadata: { summary: "Enterprise onboarding: SSO, analytics, API, support", attendees: ["Tom Reed (VP Eng)", "Amy Wu (DevOps Lead)", "Chris Taylor (SRE)", "Alex P. (CSM)"], duration_min: 60, action_items: ["Send SSO integration guide", "Provision analytics sandbox", "Set up #cloudsyncy-enterprise Slack channel"] }, source: "zoom", createdBy: "Alex P.", createdAt: "2026-02-23T14:00:00Z", pinned: false },
    { id: "a052", accountId: "d5", type: "email_sent", title: "Enterprise Welcome Package", description: "Sent comprehensive enterprise welcome email with SSO setup guide, analytics documentation, SLA details, and dedicated support contact information.", metadata: { subject: "Welcome to Enterprise — Your CloudSync Pro Upgrade Guide", recipients: ["tom.reed@cloudsync.io", "amy.wu@cloudsync.io"], open_status: "opened", click_status: "clicked" }, source: "proofpoint", createdBy: "Alex P.", createdAt: "2026-02-23T15:30:00Z", pinned: false },
    { id: "a053", accountId: "d5", type: "usage_milestone", title: "Deploy Frequency: 40% Increase Achieved", description: "CloudSync Pro's deployment frequency has increased 40% since platform adoption, from 8 deploys/week to 11.2 deploys/week. This exceeds their original success criterion of 25% improvement.", metadata: { milestone: "40% deploy frequency increase", metric_name: "weekly_deploys", metric_value: 11.2, threshold: 10.0 }, source: "proofpoint-analytics", createdBy: null, createdAt: "2026-02-15T00:00:00Z", pinned: false },
    { id: "a054", accountId: "d5", type: "playbook_action", title: "Expansion Opportunity Playbook — Step 4: Proposal Sent", description: "Enterprise upgrade proposal automatically generated and sent based on usage signals (plan limits at 92%, growing team size, positive sentiment trajectory).", metadata: { playbook_name: "Expansion Opportunity Detection", step_name: "Send Upgrade Proposal", action_type: "send_email", result: "success" }, source: "proofpoint-playbooks", createdBy: null, createdAt: "2026-02-10T08:00:00Z", pinned: false },
    { id: "a060", accountId: "d6", type: "crm_update", title: "Account Status Changed: At Risk → Churned", description: "Nextera Billing officially churned. Contract ended December 15, 2025. Reason: internal restructuring and strategic pivot away from the compliance automation vertical.", metadata: { field_changed: "lifecycle_stage", old_value: "At Risk", new_value: "Churned", changed_by: "Marcus K." }, source: "hubspot", createdBy: "Marcus K.", createdAt: "2025-12-15T10:00:00Z", pinned: false },
    { id: "a061", accountId: "d6", type: "csm_note", title: "Post-Mortem: Nextera Billing Churn", description: "Root cause was external — company pivoted strategy after new CEO joined in October. Product fit was never the issue (NPS was 7 at last survey). Lesson learned: need better executive stakeholder monitoring to catch leadership changes earlier. Added to playbook triggers.", metadata: { note_text: "Churn due to strategic pivot after CEO change. Product fit was fine. Improve executive monitoring.", tags: ["post-mortem", "leadership-change", "strategic-pivot"], is_rich_text: false }, source: "manual", createdBy: "Marcus K.", createdAt: "2025-12-16T14:00:00Z", pinned: true },
    { id: "a062", accountId: "d6", type: "billing_event", title: "Final Invoice Processed — Account Closed", description: "Final prorated invoice of $2,900 processed. Account officially closed in billing system. No outstanding balance.", metadata: { event_type: "account_closed", amount: 2900, currency: "USD", invoice_id: "INV-2025-1247" }, source: "stripe", createdBy: null, createdAt: "2025-12-15T00:00:00Z", pinned: false },
  ];
  return activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function formatRelativeTime(dateStr) {
  const now = new Date("2026-03-01T12:00:00Z");
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== 2026 ? "numeric" : undefined });
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getDateGroup(dateStr) {
  const now = new Date("2026-03-01T12:00:00Z");
  const d = new Date(dateStr);
  const diffDay = Math.floor((now - d) / 86400000);
  if (diffDay === 0) return "Today";
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return "This Week";
  if (diffDay < 14) return "Last Week";
  if (diffDay < 30) return "This Month";
  if (diffDay < 60) return "Last Month";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function TimelineMetadataDisplay({ type, metadata }) {
  if (!metadata) return null;
  const chipStyle = { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 500, background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.subtle };
  const labelStyle = { fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, fontWeight: 600 };

  switch (type) {
    case "meeting":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {metadata.attendees?.length > 0 && <div><div style={labelStyle}>Attendees</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{metadata.attendees.map((a, i) => <span key={i} style={chipStyle}>👤 {a}</span>)}</div></div>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {metadata.duration_min && <span style={chipStyle}>⏱ {metadata.duration_min} min</span>}
            {metadata.recording_url && <span onClick={() => window.open(metadata.recording_url, "_blank", "noopener")} style={{ ...chipStyle, color: T.info, cursor: "pointer" }}>🎬 Recording</span>}
          </div>
          {metadata.action_items?.length > 0 && <div><div style={labelStyle}>Action Items</div><div style={{ display: "flex", flexDirection: "column", gap: 3 }}>{metadata.action_items.map((item, i) => <div key={i} style={{ fontSize: 11.5, color: T.subtle, display: "flex", gap: 6 }}><span style={{ color: T.green }}>○</span> {item}</div>)}</div></div>}
        </div>
      );
    case "email_sent": case "email_received":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {metadata.subject && <div style={{ fontSize: 11.5, color: T.subtle }}><strong style={{ color: T.muted }}>Subject:</strong> {metadata.subject}</div>}
          {metadata.recipients && <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{metadata.recipients.map((r, i) => <span key={i} style={chipStyle}>{r}</span>)}</div>}
          {metadata.from && <span style={chipStyle}>From: {metadata.from}</span>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {metadata.open_status && <span style={{ ...chipStyle, color: metadata.open_status === "opened" ? T.green : T.muted }}>{metadata.open_status === "opened" ? "✓ Opened" : "— Not opened"}</span>}
            {metadata.click_status && <span style={{ ...chipStyle, color: metadata.click_status === "clicked" ? T.green : T.muted }}>{metadata.click_status === "clicked" ? "✓ Clicked" : "— No clicks"}</span>}
          </div>
          {metadata.body_preview && <div style={{ fontSize: 11.5, color: T.muted, fontStyle: "italic", background: "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: 6, borderLeft: `3px solid ${T.border}`, lineHeight: 1.5 }}>"{metadata.body_preview}"</div>}
        </div>
      );
    case "nps_response":
      const npsColor = metadata.score >= 9 ? T.green : metadata.score >= 7 ? T.warning : T.error;
      return (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `rgba(${hexToRgb(npsColor)},0.1)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: npsColor, border: `1px solid ${npsColor}33` }}>{metadata.score}</div>
            <span style={{ fontSize: 11, color: npsColor, fontWeight: 600 }}>{metadata.score >= 9 ? "Promoter" : metadata.score >= 7 ? "Passive" : "Detractor"}</span>
          </div>
          {metadata.comment && <div style={{ fontSize: 11.5, color: T.subtle, fontStyle: "italic", lineHeight: 1.5 }}>"{metadata.comment}"</div>}
        </div>
      );
    case "support_ticket":
      const priCol = metadata.priority === "critical" ? T.error : metadata.priority === "high" ? T.warning : metadata.priority === "medium" ? T.info : T.muted;
      const statCol = metadata.status === "resolved" ? T.green : metadata.status === "escalated" ? T.error : T.warning;
      return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <span style={chipStyle}>🎫 {metadata.ticket_id}</span>
          <span style={{ ...chipStyle, color: priCol, borderColor: `${priCol}33`, background: `rgba(${hexToRgb(priCol)},0.06)` }}>{metadata.priority}</span>
          <span style={{ ...chipStyle, color: statCol, borderColor: `${statCol}33`, background: `rgba(${hexToRgb(statCol)},0.06)` }}>{metadata.status?.replace("_", " ")}</span>
          {metadata.category && <span style={chipStyle}>📁 {metadata.category}</span>}
          {metadata.resolution && <div style={{ width: "100%", fontSize: 11, color: T.green, background: `rgba(${hexToRgb(T.green)},0.04)`, padding: "6px 10px", borderRadius: 6, borderLeft: `3px solid ${T.green}33`, marginTop: 2 }}>Resolution: {metadata.resolution}</div>}
        </div>
      );
    case "billing_event":
      const isPositive = ["payment_received", "expansion", "plan_upgrade"].includes(metadata.event_type);
      return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <span style={{ ...chipStyle, color: isPositive ? T.green : T.muted }}>{isPositive ? "+" : ""}${metadata.amount?.toLocaleString()} {metadata.currency}</span>
          <span style={chipStyle}>📄 {metadata.invoice_id}</span>
          <span style={{ ...chipStyle, color: isPositive ? T.green : T.warning }}>{metadata.event_type?.replace("_", " ")}</span>
        </div>
      );
    case "usage_milestone":
      return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <span style={{ ...chipStyle, color: T.green }}>🎯 {metadata.milestone}</span>
          {metadata.metric_value != null && <span style={chipStyle}>{metadata.metric_name}: {typeof metadata.metric_value === 'number' ? metadata.metric_value.toLocaleString() : metadata.metric_value}</span>}
          {metadata.threshold != null && <span style={chipStyle}>Threshold: {metadata.threshold.toLocaleString()}</span>}
        </div>
      );
    case "playbook_action":
      return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <span style={chipStyle}>📋 {metadata.playbook_name}</span>
          <span style={chipStyle}>Step: {metadata.step_name}</span>
          <span style={{ ...chipStyle, color: metadata.result === "success" ? T.green : T.error }}>{metadata.result === "success" ? "✓ Success" : "✕ Failed"}</span>
        </div>
      );
    case "csm_note":
      return (
        <div style={{ marginTop: 8 }}>
          {metadata.tags?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{metadata.tags.map((tag, i) => <span key={i} style={{ ...chipStyle, color: T.warning, borderColor: `${T.warning}33`, background: `rgba(${hexToRgb(T.warning)},0.06)` }}>#{tag}</span>)}</div>}
        </div>
      );
    case "crm_update":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <span style={chipStyle}>{metadata.field_changed}</span>
          <span style={{ fontSize: 11, color: T.error, textDecoration: "line-through" }}>{metadata.old_value}</span>
          <span style={{ fontSize: 11, color: T.muted }}>→</span>
          <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>{metadata.new_value}</span>
          {metadata.changed_by && <span style={{ ...chipStyle, fontSize: 10 }}>by {metadata.changed_by}</span>}
        </div>
      );
    case "call":
      return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {metadata.duration_min && <span style={chipStyle}>⏱ {metadata.duration_min} min</span>}
          {metadata.direction && <span style={chipStyle}>{metadata.direction === "outbound" ? "📤" : "📥"} {metadata.direction}</span>}
          {metadata.outcome && <span style={{ ...chipStyle, color: metadata.outcome === "positive" ? T.green : metadata.outcome === "cautiously_positive" ? T.warning : T.muted }}>{metadata.outcome.replace("_", " ")}</span>}
        </div>
      );
    case "slack_message":
      return (
        <div style={{ marginTop: 8 }}>
          <span style={chipStyle}>{metadata.channel}</span>
          {metadata.message_text && <div style={{ marginTop: 6, fontSize: 11.5, color: T.subtle, background: "rgba(225,29,72,0.04)", padding: "8px 10px", borderRadius: 6, borderLeft: "3px solid rgba(225,29,72,0.3)", lineHeight: 1.5 }}>{metadata.message_text}</div>}
        </div>
      );
    default: return null;
  }
}

function ActivityCard({ activity, expanded, onToggle, onPin, accountName }) {
  const config = ACTIVITY_TYPES[activity.type] || { label: activity.type, icon: "📌", color: T.muted, bgTint: "rgba(100,116,139,0.08)", borderTint: "rgba(100,116,139,0.20)" };
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ display: "flex", gap: 14, padding: "14px 16px", borderRadius: 12, background: hovered ? "rgba(255,255,255,0.02)" : expanded ? "rgba(255,255,255,0.015)" : "transparent", border: `1px solid ${expanded ? config.borderTint : "transparent"}`, transition: "all 0.2s ease", cursor: "pointer", position: "relative" }} onClick={onToggle}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 40 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: config.bgTint, border: `1px solid ${config.borderTint}`, boxShadow: expanded ? `0 0 12px ${config.color}22` : "none", transition: "box-shadow 0.2s" }}>{config.icon}</div>
        <div style={{ width: 2, flex: 1, marginTop: 4, background: `linear-gradient(to bottom, ${T.border}, transparent)`, borderRadius: 1, minHeight: 12 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: config.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{config.label}</span>
              {activity.source && <span style={{ fontSize: 9.5, color: T.muted, background: "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: 4 }}>via {activity.source}</span>}
              {activity.pinned && <span style={{ fontSize: 9.5, color: T.warning, background: `rgba(${hexToRgb(T.warning)},0.08)`, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>📌 Pinned</span>}
            </div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4, margin: 0 }}>{activity.title}</h4>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button onClick={(e) => { e.stopPropagation(); onPin(activity.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: activity.pinned ? T.warning : T.muted, opacity: hovered || activity.pinned ? 1 : 0, transition: "opacity 0.15s", fontSize: 13 }} title={activity.pinned ? "Unpin" : "Pin to top"}>📌</button>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>{formatRelativeTime(activity.createdAt)}</div></div>
          </div>
        </div>
        {accountName && <div style={{ marginTop: 4, marginBottom: 2 }}><span style={{ fontSize: 10.5, color: T.subtle, background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 5, border: `1px solid ${T.border}` }}>{accountName}</span></div>}
        {!expanded && activity.description && <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{activity.description}</p>}
        {expanded && (
          <div style={{ marginTop: 8, animation: "panelIn 0.2s ease" }}>
            {activity.description && <p style={{ fontSize: 12.5, color: T.subtle, lineHeight: 1.65, marginBottom: 8 }}>{activity.description}</p>}
            <TimelineMetadataDisplay type={activity.type} metadata={activity.metadata} />
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 10.5, color: T.muted }}>{formatFullDate(activity.createdAt)}{activity.createdBy && ` · by ${activity.createdBy}`}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={(e) => { e.stopPropagation(); }} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 10.5, color: T.subtle, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Edit</button>
                <button onClick={(e) => { e.stopPropagation(); }} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 10.5, color: T.subtle, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Link</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddNoteModal({ accounts, onAdd, onClose }) {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || "");
  const [title, setTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [tags, setTags] = useState("");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const handleSubmit = () => {
    if (!title.trim() || !noteText.trim()) return;
    onAdd({ id: `note-${Date.now()}`, accountId: selectedAccount, type: "csm_note", title: title.trim(), description: noteText.trim(), metadata: { note_text: noteText.trim(), tags: tags.split(",").map(t => t.trim()).filter(Boolean), is_rich_text: false }, source: "manual", createdBy: "Sarah R.", createdAt: new Date().toISOString(), pinned: false });
    onClose();
  };
  const inputStyle = { width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: T.text, fontFamily: "'DM Sans', sans-serif", outline: "none" };
  const btnActive = (active) => ({ background: active ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? T.green + "44" : T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 12, color: active ? T.green : T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 700 : 400 });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 520, maxHeight: "85vh", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", animation: "panelIn 0.2s ease" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.text, margin: 0 }}>📝 Add CSM Note</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: T.subtle, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Account</label><select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>{accounts.map(a => <option key={a.id} value={a.id}>{a.company}</option>)}</select></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: T.subtle, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Internal: Renewal Strategy Discussion" style={inputStyle} /></div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.subtle, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Note</label>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}><button onClick={() => setIsBold(b => !b)} style={btnActive(isBold)}><strong>B</strong></button><button onClick={() => setIsItalic(i => !i)} style={btnActive(isItalic)}><em>I</em></button><span style={{ flex: 1 }} /><span style={{ fontSize: 10, color: T.muted, alignSelf: "center" }}>{noteText.length} chars</span></div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={5} placeholder="Add context, observations, strategy notes, or follow-up items..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontWeight: isBold ? 700 : 400, fontStyle: isItalic ? "italic" : "normal" }} />
          </div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: T.subtle, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tags <span style={{ fontWeight: 400, color: T.muted }}>(comma-separated)</span></label><input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., renewal-risk, executive-stakeholder, pricing" style={inputStyle} /></div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 18px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!title.trim() || !noteText.trim()} style={{ background: title.trim() && noteText.trim() ? T.green : T.surface, color: title.trim() && noteText.trim() ? "#fff" : T.muted, border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 12, fontWeight: 600, cursor: title.trim() && noteText.trim() ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>📝 Add Note</button>
        </div>
      </div>
    </div>
  );
}

function TimelineFilterBar({ filters, onChange, accounts, activityCounts }) {
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const dropRef = useRef(null);
  useEffect(() => { const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowTypeDropdown(false); }; document.addEventListener("mousedown", handler); return () => document.removeEventListener("mousedown", handler); }, []);
  const selectedCount = filters.types.length;
  const totalTypes = Object.keys(ACTIVITY_TYPES).length;
  const inputStyle = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: T.text, fontFamily: "'DM Sans', sans-serif", outline: "none" };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "12px 0" }}>
      <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 13 }}>🔍</span><input value={filters.search} onChange={e => onChange({ ...filters, search: e.target.value })} placeholder="Search activities..." style={{ ...inputStyle, paddingLeft: 32, width: "100%" }} /></div>
      <select value={filters.account} onChange={e => onChange({ ...filters, account: e.target.value })} style={{ ...inputStyle, cursor: "pointer", minWidth: 160 }}><option value="all">All Accounts</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.company}</option>)}</select>
      <div ref={dropRef} style={{ position: "relative" }}>
        <button onClick={() => setShowTypeDropdown(v => !v)} style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, border: `1px solid ${showTypeDropdown ? T.green + "66" : T.border}` }}><span>🏷</span><span>{selectedCount === totalTypes ? "All Types" : `${selectedCount} type${selectedCount !== 1 ? "s" : ""}`}</span><span style={{ fontSize: 9, marginLeft: 4, color: T.muted }}>▼</span></button>
        {showTypeDropdown && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100, minWidth: 260, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 0", boxShadow: "0 12px 32px rgba(0,0,0,0.5)", animation: "panelIn 0.15s ease" }}>
            <button onClick={() => onChange({ ...filters, types: selectedCount === totalTypes ? [] : Object.keys(ACTIVITY_TYPES) })} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "7px 14px", fontSize: 11.5, color: T.green, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>{selectedCount === totalTypes ? "Deselect All" : "Select All"}</button>
            {Object.entries(ACTIVITY_TYPES).map(([key, cfg]) => { const active = filters.types.includes(key); const count = activityCounts[key] || 0; return (
              <button key={key} onClick={() => { const newTypes = active ? filters.types.filter(t => t !== key) : [...filters.types, key]; onChange({ ...filters, types: newTypes }); }} style={{ width: "100%", textAlign: "left", background: active ? cfg.bgTint : "none", border: "none", padding: "7px 14px", fontSize: 11.5, color: active ? T.text : T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8, transition: "all 0.1s" }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${active ? cfg.color : T.border}`, background: active ? cfg.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", flexShrink: 0 }}>{active ? "✓" : ""}</span><span>{cfg.icon}</span><span style={{ flex: 1 }}>{cfg.label}</span><span style={{ fontSize: 10, color: T.muted }}>{count}</span>
              </button>
            ); })}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="date" value={filters.dateFrom} onChange={e => onChange({ ...filters, dateFrom: e.target.value })} style={{ ...inputStyle, width: 130, fontSize: 11 }} /><span style={{ color: T.muted, fontSize: 11 }}>→</span><input type="date" value={filters.dateTo} onChange={e => onChange({ ...filters, dateTo: e.target.value })} style={{ ...inputStyle, width: 130, fontSize: 11 }} /></div>
      <button onClick={() => onChange({ ...filters, pinnedOnly: !filters.pinnedOnly })} style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, border: `1px solid ${filters.pinnedOnly ? T.warning + "66" : T.border}`, color: filters.pinnedOnly ? T.warning : T.muted, background: filters.pinnedOnly ? `rgba(${hexToRgb(T.warning)},0.06)` : T.surface }}>📌 Pinned</button>
    </div>
  );
}

function TimelineStatsSummary({ activities, filteredCount }) {
  const total = activities.length;
  const pinned = activities.filter(a => a.pinned).length;
  const thisWeek = activities.filter(a => { const d = new Date(a.createdAt); const now = new Date("2026-03-01T12:00:00Z"); return (now - d) < 7 * 86400000; }).length;
  const accounts = new Set(activities.map(a => a.accountId)).size;
  const statStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 16px" };
  const numStyle = { fontSize: 18, fontWeight: 700, color: T.text, fontFamily: "'DM Sans', sans-serif" };
  const labelStyle = { fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" };
  return (
    <div style={{ display: "flex", gap: 0, background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: 16 }}>
      <div style={statStyle}><span style={numStyle}>{total}</span><span style={labelStyle}>Total</span></div>
      <div style={{ width: 1, background: T.border, margin: "8px 0" }} />
      <div style={statStyle}><span style={{ ...numStyle, color: T.green }}>{thisWeek}</span><span style={labelStyle}>This Week</span></div>
      <div style={{ width: 1, background: T.border, margin: "8px 0" }} />
      <div style={statStyle}><span style={{ ...numStyle, color: T.warning }}>{pinned}</span><span style={labelStyle}>Pinned</span></div>
      <div style={{ width: 1, background: T.border, margin: "8px 0" }} />
      <div style={statStyle}><span style={{ ...numStyle, color: T.info }}>{accounts}</span><span style={labelStyle}>Accounts</span></div>
      <div style={{ width: 1, background: T.border, margin: "8px 0" }} />
      <div style={statStyle}><span style={{ ...numStyle, color: T.purple }}>{filteredCount}</span><span style={labelStyle}>Showing</span></div>
    </div>
  );
}

function ActivityTimelinePanel({ accounts: externalAccounts }) {
  const accts = externalAccounts?.length ? externalAccounts : TIMELINE_DEMO_ACCOUNTS;
  const [activities, setActivities] = useState(() => generateDemoActivities());
  const [expandedId, setExpandedId] = useState(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const scrollRef = useRef(null);
  const [filters, setFilters] = useState({ search: "", account: "all", types: Object.keys(ACTIVITY_TYPES), dateFrom: "", dateTo: "", pinnedOnly: false });
  const activityCounts = useMemo(() => { const counts = {}; activities.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; }); return counts; }, [activities]);
  const filtered = useMemo(() => {
    let result = activities;
    if (filters.account !== "all") result = result.filter(a => a.accountId === filters.account);
    if (filters.types.length < Object.keys(ACTIVITY_TYPES).length) result = result.filter(a => filters.types.includes(a.type));
    if (filters.pinnedOnly) result = result.filter(a => a.pinned);
    if (filters.dateFrom) result = result.filter(a => new Date(a.createdAt) >= new Date(filters.dateFrom));
    if (filters.dateTo) result = result.filter(a => new Date(a.createdAt) <= new Date(filters.dateTo + "T23:59:59Z"));
    if (filters.search.trim()) { const q = filters.search.toLowerCase(); result = result.filter(a => a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q) || a.source?.toLowerCase().includes(q) || a.createdBy?.toLowerCase().includes(q) || JSON.stringify(a.metadata || {}).toLowerCase().includes(q)); }
    return result.sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; return new Date(b.createdAt) - new Date(a.createdAt); });
  }, [activities, filters]);
  const visibleActivities = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const handleScroll = useCallback(() => { const el = scrollRef.current; if (!el || !hasMore) return; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) setVisibleCount(v => Math.min(v + 25, filtered.length)); }, [hasMore, filtered.length]);
  useEffect(() => { setVisibleCount(25); }, [filters]);
  const togglePin = useCallback((id) => { setActivities(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a)); }, []);
  const addNote = useCallback((note) => { setActivities(prev => [note, ...prev]); }, []);
  const accountMap = useMemo(() => { const m = {}; accts.forEach(a => { m[a.id] = a.company; }); return m; }, [accts]);
  const groupedActivities = useMemo(() => { const groups = []; let currentGroup = null; visibleActivities.forEach(activity => { const group = getDateGroup(activity.createdAt); if (group !== currentGroup) { groups.push({ type: "header", label: group }); currentGroup = group; } groups.push({ type: "activity", data: activity }); }); return groups; }, [visibleActivities]);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <FeatureExplainer
        icon="📜" title="Activity Timeline" color={T.info}
        bullets={[
          "Aggregates every customer touchpoint — emails, calls, meetings, support tickets, notes, and product events — into a single chronological feed so nothing falls through the cracks.",
          "Pin critical activities, filter by type or account, and search across all interactions to quickly find context before any customer call.",
          "Infinite-scroll timeline with date grouping so you can scan weeks of activity in seconds and spot engagement gaps before they become churn risk.",
        ]}
        workflow={[
          "Activities are auto-ingested from email, CRM, support, and product telemetry",
          "Filter by account, activity type, date range, or keyword search",
          "Pin important activities so they stay at the top of your feed",
          "Add manual notes to capture context from calls or hallway conversations",
        ]}
        outputLabel="What You See"
        outputItems={[
          { icon: "✉️", text: "Emails, meetings, and call logs in context" },
          { icon: "🎫", text: "Support tickets and resolution status" },
          { icon: "📝", text: "Manual notes and internal context" },
          { icon: "📌", text: "Pinned activities for quick reference" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "👤", text: "CSMs preparing for customer calls" },
          { icon: "🔄", text: "Handoff scenarios — full account context instantly" },
          { icon: "👥", text: "CS leaders reviewing team engagement patterns" },
        ]}
      />
      <TimelineStatsSummary activities={activities} filteredCount={filtered.length} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddNote(true)} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Note</button>
          <button onClick={() => setFilters({ search: "", account: "all", types: Object.keys(ACTIVITY_TYPES), dateFrom: "", dateTo: "", pinnedOnly: false })} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↻ Reset Filters</button>
        </div>
        <div style={{ fontSize: 11, color: T.muted }}>{filtered.length} activit{filtered.length !== 1 ? "ies" : "y"} · Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}</div>
      </div>
      <TimelineFilterBar filters={filters} onChange={setFilters} accounts={accts} activityCounts={activityCounts} />
      <div ref={scrollRef} onScroll={handleScroll} style={{ maxHeight: "calc(100vh - 380px)", overflowY: "auto", paddingRight: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}><div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🔍</div><div style={{ fontSize: 14, color: T.muted, marginBottom: 4 }}>No activities match your filters</div><div style={{ fontSize: 12, color: "#334155" }}>Try adjusting your search, date range, or activity type filters</div></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {groupedActivities.map((item, idx) => {
              if (item.type === "header") return <div key={`h-${idx}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 8px", marginTop: idx > 0 ? 8 : 0 }}><div style={{ fontSize: 11, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>{item.label}</div><div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${T.green}33, transparent)` }} /></div>;
              const a = item.data;
              return <ActivityCard key={a.id} activity={a} expanded={expandedId === a.id} onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)} onPin={togglePin} accountName={filters.account === "all" ? accountMap[a.accountId] : null} />;
            })}
            {hasMore && <div style={{ textAlign: "center", padding: "20px", color: T.muted, fontSize: 12 }}><div style={{ width: 20, height: 20, border: `2px solid ${T.green}44`, borderTop: `2px solid ${T.green}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />Loading more activities...</div>}
            {!hasMore && filtered.length > 0 && <div style={{ textAlign: "center", padding: "20px", color: "#334155", fontSize: 11 }}>— End of timeline ({filtered.length} activit{filtered.length !== 1 ? "ies" : "y"}) —</div>}
          </div>
        )}
      </div>
      {showAddNote && <AddNoteModal accounts={accts} onAdd={addNote} onClose={() => setShowAddNote(false)} />}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// RENEWAL & EXPANSION PIPELINE PANEL (Blueprint §3.11 — P1)
// Track renewals, expansion opportunities, and revenue forecasts
// ═══════════════════════════════════════════════════════════════════════════

const PIPELINE_STAGES = [
  { id: "not_started",  label: "Not Started",  icon: "⏳", color: "#64748b", short: "New" },
  { id: "in_progress",  label: "In Progress",  icon: "🔄", color: "#06b6d4", short: "Active" },
  { id: "committed",    label: "Committed",     icon: "🤝", color: "#8b5cf6", short: "Committed" },
  { id: "closed_won",   label: "Closed Won",    icon: "✅", color: "#10b981", short: "Won" },
  { id: "closed_lost",  label: "Closed Lost",   icon: "❌", color: "#ef4444", short: "Lost" },
];
const PIPELINE_STAGE_MAP = {};
PIPELINE_STAGES.forEach(s => { PIPELINE_STAGE_MAP[s.id] = s; });

const OPP_TYPES = {
  renewal:    { label: "Renewal",    icon: "🔄", color: "#06b6d4", bgTint: "rgba(6,182,212,0.08)",   borderTint: "rgba(6,182,212,0.20)" },
  upsell:     { label: "Upsell",     icon: "📈", color: "#10b981", bgTint: "rgba(16,185,129,0.08)",  borderTint: "rgba(16,185,129,0.20)" },
  cross_sell: { label: "Cross-Sell", icon: "🔗", color: "#8b5cf6", bgTint: "rgba(139,92,246,0.08)",  borderTint: "rgba(139,92,246,0.20)" },
  add_on:     { label: "Add-On",     icon: "➕", color: "#f59e0b", bgTint: "rgba(245,158,11,0.08)",  borderTint: "rgba(245,158,11,0.20)" },
};

function getPipelineHealthColor(score) { return score >= 75 ? T.green : score >= 50 ? T.warning : T.error; }
function getPipelineHealthLabel(score) { return score >= 75 ? "Healthy" : score >= 50 ? "Moderate" : "At Risk"; }
function getPipelineLikelihoodLabel(score) { return score >= 80 ? "Very Likely" : score >= 60 ? "Likely" : score >= 40 ? "Moderate" : score >= 20 ? "Unlikely" : "Very Unlikely"; }

const PIPELINE_NOW = new Date("2026-03-01T12:00:00Z");
function pipelineDaysUntil(dateStr) { return Math.ceil((new Date(dateStr) - PIPELINE_NOW) / 86400000); }
function pipelineFormatDate(dateStr) { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function pipelineGetDaysLabel(days) { return days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`; }
function pipelineGetDaysColor(days) { return days < 0 ? T.error : days <= 30 ? T.error : days <= 60 ? T.warning : T.green; }

const PIPELINE_DEMO_ACCOUNTS = [
  { id: "d1", company: "Acme Health",       industry: "healthcare", contact: "Sarah Johnson",    csm: "Marcus K." },
  { id: "d2", company: "PinPoint Financial", industry: "fintech",    contact: "James Chen",       csm: "Sarah R." },
  { id: "d3", company: "TalentForge",       industry: "hrtech",     contact: "Marcus Williams",  csm: "Alex P." },
  { id: "d4", company: "MetroPlex Realty",   industry: "realestate", contact: "Linda Park",       csm: "Sarah R." },
  { id: "d5", company: "CloudSync Pro",      industry: "saas",       contact: "Tom Reed",         csm: "Alex P." },
  { id: "d7", company: "DataVault AI",       industry: "saas",       contact: "Priya Sharma",     csm: "Marcus K." },
  { id: "d8", company: "FinLedger Corp",     industry: "fintech",    contact: "David Park",       csm: "Alex P." },
  { id: "d9", company: "MedSync Solutions",  industry: "healthcare", contact: "Dr. Amy Liu",      csm: "Sarah R." },
];

function generateDemoOpportunities() {
  return [
    { id: "r001", accountId: "d1", type: "renewal", stage: "in_progress", accountName: "Acme Health", currentMrr: 12500, estimatedValue: 150000, renewalDate: "2026-03-18", likelihoodScore: 82, healthScore: 74, assignedCsm: "Marcus K.", contact: "Sarah Johnson", notes: "CFO needs ROI summary before renewal committee on March 15. Strong product fit — 34% reduction in claims processing time.", aiRationale: "High adoption (68% core features), positive NPS trend (7→8), and quantified ROI ($1.2M recovered capacity) indicate strong renewal likelihood.", aiSuggestedApproach: "Lead with benchmark-driven ROI proof. Schedule CFO intro call to address value concerns directly. Propose multi-year lock-in with 8% discount.", signals: ["high_adoption", "positive_nps", "executive_engagement"], updatedAt: "2026-02-28T10:00:00Z" },
    { id: "r002", accountId: "d2", type: "renewal", stage: "committed", accountName: "PinPoint Financial", currentMrr: 18200, estimatedValue: 218400, renewalDate: "2026-04-01", likelihoodScore: 94, healthScore: 89, assignedCsm: "Sarah R.", contact: "James Chen", notes: "Verbal commitment received. Contract redline in progress. Expecting signed renewal by March 20.", aiRationale: "Top-quartile health score, expanding usage (3 new departments onboarded), and champion actively advocating internally.", aiSuggestedApproach: "Focus on expansion conversation alongside renewal. Usage data shows capacity for 2 additional modules.", signals: ["expanding_usage", "champion_advocacy", "multi_department"], updatedAt: "2026-02-25T14:30:00Z" },
    { id: "r003", accountId: "d4", type: "renewal", stage: "not_started", accountName: "MetroPlex Realty", currentMrr: 8400, estimatedValue: 100800, renewalDate: "2026-04-22", likelihoodScore: 28, healthScore: 34, assignedCsm: "Sarah R.", contact: "Linda Park", notes: "Critical mobile app issues ongoing. Linda gave March 7 deadline to resolve or they start evaluating alternatives.", aiRationale: "Health score dropped 18 points, critical support escalation unresolved, NPS fell to 3. Significant churn risk.", aiSuggestedApproach: "Immediate: resolve mobile stability within deadline. Then: service credit proposal + executive outreach. Leverage switching cost (22 deals closed on platform).", signals: ["health_drop", "support_escalation", "negative_nps"], updatedAt: "2026-02-28T15:00:00Z" },
    { id: "r004", accountId: "d3", type: "renewal", stage: "in_progress", accountName: "TalentForge", currentMrr: 6800, estimatedValue: 81600, renewalDate: "2026-05-15", likelihoodScore: 76, healthScore: 82, assignedCsm: "Alex P.", contact: "Marcus Williams", notes: "Strong product fit but budget review in progress. Marcus is a strong champion — NPS 10.", aiRationale: "High NPS (10), strong adoption metrics, and vocal internal champion reduce churn risk despite budget uncertainty.", aiSuggestedApproach: "Arm Marcus with ROI ammunition for budget meeting. Prepare cost-savings analysis showing recruiting efficiency gains.", signals: ["strong_champion", "high_nps", "budget_review"], updatedAt: "2026-02-20T09:00:00Z" },
    { id: "r005", accountId: "d7", type: "renewal", stage: "not_started", accountName: "DataVault AI", currentMrr: 22000, estimatedValue: 264000, renewalDate: "2026-06-01", likelihoodScore: 68, healthScore: 61, assignedCsm: "Marcus K.", contact: "Priya Sharma", notes: "New CTO joined in January — haven't built relationship yet. Product usage steady but no executive engagement.", aiRationale: "Stable usage metrics but leadership change introduces risk. Need to establish relationship with new CTO before renewal discussions.", aiSuggestedApproach: "Priority: executive intro meeting with new CTO. Present platform value story with DataVault-specific metrics. Consider executive sponsor alignment.", signals: ["leadership_change", "steady_usage", "no_exec_engagement"], updatedAt: "2026-02-18T11:00:00Z" },
    { id: "r006", accountId: "d8", type: "renewal", stage: "committed", accountName: "FinLedger Corp", currentMrr: 14500, estimatedValue: 174000, renewalDate: "2026-03-31", likelihoodScore: 91, healthScore: 86, assignedCsm: "Alex P.", contact: "David Park", notes: "Signed 2-year renewal with 12% uplift. Contract in legal review. Expected close by March 15.", aiRationale: "Strong multi-year commitment signal. Usage expanding, new compliance module adopted, and David actively references platform in investor materials.", aiSuggestedApproach: "Ensure smooth legal review. Begin expansion discussion for API tier upgrade (current usage at 85% of limit).", signals: ["multi_year_signal", "expanding_usage", "compliance_adoption"], updatedAt: "2026-02-27T16:00:00Z" },
    { id: "r007", accountId: "d9", type: "renewal", stage: "in_progress", accountName: "MedSync Solutions", currentMrr: 9800, estimatedValue: 117600, renewalDate: "2026-04-10", likelihoodScore: 72, healthScore: 66, assignedCsm: "Sarah R.", contact: "Dr. Amy Liu", notes: "Positive on product but requesting HIPAA audit trail improvements before committing. Engineering has this on Q2 roadmap.", aiRationale: "Good product-market fit for healthcare vertical. Specific feature request is addressable. Risk is timing — renewal before feature delivery.", aiSuggestedApproach: "Share product roadmap showing HIPAA audit trail in Q2 scope. Offer early access / beta participation. Consider bridge pricing for gap period.", signals: ["feature_request", "healthcare_compliance", "roadmap_dependency"], updatedAt: "2026-02-26T13:00:00Z" },
    { id: "e001", accountId: "d5", type: "upsell", stage: "closed_won", accountName: "CloudSync Pro", currentMrr: 18400, estimatedValue: 50400, renewalDate: null, likelihoodScore: 95, healthScore: 91, assignedCsm: "Alex P.", contact: "Tom Reed", notes: "Successfully upgraded from Growth to Enterprise tier. $4,200/mo uplift. SSO and advanced analytics activated.", aiRationale: "Usage signals triggered expansion: plan limits at 92%, growing team (8→14 users), 40% deploy frequency increase, and positive sentiment trajectory.", aiSuggestedApproach: "Completed. Monitor Enterprise adoption and identify cross-sell for dedicated support channel add-on.", signals: ["plan_limit_approaching", "team_growth", "usage_milestone"], updatedAt: "2026-02-22T10:00:00Z" },
    { id: "e002", accountId: "d2", type: "cross_sell", stage: "in_progress", accountName: "PinPoint Financial", currentMrr: 18200, estimatedValue: 36000, renewalDate: null, likelihoodScore: 74, healthScore: 89, assignedCsm: "Sarah R.", contact: "James Chen", notes: "AI detected opportunity: compliance reporting module. PinPoint's audit team manually exports data weekly — automation could save 15 hrs/week.", aiRationale: "Pattern analysis shows: 3 departments now active, compliance team exporting data 4x/week manually, and recent SOC2 audit required additional reporting.", aiSuggestedApproach: "Demo compliance automation module to audit team. Lead with time-savings ROI (15 hrs/week × $85/hr = $66K/year). Bundle with renewal for discount.", signals: ["manual_workaround", "compliance_need", "multi_department"], updatedAt: "2026-02-24T09:00:00Z" },
    { id: "e003", accountId: "d1", type: "upsell", stage: "not_started", accountName: "Acme Health", currentMrr: 12500, estimatedValue: 24000, renewalDate: null, likelihoodScore: 58, healthScore: 74, assignedCsm: "Marcus K.", contact: "Sarah Johnson", notes: "AI detected: API usage at 78% of plan limit and growing 12% month-over-month. Projected to hit cap in 6 weeks.", aiRationale: "API consumption trending toward plan ceiling. Historical pattern shows customers upgrade within 30 days of hitting 80% utilization.", aiSuggestedApproach: "Proactive outreach before hitting limit. Present usage trend data and offer seamless upgrade path. Frame as growth celebration, not limitation.", signals: ["api_limit_approaching", "usage_growth_trend"], updatedAt: "2026-02-26T08:00:00Z" },
    { id: "e004", accountId: "d3", type: "add_on", stage: "not_started", accountName: "TalentForge", currentMrr: 6800, estimatedValue: 9600, renewalDate: null, likelihoodScore: 62, healthScore: 82, assignedCsm: "Alex P.", contact: "Marcus Williams", notes: "AI detected: team requesting advanced analytics features 6 times in last 30 days via support. Strong signal for analytics add-on.", aiRationale: "Repeated feature requests for analytics capabilities (6 tickets in 30 days). Current plan doesn't include advanced reporting. Support tickets indicate strong demand.", aiSuggestedApproach: "Share analytics add-on overview with Marcus. Offer 30-day trial to validate value before purchase. Time alongside renewal for packaging discount.", signals: ["feature_requests", "support_pattern", "analytics_demand"], updatedAt: "2026-02-23T14:00:00Z" },
    { id: "e005", accountId: "d7", type: "cross_sell", stage: "not_started", accountName: "DataVault AI", currentMrr: 22000, estimatedValue: 18000, renewalDate: null, likelihoodScore: 45, healthScore: 61, assignedCsm: "Marcus K.", contact: "Priya Sharma", notes: "AI detected opportunity but timing is risky. New CTO may shift priorities. Recommend waiting until executive relationship established.", aiRationale: "Data team actively using 3 of 5 available integrations. Pattern suggests value in enterprise integration bundle. However, leadership change introduces timing risk.", aiSuggestedApproach: "Hold until CTO intro meeting completed. Then present integration bundle as strategic alignment conversation, not sales pitch.", signals: ["integration_adoption", "leadership_change_risk"], updatedAt: "2026-02-19T10:00:00Z" },
    { id: "r010", accountId: "d5", type: "renewal", stage: "closed_won", accountName: "CloudSync Pro", currentMrr: 14200, estimatedValue: 170400, renewalDate: "2026-01-15", likelihoodScore: 92, healthScore: 88, assignedCsm: "Alex P.", contact: "Tom Reed", notes: "Renewed and expanded to Enterprise. Smooth process — signed 3 days before renewal date.", aiRationale: null, aiSuggestedApproach: null, signals: [], updatedAt: "2026-01-12T10:00:00Z" },
    { id: "r011", accountId: "d8", type: "renewal", stage: "closed_won", accountName: "FinLedger Corp", currentMrr: 11500, estimatedValue: 138000, renewalDate: "2025-12-01", likelihoodScore: 88, healthScore: 82, assignedCsm: "Alex P.", contact: "David Park", notes: "Renewed with 15% uplift. Added compliance module.", aiRationale: null, aiSuggestedApproach: null, signals: [], updatedAt: "2025-11-28T10:00:00Z" },
  ];
}

const PIPELINE_CSMS = ["Marcus K.", "Sarah R.", "Alex P."];

function PipelineDashboardCards({ opportunities }) {
  const active = opportunities.filter(o => !["closed_won", "closed_lost"].includes(o.stage));
  const renewals = active.filter(o => o.type === "renewal");
  const expansions = active.filter(o => o.type !== "renewal");
  const atRisk = renewals.filter(o => o.healthScore < 50 || o.likelihoodScore < 40);
  const closedWon = opportunities.filter(o => o.stage === "closed_won");
  const closedLost = opportunities.filter(o => o.stage === "closed_lost");
  const winRate = closedWon.length + closedLost.length > 0 ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100) : 0;
  const totalPipeline = renewals.reduce((s, o) => s + o.estimatedValue, 0);
  const atRiskValue = atRisk.reduce((s, o) => s + o.estimatedValue, 0);
  const expansionValue = expansions.reduce((s, o) => s + o.estimatedValue, 0);
  const wonValue = closedWon.reduce((s, o) => s + o.estimatedValue, 0);
  const cards = [
    { label: "Renewal Pipeline", value: `$${(totalPipeline/1000).toFixed(0)}K`, sub: `${renewals.length} renewals`, color: T.info, icon: "🔄" },
    { label: "At-Risk Value",    value: `$${(atRiskValue/1000).toFixed(0)}K`,   sub: `${atRisk.length} accounts`,  color: T.error, icon: "⚠️" },
    { label: "Expansion Pipeline", value: `$${(expansionValue/1000).toFixed(0)}K`, sub: `${expansions.length} opportunities`, color: T.purple, icon: "📈" },
    { label: "Win Rate",         value: `${winRate}%`,                          sub: `${closedWon.length}W / ${closedLost.length}L`, color: T.green, icon: "🏆" },
    { label: "Closed Revenue",   value: `$${(wonValue/1000).toFixed(0)}K`,      sub: "This period",               color: T.amber, icon: "💰" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
      {cards.map((c, i) => (
        <div key={i} style={{ background: T.surface, borderRadius: 14, padding: "16px 18px", border: `1px solid ${T.border}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -8, right: -4, fontSize: 40, opacity: 0.05 }}>{c.icon}</div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.color, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{c.value}</div>
          <div style={{ fontSize: 11, color: T.subtle }}>{c.sub}</div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${c.color}, transparent)`, opacity: 0.5 }} />
        </div>
      ))}
    </div>
  );
}

function OpportunityCard({ opp, compact, onSelect, selected, onDragStart, onDragEnd, isDragging }) {
  const [hovered, setHovered] = useState(false);
  const typeConfig = OPP_TYPES[opp.type] || OPP_TYPES.renewal;
  const days = opp.renewalDate ? pipelineDaysUntil(opp.renewalDate) : null;
  const healthCol = getPipelineHealthColor(opp.healthScore);
  const likelihoodCol = opp.likelihoodScore >= 70 ? T.green : opp.likelihoodScore >= 40 ? T.warning : T.error;
  return (
    <div draggable onDragStart={e => { e.dataTransfer.setData("text/plain", opp.id); e.dataTransfer.effectAllowed = "move"; onDragStart?.(opp.id); }} onDragEnd={() => onDragEnd?.()} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => onSelect?.(opp.id)} style={{ background: selected ? "rgba(16,185,129,0.04)" : hovered ? "rgba(255,255,255,0.02)" : T.surface2, border: `1px solid ${selected ? T.green + "44" : isDragging ? T.info + "44" : T.border}`, borderRadius: 12, padding: compact ? "10px 12px" : "14px 16px", cursor: "grab", transition: "all 0.2s ease", opacity: isDragging ? 0.5 : 1, boxShadow: selected ? `0 0 0 1px ${T.green}22` : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9.5, fontWeight: 600, color: typeConfig.color, background: typeConfig.bgTint, border: `1px solid ${typeConfig.borderTint}`, padding: "2px 7px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.3px" }}>{typeConfig.icon} {typeConfig.label}</span>
          {opp.signals?.includes("health_drop") && <span style={{ fontSize: 9, color: T.error }}>🔻</span>}
          {opp.signals?.includes("plan_limit_approaching") && <span style={{ fontSize: 9, color: T.warning }}>⚡</span>}
        </div>
        {days !== null && <span style={{ fontSize: 10, fontWeight: 600, color: pipelineGetDaysColor(days), whiteSpace: "nowrap" }}>{pipelineGetDaysLabel(days)}</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4, lineHeight: 1.3 }}>{opp.accountName}</div>
      <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 8 }}>{opp.contact} · {opp.assignedCsm}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "6px 8px", border: `1px solid ${T.border}` }}><div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.3px" }}>MRR</div><div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>${opp.currentMrr?.toLocaleString()}</div></div>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "6px 8px", border: `1px solid ${T.border}` }}><div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.3px" }}>Value</div><div style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>${(opp.estimatedValue/1000).toFixed(0)}K</div></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: compact ? 0 : 6 }}>
        <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 9, color: T.muted }}>Health</span><span style={{ fontSize: 9, fontWeight: 600, color: healthCol }}>{opp.healthScore}</span></div><div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 2, width: `${opp.healthScore}%`, background: healthCol, transition: "width 0.4s ease" }} /></div></div>
        <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 9, color: T.muted }}>Likelihood</span><span style={{ fontSize: 9, fontWeight: 600, color: likelihoodCol }}>{opp.likelihoodScore}%</span></div><div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 2, width: `${opp.likelihoodScore}%`, background: likelihoodCol, transition: "width 0.4s ease" }} /></div></div>
      </div>
      {!compact && opp.signals?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>{opp.signals.slice(0, 3).map((s, i) => <span key={i} style={{ fontSize: 9, color: T.subtle, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, padding: "2px 6px", borderRadius: 4 }}>{s.replace(/_/g, " ")}</span>)}</div>}
    </div>
  );
}

function PipelineKanbanBoard({ opportunities, onStageChange, onSelect, selectedId }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const handleDrop = useCallback((stageId, e) => { e.preventDefault(); const oppId = e.dataTransfer.getData("text/plain"); if (oppId) onStageChange(oppId, stageId); setDragOverStage(null); setDraggingId(null); }, [onStageChange]);
  const handleDragOver = useCallback((stageId, e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStage(stageId); }, []);
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, minHeight: 500 }}>
      {PIPELINE_STAGES.map(stage => {
        const stageOpps = opportunities.filter(o => o.stage === stage.id);
        const stageValue = stageOpps.reduce((s, o) => s + o.estimatedValue, 0);
        const isOver = dragOverStage === stage.id;
        return (
          <div key={stage.id} onDrop={e => handleDrop(stage.id, e)} onDragOver={e => handleDragOver(stage.id, e)} onDragLeave={() => setDragOverStage(null)} style={{ flex: "1 1 0", minWidth: 240, maxWidth: 320, background: isOver ? `rgba(${hexToRgb(stage.color)},0.04)` : "rgba(255,255,255,0.01)", border: `1px solid ${isOver ? stage.color + "44" : T.border}`, borderRadius: 14, display: "flex", flexDirection: "column", transition: "all 0.2s ease" }}>
            <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.border}`, background: `rgba(${hexToRgb(stage.color)},0.03)`, borderRadius: "14px 14px 0 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14 }}>{stage.icon}</span><span style={{ fontSize: 12, fontWeight: 700, color: stage.color, textTransform: "uppercase", letterSpacing: "0.3px" }}>{stage.label}</span></div><span style={{ fontSize: 10, fontWeight: 700, color: T.text, background: `rgba(${hexToRgb(stage.color)},0.15)`, padding: "2px 8px", borderRadius: 10, minWidth: 22, textAlign: "center" }}>{stageOpps.length}</span></div>
              <div style={{ fontSize: 10, color: T.muted }}>${(stageValue/1000).toFixed(0)}K total value</div>
            </div>
            <div style={{ padding: 8, flex: 1, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: "calc(100vh - 480px)" }}>
              {stageOpps.length === 0 && <div style={{ padding: "24px 12px", textAlign: "center", border: `2px dashed ${isOver ? stage.color + "44" : T.border}`, borderRadius: 10, transition: "all 0.2s" }}><div style={{ fontSize: 11, color: T.muted }}>{isOver ? "Drop here" : "No opportunities"}</div></div>}
              {stageOpps.map(opp => <OpportunityCard key={opp.id} opp={opp} compact onSelect={onSelect} selected={selectedId === opp.id} onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)} isDragging={draggingId === opp.id} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineListView({ opportunities, onSelect, selectedId, onStageChange }) {
  const [sortField, setSortField] = useState("renewalDate");
  const [sortDir, setSortDir] = useState("asc");
  const toggleSort = (field) => { if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortField(field); setSortDir("asc"); } };
  const sorted = useMemo(() => {
    return [...opportunities].sort((a, b) => { let va = a[sortField], vb = b[sortField]; if (sortField === "renewalDate") { va = va ? new Date(va).getTime() : Infinity; vb = vb ? new Date(vb).getTime() : Infinity; } if (typeof va === "string") va = va.toLowerCase(); if (typeof vb === "string") vb = vb.toLowerCase(); if (va < vb) return sortDir === "asc" ? -1 : 1; if (va > vb) return sortDir === "asc" ? 1 : -1; return 0; });
  }, [opportunities, sortField, sortDir]);
  const thStyle = { padding: "10px 12px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}` };
  const tdStyle = { padding: "12px 12px", fontSize: 12, color: T.text, borderBottom: `1px solid ${T.border}`, verticalAlign: "middle" };
  const sortIcon = (field) => sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";
  return (
    <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${T.border}`, background: T.surface }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif" }}>
        <thead><tr style={{ background: "rgba(255,255,255,0.02)" }}>
          <th style={thStyle} onClick={() => toggleSort("accountName")}>Account{sortIcon("accountName")}</th><th style={thStyle} onClick={() => toggleSort("type")}>Type{sortIcon("type")}</th><th style={thStyle} onClick={() => toggleSort("stage")}>Stage{sortIcon("stage")}</th><th style={thStyle} onClick={() => toggleSort("currentMrr")}>MRR{sortIcon("currentMrr")}</th><th style={thStyle} onClick={() => toggleSort("estimatedValue")}>Value{sortIcon("estimatedValue")}</th><th style={thStyle} onClick={() => toggleSort("renewalDate")}>Renewal{sortIcon("renewalDate")}</th><th style={thStyle} onClick={() => toggleSort("healthScore")}>Health{sortIcon("healthScore")}</th><th style={thStyle} onClick={() => toggleSort("likelihoodScore")}>Likelihood{sortIcon("likelihoodScore")}</th><th style={thStyle} onClick={() => toggleSort("assignedCsm")}>CSM{sortIcon("assignedCsm")}</th>
        </tr></thead>
        <tbody>
          {sorted.map(opp => { const typeConfig = OPP_TYPES[opp.type] || OPP_TYPES.renewal; const stageConfig = PIPELINE_STAGE_MAP[opp.stage]; const days = opp.renewalDate ? pipelineDaysUntil(opp.renewalDate) : null; const healthCol = getPipelineHealthColor(opp.healthScore); const likCol = opp.likelihoodScore >= 70 ? T.green : opp.likelihoodScore >= 40 ? T.warning : T.error; return (
            <tr key={opp.id} onClick={() => onSelect?.(opp.id)} style={{ cursor: "pointer", transition: "background 0.15s", background: selectedId === opp.id ? "rgba(16,185,129,0.04)" : "transparent" }} onMouseEnter={e => { if (selectedId !== opp.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }} onMouseLeave={e => { if (selectedId !== opp.id) e.currentTarget.style.background = "transparent"; }}>
              <td style={tdStyle}><div style={{ fontWeight: 600, marginBottom: 2 }}>{opp.accountName}</div><div style={{ fontSize: 10, color: T.muted }}>{opp.contact}</div></td>
              <td style={tdStyle}><span style={{ fontSize: 10, fontWeight: 600, color: typeConfig.color, background: typeConfig.bgTint, border: `1px solid ${typeConfig.borderTint}`, padding: "3px 8px", borderRadius: 5 }}>{typeConfig.icon} {typeConfig.label}</span></td>
              <td style={tdStyle}><select value={opp.stage} onClick={e => e.stopPropagation()} onChange={e => onStageChange(opp.id, e.target.value)} style={{ background: `rgba(${hexToRgb(stageConfig.color)},0.08)`, border: `1px solid ${stageConfig.color}33`, borderRadius: 6, padding: "4px 8px", fontSize: 10.5, color: stageConfig.color, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}</select></td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>${opp.currentMrr?.toLocaleString()}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: T.amber }}>${(opp.estimatedValue/1000).toFixed(0)}K</td>
              <td style={tdStyle}>{opp.renewalDate ? <div><div style={{ fontSize: 11.5 }}>{pipelineFormatDate(opp.renewalDate)}</div><div style={{ fontSize: 10, fontWeight: 600, color: pipelineGetDaysColor(days), marginTop: 1 }}>{pipelineGetDaysLabel(days)}</div></div> : <span style={{ fontSize: 10, color: T.muted }}>—</span>}</td>
              <td style={tdStyle}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 32, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 3, width: `${opp.healthScore}%`, background: healthCol }} /></div><span style={{ fontSize: 11, fontWeight: 600, color: healthCol }}>{opp.healthScore}</span></div></td>
              <td style={tdStyle}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 32, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 3, width: `${opp.likelihoodScore}%`, background: likCol }} /></div><span style={{ fontSize: 11, fontWeight: 600, color: likCol }}>{opp.likelihoodScore}%</span></div></td>
              <td style={{ ...tdStyle, fontSize: 11, color: T.subtle }}>{opp.assignedCsm}</td>
            </tr>
          ); })}
        </tbody>
      </table>
    </div>
  );
}

function PipelineForecastView({ opportunities }) {
  const months = ["Mar 2026", "Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026"];
  const monthKeys = ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];
  const forecast = useMemo(() => {
    return monthKeys.map((mk, i) => {
      const renewals = opportunities.filter(o => o.type === "renewal" && o.renewalDate && o.renewalDate.startsWith(mk));
      const totalValue = renewals.reduce((s, o) => s + o.estimatedValue, 0);
      const weightedValue = renewals.reduce((s, o) => s + (o.estimatedValue * o.likelihoodScore / 100), 0);
      const atRiskValue = renewals.filter(o => o.likelihoodScore < 50).reduce((s, o) => s + o.estimatedValue, 0);
      const committedValue = renewals.filter(o => o.stage === "committed" || o.stage === "closed_won").reduce((s, o) => s + o.estimatedValue, 0);
      return { month: months[i], key: mk, total: totalValue, weighted: weightedValue, atRisk: atRiskValue, committed: committedValue, count: renewals.length, opps: renewals };
    });
  }, [opportunities]);
  const maxVal = Math.max(...forecast.map(f => f.total), 1);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[{ label: "Total Forecast", value: `$${(forecast.reduce((s,f) => s + f.total, 0)/1000).toFixed(0)}K`, color: T.info }, { label: "Weighted Forecast", value: `$${(forecast.reduce((s,f) => s + f.weighted, 0)/1000).toFixed(0)}K`, color: T.green }, { label: "At-Risk Revenue", value: `$${(forecast.reduce((s,f) => s + f.atRisk, 0)/1000).toFixed(0)}K`, color: T.error }].map((s, i) => (
          <div key={i} style={{ background: T.surface, borderRadius: 12, padding: "14px 18px", border: `1px solid ${T.border}` }}><div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div></div>
        ))}
      </div>
      <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>Revenue Forecast — Next 6 Months</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 220, marginBottom: 12 }}>
          {forecast.map((f, i) => { const totalH = maxVal > 0 ? (f.total / maxVal) * 180 : 0; const weightedH = maxVal > 0 ? (f.weighted / maxVal) * 180 : 0; const committedH = maxVal > 0 ? (f.committed / maxVal) * 180 : 0; return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: f.total > 0 ? T.text : T.muted }}>{f.total > 0 ? `$${(f.total/1000).toFixed(0)}K` : "—"}</div>
              <div style={{ width: "100%", maxWidth: 60, height: 180, display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: totalH, background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 8, transition: "height 0.6s ease" }} />
                <div style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: weightedH, background: `rgba(${hexToRgb(T.green)},0.25)`, borderRadius: 6, transition: "height 0.6s ease" }} />
                <div style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: committedH, background: T.green, borderRadius: 4, transition: "height 0.6s ease", opacity: 0.7 }} />
              </div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>{f.month.split(" ")[0]}</div>
              <div style={{ fontSize: 9, color: "#334155" }}>{f.count} renewal{f.count !== 1 ? "s" : ""}</div>
            </div>
          ); })}
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          {[{ label: "Total Pipeline", color: "rgba(6,182,212,0.3)" }, { label: "Weighted (likelihood-adjusted)", color: `rgba(${hexToRgb(T.green)},0.4)` }, { label: "Committed", color: T.green }].map((l, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} /><span style={{ fontSize: 10, color: T.subtle }}>{l.label}</span></div>)}
        </div>
      </div>
      <div style={{ marginTop: 16, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif" }}>
          <thead><tr style={{ background: "rgba(255,255,255,0.02)" }}>{["Month","Renewals","Pipeline","Weighted","Committed","At Risk"].map((h,i) => <th key={i} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: i === 0 ? "left" : "right", borderBottom: `1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
          <tbody>{forecast.map((f, i) => <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}><td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: T.text }}>{f.month}</td><td style={{ padding: "12px 14px", fontSize: 12, color: T.subtle, textAlign: "right" }}>{f.count}</td><td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: T.info, textAlign: "right" }}>{f.total > 0 ? `$${(f.total/1000).toFixed(0)}K` : "—"}</td><td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: T.green, textAlign: "right" }}>{f.weighted > 0 ? `$${(f.weighted/1000).toFixed(0)}K` : "—"}</td><td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: T.purple, textAlign: "right" }}>{f.committed > 0 ? `$${(f.committed/1000).toFixed(0)}K` : "—"}</td><td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: f.atRisk > 0 ? T.error : T.muted, textAlign: "right" }}>{f.atRisk > 0 ? `$${(f.atRisk/1000).toFixed(0)}K` : "—"}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function PipelineDetailSidebar({ opp, onClose, onStageChange, onNavigate }) {
  if (!opp) return null;
  const typeConfig = OPP_TYPES[opp.type] || OPP_TYPES.renewal;
  const stageConfig = PIPELINE_STAGE_MAP[opp.stage];
  const days = opp.renewalDate ? pipelineDaysUntil(opp.renewalDate) : null;
  const healthCol = getPipelineHealthColor(opp.healthScore);
  const sectionTitle = { fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 };
  const chipStyle = { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 500, background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.subtle };
  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 420, zIndex: 500, background: T.surface2, borderLeft: `1px solid ${T.border}`, boxShadow: "-8px 0 32px rgba(0,0,0,0.4)", animation: "slideIn 0.25s ease", overflowY: "auto" }}>
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, background: T.surface2, zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 10, fontWeight: 600, color: typeConfig.color, background: typeConfig.bgTint, border: `1px solid ${typeConfig.borderTint}`, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase" }}>{typeConfig.icon} {typeConfig.label}</span>{days !== null && <span style={{ fontSize: 10, fontWeight: 600, color: pipelineGetDaysColor(days) }}>{pipelineGetDaysLabel(days)}</span>}</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.text, margin: 0, lineHeight: 1.3 }}>{opp.accountName}</h3>
            <p style={{ fontSize: 11.5, color: T.muted, marginTop: 3 }}>{opp.contact} · {opp.assignedCsm}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, padding: 4, flexShrink: 0 }}>✕</button>
        </div>
      </div>
      <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div><div style={sectionTitle}>Pipeline Stage</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{PIPELINE_STAGES.map(s => <button key={s.id} onClick={() => onStageChange(opp.id, s.id)} style={{ background: opp.stage === s.id ? `rgba(${hexToRgb(s.color)},0.15)` : "rgba(255,255,255,0.03)", border: `1px solid ${opp.stage === s.id ? s.color + "55" : T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 600, color: opp.stage === s.id ? s.color : T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>{s.icon} {s.short}</button>)}</div></div>
        <div><div style={sectionTitle}>Financial Details</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "12px 14px", border: `1px solid ${T.border}` }}><div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Current MRR</div><div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>${opp.currentMrr?.toLocaleString()}</div></div><div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "12px 14px", border: `1px solid ${T.border}` }}><div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Deal Value</div><div style={{ fontSize: 18, fontWeight: 700, color: T.amber }}>${opp.estimatedValue?.toLocaleString()}</div></div></div></div>
        <div><div style={sectionTitle}>Scores</div><div style={{ display: "flex", flexDirection: "column", gap: 10 }}><div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: T.subtle }}>Health Score</span><span style={{ fontSize: 11, fontWeight: 700, color: healthCol }}>{opp.healthScore} — {getPipelineHealthLabel(opp.healthScore)}</span></div><div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 3, width: `${opp.healthScore}%`, background: healthCol, transition: "width 0.4s" }} /></div></div><div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: T.subtle }}>Renewal Likelihood</span><span style={{ fontSize: 11, fontWeight: 700, color: opp.likelihoodScore >= 70 ? T.green : opp.likelihoodScore >= 40 ? T.warning : T.error }}>{opp.likelihoodScore}% — {getPipelineLikelihoodLabel(opp.likelihoodScore)}</span></div><div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 3, width: `${opp.likelihoodScore}%`, background: opp.likelihoodScore >= 70 ? T.green : opp.likelihoodScore >= 40 ? T.warning : T.error, transition: "width 0.4s" }} /></div></div></div></div>
        {opp.renewalDate && <div><div style={sectionTitle}>Renewal Date</div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{pipelineFormatDate(opp.renewalDate)}</span><span style={{ fontSize: 10, fontWeight: 700, color: pipelineGetDaysColor(days), background: `rgba(${hexToRgb(pipelineGetDaysColor(days))},0.08)`, padding: "3px 8px", borderRadius: 5 }}>{pipelineGetDaysLabel(days)}</span></div></div>}
        {opp.aiRationale && <div><div style={sectionTitle}>🤖 AI Analysis</div><div style={{ background: `rgba(${hexToRgb(T.green)},0.04)`, border: `1px solid ${T.green}22`, borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${T.green}55` }}><p style={{ fontSize: 12, color: T.subtle, lineHeight: 1.6, margin: 0 }}>{opp.aiRationale}</p></div></div>}
        {opp.aiSuggestedApproach && <div><div style={sectionTitle}>🎯 Suggested Approach</div><div style={{ background: `rgba(${hexToRgb(T.purple)},0.04)`, border: `1px solid ${T.purple}22`, borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${T.purple}55` }}><p style={{ fontSize: 12, color: T.subtle, lineHeight: 1.6, margin: 0 }}>{opp.aiSuggestedApproach}</p></div></div>}
        {opp.signals?.length > 0 && <div><div style={sectionTitle}>Detection Signals</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{opp.signals.map((s, i) => { const isRisk = s.includes("risk") || s.includes("drop") || s.includes("escalation") || s.includes("negative"); const isPositive = s.includes("growth") || s.includes("champion") || s.includes("high") || s.includes("expanding") || s.includes("positive") || s.includes("milestone"); const sigColor = isRisk ? T.error : isPositive ? T.green : T.info; return <span key={i} style={{ ...chipStyle, color: sigColor, background: `rgba(${hexToRgb(sigColor)},0.06)`, borderColor: `${sigColor}33` }}>{isRisk ? "⚠️" : isPositive ? "✓" : "📊"} {s.replace(/_/g, " ")}</span>; })}</div></div>}
        {opp.notes && <div><div style={sectionTitle}>Notes</div><p style={{ fontSize: 12, color: T.subtle, lineHeight: 1.6, margin: 0 }}>{opp.notes}</p></div>}
        <div><div style={sectionTitle}>Quick Actions</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{[{ label: "Draft Renewal Email", icon: "✉️", color: T.purple, target: "email-center" }, { label: "Generate ROI Report", icon: "📊", color: T.green, target: "generator" }, { label: "Schedule Meeting", icon: "📅", color: T.info, target: "meetings" }, { label: "View Account Timeline", icon: "📋", color: T.amber, target: "activity-timeline" }].map((a, i) => <button key={i} onClick={() => onNavigate && onNavigate(a.target)} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", fontSize: 12, color: T.text, textAlign: "left" }}><span>{a.icon}</span><span>{a.label}</span><span style={{ marginLeft: "auto", fontSize: 10, color: T.muted }}>→</span></button>)}</div></div>
      </div>
    </div>
  );
}

function PipelineFilterBar({ filters, onChange }) {
  const inputStyle = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: T.text, fontFamily: "'DM Sans', sans-serif", outline: "none" };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
      <div style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}><span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 13 }}>🔍</span><input value={filters.search} onChange={e => onChange({ ...filters, search: e.target.value })} placeholder="Search accounts..." style={{ ...inputStyle, paddingLeft: 32, width: "100%" }} /></div>
      <select value={filters.type} onChange={e => onChange({ ...filters, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="all">All Types</option>{Object.entries(OPP_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select>
      <select value={filters.csm} onChange={e => onChange({ ...filters, csm: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="all">All CSMs</option>{PIPELINE_CSMS.map(c => <option key={c} value={c}>{c}</option>)}</select>
      <select value={filters.window} onChange={e => onChange({ ...filters, window: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="all">All Time</option><option value="30">Next 30 days</option><option value="60">Next 60 days</option><option value="90">Next 90 days</option><option value="120">Next 120 days</option></select>
      <select value={filters.health} onChange={e => onChange({ ...filters, health: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="all">All Health</option><option value="healthy">Healthy (75+)</option><option value="moderate">Moderate (50-74)</option><option value="at_risk">At Risk (&lt;50)</option></select>
      <button onClick={() => onChange({ search: "", type: "all", csm: "all", window: "all", health: "all" })} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↻ Reset</button>
    </div>
  );
}

function RenewalPipelinePanel({ accounts: externalAccounts, onNavigate }) {
  const [opportunities, setOpportunities] = useState(() => generateDemoOpportunities());
  const [view, setView] = useState("kanban");
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({ search: "", type: "all", csm: "all", window: "all", health: "all" });
  const filtered = useMemo(() => {
    let result = opportunities;
    if (filters.search.trim()) { const q = filters.search.toLowerCase(); result = result.filter(o => o.accountName.toLowerCase().includes(q) || o.contact?.toLowerCase().includes(q) || o.notes?.toLowerCase().includes(q)); }
    if (filters.type !== "all") result = result.filter(o => o.type === filters.type);
    if (filters.csm !== "all") result = result.filter(o => o.assignedCsm === filters.csm);
    if (filters.health === "healthy") result = result.filter(o => o.healthScore >= 75);
    if (filters.health === "moderate") result = result.filter(o => o.healthScore >= 50 && o.healthScore < 75);
    if (filters.health === "at_risk") result = result.filter(o => o.healthScore < 50);
    if (filters.window !== "all") { const days = parseInt(filters.window); result = result.filter(o => { if (!o.renewalDate) return true; const d = pipelineDaysUntil(o.renewalDate); return d <= days && d >= -30; }); }
    return result;
  }, [opportunities, filters]);
  const handleStageChange = useCallback((oppId, newStage) => { setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, stage: newStage, updatedAt: new Date().toISOString() } : o)); }, []);
  const selectedOpp = selectedId ? opportunities.find(o => o.id === selectedId) : null;
  const viewTabs = [{ id: "kanban", label: "Kanban Board", icon: "◫" }, { id: "list", label: "List View", icon: "☰" }, { id: "forecast", label: "Forecast", icon: "📈" }];
  return (
    <div style={{ position: "relative" }}>
      <FeatureExplainer
        icon="🔄" title="Renewal & Expansion Pipeline" color={T.green}
        bullets={[
          "Tracks every renewal and expansion opportunity through a visual Kanban board with drag-and-drop stage management, list view, and revenue forecasting.",
          "Filter by type, CSM, health score, or renewal window to focus on the deals that matter most right now.",
          "Built-in forecast view projects revenue by stage and confidence so leadership can see pipeline health at a glance.",
        ]}
        workflow={[
          "Renewals and expansion opportunities populate automatically from account data",
          "Drag deals between stages on the Kanban board as conversations progress",
          "Click any deal for a detail sidebar with contacts, notes, and history",
          "Switch to Forecast view for revenue projections broken out by stage",
        ]}
        outputLabel="Pipeline Views"
        outputItems={[
          { icon: "◫", text: "Kanban board — visual stage management" },
          { icon: "☰", text: "List view — sortable table of all opportunities" },
          { icon: "📈", text: "Forecast — revenue projections by stage" },
          { icon: "🔍", text: "Detail sidebar — full context on any deal" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "🎯", text: "CSMs managing their renewal book of business" },
          { icon: "📊", text: "CS leaders forecasting retention revenue" },
          { icon: "💰", text: "Revenue teams tracking expansion pipeline" },
        ]}
      />
      <PipelineDashboardCards opportunities={opportunities} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          {viewTabs.map(tab => <button key={tab.id} onClick={() => setView(tab.id)} style={{ background: view === tab.id ? `rgba(${hexToRgb(T.green)},0.1)` : "transparent", border: "none", borderRight: `1px solid ${T.border}`, padding: "9px 16px", fontSize: 12, fontWeight: view === tab.id ? 700 : 400, color: view === tab.id ? T.green : T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}><span style={{ fontSize: 13 }}>{tab.icon}</span>{tab.label}</button>)}
        </div>
        <div style={{ fontSize: 11, color: T.muted }}>{filtered.length} opportunit{filtered.length !== 1 ? "ies" : "y"} · ${(filtered.reduce((s, o) => s + o.estimatedValue, 0)/1000).toFixed(0)}K total</div>
      </div>
      <PipelineFilterBar filters={filters} onChange={setFilters} />
      {view === "kanban" && <PipelineKanbanBoard opportunities={filtered} onStageChange={handleStageChange} onSelect={setSelectedId} selectedId={selectedId} />}
      {view === "list" && <PipelineListView opportunities={filtered} onSelect={setSelectedId} selectedId={selectedId} onStageChange={handleStageChange} />}
      {view === "forecast" && <PipelineForecastView opportunities={filtered} />}
      {selectedOpp && <><div onClick={() => setSelectedId(null)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.3)" }} /><PipelineDetailSidebar opp={selectedOpp} onClose={() => setSelectedId(null)} onStageChange={handleStageChange} onNavigate={onNavigate} /></>}
    </div>
  );
}

// NAV CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const NAV_ITEMS = [
  { id: "custom-dash", label: "My Dashboard", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg> },
  { id: "dashboard", label: "Portfolio", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: "health-score", label: "Health Scores", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { id: "playbooks", label: "Playbooks", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { id: "meetings", label: "Meetings AI", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
  { id: "surveys", label: "NPS / CSAT", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { id: "stakeholders", label: "Stakeholders", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: "qbr-deck", label: "QBR Decks", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
  { id: "email-center", label: "Email Center", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
  { id: "generator", label: "Report Generator", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/><path d="M19 15l.5 1.5L21 17l-1.5.5L19 19l-.5-1.5L17 17l1.5-.5L19 15z"/></svg> },
  { id: "next-action", label: "Next Actions", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg> },
  { id: "roi-calc", label: "CS ROI Calculator", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { id: "crm-hub", label: "CRM Hub", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> },
  { id: "churn-ai", label: "Churn Prediction", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  { id: "success-plans", label: "Success Plans", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
  { id: "activity-timeline", label: "Activity Timeline", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { id: "renewal-pipeline", label: "Pipeline", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { id: "lifecycle", label: "Lifecycle Tracker", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> },
  { id: "team-perf", label: "Team Performance", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: "revenue", label: "Revenue", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { id: "anomaly-alerts", label: "Smart Alerts", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
  { id: "customer-360", label: "Customer 360", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { id: "billing", label: "Billing", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { id: "admin", label: "Admin", icon: (a) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?T.green:"#475569"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD PANEL (with CSV import, statuses, assign, etc.)
// ═══════════════════════════════════════════════════════════════════════════
function DashboardPanel({ navigate, savedReports, accounts, onUpdateAccount, onImportAccounts }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);

  const filtered = accounts
    .filter(r => filter === "all" || r.status === filter)
    .filter(r => r.company.toLowerCase().includes(search.toLowerCase()));
  const selectedReport = accounts.find(r => r.id === selected);
  const needsAttention = accounts.filter(r => ["at-risk", "renewal-due"].includes(r.status));

  const statusCounts = {};
  accounts.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "panelIn 0.3s ease" }}>
      {showImport && <CSVImportModal onClose={() => setShowImport(false)} onImport={onImportAccounts} />}

      <FeatureExplainer
        icon="📁" title="Account Portfolio" color={T.green}
        bullets={[
          "Your single source of truth for every customer account — view status, MRR, renewal timelines, and assigned CSM all in one filterable list with real-time status badges.",
          "Import accounts via CSV, filter by any lifecycle status, and click into any account for a full detail view with context preview.",
          "Attention alerts surface at-risk and renewal-due accounts automatically so you never miss a critical deadline.",
        ]}
        workflow={[
          "Accounts populate from your CRM or via CSV import",
          "Filter by status and search by company name to find accounts fast",
          "Click any account to see its full detail panel with context and history",
          "Update status, reassign CSMs, and generate reports directly from the list",
        ]}
        outputLabel="At a Glance"
        outputItems={[
          { icon: "📊", text: "Portfolio summary — total, active, renewed, at-risk" },
          { icon: "🔍", text: "Filterable account list with status badges" },
          { icon: "📋", text: "Detail panel with preview and contact info" },
          { icon: "📤", text: "CSV import for bulk account onboarding" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "👤", text: "CSMs managing a book of 20-100 accounts" },
          { icon: "📈", text: "CS leaders reviewing portfolio health" },
          { icon: "🔄", text: "New hires getting up to speed on accounts" },
        ]}
      />

      {/* Top Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, paddingBottom: 20 }}>
        {[
          { label: "Total Accounts", value: String(accounts.length), sub: "in portfolio", color: T.text },
          { label: "Active", value: String((statusCounts.active || 0) + (statusCounts.renewed || 0) + (statusCounts.expanded || 0)), sub: "healthy accounts", color: T.green },
          { label: "Renewed", value: String(statusCounts.renewed || 0), sub: "this cycle", color: T.info },
          { label: "Attention", value: String(needsAttention.length), sub: "at risk or renewal due", color: needsAttention.length > 0 ? T.error : T.green, alert: needsAttention.length > 0 },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface2, border: `1px solid ${s.alert ? "rgba(239,68,68,0.2)" : T.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: s.color, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." style={{ ...inputStyle, width: 200, padding: "8px 12px", fontSize: 12.5, background: T.surface2 }} />
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "8px 12px", fontSize: 12.5, cursor: "pointer", background: T.surface2 }}>
            <option value="all">All Statuses</option>
            {Object.entries(ACCOUNT_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}{statusCounts[k] ? ` (${statusCounts[k]})` : ""}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowImport(true)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12.5, color: T.subtle, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import CSV
          </button>
          <button onClick={() => navigate("generator")} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Report
          </button>
        </div>
      </div>

      {/* Report List + Detail */}
      <div style={{ flex: 1, display: "flex", gap: 16, overflow: "hidden", minHeight: 0 }}>
        {/* List */}
        <div style={{ flex: selected ? "0 0 400px" : 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
          {filtered.map(r => {
            const ind = BENCHMARKS[r.industry] || BENCHMARKS.saas;
            const isActive = selected === r.id;
            const assignee = TEAM_MEMBERS.find(m => m.id === r.assignedTo);
            return (
              <div key={r.id} onClick={() => setSelected(isActive ? null : r.id)} style={{
                background: isActive ? `rgba(${hexToRgb(T.green)},0.06)` : T.surface2,
                border: `1px solid ${isActive ? T.green + "44" : T.border}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s ease",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `rgba(${hexToRgb(ind.color)},0.12)`, border: `1px solid ${ind.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{ind.icon}</div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{r.company}</div>
                      <div style={{ fontSize: 11.5, color: "#475569" }}>{FORMAT_PROMPTS[r.format]?.label || r.format} · {r.date}</div>
                    </div>
                  </div>
                  <StatusBadge status={r.status} small />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: ind.color, fontWeight: 600 }}>✦ {r.metric}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {assignee && assignee.id !== "unassigned" && (
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: `rgba(${hexToRgb(assignee.color)},0.15)`, border: `1px solid ${assignee.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: assignee.color }} title={assignee.name}>{assignee.initials}</div>
                    )}
                    <span style={{ fontSize: 11.5, color: "#334155" }}>{r.mrr}/mo</span>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#334155" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 13 }}>No accounts match your filter</div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedReport && (
          <div style={{ flex: 1, background: T.surface2, borderRadius: 14, border: `1px solid ${T.border}`, overflowY: "auto", padding: "22px 24px", animation: "panelIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: T.text }}>{selectedReport.company}</h2>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{selectedReport.contact ? `${selectedReport.contact} · ` : ""}{selectedReport.date}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>

            {/* Status + Assign row */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Status</div>
                <StatusPicker current={selectedReport.status} onChange={(s) => onUpdateAccount(selectedReport.id, { status: s })} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Assigned To</div>
                <AssignPicker current={selectedReport.assignedTo || "unassigned"} onChange={(id) => onUpdateAccount(selectedReport.id, { assignedTo: id })} />
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[{ l: "MRR", v: selectedReport.mrr }, { l: "Key Win", v: selectedReport.metric }, { l: "Renewal", v: `${selectedReport.renewalIn} days` }, { l: "Industry", v: (BENCHMARKS[selectedReport.industry] || BENCHMARKS.saas).label }].map((m, i) => (
                <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px 13px" }}>
                  <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{m.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{m.v}</div>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", marginBottom: 8 }}>Preview</div>
              <p style={{ fontSize: 13, color: T.subtle, lineHeight: 1.7 }}>{selectedReport.preview}</p>
            </div>

            {/* Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => navigate("generator")} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px", fontSize: 12, color: T.subtle, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>✦ New Report</button>
              <button onClick={() => navigate("next-action")} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px", fontSize: 12, color: T.subtle, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>🎯 Next Actions</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HUBSPOT AUTO-FILL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function HubSpotAutoFill({ onFill }) {
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [filled, setFilled] = useState(false);

  async function searchCompanies() {
    if (!token || !search) return;
    setSearching(true);
    // In production: POST to /api/hubspot with token and search query
    // Mock response for demo:
    await new Promise(r => setTimeout(r, 800));
    setResults([
      { id: "hs1", name: search.charAt(0).toUpperCase() + search.slice(1) + " Corp", domain: search.toLowerCase().replace(/\s/g,"") + ".com", mrr: "15000", contact: "Jane Smith", title: "VP Customer Success", created: "2025-06-15" },
      { id: "hs2", name: search.charAt(0).toUpperCase() + search.slice(1) + " Inc", domain: search.toLowerCase().replace(/\s/g,"") + "inc.com", mrr: "8500", contact: "Mike Torres", title: "Director of Operations", created: "2025-09-01" },
    ]);
    setSearching(false);
  }

  function selectCompany(company) {
    onFill({ companyName: company.name, contactName: company.contact, contactTitle: company.title, mrr: company.mrr, contractStart: company.created });
    setFilled(true);
    setTimeout(() => setExpanded(false), 600);
  }

  return (
    <div style={{ marginBottom: 16, border: `1px solid ${expanded ? "#f97316" + "44" : T.border}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: "100%", padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: expanded ? "rgba(249,115,22,0.06)" : T.surface2, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🟠</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: filled ? "#10b981" : "#f97316" }}>{filled ? "✓ Filled from HubSpot" : "Auto-fill from HubSpot"}</span>
          <span style={{ fontSize: 10, color: T.muted }}>(optional)</span>
        </div>
        <span style={{ fontSize: 12, color: T.muted, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </button>
      {expanded && (
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}`, animation: "panelIn 0.2s ease" }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ ...labelStyle, color: "#f97316" }}>HubSpot API Token</label>
            <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your HubSpot private app token" style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company name..." style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === "Enter" && searchCompanies()} />
            <button onClick={searchCompanies} disabled={!token || !search || searching} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: (!token || !search) ? T.border : "#f97316", color: "#fff", fontSize: 12, fontWeight: 600, cursor: (!token || !search) ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              {searching ? "..." : "Search"}
            </button>
          </div>
          {results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {results.map(r => (
                <button key={r.id} onClick={() => selectCompany(r)} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{r.contact} · {r.title} · MRR: ${r.mrr}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "#f97316", fontWeight: 600 }}>Select →</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#334155", marginTop: 8 }}>Token is used for this session only and routes through /api/hubspot. <a href="https://developers.hubspot.com/docs/api/private-apps" target="_blank" style={{ color: "#f97316" }}>Get token →</a></div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT GENERATOR PANEL (unchanged core logic)
// ═══════════════════════════════════════════════════════════════════════════
function GeneratorPanel({ onSaveReport }) {
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState("saas");
  const [format, setFormat] = useState("executive");
  const [form, setForm] = useState({ companyName: "", contactName: "", contactTitle: "", contractStart: "", mrr: "", annualChurn: "", adoptionRate: "", supportTickets: "", nrr: "", m1Label: "", m1Value: "", m2Label: "", m2Value: "", m3Label: "", m3Value: "", primaryGoal: "", additionalContext: "" });
  const [report, setReport] = useState("");
  const [editableReport, setEditableReport] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const { tierId, incrementActions } = useTier();
  const ind = BENCHMARKS[industry]; const fmt = FORMAT_PROMPTS[format];
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const generate = async () => {
    if (!form.companyName || !form.primaryGoal) { setError("Company Name and Primary Goal are required."); return; }
    setError(""); setLoading(true);
    try {
      const months = form.contractStart ? Math.floor((Date.now() - new Date(form.contractStart)) / (1000*60*60*24*30)) : "unknown";
      const benchCtx = buildBenchmarkContext(industry, form);
      const userPrompt = `${fmt.prompt}\n\n---\nCUSTOMER DATA:\nCompany: ${form.companyName}\nContact: ${form.contactName || "Not specified"}, ${form.contactTitle || ""}\nIndustry: ${ind.label}\nContract Start: ${form.contractStart} (${months} months)\nMRR: $${form.mrr}\nAdoption: ${form.adoptionRate}%\nSupport Tickets (90d): ${form.supportTickets}\n${form.nrr ? `NRR: ${form.nrr}%` : ""}\n${form.annualChurn ? `Churn: ${form.annualChurn}%` : ""}\n\nKey Metrics:\n${form.m1Label ? `• ${form.m1Label}: ${form.m1Value}` : ""}\n${form.m2Label ? `• ${form.m2Label}: ${form.m2Value}` : ""}\n${form.m3Label ? `• ${form.m3Label}: ${form.m3Value}` : ""}\n\nPrimary Goal: ${form.primaryGoal}\nContext: ${form.additionalContext || "None"}\n\n---\n${benchCtx}`;
      const text = await callClaude(INDUSTRY_PROMPTS[industry], userPrompt, undefined, { action_type: "report_generation", tier: tierId });
      incrementActions();
      setReport(text); setEditableReport(text); setStep(3);
    } catch { setError("Generation failed. Please try again."); }
    finally { setLoading(false); }
  };

  const handleSave = () => { onSaveReport({ companyName: form.companyName, industry, format, mrr: form.mrr, report: isEditing ? editableReport : report, form }); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handlePrint = () => {
    const win = window.open("", "_blank"); const content = isEditing ? editableReport : report;
    const benchmarkRows = Object.entries(ind.metrics).filter(([k]) => form[k] && form[k] !== "").map(([k, m]) => { const tier = scoreTier(form[k], m); const tc = tier ? TIER_LABELS[tier] : null; return `<tr><td>${m.label}</td><td><strong>${form[k]}${m.unit}</strong></td><td>${m.industry}${m.unit}</td><td>${m.topQuartile}${m.unit}</td><td style="color:${tc?.color||"#333"};font-weight:700">${tc?.label||"—"}</td></tr>`; }).join("");
    win.document.write(`<html><head><title>${form.companyName} — ${fmt.label}</title><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"><style>body{font-family:'DM Sans',sans-serif;max-width:720px;margin:60px auto;color:#1e293b;line-height:1.7;font-size:14px}h1{font-family:'Playfair Display',serif;font-size:30px;margin-bottom:4px}.meta{color:#64748b;font-size:13px;margin-bottom:32px;border-bottom:2px solid #e2e8f0;padding-bottom:16px}h3{font-family:'Playfair Display',serif;font-size:17px;color:#0f172a;margin:28px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}p{margin:0 0 10px}.bt{width:100%;border-collapse:collapse;margin:16px 0 28px;font-size:12px}.bt th{background:#f8fafc;padding:8px 12px;text-align:left;border:1px solid #e2e8f0;font-weight:600;color:#475569;font-size:11px}.bt td{padding:8px 12px;border:1px solid #e2e8f0}.footer{margin-top:60px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}</style></head><body><h1>${form.companyName}</h1><div class="meta">${fmt.label} · ${ind.icon} ${ind.label} · ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>${content.split("\n").map(l => l.startsWith("## ") ? `<h3>${l.slice(3)}</h3>` : l.startsWith("Subject:") ? `<p><strong>${l}</strong></p>` : !l.trim() ? "<br/>" : `<p>${l}</p>`).join("")}${benchmarkRows ? `<h3>Benchmark Reference</h3><table class="bt"><tr><th>Metric</th><th>Customer</th><th>${ind.label} Avg</th><th>Top Q</th><th>Standing</th></tr>${benchmarkRows}</table>` : ""}<div class="footer">Generated by Proofpoint · Benchmarks 2024–2026</div></body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div style={{ animation: "panelIn 0.3s ease", maxWidth: 820, margin: "0 auto" }}>
      <FeatureExplainer
        icon="✦" title="Report Generator" color={T.green}
        bullets={[
          "Transforms your raw customer data — adoption rates, support tickets, MRR, churn — into a polished, executive-ready document that your customer's champion can hand directly to their CFO at renewal time.",
          "Every report is tailored to the customer's industry with real published benchmarks. A healthcare client gets language about clinical hours recovered and claim denial rates. A fintech client gets basis points and compliance risk reduction.",
          "Reports are AI-generated in under 30 seconds with traceable citations on every benchmark, so your customer can fact-check every claim.",
        ]}
        workflow={[
          "Pick industry & format (Executive Summary, QBR, or Follow-up Email)",
          "Enter customer data and metrics — benchmarks auto-score in real time",
          "AI generates a complete report with industry comparisons and citations",
          "Edit, copy, export to PDF, or generate a slide deck prompt",
        ]}
        outputLabel="What You Get"
        outputItems={[
          { icon: "📋", text: "Executive Summary — 3 min read for decision-makers" },
          { icon: "📊", text: "QBR Narrative — full quarterly review for 45-min meetings" },
          { icon: "✉️", text: "Follow-up Email — renewal nudge with one key benchmark" },
          { icon: "🎨", text: "Slide deck prompt — ready for Copilot, Gamma, Genspark" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "🎯", text: "Your customer's CFO, VP, or budget holder" },
          { icon: "🤝", text: "Your champion who needs ammo for internal buy-in" },
          { icon: "📈", text: "QBR attendees who need a value narrative" },
        ]}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
        {["Configure", "Customer Data", "Report"].map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: step > i+1 ? T.green : step === i+1 ? "rgba(16,185,129,0.15)" : T.surface2, border: `1.5px solid ${step >= i+1 ? T.green : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: step > i+1 ? "#fff" : step === i+1 ? T.green : "#475569", transition: "all 0.3s" }}>{step > i+1 ? "✓" : i+1}</div>
            <span style={{ fontSize: 12, color: step === i+1 ? T.text : "#475569", fontWeight: step === i+1 ? 600 : 400 }}>{l}</span>
            {i < 2 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}
          </div>
        ))}
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 32px" }}>
        {step === 1 && (<div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: T.text, marginBottom: 20 }}>Configure Report</h2>
          <label style={labelStyle}>Industry</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 20 }}>{Object.entries(BENCHMARKS).map(([key, b]) => (<button key={key} onClick={() => setIndustry(key)} style={{ background: industry === key ? `rgba(${hexToRgb(b.color)},0.12)` : T.surface2, border: `1px solid ${industry === key ? b.color : T.border}`, borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "center", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}><div style={{ fontSize: 22, marginBottom: 4 }}>{b.icon}</div><div style={{ fontSize: 11, fontWeight: 600, color: industry === key ? b.color : "#475569" }}>{b.label.split(" ")[0]}</div></button>))}</div>
          <label style={labelStyle}>Report Format</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>{Object.entries(FORMAT_PROMPTS).map(([key, f]) => (<button key={key} onClick={() => setFormat(key)} style={{ background: format === key ? "rgba(16,185,129,0.1)" : T.surface2, border: `1px solid ${format === key ? T.green : T.border}`, borderRadius: 10, padding: "14px", cursor: "pointer", textAlign: "center", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}><div style={{ fontSize: 20, marginBottom: 5 }}>{f.icon}</div><div style={{ fontSize: 12, fontWeight: 600, color: format === key ? T.green : "#475569" }}>{f.label}</div></button>))}</div>
          <button onClick={() => setStep(2)} style={{ width: "100%", background: ind.color, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Continue →</button>
        </div>)}
        {step === 2 && (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: T.text }}>Customer Data</h2><button onClick={() => setStep(1)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button></div>
          {/* HubSpot Auto-fill Panel */}
          <HubSpotAutoFill onFill={(data) => setForm(p => ({ ...p, ...data }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px", marginBottom: 16 }}><Field label="Company Name *" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Acme Health" /><Field label="Contact Name" name="contactName" value={form.contactName} onChange={handleChange} placeholder="Sarah Johnson" /><Field label="Contact Title" name="contactTitle" value={form.contactTitle} onChange={handleChange} placeholder="VP Operations" /><Field label="Contract Start" name="contractStart" value={form.contractStart} onChange={handleChange} type="date" /><Field label="Monthly Revenue ($)" name="mrr" value={form.mrr} onChange={handleChange} placeholder="12,500" /></div>
          <div style={{ background: `rgba(${hexToRgb(ind.color)},0.05)`, border: `1px solid ${ind.color}33`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}><div style={{ fontSize: 11, fontWeight: 700, color: ind.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{ind.icon} {ind.label} Benchmarks</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px" }}>{Object.entries(ind.metrics).map(([key, metric]) => (<div key={key}><label style={{ ...labelStyle, color: ind.color + "cc" }}>{metric.label}</label><input type="number" name={key} value={form[key]} onChange={handleChange} placeholder={`Avg: ${metric.industry}`} style={inputStyle} />{form[key] && (() => { const tier = scoreTier(form[key], metric); const tc = tier ? TIER_LABELS[tier] : null; return tc ? <div style={{ fontSize: 10, fontWeight: 700, color: tc.color, marginTop: 3 }}>✦ {tc.label}</div> : null; })()}</div>))}</div></div>
          <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Additional Metrics</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px" }}>{[[0,"m1Label","m1Value"],[1,"m2Label","m2Value"],[2,"m3Label","m3Value"]].map(([i,lk,vk]) => (<div key={lk} style={{ display: "contents" }}><Field label={`Metric ${+i+1} Name`} name={lk} value={form[lk]} onChange={handleChange} placeholder={["Hours saved/week","Error rate reduction","Revenue influenced"][i]} /><Field label="Value" name={vk} value={form[vk]} onChange={handleChange} placeholder={["14 hours","62%","$340K"][i]} /></div>))}</div></div>
          <Field label="Customer's Primary Goal *" name="primaryGoal" value={form.primaryGoal} onChange={handleChange} type="textarea" placeholder="Reduce claim processing time by 50%..." /><div style={{ marginTop: 10 }}><Field label="Additional Context" name="additionalContext" value={form.additionalContext} onChange={handleChange} type="textarea" placeholder="Renewal in 60 days..." /></div>
          {error && <p style={{ fontSize: 13, color: T.error, marginTop: 10 }}>{error}</p>}
          <button onClick={generate} disabled={loading} style={{ width: "100%", marginTop: 14, background: loading ? T.greenDim : ind.color, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.8 : 1 }}>{loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Generating...</span> : `✦ Generate ${fmt.label}`}</button>
        </div>)}
        {step === 3 && report && (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}><div><h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: T.text, marginBottom: 2 }}>{form.companyName} — {fmt.label}</h2><div style={{ fontSize: 12, color: "#334155" }}>{ind.icon} {ind.label} · {new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button onClick={() => { setStep(2); setReport(""); }} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Edit</button><button onClick={() => setIsEditing(e => !e)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{isEditing ? "Preview" : "✏️ Edit"}</button><button onClick={() => { navigator.clipboard.writeText(isEditing ? editableReport : report); setCopied(true); setTimeout(()=>setCopied(false),2000); }} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: copied ? T.green : T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{copied ? "✓ Copied!" : "Copy"}</button><button onClick={handleSave} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: T.green, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>💾 Save</button><button onClick={handlePrint} style={{ background: ind.color, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↓ PDF</button></div></div>
          <BenchmarkScorecard industry={industry} formData={form} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8 }}><span style={{ fontSize: 13 }}>📚</span><span style={{ fontSize: 11.5, color: "#6ee7b7" }}>Citations in <strong style={{ color: T.green }}>green</strong> — every benchmark is traceable.</span></div>
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>{isEditing ? <textarea value={editableReport} onChange={e => setEditableReport(e.target.value)} style={{ ...inputStyle, background: T.bg, border: "none", borderRadius: 0, padding: "22px 24px", minHeight: 400, fontSize: 13.5, lineHeight: 1.85, resize: "none", width: "100%" }} /> : <div style={{ padding: "22px 24px" }}>{renderMarkdown(report)}</div>}</div>
          <DeckPromptBox type="client-report" companyName={form.companyName} industry={industry} reportContent={isEditing ? editableReport : report} metrics={[
            { label: "Monthly Recurring Revenue", value: form.mrr ? `$${form.mrr}` : "" },
            { label: "Annual Churn Rate", value: form.annualChurn ? `${form.annualChurn}%` : "" },
            { label: "User Adoption Rate", value: form.adoptionRate ? `${form.adoptionRate}%` : "" },
            { label: "Net Revenue Retention", value: form.nrr ? `${form.nrr}%` : "" },
            { label: "Support Tickets (90d)", value: form.supportTickets || "" },
            ...(form.m1Label ? [{ label: form.m1Label, value: form.m1Value }] : []),
            ...(form.m2Label ? [{ label: form.m2Label, value: form.m2Value }] : []),
            ...(form.m3Label ? [{ label: form.m3Label, value: form.m3Value }] : []),
          ]} />
          <div style={{ marginTop: 12, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}><p style={{ fontSize: 11, color: "#334155", fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>Generate another format</p><div style={{ display: "flex", gap: 8 }}>{Object.entries(FORMAT_PROMPTS).filter(([k]) => k !== format).map(([key, f]) => (<button key={key} onClick={() => { setFormat(key); setStep(2); setReport(""); }} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{f.icon} {f.label}</button>))}</div></div>
        </div>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NEXT ACTION PANEL
// ═══════════════════════════════════════════════════════════════════════════
function NextActionPanel() {
  const [industry, setIndustry] = useState("saas");
  const [form, setForm] = useState({ companyName: "", contactName: "", contactTitle: "", mrr: "", renewalDate: "", championEngagement: "", recentChange: "", context: "", annualChurn: "", adoptionRate: "", supportTickets: "", nrr: "" });
  const [actions, setActions] = useState([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [expanded, setExpanded] = useState(0); const [step, setStep] = useState(1);
  const { tierId, incrementActions } = useTier();
  const ind = BENCHMARKS[industry]; const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const TIER_CONFIG = { strong: { label: "Top Quartile", color: T.green }, good: { label: "Above Average", color: T.info }, watch: { label: "Watch", color: T.warning }, risk: { label: "At Risk", color: T.error } };
  const URGENCY = { critical: { label: "Do This Week", color: T.error, icon: "⚡" }, soon: { label: "This Month", color: T.warning, icon: "◆" }, growth: { label: "Opportunity", color: T.green, icon: "▲" } };
  const getSignalTier = (value, metric) => { const num = parseFloat(value); if (isNaN(num)) return null; const { industry: avg, topQuartile, warning, direction } = metric; if (direction === "higher_is_better") { if (num >= topQuartile) return "strong"; if (num >= avg) return "good"; if (num >= warning) return "watch"; return "risk"; } else { if (num <= topQuartile) return "strong"; if (num <= avg) return "good"; if (num <= warning) return "watch"; return "risk"; } };

  const generate = async () => {
    if (!form.companyName) { setError("Company name is required."); return; }
    setError(""); setLoading(true);
    try {
      const signals = Object.entries(ind.metrics).filter(([k]) => form[k]).map(([k, m]) => ({ label: m.label, value: form[k], unit: m.unit, industry: m.industry, tier: getSignalTier(form[k], m) || "watch" }));
      const renewalDays = form.renewalDate ? Math.round((new Date(form.renewalDate) - Date.now()) / 86400000) : null;
      const signalLines = signals.map(s => `• ${s.label}: ${s.value}${s.unit} — ${TIER_CONFIG[s.tier].label} vs avg ${s.industry}${s.unit}`).join("\n");
      const prompt = `You are a senior CS strategist. Analyze this customer and generate exactly 4 next actions ranked by urgency.\n\nCUSTOMER:\nCompany: ${form.companyName}\nIndustry: ${ind.label}\nContact: ${form.contactName || "unknown"}, ${form.contactTitle || ""}\nRenewal: ${renewalDays !== null ? `${renewalDays} days` : "unknown"}\nMRR: $${form.mrr || "unknown"}\nChampion: ${form.championEngagement || "unknown"}\nRecent change: ${form.recentChange || "none"}\n\nSIGNALS:\n${signalLines}\n\nContext: ${form.context || "None"}\n\nReturn a JSON array of 4 objects with: urgency ("critical"|"soon"|"growth"), title (max 8 words), signal (1 sentence), talkingPoints (array of 2-3 phrases), outcome (1 sentence), deadline. Start with [ end with ]. No markdown.`;
      const text = await callClaude("You are a senior Customer Success strategist. Return only valid JSON.", prompt, undefined, { action_type: "next_action", tier: tierId });
      incrementActions();
      const parsed = JSON.parse(text.replace(/```json?/g, "").replace(/```/g, "").trim());
      setActions(parsed); setStep(2); setExpanded(0);
    } catch { setError("Failed to generate actions. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ animation: "panelIn 0.3s ease", maxWidth: 820, margin: "0 auto" }}>
      <FeatureExplainer
        icon="🎯" title="Next Action Planner" color={T.info}
        bullets={[
          "Analyzes your customer's health signals — churn rate, adoption, NRR, champion engagement, renewal timeline — and generates a prioritized action plan ranked by urgency so you know exactly what to do next.",
          "Each action comes with ready-to-use talking points you can bring straight into your next customer call, plus a clear outcome you're driving toward and a deadline to hit.",
          "Signals are scored against industry benchmarks in real time so you can see at a glance whether a metric is Top Quartile, Above Average, a Watch item, or At Risk — before the AI even runs its analysis.",
        ]}
        workflow={[
          "Select industry and enter customer context — health metrics, renewal date, champion status",
          "Metrics are instantly scored against published benchmarks (Top Quartile → At Risk)",
          "AI analyzes the full signal picture and generates 4 prioritized actions",
          "Each action includes urgency level, talking points, outcome, and deadline",
        ]}
        outputLabel="What You Get"
        outputItems={[
          { icon: "⚡", text: "Critical actions — do this week to prevent churn" },
          { icon: "◆", text: "Soon actions — handle this month to stay ahead" },
          { icon: "▲", text: "Growth opportunities — expansion and upsell plays" },
          { icon: "💬", text: "Talking points — ready for your next customer call" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "👤", text: "CSMs preparing for check-in calls and QBRs" },
          { icon: "🔥", text: "CS leads triaging at-risk accounts" },
          { icon: "📋", text: "Teams needing a playbook before every touchpoint" },
        ]}
      />
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 32px" }}>
        <div style={{ height: 3, background: T.surface2, borderRadius: 2, marginBottom: 24 }}><div style={{ height: "100%", width: step === 1 ? "50%" : "100%", background: `linear-gradient(90deg, ${T.warning}, ${T.green})`, transition: "width 0.5s", borderRadius: 2 }} /></div>
        {step === 1 && (<div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: T.text, marginBottom: 20 }}>Customer Signals</h2>
          <label style={labelStyle}>Industry</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 20 }}>{Object.entries(BENCHMARKS).map(([key, b]) => (<button key={key} onClick={() => setIndustry(key)} style={{ background: industry === key ? `rgba(${hexToRgb(b.color)},0.12)` : T.surface2, border: `1px solid ${industry === key ? b.color : T.border}`, borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}><div style={{ fontSize: 20, marginBottom: 3 }}>{b.icon}</div><div style={{ fontSize: 10, fontWeight: 600, color: industry === key ? b.color : "#475569" }}>{b.label.split(" ")[0]}</div></button>))}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px", marginBottom: 14 }}><Field label="Company Name *" name="companyName" value={form.companyName} onChange={handleChange} placeholder="Acme Health" /><Field label="MRR ($)" name="mrr" value={form.mrr} onChange={handleChange} placeholder="12,500" /><Field label="Contact Name" name="contactName" value={form.contactName} onChange={handleChange} placeholder="Sarah Johnson" /><Field label="Title" name="contactTitle" value={form.contactTitle} onChange={handleChange} placeholder="VP Ops" /><Field label="Renewal Date" name="renewalDate" value={form.renewalDate} onChange={handleChange} type="date" /><Field label="Champion Engagement" name="championEngagement" value={form.championEngagement} onChange={handleChange} placeholder="High / Low / Left company" /></div>
          <div style={{ background: `rgba(${hexToRgb(ind.color)},0.05)`, border: `1px solid ${ind.color}33`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: ind.color, textTransform: "uppercase", marginBottom: 10 }}>{ind.icon} Health Signals</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px" }}>{Object.entries(ind.metrics).map(([key, metric]) => (<div key={key}><label style={{ ...labelStyle, color: ind.color + "cc" }}>{metric.label}</label><input type="number" name={key} value={form[key]} onChange={handleChange} placeholder={`Avg: ${metric.industry}`} style={inputStyle} />{form[key] && (() => { const tier = getSignalTier(form[key], metric); const tc = tier ? TIER_CONFIG[tier] : null; return tc ? <div style={{ fontSize: 10, fontWeight: 700, color: tc.color, marginTop: 3 }}>✦ {tc.label}</div> : null; })()}</div>))}</div></div>
          <Field label="Recent Changes" name="recentChange" value={form.recentChange} onChange={handleChange} placeholder="Champion left, budget cuts..." /><div style={{ marginTop: 10 }}><Field label="Additional Context" name="context" value={form.context} onChange={handleChange} type="textarea" placeholder="Any other signals..." /></div>
          {error && <p style={{ fontSize: 13, color: T.error, marginTop: 10 }}>{error}</p>}
          <button onClick={generate} disabled={loading} style={{ width: "100%", marginTop: 14, background: loading ? T.greenDim : T.green, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>{loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Analyzing...</span> : "🎯 Generate Next Actions"}</button>
        </div>)}
        {step === 2 && actions.length > 0 && (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><div><h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: T.text, marginBottom: 2 }}>{form.companyName} — Action Plan</h2><div style={{ fontSize: 12, color: "#475569" }}>{ind.icon} {ind.label} · {actions.length} actions</div></div><button onClick={() => { setStep(1); setActions([]); }} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← New</button></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{actions.map((action, i) => { const u = URGENCY[action.urgency] || URGENCY.soon; const isExp = expanded === i; return (<div key={i} onClick={() => setExpanded(isExp ? -1 : i)} style={{ background: isExp ? `rgba(${hexToRgb(u.color)},0.04)` : T.surface2, border: `1px solid ${isExp ? u.color + "44" : T.border}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(${hexToRgb(u.color)},0.12)`, border: `1px solid ${u.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{u.icon}</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{action.title}</div><div style={{ fontSize: 12, color: "#475569" }}>{action.signal}</div></div><span style={{ fontSize: 10, fontWeight: 700, color: u.color, background: `rgba(${hexToRgb(u.color)},0.1)`, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{u.label}</span></div>
            {isExp && (<div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}`, animation: "panelIn 0.2s ease" }}><div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", marginBottom: 8 }}>Talking Points</div>{action.talkingPoints?.map((tp, j) => (<div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}><span style={{ color: u.color, fontSize: 10, marginTop: 2 }}>●</span><span style={{ fontSize: 13, color: T.subtle, lineHeight: 1.5 }}>{tp}</span></div>))}<div style={{ display: "flex", gap: 16, marginTop: 12 }}><div style={{ flex: 1, background: T.bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.border}` }}><div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", marginBottom: 3 }}>Outcome</div><div style={{ fontSize: 12.5, color: T.subtle }}>{action.outcome}</div></div>{action.deadline && <div style={{ background: T.bg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${T.border}`, minWidth: 90 }}><div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", marginBottom: 3 }}>Deadline</div><div style={{ fontSize: 12.5, color: u.color, fontWeight: 600 }}>{action.deadline}</div></div>}</div></div>)}
          </div>); })}</div>
        </div>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROI CALCULATOR PANEL
// ═══════════════════════════════════════════════════════════════════════════
function ROICalcPanel() {
  const [form, setForm] = useState({ teamSize: "", avgSalary: "85000", totalCustomers: "", avgArr: "", totalArr: "", expansionRevenue: "", grossRetention: "92", netRetention: "112", monthlyChurn: "1.2" });
  const [report, setReport] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [step, setStep] = useState(1);
  const { tierId, incrementActions } = useTier();
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const ts = parseFloat(form.teamSize) || 0; const sal = parseFloat(form.avgSalary) || 85000; const totalCust = parseFloat(form.totalCustomers) || 0; const expansion = parseFloat(form.expansionRevenue) || 0; const grr = parseFloat(form.grossRetention) || 92; const nrr = parseFloat(form.netRetention) || 112; const totalArr = parseFloat(form.totalArr) || 0;
  const teamCost = ts * sal; const revenueRetained = totalArr * (grr / 100); const roiMultiple = teamCost > 0 ? ((revenueRetained + expansion) / teamCost).toFixed(1) : "—"; const custPerCSM = ts > 0 ? Math.round(totalCust / ts) : "—"; const costPerDollar = teamCost > 0 && revenueRetained > 0 ? `$${(teamCost / revenueRetained).toFixed(2)}` : "—";
  const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n}`;

  const generate = async () => {
    if (!form.teamSize || !form.totalArr) { setError("Team size and Total ARR are required."); return; }
    setError(""); setLoading(true);
    try {
      const prompt = `Analyze this CS program:\n\nTeam: ${ts} CSMs, avg salary ${fmt(sal)}, total cost ${fmt(teamCost)}\nPortfolio: ${totalCust} customers, ${fmt(totalArr)} ARR\nRetention: ${grr}% GRR, ${nrr}% NRR\nExpansion: ${fmt(expansion)}\n\nCalculated: ROI ${roiMultiple}x, ${custPerCSM} customers/CSM, ${costPerDollar} cost per $1 retained\n\nGenerate a board-ready CS program ROI report with ## section headers.`;
      const text = await callClaude(`You are a strategic CS advisor writing for VP/C-suite executives. Write a comprehensive CS program ROI report with sections: Executive Summary, Program ROI Analysis, Revenue Protection & Growth, Benchmarking, Investment Efficiency, Strategic Recommendations, Board-Level Narrative. Use ## markdown headers.`, prompt, undefined, { action_type: "roi_report", tier: tierId });
      incrementActions();
      setReport(text); setStep(2);
    } catch { setError("Generation failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ animation: "panelIn 0.3s ease", maxWidth: 820, margin: "0 auto" }}>
      <FeatureExplainer
        icon="📈" title="CS ROI Calculator" color={T.warning}
        bullets={[
          "Calculates the return on investment of your entire Customer Success program and generates a board-ready report that proves your CS team is a revenue engine, not a cost center.",
          "Input your team size, salaries, total ARR, retention rates, and expansion revenue — the calculator instantly computes your ROI multiple, cost per dollar retained, and customers per CSM ratio.",
          "The AI then generates a comprehensive narrative report with executive-level analysis, benchmarking your program against industry standards, and strategic recommendations for scaling impact.",
        ]}
        workflow={[
          "Enter your CS team investment — headcount, average salary, total cost",
          "Add portfolio data — total customers, ARR, expansion revenue",
          "Input retention metrics — GRR, NRR, monthly churn rate",
          "AI generates a board-ready ROI report with benchmarks and recommendations",
        ]}
        outputLabel="What You Get"
        outputItems={[
          { icon: "🔢", text: "ROI multiple — e.g. 'Your CS team returns 6.2x its cost'" },
          { icon: "📊", text: "Efficiency metrics — customers/CSM, cost per $1 retained" },
          { icon: "📄", text: "Full narrative report — ready to present to your board" },
          { icon: "🎨", text: "Slide deck prompt — ready for Copilot, Gamma, Genspark" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "🏢", text: "VP of CS justifying headcount or budget requests" },
          { icon: "💼", text: "CFO or board members evaluating CS investment" },
          { icon: "📋", text: "CS leaders building the case for team expansion" },
        ]}
      />
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 32px" }}>
        <div style={{ height: 3, background: T.surface2, borderRadius: 2, marginBottom: 24 }}><div style={{ height: "100%", width: step === 1 ? "50%" : "100%", background: "linear-gradient(90deg, #f59e0b, #10b981)", transition: "width 0.5s", borderRadius: 2 }} /></div>
        {step === 1 && (<div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: T.text, marginBottom: 20 }}>CS Program Inputs</h2>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.warning, textTransform: "uppercase", marginBottom: 12 }}>Team</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px", marginBottom: 18 }}><Field label="Team Size *" name="teamSize" value={form.teamSize} onChange={handleChange} placeholder="5" /><Field label="Avg Salary ($)" name="avgSalary" value={form.avgSalary} onChange={handleChange} placeholder="85000" /></div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.info, textTransform: "uppercase", marginBottom: 12 }}>Portfolio</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px", marginBottom: 18 }}><Field label="Total Customers" name="totalCustomers" value={form.totalCustomers} onChange={handleChange} placeholder="120" /><Field label="Avg ARR/Customer ($)" name="avgArr" value={form.avgArr} onChange={handleChange} placeholder="24000" /><Field label="Total ARR ($) *" name="totalArr" value={form.totalArr} onChange={handleChange} placeholder="2880000" /><Field label="Expansion Revenue ($)" name="expansionRevenue" value={form.expansionRevenue} onChange={handleChange} placeholder="432000" /></div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.green, textTransform: "uppercase", marginBottom: 12 }}>Retention</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 18px", marginBottom: 18 }}><Field label="GRR (%)" name="grossRetention" value={form.grossRetention} onChange={handleChange} placeholder="92" /><Field label="NRR (%)" name="netRetention" value={form.netRetention} onChange={handleChange} placeholder="112" /><Field label="Monthly Churn (%)" name="monthlyChurn" value={form.monthlyChurn} onChange={handleChange} placeholder="1.2" /></div>
          {teamCost > 0 && (<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>{[{ l: "ROI Multiple", v: `${roiMultiple}x`, h: true }, { l: "Team Cost", v: fmt(teamCost) }, { l: "Customers/CSM", v: custPerCSM }, { l: "Cost per $1", v: costPerDollar }].map(s => (<div key={s.l} style={{ background: s.h ? "rgba(245,158,11,0.08)" : T.bg, border: `1px solid ${s.h ? T.warning : T.border}`, borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: 10, color: s.h ? T.warning : "#334155", textTransform: "uppercase", marginBottom: 4 }}>{s.l}</div><div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: s.h ? "#fbbf24" : T.text }}>{s.v}</div></div>))}</div>)}
          {error && <p style={{ fontSize: 13, color: T.error, marginTop: 10 }}>{error}</p>}
          <button onClick={generate} disabled={loading} style={{ width: "100%", marginTop: 8, background: loading ? T.greenDim : T.warning, color: "#000", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>{loading ? "Running analysis..." : "📈 Generate Board-Ready ROI Report"}</button>
        </div>)}
        {step === 2 && report && (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: T.text }}>CS Program ROI Report</h2><div style={{ display: "flex", gap: 6 }}><button onClick={() => { setStep(1); setReport(""); }} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Edit</button><button onClick={() => navigator.clipboard.writeText(report)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Copy</button></div></div>
          {teamCost > 0 && (<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>{[{ l: "ROI", v: `${roiMultiple}x`, c: T.warning }, { l: "Protected", v: fmt(revenueRetained), c: T.green }, { l: "Investment", v: fmt(teamCost), c: T.info }, { l: "Expansion", v: fmt(expansion), c: T.purple }].map(s => (<div key={s.l} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px" }}><div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", marginBottom: 3 }}>{s.l}</div><div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div></div>))}</div>)}
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: "22px 24px" }}>{renderMarkdown(report)}</div>
          <DeckPromptBox type="roi-program" companyName="Our CS Program" industry="saas" reportContent={report} metrics={[
            { label: "ROI Multiple", value: `${roiMultiple}x` },
            { label: "Total CS Team Investment", value: fmt(teamCost) },
            { label: "Revenue Protected (GRR)", value: fmt(revenueRetained) },
            { label: "Expansion Revenue", value: fmt(expansion) },
            { label: "Gross Retention Rate", value: `${grr}%` },
            { label: "Net Revenue Retention", value: `${nrr}%` },
            { label: "Customers per CSM", value: String(custPerCSM) },
            { label: "Cost per $1 Retained", value: costPerDollar },
          ]} />
        </div>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH SCORE ENGINE
// ═══════════════════════════════════════════════════════════════════════════
//
// PostgreSQL Schema Reference (for production deployment):
//
// CREATE TABLE health_scores (
//   id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   account_id    UUID NOT NULL REFERENCES accounts(id),
//   score         INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
//   component_scores JSONB NOT NULL,  -- {"productUsage":82,"supportHealth":65,...}
//   weights_used  JSONB NOT NULL,     -- {"productUsage":0.25,"supportHealth":0.15,...}
//   explanation   TEXT,               -- AI-generated natural language summary
//   alert_fired   BOOLEAN DEFAULT FALSE,
//   calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// CREATE INDEX idx_hs_account ON health_scores(account_id, calculated_at DESC);
//
// CREATE TABLE health_score_configs (
//   id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   tenant_id     UUID NOT NULL,
//   weights       JSONB NOT NULL,  -- {"productUsage":0.25,...}
//   alert_threshold INTEGER NOT NULL DEFAULT 40,
//   updated_by    UUID REFERENCES users(id),
//   updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// ═══════════════════════════════════════════════════════════════════════════

const HEALTH_SIGNALS = {
  productUsage: {
    key: "productUsage", label: "Product Usage", icon: "📊", color: "#8b5cf6",
    description: "DAU/MAU ratio, session frequency, core feature engagement",
    fields: [
      { name: "dauMau", label: "DAU/MAU Ratio (%)", placeholder: "32", tip: "Daily active / monthly active users" },
      { name: "avgSessionsWeek", label: "Avg Sessions/Week", placeholder: "4.2", tip: "Per licensed user" },
      { name: "coreFeatureAdoption", label: "Core Feature Adoption (%)", placeholder: "68", tip: "% of key features used regularly" },
    ],
    scoreFunction: (f) => {
      const dau = parseFloat(f.dauMau) || 0;
      const sessions = parseFloat(f.avgSessionsWeek) || 0;
      const features = parseFloat(f.coreFeatureAdoption) || 0;
      const dauScore = Math.min(100, (dau / 40) * 100);
      const sessScore = Math.min(100, (sessions / 5) * 100);
      const featScore = Math.min(100, (features / 80) * 100);
      return Math.round((dauScore * 0.35 + sessScore * 0.30 + featScore * 0.35));
    },
    defaultWeight: 0.25,
  },
  supportHealth: {
    key: "supportHealth", label: "Support Health", icon: "🎧", color: "#06b6d4",
    description: "Ticket volume, resolution time, escalation rate",
    fields: [
      { name: "ticketsPerMonth", label: "Tickets / Month", placeholder: "8", tip: "Lower is healthier" },
      { name: "avgResolutionHrs", label: "Avg Resolution (hrs)", placeholder: "4.5", tip: "Time to close" },
      { name: "escalationRate", label: "Escalation Rate (%)", placeholder: "12", tip: "% tickets escalated" },
    ],
    scoreFunction: (f) => {
      const tickets = parseFloat(f.ticketsPerMonth) || 0;
      const resolution = parseFloat(f.avgResolutionHrs) || 0;
      const escalation = parseFloat(f.escalationRate) || 0;
      const tScore = Math.max(0, 100 - (tickets * 3.5));
      const rScore = Math.max(0, 100 - (resolution * 4));
      const eScore = Math.max(0, 100 - (escalation * 3));
      return Math.round(Math.max(0, Math.min(100, (tScore * 0.35 + rScore * 0.35 + eScore * 0.30))));
    },
    defaultWeight: 0.15,
  },
  sentimentScore: {
    key: "sentimentScore", label: "NPS / CSAT", icon: "😊", color: "#10b981",
    description: "Net Promoter Score, CSAT survey results, qualitative sentiment",
    fields: [
      { name: "npsScore", label: "NPS Score (-100 to 100)", placeholder: "42", tip: "Latest NPS" },
      { name: "csatScore", label: "CSAT Score (1–5)", placeholder: "4.2", tip: "Latest CSAT average" },
      { name: "lastSurveyDays", label: "Days Since Last Survey", placeholder: "30", tip: "Recency of data" },
    ],
    scoreFunction: (f) => {
      const nps = parseFloat(f.npsScore);
      const csat = parseFloat(f.csatScore) || 0;
      const daysSince = parseFloat(f.lastSurveyDays) || 90;
      const npsNorm = isNaN(nps) ? 50 : Math.min(100, Math.max(0, ((nps + 100) / 200) * 100));
      const csatNorm = Math.min(100, (csat / 5) * 100);
      const recency = Math.max(0, 100 - (daysSince * 0.8));
      return Math.round((npsNorm * 0.40 + csatNorm * 0.40 + recency * 0.20));
    },
    defaultWeight: 0.15,
  },
  billingHealth: {
    key: "billingHealth", label: "Billing & Payments", icon: "💳", color: "#f59e0b",
    description: "Payment history, contract value trend, expansion signals",
    fields: [
      { name: "onTimePayments", label: "On-Time Payments (%)", placeholder: "95", tip: "Last 12 months" },
      { name: "contractGrowth", label: "Contract Growth (%)", placeholder: "12", tip: "YoY change in ACV" },
      { name: "daysPastDue", label: "Days Past Due", placeholder: "0", tip: "Current balance" },
    ],
    scoreFunction: (f) => {
      const onTime = parseFloat(f.onTimePayments) || 0;
      const growth = parseFloat(f.contractGrowth) || 0;
      const pastDue = parseFloat(f.daysPastDue) || 0;
      const otScore = Math.min(100, onTime);
      const gScore = Math.min(100, Math.max(0, 50 + (growth * 2.5)));
      const pdScore = Math.max(0, 100 - (pastDue * 5));
      return Math.round((otScore * 0.40 + gScore * 0.30 + pdScore * 0.30));
    },
    defaultWeight: 0.15,
  },
  csmEngagement: {
    key: "csmEngagement", label: "CSM Touchpoints", icon: "🤝", color: "#ec4899",
    description: "Meeting frequency, response times, relationship depth",
    fields: [
      { name: "touchpointsMonth", label: "Touchpoints / Month", placeholder: "4", tip: "Meetings, calls, emails" },
      { name: "lastContactDays", label: "Days Since Last Contact", placeholder: "5", tip: "Most recent interaction" },
      { name: "stakeholdersBroad", label: "Stakeholders Engaged", placeholder: "3", tip: "Unique contacts in last 90d" },
    ],
    scoreFunction: (f) => {
      const touches = parseFloat(f.touchpointsMonth) || 0;
      const lastContact = parseFloat(f.lastContactDays) || 30;
      const stakeholders = parseFloat(f.stakeholdersBroad) || 0;
      const tScore = Math.min(100, (touches / 6) * 100);
      const lcScore = Math.max(0, 100 - (lastContact * 3));
      const sScore = Math.min(100, (stakeholders / 5) * 100);
      return Math.round((tScore * 0.30 + lcScore * 0.40 + sScore * 0.30));
    },
    defaultWeight: 0.15,
  },
  featureAdoption: {
    key: "featureAdoption", label: "Feature Adoption", icon: "🧩", color: "#14b8a6",
    description: "Breadth of feature usage, new feature uptake, power user ratio",
    fields: [
      { name: "featuresUsedPct", label: "Features Used (%)", placeholder: "55", tip: "% of available features used" },
      { name: "newFeatureUptake", label: "New Feature Uptake (%)", placeholder: "40", tip: "Adoption of features released last 90d" },
      { name: "powerUserRatio", label: "Power Users (%)", placeholder: "18", tip: "Users using advanced features" },
    ],
    scoreFunction: (f) => {
      const used = parseFloat(f.featuresUsedPct) || 0;
      const uptake = parseFloat(f.newFeatureUptake) || 0;
      const power = parseFloat(f.powerUserRatio) || 0;
      const uScore = Math.min(100, (used / 70) * 100);
      const nScore = Math.min(100, (uptake / 50) * 100);
      const pScore = Math.min(100, (power / 25) * 100);
      return Math.round((uScore * 0.40 + nScore * 0.30 + pScore * 0.30));
    },
    defaultWeight: 0.15,
  },
};

function healthTier(score) {
  if (score >= 70) return { label: "Healthy", color: "#10b981", bg: "rgba(16,185,129,0.10)", ring: "rgba(16,185,129,0.25)" };
  if (score >= 40) return { label: "Needs Attention", color: "#f59e0b", bg: "rgba(245,158,11,0.10)", ring: "rgba(245,158,11,0.25)" };
  return { label: "At Risk", color: "#ef4444", bg: "rgba(239,68,68,0.10)", ring: "rgba(239,68,68,0.25)" };
}

// Mini SVG spark chart
function SparkChart({ data, width = 200, height = 48, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 100); const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 8) - 4}`).join(" ");
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 8) - 4;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={width} cy={lastY} r="3.5" fill={color} />
    </svg>
  );
}

// Circular score gauge
function ScoreGauge({ score, size = 120 }) {
  const tier = healthTier(score);
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={T.surface2} strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={tier.color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: size * 0.3, fontWeight: 700, color: tier.color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.085, color: tier.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{tier.label}</span>
      </div>
    </div>
  );
}

// Weight slider
function WeightSlider({ signal, weight, onChange }) {
  const pct = Math.round(weight * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: `rgba(${hexToRgb(signal.color)},0.12)`, border: `1px solid ${signal.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{signal.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{signal.label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: signal.color, minWidth: 36, textAlign: "right" }}>{pct}%</span>
        </div>
        <input type="range" min="0" max="50" value={pct} onChange={e => onChange(parseInt(e.target.value) / 100)}
          style={{ width: "100%", height: 4, appearance: "none", background: T.surface2, borderRadius: 2, outline: "none", cursor: "pointer", accentColor: signal.color }} />
      </div>
    </div>
  );
}

function HealthScorePanel({ accounts }) {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || "");
  const [weights, setWeights] = useState(() => {
    const w = {};
    Object.values(HEALTH_SIGNALS).forEach(s => { w[s.key] = s.defaultWeight; });
    return w;
  });
  const [signals, setSignals] = useState(() => {
    const s = {};
    Object.values(HEALTH_SIGNALS).forEach(sig => {
      sig.fields.forEach(f => { s[f.name] = ""; });
    });
    return s;
  });
  const [scoreHistory, setScoreHistory] = useState([]);
  const [currentScore, setCurrentScore] = useState(null);
  const [componentScores, setComponentScores] = useState({});
  const [explanation, setExplanation] = useState("");
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(40);
  const [alerts, setAlerts] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const { tierId, incrementActions } = useTier();

  const account = accounts.find(a => a.id === selectedAccount);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightsValid = Math.abs(totalWeight - 1.0) < 0.02;

  const normalizeWeights = () => {
    if (totalWeight === 0) return;
    const normalized = {};
    Object.entries(weights).forEach(([k, v]) => { normalized[k] = parseFloat((v / totalWeight).toFixed(2)); });
    // Fix rounding to ensure sum is exactly 1.00
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
    const firstKey = Object.keys(normalized)[0];
    normalized[firstKey] = parseFloat((normalized[firstKey] + (1 - sum)).toFixed(2));
    setWeights(normalized);
  };

  const handleSignalChange = (name, value) => {
    setSignals(p => ({ ...p, [name]: value }));
  };

  const calculateScore = () => {
    const compScores = {};
    Object.values(HEALTH_SIGNALS).forEach(sig => {
      const fieldValues = {};
      sig.fields.forEach(f => { fieldValues[f.name] = signals[f.name]; });
      compScores[sig.key] = sig.scoreFunction(fieldValues);
    });
    setComponentScores(compScores);

    let composite = 0;
    Object.entries(compScores).forEach(([key, score]) => {
      composite += score * (weights[key] || 0);
    });
    const finalScore = Math.round(Math.max(0, Math.min(100, composite)));
    setCurrentScore(finalScore);

    const historyEntry = { score: finalScore, date: new Date().toLocaleString(), components: { ...compScores } };
    setScoreHistory(prev => [...prev, historyEntry]);

    // Check alerts
    if (finalScore < alertThreshold) {
      setAlerts(prev => [...prev, {
        id: Date.now(), account: account?.company || "Unknown",
        score: finalScore, threshold: alertThreshold,
        time: new Date().toLocaleTimeString(),
      }]);
    }

    return { finalScore, compScores };
  };

  const generateExplanation = async (score, compScores) => {
    setLoadingExplanation(true);
    try {
      const prevScore = scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].score : null;
      const direction = prevScore !== null ? (score > prevScore ? "increased" : score < prevScore ? "decreased" : "unchanged") : "initial";
      const delta = prevScore !== null ? Math.abs(score - prevScore) : 0;

      const signalBreakdown = Object.entries(compScores).map(([key, val]) => {
        const sig = HEALTH_SIGNALS[key];
        const w = Math.round(weights[key] * 100);
        return `${sig.label}: ${val}/100 (weight: ${w}%)`;
      }).join(", ");

      const prompt = `Customer: ${account?.company || "Unknown"}. Composite health score: ${score}/100 (${healthTier(score).label}). ${prevScore !== null ? `Previous score: ${prevScore}. Score ${direction} by ${delta} points.` : "This is the first score calculation."} Component breakdown: ${signalBreakdown}. Alert threshold: ${alertThreshold}. ${score < alertThreshold ? "ALERT: Score is below threshold." : ""}\n\nWrite exactly 2 sentences explaining why this customer's health score is at ${score}. Be specific about which signals are driving it up or down. If the score changed, explain what caused the change. Use business language a CSM would use.`;

      const text = await callClaude("You are a Customer Success analytics engine. Write concise, specific health score explanations in exactly 2 sentences. No hedging, no filler.", prompt, 200, { action_type: "health_score", tier: tierId });
      incrementActions();
      setExplanation(text);
    } catch {
      setExplanation("Unable to generate explanation. Score calculated successfully.");
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleCalculate = async () => {
    const { finalScore, compScores } = calculateScore();
    await generateExplanation(finalScore, compScores);
  };

  const loadDemoData = () => {
    setSignals({
      dauMau: "28", avgSessionsWeek: "3.8", coreFeatureAdoption: "62",
      ticketsPerMonth: "11", avgResolutionHrs: "6", escalationRate: "15",
      npsScore: "35", csatScore: "3.9", lastSurveyDays: "21",
      onTimePayments: "92", contractGrowth: "8", daysPastDue: "0",
      touchpointsMonth: "3", lastContactDays: "8", stakeholdersBroad: "2",
      featuresUsedPct: "45", newFeatureUptake: "30", powerUserRatio: "12",
    });
    setShowDemo(true);
    setTimeout(() => setShowDemo(false), 2000);
  };

  const scoreData = scoreHistory.map(h => h.score);

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="❤️" title="Health Score Engine" color="#ec4899"
        bullets={[
          "Calculates a composite customer health score (0–100) by combining six signal categories: product usage, support health, NPS/CSAT sentiment, billing patterns, CSM engagement, and feature adoption depth.",
          "Each signal category has configurable weights that admins can adjust via sliders — so a product-led company can weight usage higher, while a services company can weight CSM engagement higher.",
          "Scores are tracked over time with trend charts, and Claude AI generates a natural-language explanation for every score — telling you in plain English exactly why a customer is healthy or at risk.",
        ]}
        workflow={[
          "Select an account and enter signal data across all six categories",
          "Adjust category weights with sliders (must total 100%)",
          "Engine calculates component scores and a weighted composite",
          "AI generates a 2-sentence explanation of what's driving the score",
        ]}
        outputLabel="What You Get"
        outputItems={[
          { icon: "🎯", text: "Composite score 0–100 with circular gauge" },
          { icon: "📊", text: "Component breakdown per signal category" },
          { icon: "📈", text: "Score trend history with spark charts" },
          { icon: "🤖", text: "AI explanation of every score change" },
        ]}
        audienceLabel="Alerts & Config"
        audience={[
          { icon: "🔴", text: "Auto-alerts when score drops below threshold" },
          { icon: "⚙️", text: "Admin-configurable weights per tenant" },
          { icon: "🗄️", text: "PostgreSQL schema included for production" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, minHeight: 0 }}>
        {/* ─── Left: Account + Config ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Account Picker */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Account</div>
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
              style={{ ...inputStyle, fontSize: 13, cursor: "pointer" }}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.company}</option>
              ))}
            </select>
            {account && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <StatusBadge status={account.status} small />
                <span style={{ fontSize: 11, color: "#475569" }}>{account.mrr}/mo</span>
              </div>
            )}
          </div>

          {/* Weight Config */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>Signal Weights</div>
              <button onClick={() => setShowConfig(c => !c)} style={{ fontSize: 10, color: T.green, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{showConfig ? "Hide" : "Configure"}</button>
            </div>
            {!weightsValid && (
              <div style={{ fontSize: 11, color: T.warning, marginBottom: 8, padding: "6px 10px", background: "rgba(245,158,11,0.06)", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Total: {Math.round(totalWeight * 100)}% (must equal 100%)</span>
                <button onClick={normalizeWeights} style={{ fontSize: 10, fontWeight: 600, color: T.green, background: "none", border: `1px solid ${T.green}44`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Auto-fix</button>
              </div>
            )}
            {showConfig ? (
              Object.values(HEALTH_SIGNALS).map(sig => (
                <WeightSlider key={sig.key} signal={sig} weight={weights[sig.key]}
                  onChange={v => setWeights(p => ({ ...p, [sig.key]: v }))} />
              ))
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Object.values(HEALTH_SIGNALS).map(sig => (
                  <span key={sig.key} style={{ fontSize: 10, color: sig.color, background: `rgba(${hexToRgb(sig.color)},0.08)`, padding: "3px 8px", borderRadius: 5 }}>
                    {sig.icon} {Math.round(weights[sig.key] * 100)}%
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Alert Config */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Alert Threshold</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min="10" max="70" value={alertThreshold} onChange={e => setAlertThreshold(parseInt(e.target.value))}
                style={{ flex: 1, height: 4, appearance: "none", background: T.surface2, borderRadius: 2, outline: "none", cursor: "pointer", accentColor: T.error }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.error, minWidth: 28 }}>{alertThreshold}</span>
            </div>
            <p style={{ fontSize: 10.5, color: "#475569", marginTop: 6 }}>Alert fires when any account scores below {alertThreshold}</p>
          </div>

          {/* Alerts Log */}
          {alerts.length > 0 && (
            <div style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.error, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>⚠ Alerts ({alerts.length})</div>
              {alerts.slice(-5).reverse().map(a => (
                <div key={a.id} style={{ fontSize: 11.5, color: T.subtle, padding: "5px 0", borderBottom: `1px solid rgba(239,68,68,0.08)` }}>
                  <strong style={{ color: T.error }}>{a.score}</strong> — {a.account} <span style={{ color: "#475569" }}>({a.time})</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <button onClick={loadDemoData} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px", fontSize: 12, color: showDemo ? T.green : T.subtle, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {showDemo ? "✓ Demo Data Loaded" : "⚡ Load Demo Data"}
          </button>
        </div>

        {/* ─── Right: Signal Inputs + Results ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Signal Input Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {Object.values(HEALTH_SIGNALS).map(sig => {
              const fieldValues = {};
              sig.fields.forEach(f => { fieldValues[f.name] = signals[f.name]; });
              const preview = sig.fields.some(f => signals[f.name]) ? sig.scoreFunction(fieldValues) : null;
              const tier = preview !== null ? healthTier(preview) : null;
              return (
                <div key={sig.key} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `rgba(${hexToRgb(sig.color)},0.12)`, border: `1px solid ${sig.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{sig.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{sig.label}</div>
                      <div style={{ fontSize: 10.5, color: "#475569" }}>{sig.description}</div>
                    </div>
                    {preview !== null && (
                      <div style={{ fontSize: 16, fontWeight: 700, color: tier.color, fontFamily: "'Playfair Display', serif" }}>{preview}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sig.fields.map(f => (
                      <div key={f.name}>
                        <label style={{ fontSize: 10, color: `${sig.color}cc`, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>{f.label}</label>
                        <input type="number" value={signals[f.name]} onChange={e => handleSignalChange(f.name, e.target.value)} placeholder={f.placeholder} title={f.tip} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calculate Button */}
          <button onClick={handleCalculate} disabled={loadingExplanation} style={{
            width: "100%", background: loadingExplanation ? T.greenDim : "linear-gradient(135deg, #ec4899, #8b5cf6)",
            color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 600,
            cursor: loadingExplanation ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 4px 20px rgba(236,72,153,0.2)",
          }}>
            {loadingExplanation ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                Calculating & Generating AI Explanation...
              </span>
            ) : "❤️ Calculate Health Score"}
          </button>

          {/* ─── Results Panel ─── */}
          {currentScore !== null && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", animation: "panelIn 0.3s ease" }}>
              {/* Score Header */}
              <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 20 }}>
                <ScoreGauge score={currentScore} size={130} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: T.text, marginBottom: 4 }}>{account?.company || "Account"}</h3>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
                    Calculated {new Date().toLocaleString()} · {Object.values(signals).filter(v => v).length} signals processed
                  </div>
                  {/* Score trend */}
                  {scoreData.length > 1 && (
                    <div>
                      <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Score Trend</div>
                      <SparkChart data={scoreData} width={220} height={44} color={healthTier(currentScore).color} />
                    </div>
                  )}
                </div>
              </div>

              {/* AI Explanation */}
              <div style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.14)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>🤖</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Explanation</span>
                </div>
                <p style={{ fontSize: 13.5, color: "#c4b5fd", lineHeight: 1.7 }}>
                  {loadingExplanation ? "Generating explanation..." : explanation || "Calculating..."}
                </p>
              </div>

              {/* Alert Banner */}
              {currentScore < alertThreshold && (
                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🚨</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.error }}>Health Score Alert</div>
                    <div style={{ fontSize: 12, color: "#f87171" }}>Score of {currentScore} is below your threshold of {alertThreshold}. Immediate attention recommended.</div>
                  </div>
                </div>
              )}

              {/* Component Breakdown */}
              <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Component Scores</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                {Object.entries(componentScores).map(([key, score]) => {
                  const sig = HEALTH_SIGNALS[key];
                  const tier = healthTier(score);
                  const weightPct = Math.round(weights[key] * 100);
                  const weighted = Math.round(score * weights[key]);
                  return (
                    <div key={key} style={{ background: T.bg, border: `1px solid ${tier.color}22`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>{sig.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{sig.label}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: tier.color }}>{score}</span>
                        <span style={{ fontSize: 10, color: "#475569" }}>{weightPct}% → <strong style={{ color: tier.color }}>{weighted}</strong> pts</span>
                      </div>
                      {/* Mini bar */}
                      <div style={{ height: 4, background: T.surface2, borderRadius: 2, marginTop: 8 }}>
                        <div style={{ height: "100%", width: `${score}%`, background: tier.color, borderRadius: 2, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Score History Table */}
              {scoreHistory.length > 1 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Score History</div>
                  <div style={{ maxHeight: 160, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "7px 12px", textAlign: "left", borderBottom: `1px solid ${T.border}`, color: "#475569", fontWeight: 600, background: T.surface2, position: "sticky", top: 0 }}>#</th>
                          <th style={{ padding: "7px 12px", textAlign: "left", borderBottom: `1px solid ${T.border}`, color: "#475569", fontWeight: 600, background: T.surface2, position: "sticky", top: 0 }}>Score</th>
                          <th style={{ padding: "7px 12px", textAlign: "left", borderBottom: `1px solid ${T.border}`, color: "#475569", fontWeight: 600, background: T.surface2, position: "sticky", top: 0 }}>Delta</th>
                          <th style={{ padding: "7px 12px", textAlign: "left", borderBottom: `1px solid ${T.border}`, color: "#475569", fontWeight: 600, background: T.surface2, position: "sticky", top: 0 }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...scoreHistory].reverse().map((h, i) => {
                          const idx = scoreHistory.length - i;
                          const prev = scoreHistory.length - i - 2 >= 0 ? scoreHistory[scoreHistory.length - i - 2].score : null;
                          const delta = prev !== null ? h.score - prev : null;
                          const tier = healthTier(h.score);
                          return (
                            <tr key={i}>
                              <td style={{ padding: "6px 12px", borderBottom: `1px solid ${T.border}`, color: "#475569" }}>{idx}</td>
                              <td style={{ padding: "6px 12px", borderBottom: `1px solid ${T.border}` }}>
                                <span style={{ fontWeight: 700, color: tier.color }}>{h.score}</span>
                              </td>
                              <td style={{ padding: "6px 12px", borderBottom: `1px solid ${T.border}` }}>
                                {delta !== null ? (
                                  <span style={{ fontWeight: 600, color: delta > 0 ? T.green : delta < 0 ? T.error : "#475569" }}>
                                    {delta > 0 ? "+" : ""}{delta}
                                  </span>
                                ) : <span style={{ color: "#334155" }}>—</span>}
                              </td>
                              <td style={{ padding: "6px 12px", borderBottom: `1px solid ${T.border}`, color: "#475569" }}>{h.date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBOOK ENGINE
// ═══════════════════════════════════════════════════════════════════════════
//
// PostgreSQL Schema Reference:
//
// CREATE TABLE playbooks (
//   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   tenant_id   UUID NOT NULL, name TEXT NOT NULL,
//   description TEXT, trigger_type TEXT NOT NULL,
//   trigger_config JSONB NOT NULL DEFAULT '{}',
//   steps       JSONB NOT NULL DEFAULT '[]',
//   is_active   BOOLEAN DEFAULT FALSE,
//   created_by  UUID REFERENCES users(id),
//   created_at  TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE playbook_steps (
//   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
//   step_order  INTEGER NOT NULL,
//   node_type   TEXT NOT NULL, -- 'action','condition','delay'
//   action_type TEXT,          -- 'send_email','create_task', etc.
//   config      JSONB NOT NULL DEFAULT '{}',
//   true_next   UUID REFERENCES playbook_steps(id),
//   false_next  UUID REFERENCES playbook_steps(id),
//   created_at  TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE playbook_enrollments (
//   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   playbook_id UUID NOT NULL REFERENCES playbooks(id),
//   account_id  UUID NOT NULL,
//   status      TEXT DEFAULT 'active', -- active, completed, paused, failed
//   current_step UUID REFERENCES playbook_steps(id),
//   enrolled_at TIMESTAMPTZ DEFAULT NOW(),
//   completed_at TIMESTAMPTZ, metadata JSONB DEFAULT '{}'
// );
//
// CREATE TABLE playbook_execution_logs (
//   id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   enrollment_id UUID NOT NULL REFERENCES playbook_enrollments(id),
//   step_id       UUID NOT NULL REFERENCES playbook_steps(id),
//   status        TEXT NOT NULL, -- 'success','failed','skipped','retrying'
//   attempt       INTEGER DEFAULT 1,
//   result        JSONB DEFAULT '{}',
//   error_message TEXT,
//   executed_at   TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_pe_enrollment ON playbook_execution_logs(enrollment_id, executed_at);
// ═══════════════════════════════════════════════════════════════════════════

const TRIGGER_TYPES = {
  manual:    { label: "Manual", icon: "👆", color: "#64748b", description: "Triggered manually by a CSM" },
  scheduled: { label: "Scheduled", icon: "🕐", color: "#8b5cf6", description: "Runs on a cron schedule" },
  health_score_change: { label: "Health Score Change", icon: "❤️", color: "#ec4899", description: "Fires when score crosses threshold" },
  new_support_ticket:  { label: "New Support Ticket", icon: "🎧", color: "#06b6d4", description: "Fires on new ticket creation" },
  approaching_renewal: { label: "Approaching Renewal", icon: "⏳", color: "#f59e0b", description: "Fires X days before renewal" },
  nps_response:        { label: "NPS Response", icon: "📊", color: "#10b981", description: "Fires when NPS survey submitted" },
  days_since_login:    { label: "Days Since Login", icon: "🚪", color: "#ef4444", description: "Fires when login gap exceeds X days" },
};

const ACTION_TYPES = {
  send_email:     { label: "Send Email", icon: "✉️", color: "#8b5cf6", description: "AI-personalized email from template" },
  create_task:    { label: "Create Task", icon: "✓", color: "#10b981", description: "Assigned to CSM with due date" },
  update_field:   { label: "Update Account", icon: "✏️", color: "#06b6d4", description: "Modify account field" },
  send_slack:     { label: "Slack Message", icon: "💬", color: "#f59e0b", description: "Post to Slack channel" },
  calendar_event: { label: "Calendar Event", icon: "📅", color: "#ec4899", description: "Create meeting invite" },
  add_note:       { label: "Add Note", icon: "📝", color: "#14b8a6", description: "Add to account timeline" },
  escalate:       { label: "Escalate", icon: "🚨", color: "#ef4444", description: "Escalate to manager" },
};

const CONDITION_TYPES = {
  health_score:    { label: "Health Score", icon: "❤️", options: ["≥ 70 (Healthy)", "40–69 (Attention)", "< 40 (At Risk)"] },
  account_tier:    { label: "Account Tier", icon: "⭐", options: ["Enterprise", "Mid-Market", "SMB"] },
  days_last_contact: { label: "Days Since Contact", icon: "📞", options: ["< 7 days", "7–14 days", "15–30 days", "> 30 days"] },
  email_engagement:  { label: "Email Engagement", icon: "📧", options: ["Opened", "Clicked", "No engagement"] },
  custom_field:      { label: "Custom Field", icon: "🔧", options: ["Equals value", "Greater than", "Less than"] },
};

const PLAYBOOK_TEMPLATES = {
  onboarding_90day: {
    name: "90-Day Onboarding", icon: "🚀", color: "#06b6d4",
    description: "Structured 90-day onboarding with welcome, training, check-ins, and go-live milestones.",
    trigger: "manual", triggerConfig: {},
    steps: [
      { type: "action", action: "send_email", label: "Welcome Email", config: { template: "welcome_onboarding", delay: 0 } },
      { type: "action", action: "create_task", label: "Schedule Kickoff", config: { task: "Schedule kickoff call", dueDays: 2 } },
      { type: "action", action: "calendar_event", label: "Kickoff Meeting", config: { title: "Onboarding Kickoff", delay: 3 } },
      { type: "delay", label: "Wait 7 days", config: { days: 7 } },
      { type: "action", action: "send_email", label: "Training Resources", config: { template: "training_resources" } },
      { type: "delay", label: "Wait 14 days", config: { days: 14 } },
      { type: "condition", condition: "health_score", label: "Check Adoption", trueLabel: "On Track", falseLabel: "Needs Help" },
      { type: "action", action: "create_task", label: "30-Day Check-in", config: { task: "30-day check-in call" } },
      { type: "delay", label: "Wait 30 days", config: { days: 30 } },
      { type: "action", action: "send_email", label: "60-Day Review", config: { template: "60_day_review" } },
      { type: "delay", label: "Wait 30 days", config: { days: 30 } },
      { type: "action", action: "create_task", label: "90-Day Success Review", config: { task: "90-day success review meeting" } },
      { type: "action", action: "add_note", label: "Mark Onboarded", config: { note: "Account completed 90-day onboarding" } },
    ],
  },
  renewal_prep_60day: {
    name: "60-Day Renewal Prep", icon: "⏳", color: "#f59e0b",
    description: "Proactive renewal workflow starting 60 days before contract end.",
    trigger: "approaching_renewal", triggerConfig: { daysBefore: 60 },
    steps: [
      { type: "action", action: "create_task", label: "Prep Renewal Brief", config: { task: "Prepare renewal brief and ROI summary", dueDays: 3 } },
      { type: "action", action: "send_email", label: "Value Recap Email", config: { template: "renewal_value_recap" } },
      { type: "delay", label: "Wait 7 days", config: { days: 7 } },
      { type: "condition", condition: "health_score", label: "Health Check", trueLabel: "Healthy", falseLabel: "At Risk" },
      { type: "action", action: "calendar_event", label: "Renewal Meeting", config: { title: "Renewal Discussion" } },
      { type: "delay", label: "Wait 14 days", config: { days: 14 } },
      { type: "action", action: "send_email", label: "Contract Sent", config: { template: "contract_follow_up" } },
      { type: "action", action: "create_task", label: "Final Follow-Up", config: { task: "Renewal final follow-up", dueDays: 7 } },
    ],
  },
  at_risk_intervention: {
    name: "At-Risk Intervention", icon: "🚨", color: "#ef4444",
    description: "Immediate escalation and recovery workflow when health drops below 40.",
    trigger: "health_score_change", triggerConfig: { threshold: 40, direction: "below" },
    steps: [
      { type: "action", action: "escalate", label: "Alert Manager", config: { message: "Account health critical — immediate attention required" } },
      { type: "action", action: "create_task", label: "Emergency Call", config: { task: "Schedule emergency check-in within 24hrs", dueDays: 1 } },
      { type: "action", action: "send_slack", label: "Slack Team", config: { channel: "#cs-urgent", message: "⚠ At-risk account flagged" } },
      { type: "delay", label: "Wait 2 days", config: { days: 2 } },
      { type: "condition", condition: "days_last_contact", label: "Contact Made?", trueLabel: "Yes", falseLabel: "No Response" },
      { type: "action", action: "send_email", label: "Executive Outreach", config: { template: "exec_save_attempt" } },
      { type: "action", action: "add_note", label: "Log Intervention", config: { note: "At-risk intervention playbook completed" } },
    ],
  },
  qbr_scheduling: {
    name: "QBR Scheduling", icon: "📊", color: "#8b5cf6",
    description: "Quarterly business review preparation and follow-up automation.",
    trigger: "scheduled", triggerConfig: { cron: "0 9 1 */3 *" },
    steps: [
      { type: "action", action: "create_task", label: "Prep QBR Deck", config: { task: "Prepare QBR deck with latest metrics", dueDays: 7 } },
      { type: "action", action: "send_email", label: "QBR Invite", config: { template: "qbr_invite" } },
      { type: "delay", label: "Wait 3 days", config: { days: 3 } },
      { type: "condition", condition: "email_engagement", label: "Email Opened?", trueLabel: "Opened", falseLabel: "Not Opened" },
      { type: "action", action: "calendar_event", label: "QBR Meeting", config: { title: "Quarterly Business Review" } },
      { type: "delay", label: "Wait 1 day after QBR", config: { days: 1 } },
      { type: "action", action: "send_email", label: "QBR Follow-Up", config: { template: "qbr_follow_up" } },
    ],
  },
  expansion_signal: {
    name: "Expansion Signal", icon: "📈", color: "#10b981",
    description: "Capture expansion opportunities when usage or engagement spikes.",
    trigger: "health_score_change", triggerConfig: { threshold: 80, direction: "above" },
    steps: [
      { type: "action", action: "add_note", label: "Flag Expansion", config: { note: "Expansion signal detected — high health score" } },
      { type: "action", action: "create_task", label: "Upsell Review", config: { task: "Review account for expansion opportunities", dueDays: 5 } },
      { type: "condition", condition: "account_tier", label: "Tier Check", trueLabel: "Enterprise", falseLabel: "Other" },
      { type: "action", action: "send_email", label: "New Features Intro", config: { template: "expansion_features" } },
      { type: "action", action: "calendar_event", label: "Expansion Call", config: { title: "Growth Opportunity Discussion" } },
    ],
  },
  win_back_churned: {
    name: "Win-Back Churned", icon: "🔄", color: "#64748b",
    description: "Re-engagement sequence for churned accounts over 60 days.",
    trigger: "manual", triggerConfig: {},
    steps: [
      { type: "delay", label: "Wait 30 days", config: { days: 30 } },
      { type: "action", action: "send_email", label: "We Miss You", config: { template: "win_back_soft" } },
      { type: "delay", label: "Wait 14 days", config: { days: 14 } },
      { type: "condition", condition: "email_engagement", label: "Engaged?", trueLabel: "Opened", falseLabel: "Ignored" },
      { type: "action", action: "send_email", label: "Special Offer", config: { template: "win_back_offer" } },
      { type: "action", action: "create_task", label: "Personal Call", config: { task: "Make personal win-back call", dueDays: 3 } },
    ],
  },
  escalation_critical: {
    name: "Critical Escalation", icon: "⚡", color: "#ef4444",
    description: "Multi-level escalation path for critical account situations.",
    trigger: "new_support_ticket", triggerConfig: { severity: "critical" },
    steps: [
      { type: "action", action: "send_slack", label: "Alert Channel", config: { channel: "#cs-escalations", message: "🔴 Critical ticket escalation" } },
      { type: "action", action: "escalate", label: "Notify Manager", config: { message: "Critical support ticket requires immediate attention" } },
      { type: "action", action: "create_task", label: "Respond in 1hr", config: { task: "Respond to critical ticket", dueDays: 0 } },
      { type: "delay", label: "Wait 4 hours", config: { hours: 4 } },
      { type: "condition", condition: "custom_field", label: "Resolved?", trueLabel: "Yes", falseLabel: "No" },
      { type: "action", action: "escalate", label: "VP Escalation", config: { message: "Unresolved critical ticket — VP attention required" } },
      { type: "action", action: "send_email", label: "Customer Update", config: { template: "critical_status_update" } },
    ],
  },
};

// ─── Workflow Node Component ─────────────────────────────────────────────
function WorkflowNode({ node, index, total, selected, onSelect, onRemove }) {
  const isAction = node.type === "action";
  const isCondition = node.type === "condition";
  const isDelay = node.type === "delay";
  const meta = isAction ? ACTION_TYPES[node.action] : isCondition ? { label: "Condition", icon: "◆", color: "#f59e0b" } : { label: "Delay", icon: "⏱", color: "#64748b" };
  const borderColor = selected ? meta.color : T.border;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {index > 0 && (
        <div style={{ width: 2, height: 20, background: `linear-gradient(to bottom, ${T.border}, ${meta.color}44)` }} />
      )}
      <div onClick={() => onSelect(index)} style={{
        position: "relative", minWidth: isCondition ? 220 : 200, background: selected ? `rgba(${hexToRgb(meta.color)},0.06)` : T.surface,
        border: `1.5px solid ${borderColor}`, borderRadius: isCondition ? 14 : 12,
        padding: isCondition ? "14px 16px" : "12px 16px", cursor: "pointer",
        transition: "all 0.15s", boxShadow: selected ? `0 0 16px ${meta.color}22` : "none",
      }}>
        {onRemove && (
          <button onClick={e => { e.stopPropagation(); onRemove(index); }} style={{
            position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%",
            background: T.surface2, border: `1px solid ${T.border}`, color: "#475569",
            fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: isCondition ? 28 : 7, background: `rgba(${hexToRgb(meta.color)},0.12)`, border: `1px solid ${meta.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
            {isDelay ? "⏱" : isCondition ? "◆" : (meta.icon || "?")}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.label}</div>
            <div style={{ fontSize: 10, color: "#475569" }}>
              {isAction ? meta.label : isCondition ? CONDITION_TYPES[node.condition]?.label || "Condition" : `Wait ${node.config?.days || 0}d`}
            </div>
          </div>
        </div>
        {isCondition && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 9, background: "rgba(16,185,129,0.1)", color: T.green, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>✓ {node.trueLabel || "Yes"}</span>
            <span style={{ fontSize: 9, background: "rgba(239,68,68,0.1)", color: T.error, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>✕ {node.falseLabel || "No"}</span>
          </div>
        )}
      </div>
      {index < total - 1 && (
        <div style={{ width: 2, height: 20, background: `linear-gradient(to bottom, ${meta.color}44, ${T.border})` }} />
      )}
    </div>
  );
}

// ─── Node Configuration Sidebar ──────────────────────────────────────────
function NodeConfigPanel({ node, index, onChange, onClose }) {
  if (!node) return null;
  const isAction = node.type === "action";
  const isCondition = node.type === "condition";
  const meta = isAction ? ACTION_TYPES[node.action] : isCondition ? { label: "Condition", icon: "◆", color: "#f59e0b" } : { label: "Delay", icon: "⏱", color: "#64748b" };
  const update = (key, val) => onChange(index, { ...node, [key]: val });
  const updateConfig = (key, val) => onChange(index, { ...node, config: { ...node.config, [key]: val } });

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", animation: "panelIn 0.2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `rgba(${hexToRgb(meta.color)},0.12)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{meta.icon}</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{meta.label}</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer", fontSize: 10 }}>✕</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div><label style={labelStyle}>Step Name</label><input value={node.label || ""} onChange={e => update("label", e.target.value)} style={inputStyle} /></div>
        {isAction && (
          <>
            <div><label style={labelStyle}>Action Type</label>
              <select value={node.action} onChange={e => update("action", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {Object.entries(ACTION_TYPES).map(([k, v]) => (<option key={k} value={k}>{v.icon} {v.label}</option>))}
              </select>
            </div>
            {node.action === "send_email" && <div><label style={labelStyle}>Email Template</label><input value={node.config?.template || ""} onChange={e => updateConfig("template", e.target.value)} placeholder="template_name" style={inputStyle} /></div>}
            {node.action === "create_task" && (<><div><label style={labelStyle}>Task Description</label><input value={node.config?.task || ""} onChange={e => updateConfig("task", e.target.value)} placeholder="Task to create..." style={inputStyle} /></div><div><label style={labelStyle}>Due in (days)</label><input type="number" value={node.config?.dueDays || ""} onChange={e => updateConfig("dueDays", parseInt(e.target.value) || 0)} style={inputStyle} /></div></>)}
            {node.action === "send_slack" && (<><div><label style={labelStyle}>Channel</label><input value={node.config?.channel || ""} onChange={e => updateConfig("channel", e.target.value)} placeholder="#cs-alerts" style={inputStyle} /></div><div><label style={labelStyle}>Message</label><input value={node.config?.message || ""} onChange={e => updateConfig("message", e.target.value)} style={inputStyle} /></div></>)}
            {node.action === "escalate" && <div><label style={labelStyle}>Escalation Message</label><input value={node.config?.message || ""} onChange={e => updateConfig("message", e.target.value)} style={inputStyle} /></div>}
            {node.action === "add_note" && <div><label style={labelStyle}>Note</label><input value={node.config?.note || ""} onChange={e => updateConfig("note", e.target.value)} style={inputStyle} /></div>}
            {node.action === "calendar_event" && <div><label style={labelStyle}>Event Title</label><input value={node.config?.title || ""} onChange={e => updateConfig("title", e.target.value)} style={inputStyle} /></div>}
          </>
        )}
        {isCondition && (
          <div><label style={labelStyle}>Condition Type</label>
            <select value={node.condition || ""} onChange={e => update("condition", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {Object.entries(CONDITION_TYPES).map(([k, v]) => (<option key={k} value={k}>{v.icon} {v.label}</option>))}
            </select>
          </div>
        )}
        {node.type === "delay" && <div><label style={labelStyle}>Wait (days)</label><input type="number" value={node.config?.days || ""} onChange={e => updateConfig("days", parseInt(e.target.value) || 0)} style={inputStyle} /></div>}
      </div>
    </div>
  );
}

// ─── Execution Simulation ────────────────────────────────────────────────
function simulateExecution(playbook, account) {
  const logs = [];
  const startTime = new Date();
  playbook.steps.forEach((step, i) => {
    const elapsed = i * 1200;
    const status = Math.random() > 0.1 ? "success" : (Math.random() > 0.5 ? "retrying" : "failed");
    const meta = step.type === "action" ? ACTION_TYPES[step.action] : step.type === "condition" ? { label: "Condition" } : { label: "Delay" };
    logs.push({
      id: `log-${Date.now()}-${i}`, stepIndex: i, stepLabel: step.label,
      stepType: step.type, actionType: step.action,
      status, attempt: status === "retrying" ? 2 : 1,
      result: status === "success" ? { delivered: true } : {},
      error: status === "failed" ? "Connection timeout — will retry" : null,
      executedAt: new Date(startTime.getTime() + elapsed).toLocaleTimeString(),
    });
  });
  return logs;
}

// ─── Playbook Panel ──────────────────────────────────────────────────────
function PlaybookPanel({ accounts }) {
  const [tab, setTab] = useState("templates");  // templates | builder | dashboard | logs
  const [playbooks, setPlaybooks] = useState([]);
  const [activePlaybook, setActivePlaybook] = useState(null);
  const [steps, setSteps] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [playbookName, setPlaybookName] = useState("");
  const [playbookDesc, setPlaybookDesc] = useState("");
  const [triggerType, setTriggerType] = useState("manual");
  const [enrollments, setEnrollments] = useState([]);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [runningPlaybook, setRunningPlaybook] = useState(null);
  const [showAddNode, setShowAddNode] = useState(false);

  const loadTemplate = (key) => {
    const tpl = PLAYBOOK_TEMPLATES[key];
    setPlaybookName(tpl.name);
    setPlaybookDesc(tpl.description);
    setTriggerType(tpl.trigger);
    setSteps([...tpl.steps]);
    setSelectedStep(null);
    setTab("builder");
  };

  const savePlaybook = () => {
    if (!playbookName) return;
    const pb = {
      id: `pb-${Date.now()}`, name: playbookName, description: playbookDesc,
      trigger: triggerType, steps: [...steps], isActive: false,
      createdAt: new Date().toLocaleDateString(), enrolledCount: 0, completionRate: 0,
    };
    setPlaybooks(prev => [pb, ...prev]);
    setActivePlaybook(pb.id);
    setTab("dashboard");
  };

  const toggleActive = (id) => {
    setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const enrollAccount = (playbookId, accountId) => {
    const account = accounts.find(a => a.id === accountId);
    const enrollment = {
      id: `en-${Date.now()}`, playbookId, accountId, accountName: account?.company || "Unknown",
      status: "active", enrolledAt: new Date().toLocaleString(), currentStep: 0,
    };
    setEnrollments(prev => [enrollment, ...prev]);
    setPlaybooks(prev => prev.map(p => p.id === playbookId ? { ...p, enrolledCount: (p.enrolledCount || 0) + 1 } : p));
  };

  const runPlaybook = (playbookId) => {
    const pb = playbooks.find(p => p.id === playbookId);
    if (!pb) return;
    setRunningPlaybook(playbookId);
    const logs = simulateExecution(pb, null);
    setTimeout(() => {
      setExecutionLogs(prev => [...logs.reverse(), ...prev]);
      setRunningPlaybook(null);
      setPlaybooks(prev => prev.map(p => p.id === playbookId ? { ...p, completionRate: Math.round(70 + Math.random() * 25) } : p));
    }, 1500);
  };

  const addNode = (type, action, condition) => {
    const newNode = { type, label: type === "action" ? (ACTION_TYPES[action]?.label || "Action") : type === "condition" ? "Condition Check" : "Wait", action, condition, config: {}, trueLabel: "Yes", falseLabel: "No" };
    setSteps(prev => [...prev, newNode]);
    setShowAddNode(false);
    setSelectedStep(steps.length);
  };

  const updateNode = (index, updated) => { setSteps(prev => prev.map((s, i) => i === index ? updated : s)); };
  const removeNode = (index) => { setSteps(prev => prev.filter((_, i) => i !== index)); setSelectedStep(null); };
  const moveNode = (index, dir) => {
    const newSteps = [...steps];
    const target = index + dir;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]];
    setSteps(newSteps);
    setSelectedStep(target);
  };

  const totalEnrolled = enrollments.length;
  const activeEnrolled = enrollments.filter(e => e.status === "active").length;
  const successLogs = executionLogs.filter(l => l.status === "success").length;
  const failedLogs = executionLogs.filter(l => l.status === "failed").length;

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="⚡" title="Playbook Engine" color="#8b5cf6"
        bullets={[
          "Build automated multi-step workflows that run across your entire customer lifecycle — from onboarding through renewal, expansion, and even win-back sequences for churned accounts.",
          "Each playbook chains together actions (send emails, create tasks, Slack alerts, escalations), conditions (if health score is X, if account tier is Y), and delays into a visual step-by-step flow.",
          "Seven pre-built templates cover the most common CS motions. Load one, customize it, or build from scratch. Every execution is logged step-by-step with success/fail/retry status.",
        ]}
        workflow={[
          "Choose a pre-built template or start a blank playbook",
          "Add trigger, actions, conditions, and delays in the visual builder",
          "Configure each step — email templates, task details, Slack channels",
          "Activate the playbook and enroll accounts to begin execution",
        ]}
        outputLabel="Action Types"
        outputItems={[
          { icon: "✉️", text: "AI-personalized emails, tasks, Slack, calendar" },
          { icon: "◆", text: "Conditional branches on score, tier, engagement" },
          { icon: "🚨", text: "Auto-escalation to managers when needed" },
          { icon: "📊", text: "Step-by-step execution logs and metrics" },
        ]}
        audienceLabel="7 Templates"
        audience={[
          { icon: "🚀", text: "Onboarding, Renewal, At-Risk, QBR" },
          { icon: "📈", text: "Expansion Signal, Win-Back Churned" },
          { icon: "⚡", text: "Critical Escalation" },
        ]}
      />

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
        {[{ id: "templates", label: "Templates", icon: "📋" }, { id: "builder", label: "Builder", icon: "🔧" }, { id: "dashboard", label: "Dashboard", icon: "📊" }, { id: "logs", label: "Execution Logs", icon: "📜" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer",
            background: tab === t.id ? "rgba(139,92,246,0.12)" : "transparent",
            color: tab === t.id ? "#a78bfa" : "#475569", fontSize: 12, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ─── Templates Tab ─── */}
      {tab === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {Object.entries(PLAYBOOK_TEMPLATES).map(([key, tpl]) => (
            <div key={key} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px", transition: "border-color 0.15s", cursor: "pointer" }} onClick={() => loadTemplate(key)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `rgba(${hexToRgb(tpl.color)},0.12)`, border: `1px solid ${tpl.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{tpl.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{tpl.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: tpl.color, fontWeight: 600 }}>{TRIGGER_TYPES[tpl.trigger]?.icon} {TRIGGER_TYPES[tpl.trigger]?.label}</span>
                    <span style={{ fontSize: 10, color: "#475569" }}>· {tpl.steps.length} steps</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 12 }}>{tpl.description}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {tpl.steps.slice(0, 5).map((s, i) => {
                  const c = s.type === "action" ? (ACTION_TYPES[s.action]?.color || "#475569") : s.type === "condition" ? "#f59e0b" : "#64748b";
                  return <span key={i} style={{ fontSize: 9, color: c, background: `rgba(${hexToRgb(c)},0.08)`, padding: "2px 7px", borderRadius: 4, fontWeight: 500 }}>{s.type === "action" ? ACTION_TYPES[s.action]?.icon : s.type === "condition" ? "◆" : "⏱"} {s.label?.split(" ").slice(0, 2).join(" ")}</span>;
                })}
                {tpl.steps.length > 5 && <span style={{ fontSize: 9, color: "#475569", padding: "2px 7px" }}>+{tpl.steps.length - 5} more</span>}
              </div>
              <button style={{ width: "100%", marginTop: 12, background: `rgba(${hexToRgb(tpl.color)},0.08)`, border: `1px solid ${tpl.color}33`, borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 600, color: tpl.color, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Use Template →</button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Builder Tab ─── */}
      {tab === "builder" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Playbook Meta */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Playbook Name</label><input value={playbookName} onChange={e => setPlaybookName(e.target.value)} placeholder="My Playbook" style={inputStyle} /></div>
                <div><label style={labelStyle}>Trigger</label>
                  <select value={triggerType} onChange={e => setTriggerType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {Object.entries(TRIGGER_TYPES).map(([k, v]) => (<option key={k} value={k}>{v.icon} {v.label}</option>))}
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>Description</label><input value={playbookDesc} onChange={e => setPlaybookDesc(e.target.value)} placeholder="Describe this playbook..." style={inputStyle} /></div>
            </div>

            {/* Visual Workflow */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px", minHeight: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>Workflow ({steps.length} steps)</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {selectedStep !== null && selectedStep > 0 && <button onClick={() => moveNode(selectedStep, -1)} style={{ fontSize: 10, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 5, padding: "3px 8px", color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↑ Move Up</button>}
                  {selectedStep !== null && selectedStep < steps.length - 1 && <button onClick={() => moveNode(selectedStep, 1)} style={{ fontSize: 10, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 5, padding: "3px 8px", color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↓ Move Down</button>}
                </div>
              </div>

              {/* Trigger Node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: steps.length > 0 ? 0 : 16 }}>
                <div style={{ background: `rgba(${hexToRgb(TRIGGER_TYPES[triggerType]?.color || "#64748b")},0.08)`, border: `1.5px solid ${TRIGGER_TYPES[triggerType]?.color || "#64748b"}44`, borderRadius: 12, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{TRIGGER_TYPES[triggerType]?.icon}</span>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Trigger: {TRIGGER_TYPES[triggerType]?.label}</div><div style={{ fontSize: 10, color: "#475569" }}>{TRIGGER_TYPES[triggerType]?.description}</div></div>
                </div>
                {steps.length > 0 && <div style={{ width: 2, height: 20, background: T.border }} />}
              </div>

              {/* Step Nodes */}
              {steps.map((step, i) => (
                <WorkflowNode key={i} node={step} index={i} total={steps.length} selected={selectedStep === i} onSelect={setSelectedStep} onRemove={removeNode} />
              ))}

              {/* Add Node Button */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: steps.length > 0 ? 0 : 8 }}>
                {steps.length > 0 && <div style={{ width: 2, height: 16, background: T.border }} />}
                {!showAddNode ? (
                  <button onClick={() => setShowAddNode(true)} style={{
                    width: 36, height: 36, borderRadius: "50%", background: "rgba(139,92,246,0.08)",
                    border: `2px dashed #8b5cf644`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#8b5cf6", fontSize: 18, transition: "all 0.15s",
                  }}>+</button>
                ) : (
                  <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px", display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 420, animation: "panelIn 0.2s ease" }}>
                    <div style={{ width: "100%", fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>Actions</div>
                    {Object.entries(ACTION_TYPES).map(([k, v]) => (
                      <button key={k} onClick={() => addNode("action", k)} style={{ fontSize: 10, background: `rgba(${hexToRgb(v.color)},0.06)`, border: `1px solid ${v.color}33`, borderRadius: 6, padding: "5px 10px", color: v.color, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{v.icon} {v.label}</button>
                    ))}
                    <div style={{ width: "100%", fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginTop: 4, marginBottom: 4 }}>Logic</div>
                    <button onClick={() => addNode("condition", null, "health_score")} style={{ fontSize: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 6, padding: "5px 10px", color: "#f59e0b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>◆ Condition</button>
                    <button onClick={() => addNode("delay")} style={{ fontSize: 10, background: "rgba(100,116,139,0.06)", border: "1px solid rgba(100,116,139,0.3)", borderRadius: 6, padding: "5px 10px", color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>⏱ Delay</button>
                    <button onClick={() => setShowAddNode(false)} style={{ fontSize: 10, background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button onClick={savePlaybook} disabled={!playbookName || steps.length === 0} style={{
              width: "100%", background: (!playbookName || steps.length === 0) ? T.surface2 : "linear-gradient(135deg, #8b5cf6, #06b6d4)",
              color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 600,
              cursor: (!playbookName || steps.length === 0) ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>💾 Save Playbook</button>
          </div>

          {/* Right Config Panel */}
          <div>
            {selectedStep !== null && steps[selectedStep] ? (
              <NodeConfigPanel node={steps[selectedStep]} index={selectedStep} onChange={updateNode} onClose={() => setSelectedStep(null)} />
            ) : (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>👈</div>
                <p style={{ fontSize: 13, color: "#475569" }}>Click a step in the workflow to configure it</p>
                <p style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>Or click <strong style={{ color: "#8b5cf6" }}>+</strong> to add a new step</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Dashboard Tab ─── */}
      {tab === "dashboard" && (
        <div>
          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Total Playbooks", value: playbooks.length, color: "#8b5cf6" },
              { label: "Active", value: playbooks.filter(p => p.isActive).length, color: T.green },
              { label: "Enrolled Accounts", value: totalEnrolled, color: T.info },
              { label: "Avg Completion", value: playbooks.length > 0 ? Math.round(playbooks.reduce((a, p) => a + (p.completionRate || 0), 0) / Math.max(1, playbooks.filter(p => p.completionRate).length)) + "%" : "—", color: T.warning },
            ].map(s => (
              <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {playbooks.length === 0 ? (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>⚡</div>
              <p style={{ fontSize: 15, color: "#475569", marginBottom: 8 }}>No playbooks yet</p>
              <p style={{ fontSize: 12, color: "#334155" }}>Start from a template or build one from scratch</p>
              <button onClick={() => setTab("templates")} style={{ marginTop: 14, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 8, padding: "9px 20px", fontSize: 13, color: "#a78bfa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Browse Templates →</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {playbooks.map(pb => (
                <div key={pb.id} style={{ background: T.surface, border: `1px solid ${pb.isActive ? T.green + "44" : T.border}`, borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: pb.isActive ? T.green : "#475569" }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{pb.name}</div>
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          {TRIGGER_TYPES[pb.trigger]?.icon} {TRIGGER_TYPES[pb.trigger]?.label} · {pb.steps.length} steps · Created {pb.createdAt}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {pb.enrolledCount > 0 && <span style={{ fontSize: 11, color: T.info, background: "rgba(6,182,212,0.08)", padding: "3px 10px", borderRadius: 5 }}>{pb.enrolledCount} enrolled</span>}
                      {pb.completionRate > 0 && <span style={{ fontSize: 11, color: T.green, background: "rgba(16,185,129,0.08)", padding: "3px 10px", borderRadius: 5 }}>{pb.completionRate}% complete</span>}
                      <button onClick={() => toggleActive(pb.id)} style={{ fontSize: 11, fontWeight: 600, background: pb.isActive ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${pb.isActive ? T.error + "33" : T.green + "33"}`, borderRadius: 6, padding: "5px 12px", color: pb.isActive ? T.error : T.green, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{pb.isActive ? "Pause" : "Activate"}</button>
                      <button onClick={() => runPlaybook(pb.id)} disabled={runningPlaybook === pb.id} style={{ fontSize: 11, fontWeight: 600, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6, padding: "5px 12px", color: "#a78bfa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        {runningPlaybook === pb.id ? "Running..." : "▶ Run"}
                      </button>
                      <select onChange={e => { if (e.target.value) enrollAccount(pb.id, e.target.value); e.target.value = ""; }} style={{ ...inputStyle, width: "auto", fontSize: 10, padding: "5px 8px", cursor: "pointer" }}>
                        <option value="">+ Enroll</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.company}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Step Conversion Funnel */}
                  {pb.completionRate > 0 && (
                    <div style={{ marginTop: 12, display: "flex", gap: 3 }}>
                      {pb.steps.map((s, i) => {
                        const pct = Math.max(10, 100 - (i * (100 / pb.steps.length) * (1 - pb.completionRate / 100)));
                        const c = s.type === "action" ? (ACTION_TYPES[s.action]?.color || "#475569") : s.type === "condition" ? "#f59e0b" : "#64748b";
                        return (
                          <div key={i} title={`Step ${i + 1}: ${s.label} — ${Math.round(pct)}%`} style={{ flex: 1, height: 6, borderRadius: 3, background: `rgba(${hexToRgb(c)},${pct / 200 + 0.1})`, transition: "all 0.3s" }} />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Enrollments */}
          {enrollments.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Recent Enrollments</div>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                {enrollments.slice(0, 8).map(en => (
                  <div key={en.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: en.status === "active" ? T.green : en.status === "completed" ? "#8b5cf6" : T.error }} />
                      <span style={{ fontSize: 12.5, color: T.text, fontWeight: 500 }}>{en.accountName}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#475569" }}>{en.enrolledAt}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: en.status === "active" ? T.green : "#475569", textTransform: "uppercase" }}>{en.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Execution Logs Tab ─── */}
      {tab === "logs" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>✓ {successLogs} success</span>
              <span style={{ fontSize: 12, color: T.error, fontWeight: 600 }}>✕ {failedLogs} failed</span>
              <span style={{ fontSize: 12, color: T.warning, fontWeight: 600 }}>↻ {executionLogs.filter(l => l.status === "retrying").length} retrying</span>
            </div>
            {executionLogs.length > 0 && <button onClick={() => setExecutionLogs([])} style={{ fontSize: 11, color: "#475569", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear Logs</button>}
          </div>
          {executionLogs.length === 0 ? (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>📜</div>
              <p style={{ fontSize: 13, color: "#475569" }}>No execution logs yet. Run a playbook to see step-by-step results.</p>
            </div>
          ) : (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", maxHeight: 500, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Step", "Type", "Status", "Attempt", "Time", "Details"].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", borderBottom: `1px solid ${T.border}`, color: "#475569", fontWeight: 600, background: T.surface2, position: "sticky", top: 0, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {executionLogs.map(log => {
                    const statusConfig = { success: { color: T.green, icon: "✓", bg: "rgba(16,185,129,0.08)" }, failed: { color: T.error, icon: "✕", bg: "rgba(239,68,68,0.08)" }, retrying: { color: T.warning, icon: "↻", bg: "rgba(245,158,11,0.08)" }, skipped: { color: "#64748b", icon: "—", bg: "rgba(100,116,139,0.08)" } }[log.status] || { color: "#475569", icon: "?", bg: T.surface2 };
                    return (
                      <tr key={log.id}>
                        <td style={{ padding: "8px 14px", borderBottom: `1px solid ${T.border}`, color: T.text, fontWeight: 500 }}>{log.stepLabel}</td>
                        <td style={{ padding: "8px 14px", borderBottom: `1px solid ${T.border}` }}>
                          <span style={{ fontSize: 10, color: ACTION_TYPES[log.actionType]?.color || "#475569", fontWeight: 600 }}>{ACTION_TYPES[log.actionType]?.icon || "⏱"} {log.stepType}</span>
                        </td>
                        <td style={{ padding: "8px 14px", borderBottom: `1px solid ${T.border}` }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: statusConfig.color, background: statusConfig.bg, padding: "2px 8px", borderRadius: 4 }}>{statusConfig.icon} {log.status}</span>
                        </td>
                        <td style={{ padding: "8px 14px", borderBottom: `1px solid ${T.border}`, color: "#475569" }}>{log.attempt}</td>
                        <td style={{ padding: "8px 14px", borderBottom: `1px solid ${T.border}`, color: "#475569" }}>{log.executedAt}</td>
                        <td style={{ padding: "8px 14px", borderBottom: `1px solid ${T.border}`, color: log.error ? T.error : "#475569", fontSize: 11 }}>{log.error || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MEETING INTELLIGENCE MODULE
// ═══════════════════════════════════════════════════════════════════════════
//
// PostgreSQL Schema:
//
// CREATE TABLE meetings (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   tenant_id UUID NOT NULL, account_id UUID REFERENCES accounts(id),
//   title TEXT NOT NULL, platform TEXT NOT NULL, -- 'zoom','google_meet','teams'
//   external_meeting_id TEXT, recording_url TEXT,
//   scheduled_at TIMESTAMPTZ, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ,
//   duration_seconds INTEGER, attendees JSONB DEFAULT '[]',
//   status TEXT DEFAULT 'scheduled', -- scheduled,recording,processing,analyzed,failed
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_meetings_account ON meetings(account_id, scheduled_at DESC);
//
// CREATE TABLE meeting_transcripts (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
//   segments JSONB NOT NULL, -- [{speaker, text, start_time, end_time}]
//   full_text TEXT NOT NULL, -- searchable plain text
//   language TEXT DEFAULT 'en',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_transcript_search ON meeting_transcripts USING gin(to_tsvector('english', full_text));
//
// CREATE TABLE meeting_insights (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
//   summary JSONB NOT NULL,        -- ["bullet1","bullet2",...]
//   action_items JSONB NOT NULL,   -- [{description, assignee_name, due_date}]
//   sentiment JSONB NOT NULL,      -- [{name, sentiment, confidence}]
//   risk_signals JSONB NOT NULL,   -- [{type, quote, timestamp}]
//   topics JSONB NOT NULL,         -- [{topic, start_time, end_time}]
//   processing_time_ms INTEGER,
//   model_version TEXT DEFAULT 'claude-sonnet-4-20250514',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE meeting_action_items (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   meeting_id UUID NOT NULL REFERENCES meetings(id),
//   insight_id UUID REFERENCES meeting_insights(id),
//   description TEXT NOT NULL, assignee_name TEXT,
//   due_date DATE, status TEXT DEFAULT 'pending', -- pending,in_progress,done
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- Job queue for async processing
// CREATE TABLE meeting_jobs (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   meeting_id UUID NOT NULL REFERENCES meetings(id),
//   job_type TEXT NOT NULL, -- 'transcribe','analyze','extract_actions'
//   status TEXT DEFAULT 'queued', -- queued,running,completed,failed,retrying
//   attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3,
//   error TEXT, result JSONB,
//   queued_at TIMESTAMPTZ DEFAULT NOW(), started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
// );
// ═══════════════════════════════════════════════════════════════════════════

const PLATFORMS = {
  zoom:        { label: "Zoom", icon: "📹", color: "#2D8CFF", apiLabel: "Webhook + REST API" },
  google_meet: { label: "Google Meet", icon: "🟢", color: "#00AC47", apiLabel: "Calendar API + Recording" },
  teams:       { label: "Microsoft Teams", icon: "🟣", color: "#6264A7", apiLabel: "Graph API" },
};

const RISK_TYPES = {
  competitor_mention: { label: "Competitor Mention", icon: "⚔️", color: "#ef4444" },
  frustration:        { label: "Frustration", icon: "😤", color: "#f97316" },
  budget_concern:     { label: "Budget Concern", icon: "💰", color: "#f59e0b" },
  timeline_risk:      { label: "Timeline Risk", icon: "⏰", color: "#8b5cf6" },
};

const SENTIMENT_COLORS = { positive: "#10b981", neutral: "#64748b", negative: "#ef4444" };

// Demo transcript segments
function generateDemoMeetings(accounts) {
  return [
    {
      id: "m1", accountId: "d1", title: "Acme Health — QBR Prep Call", platform: "zoom",
      scheduledAt: "2026-02-26T14:00:00Z", duration: 2460, status: "analyzed",
      attendees: [
        { name: "Sarah Johnson", role: "VP Operations", side: "customer" },
        { name: "Dr. Michael Chen", role: "CMO", side: "customer" },
        { name: "Sarah R.", role: "Senior CSM", side: "internal" },
      ],
      transcript: [
        { speaker: "Sarah R.", text: "Thanks for joining everyone. I wanted to walk through the numbers ahead of your renewal next month.", start: "00:00", end: "00:08" },
        { speaker: "Sarah Johnson", text: "Appreciate it. The team has been really active on the platform, but I want to make sure we're getting full value before we commit to another year.", start: "00:08", end: "00:18" },
        { speaker: "Sarah R.", text: "Absolutely. So looking at your adoption data, you're at 78% feature utilization — that's top quartile for healthcare. Your clinical hours recovered are up 34% quarter over quarter.", start: "00:18", end: "00:32" },
        { speaker: "Dr. Michael Chen", text: "That's encouraging. Honestly though, we've been looking at what CompetitorX offers for their AI triage module. Their pricing came in quite a bit lower.", start: "00:32", end: "00:45" },
        { speaker: "Sarah R.", text: "I'm glad you brought that up. Let me show you our roadmap — we have our own AI triage launching in Q2, and your current data integrations would carry over seamlessly.", start: "00:45", end: "00:58" },
        { speaker: "Sarah Johnson", text: "That's helpful. Budget is tight this year though — our CFO is scrutinizing every renewal above 50K. Can you put together an ROI summary we can share internally?", start: "00:58", end: "01:12" },
        { speaker: "Sarah R.", text: "Absolutely, I'll have that ready by end of week. Also, I noticed your support ticket volume dropped 40% since onboarding — that's a strong data point for your CFO.", start: "01:12", end: "01:26" },
        { speaker: "Dr. Michael Chen", text: "Good. We need that analysis by Friday at the latest — the budget committee meets next Tuesday.", start: "01:26", end: "01:35" },
        { speaker: "Sarah R.", text: "Done. I'll send it over Thursday. Any other concerns I should address in the summary?", start: "01:35", end: "01:42" },
        { speaker: "Sarah Johnson", text: "Just make sure it covers the compliance audit improvements. That was the original reason we bought in.", start: "01:42", end: "01:50" },
      ],
      insights: {
        summary: [
          "Acme Health is at 78% feature utilization (top quartile healthcare), with clinical hours recovered up 34% QoQ.",
          "Competitor threat identified — customer is evaluating CompetitorX AI triage module on price.",
          "Budget scrutiny from CFO on renewals above $50K; ROI summary requested by Friday for Tuesday budget committee.",
          "Support ticket volume down 40% since onboarding — strong retention data point.",
          "Customer needs ROI report emphasizing compliance audit improvements as original purchase driver.",
        ],
        actionItems: [
          { description: "Prepare and send ROI summary to Sarah Johnson", assignee: "Sarah R.", dueDate: "2026-02-27", status: "pending" },
          { description: "Include compliance audit improvement metrics in ROI report", assignee: "Sarah R.", dueDate: "2026-02-27", status: "pending" },
          { description: "Share Q2 AI triage roadmap details with Acme Health team", assignee: "Sarah R.", dueDate: "2026-03-01", status: "pending" },
          { description: "Schedule follow-up after budget committee meeting (Tuesday)", assignee: "Sarah R.", dueDate: "2026-03-04", status: "pending" },
        ],
        sentiment: [
          { name: "Sarah Johnson", sentiment: "neutral", confidence: 0.82 },
          { name: "Dr. Michael Chen", sentiment: "negative", confidence: 0.71 },
          { name: "Sarah R.", sentiment: "positive", confidence: 0.90 },
        ],
        riskSignals: [
          { type: "competitor_mention", quote: "We've been looking at what CompetitorX offers for their AI triage module. Their pricing came in quite a bit lower.", timestamp: "00:32" },
          { type: "budget_concern", quote: "Our CFO is scrutinizing every renewal above 50K.", timestamp: "00:58" },
          { type: "timeline_risk", quote: "We need that analysis by Friday at the latest — the budget committee meets next Tuesday.", timestamp: "01:26" },
        ],
        topics: [
          { topic: "Adoption & Usage Metrics", startTime: "00:18", endTime: "00:32" },
          { topic: "Competitor Evaluation", startTime: "00:32", endTime: "00:58" },
          { topic: "Budget & Renewal Concerns", startTime: "00:58", endTime: "01:26" },
          { topic: "ROI Documentation", startTime: "01:26", endTime: "01:50" },
        ],
      },
    },
    {
      id: "m2", accountId: "d2", title: "PinPoint Financial — Monthly Check-in", platform: "google_meet",
      scheduledAt: "2026-02-24T10:00:00Z", duration: 1800, status: "analyzed",
      attendees: [
        { name: "David Chen", role: "Head of Compliance", side: "customer" },
        { name: "Marcus K.", role: "CSM", side: "internal" },
      ],
      transcript: [
        { speaker: "Marcus K.", text: "David, good to see you. How's the team doing with the new fraud detection module?", start: "00:00", end: "00:06" },
        { speaker: "David Chen", text: "Really well actually. Our false positive rate dropped from 18% to under 7%. The compliance team is thrilled.", start: "00:06", end: "00:16" },
        { speaker: "Marcus K.", text: "That's fantastic! Have you had a chance to try the real-time monitoring dashboard we launched last month?", start: "00:16", end: "00:24" },
        { speaker: "David Chen", text: "Not yet — we've been buried in audit prep. Can you schedule a walkthrough for the team next week?", start: "00:24", end: "00:32" },
      ],
      insights: {
        summary: [
          "Fraud detection module delivering strong results — false positive rate dropped from 18% to under 7%.",
          "Compliance team is highly satisfied with current performance.",
          "New real-time monitoring dashboard not yet adopted due to audit prep workload.",
          "Training walkthrough requested for next week.",
        ],
        actionItems: [
          { description: "Schedule real-time monitoring dashboard walkthrough", assignee: "Marcus K.", dueDate: "2026-03-03", status: "pending" },
        ],
        sentiment: [
          { name: "David Chen", sentiment: "positive", confidence: 0.91 },
          { name: "Marcus K.", sentiment: "positive", confidence: 0.88 },
        ],
        riskSignals: [],
        topics: [
          { topic: "Fraud Detection Results", startTime: "00:06", endTime: "00:16" },
          { topic: "New Feature Adoption", startTime: "00:16", endTime: "00:32" },
        ],
      },
    },
    {
      id: "m3", accountId: "d4", title: "MetroPlex Realty — Escalation Call", platform: "teams",
      scheduledAt: "2026-02-25T16:00:00Z", duration: 1200, status: "analyzed",
      attendees: [
        { name: "Linda Park", role: "Director of Sales", side: "customer" },
        { name: "Sarah R.", role: "Senior CSM", side: "internal" },
        { name: "Alex P.", role: "CS Manager", side: "internal" },
      ],
      transcript: [
        { speaker: "Linda Park", text: "I'll be blunt — my agents are frustrated. The mobile app has been crashing twice a day and it's costing us showings.", start: "00:00", end: "00:10" },
        { speaker: "Alex P.", text: "Linda, I completely understand the urgency. We've escalated this to our engineering team as a P1.", start: "00:10", end: "00:18" },
        { speaker: "Linda Park", text: "We need a fix this week or we're going to have to evaluate other options. I can't have my agents losing deals because of software issues.", start: "00:18", end: "00:28" },
        { speaker: "Sarah R.", text: "We're committing to a hotfix by Wednesday. I'll send you daily status updates until it's resolved.", start: "00:28", end: "00:36" },
      ],
      insights: {
        summary: [
          "Critical mobile app stability issue — crashing twice daily, directly impacting agent showings.",
          "Customer is frustrated and evaluating alternatives if not resolved this week.",
          "Engineering has escalated to P1 priority; hotfix committed by Wednesday.",
          "Daily status updates promised until resolution.",
        ],
        actionItems: [
          { description: "Deliver mobile app hotfix by Wednesday", assignee: "Engineering", dueDate: "2026-02-27", status: "in_progress" },
          { description: "Send daily status updates to Linda Park", assignee: "Sarah R.", dueDate: "2026-02-26", status: "pending" },
          { description: "Follow up post-fix to confirm stability", assignee: "Sarah R.", dueDate: "2026-02-28", status: "pending" },
        ],
        sentiment: [
          { name: "Linda Park", sentiment: "negative", confidence: 0.94 },
          { name: "Sarah R.", sentiment: "neutral", confidence: 0.80 },
          { name: "Alex P.", sentiment: "neutral", confidence: 0.78 },
        ],
        riskSignals: [
          { type: "frustration", quote: "My agents are frustrated. The mobile app has been crashing twice a day and it's costing us showings.", timestamp: "00:00" },
          { type: "competitor_mention", quote: "We're going to have to evaluate other options.", timestamp: "00:18" },
          { type: "timeline_risk", quote: "We need a fix this week.", timestamp: "00:18" },
        ],
        topics: [
          { topic: "Mobile App Stability Crisis", startTime: "00:00", endTime: "00:18" },
          { topic: "Resolution Timeline & Commitments", startTime: "00:18", endTime: "00:36" },
        ],
      },
    },
  ];
}

// ─── Job Queue Simulator ─────────────────────────────────────────────────
function JobQueueBadge({ status }) {
  const config = {
    queued: { label: "Queued", color: "#64748b", bg: "rgba(100,116,139,0.08)" },
    running: { label: "Processing", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
    completed: { label: "Complete", color: T.green, bg: "rgba(16,185,129,0.08)" },
    failed: { label: "Failed", color: T.error, bg: "rgba(239,68,68,0.08)" },
    retrying: { label: "Retrying", color: T.warning, bg: "rgba(245,158,11,0.08)" },
  }[status] || { label: status, color: "#475569", bg: T.surface2 };
  return <span style={{ fontSize: 10, fontWeight: 700, color: config.color, background: config.bg, padding: "2px 8px", borderRadius: 4 }}>{config.label}</span>;
}

function SentimentBadge({ sentiment, confidence }) {
  const color = SENTIMENT_COLORS[sentiment] || "#64748b";
  const icon = sentiment === "positive" ? "😊" : sentiment === "negative" ? "😟" : "😐";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color, background: `rgba(${hexToRgb(color)},0.08)`, padding: "3px 10px", borderRadius: 6 }}>
      {icon} {sentiment} <span style={{ fontWeight: 400, opacity: 0.7 }}>({Math.round(confidence * 100)}%)</span>
    </span>
  );
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ─── Meeting Intelligence Panel ──────────────────────────────────────────
function MeetingIntelPanel({ accounts }) {
  const [meetings, setMeetings] = useState(() => generateDemoMeetings(accounts));
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [tab, setTab] = useState("list"); // list | detail | process
  const [detailTab, setDetailTab] = useState("summary"); // summary | transcript | actions | risks | timeline
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [processingJobs, setProcessingJobs] = useState([]);
  const [integrations, setIntegrations] = useState({ zoom: true, google_meet: false, teams: true });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadPlatform, setUploadPlatform] = useState("zoom");
  const [uploadAccount, setUploadAccount] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const { tierId, incrementActions } = useTier();

  const meeting = meetings.find(m => m.id === selectedMeeting);
  const accountMap = {};
  accounts.forEach(a => { accountMap[a.id] = a; });

  // Process a new transcript through Claude
  const analyzeTranscript = async (meetingId) => {
    const mtg = meetings.find(m => m.id === meetingId);
    if (!mtg || !mtg.transcript) return;

    setAnalyzing(true);
    // Simulate job queue
    const jobId = `job-${Date.now()}`;
    const jobs = [
      { id: jobId + "-1", meetingId, type: "transcribe", status: "completed", queuedAt: new Date().toISOString() },
      { id: jobId + "-2", meetingId, type: "analyze", status: "running", queuedAt: new Date().toISOString() },
      { id: jobId + "-3", meetingId, type: "extract_actions", status: "queued", queuedAt: new Date().toISOString() },
    ];
    setProcessingJobs(prev => [...jobs, ...prev]);

    try {
      const fullTranscript = mtg.transcript.map(s => `[${s.start}] ${s.speaker}: ${s.text}`).join("\n");
      const attendeeList = mtg.attendees.map(a => `${a.name} (${a.role}, ${a.side})`).join(", ");

      const prompt = `Analyze this customer meeting transcript and return a JSON object with these exact fields:

{
  "summary": ["bullet1", "bullet2", ...],  // 3-5 key takeaways
  "actionItems": [{"description": "...", "assignee": "...", "dueDate": "YYYY-MM-DD"}],
  "sentiment": [{"name": "...", "sentiment": "positive|neutral|negative", "confidence": 0.0-1.0}],
  "riskSignals": [{"type": "competitor_mention|frustration|budget_concern|timeline_risk", "quote": "exact quote", "timestamp": "MM:SS"}],
  "topics": [{"topic": "...", "startTime": "MM:SS", "endTime": "MM:SS"}]
}

Meeting: ${mtg.title}
Attendees: ${attendeeList}
Transcript:
${fullTranscript}

Return ONLY the JSON, no markdown fences or explanation.`;

      const text = await callClaude("You are a meeting intelligence AI. Return only valid JSON, no markdown.", prompt, 2000, { action_type: "meeting_analysis", tier: tierId });
      incrementActions();
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      setMeetings(prev => prev.map(m => m.id === meetingId ? {
        ...m, status: "analyzed",
        insights: {
          summary: parsed.summary || [],
          actionItems: (parsed.actionItems || []).map(a => ({ ...a, status: "pending" })),
          sentiment: parsed.sentiment || [],
          riskSignals: parsed.riskSignals || [],
          topics: parsed.topics || [],
        },
      } : m));

      setProcessingJobs(prev => prev.map(j => j.meetingId === meetingId ? { ...j, status: "completed" } : j));
    } catch (err) {
      setProcessingJobs(prev => prev.map(j => j.meetingId === meetingId && j.status !== "completed" ? { ...j, status: "failed" } : j));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUploadTranscript = () => {
    if (!uploadTitle || !uploadText) return;
    // Parse a simple transcript format
    const lines = uploadText.split("\n").filter(l => l.trim());
    const segments = lines.map((line, i) => {
      const match = line.match(/^\[?(\d{1,2}:\d{2})?\]?\s*([^:]+):\s*(.+)$/);
      if (match) return { speaker: match[2].trim(), text: match[3].trim(), start: match[1] || `${String(Math.floor(i * 0.5)).padStart(2, "0")}:${String((i * 30) % 60).padStart(2, "0")}`, end: "" };
      return { speaker: "Unknown", text: line.trim(), start: `${String(Math.floor(i * 0.5)).padStart(2, "0")}:${String((i * 30) % 60).padStart(2, "0")}`, end: "" };
    });
    const newMeeting = {
      id: `m-${Date.now()}`, accountId: uploadAccount || null, title: uploadTitle,
      platform: uploadPlatform, scheduledAt: new Date().toISOString(),
      duration: segments.length * 30, status: "processing",
      attendees: [...new Set(segments.map(s => s.speaker))].map(name => ({ name, role: "", side: "unknown" })),
      transcript: segments, insights: null,
    };
    setMeetings(prev => [newMeeting, ...prev]);
    setSelectedMeeting(newMeeting.id);
    setShowUpload(false);
    setUploadText(""); setUploadTitle("");
    setTab("detail"); setDetailTab("transcript");
    // Auto-analyze
    setTimeout(() => analyzeTranscript(newMeeting.id), 500);
  };

  const updateActionStatus = (meetingId, actionIdx, newStatus) => {
    setMeetings(prev => prev.map(m => {
      if (m.id !== meetingId || !m.insights) return m;
      const items = [...m.insights.actionItems];
      items[actionIdx] = { ...items[actionIdx], status: newStatus };
      return { ...m, insights: { ...m.insights, actionItems: items } };
    }));
  };

  // Filtered transcript segments for search
  const filteredTranscript = meeting?.transcript?.filter(s =>
    !transcriptSearch || s.text.toLowerCase().includes(transcriptSearch.toLowerCase()) || s.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
  ) || [];

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="🎙️" title="Meeting Intelligence" color="#2D8CFF"
        bullets={[
          "Auto-captures meeting recordings and transcripts from Zoom, Google Meet, and Microsoft Teams, then processes them through Claude AI to extract structured insights, action items, and risk signals.",
          "Every transcript is analyzed for per-attendee sentiment, competitor mentions, budget concerns, frustration signals, and timeline risks — with exact quotes and timestamps so you can jump to the moment it happened.",
          "Action items are automatically extracted with assignees and due dates, and added to your task pipeline. Full transcripts are stored with speaker attribution and full-text search.",
        ]}
        workflow={[
          "Connect Zoom, Google Meet, or Teams via API integration",
          "Meetings are auto-captured or transcripts uploaded manually",
          "Claude AI processes transcript → structured JSON insights",
          "Summary, actions, risks, and sentiment appear on the meeting card",
        ]}
        outputLabel="AI Extracts"
        outputItems={[
          { icon: "📋", text: "3–5 bullet summary of key takeaways" },
          { icon: "✓", text: "Action items with assignees and due dates" },
          { icon: "😊", text: "Per-attendee sentiment with confidence %" },
          { icon: "⚠️", text: "Risk signals: competitors, budget, timeline" },
        ]}
        audienceLabel="Integrations"
        audience={[
          { icon: "📹", text: "Zoom — Webhook + REST API" },
          { icon: "🟢", text: "Google Meet — Calendar API + Recording" },
          { icon: "🟣", text: "Teams — Microsoft Graph API" },
        ]}
      />

      {/* Integration Status Bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(PLATFORMS).map(([key, p]) => (
          <div key={key} onClick={() => setIntegrations(prev => ({ ...prev, [key]: !prev[key] }))} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
            background: integrations[key] ? `rgba(${hexToRgb(p.color)},0.06)` : T.surface,
            border: `1px solid ${integrations[key] ? p.color + "44" : T.border}`, borderRadius: 10,
            cursor: "pointer", transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 16 }}>{p.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: integrations[key] ? p.color : "#475569" }}>{p.label}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{integrations[key] ? "✓ Connected" : "Click to connect"}</div>
            </div>
          </div>
        ))}
        <button onClick={() => setShowUpload(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>📎 Upload Transcript</button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowUpload(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px", width: 560, maxHeight: "80vh", overflowY: "auto", animation: "panelIn 0.2s ease" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.text, marginBottom: 16 }}>Upload Meeting Transcript</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div><label style={labelStyle}>Meeting Title *</label><input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="QBR — Acme Corp" style={inputStyle} /></div>
              <div><label style={labelStyle}>Platform</label>
                <select value={uploadPlatform} onChange={e => setUploadPlatform(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Account</label>
              <select value={uploadAccount} onChange={e => setUploadAccount(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">No account linked</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.company}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Transcript *</label>
              <textarea value={uploadText} onChange={e => setUploadText(e.target.value)} placeholder={"[00:00] Sarah R.: Welcome everyone...\n[00:05] David Chen: Thanks for having us...\n\nOr just:\nSarah R.: Welcome everyone...\nDavid Chen: Thanks for having us..."} rows={10} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <p style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>Format: <code style={{ background: T.surface2, padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>[MM:SS] Speaker: text</code> or <code style={{ background: T.surface2, padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>Speaker: text</code></p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowUpload(false)} style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px", fontSize: 13, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={handleUploadTranscript} disabled={!uploadTitle || !uploadText} style={{ flex: 1, background: (!uploadTitle || !uploadText) ? T.surface2 : "#2D8CFF", color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 600, cursor: (!uploadTitle || !uploadText) ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>🎙️ Upload & Analyze</button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting List */}
      {!selectedMeeting && (
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Total Meetings", value: meetings.length, color: "#2D8CFF" },
              { label: "Analyzed", value: meetings.filter(m => m.status === "analyzed").length, color: T.green },
              { label: "Action Items", value: meetings.reduce((s, m) => s + (m.insights?.actionItems?.length || 0), 0), color: T.warning },
              { label: "Risk Signals", value: meetings.reduce((s, m) => s + (m.insights?.riskSignals?.length || 0), 0), color: T.error },
            ].map(s => (
              <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Meeting Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {meetings.map(mtg => {
              const plat = PLATFORMS[mtg.platform];
              const acct = accountMap[mtg.accountId];
              const riskCount = mtg.insights?.riskSignals?.length || 0;
              const actionCount = mtg.insights?.actionItems?.length || 0;
              return (
                <div key={mtg.id} onClick={() => { setSelectedMeeting(mtg.id); setTab("detail"); setDetailTab("summary"); }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", cursor: "pointer", transition: "border-color 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `rgba(${hexToRgb(plat.color)},0.1)`, border: `1px solid ${plat.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{plat.icon}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{mtg.title}</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "#475569" }}>
                          <span>{plat.label}</span>
                          <span>·</span>
                          <span>{new Date(mtg.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          <span>·</span>
                          <span>{formatDuration(mtg.duration)}</span>
                          <span>·</span>
                          <span>{mtg.attendees.length} attendees</span>
                          {acct && <><span>·</span><span style={{ color: T.green }}>{acct.company}</span></>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {riskCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: T.error, background: "rgba(239,68,68,0.08)", padding: "3px 8px", borderRadius: 5 }}>⚠ {riskCount} risk{riskCount > 1 ? "s" : ""}</span>}
                      {actionCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: T.warning, background: "rgba(245,158,11,0.08)", padding: "3px 8px", borderRadius: 5 }}>✓ {actionCount} action{actionCount > 1 ? "s" : ""}</span>}
                      <JobQueueBadge status={mtg.status === "analyzed" ? "completed" : mtg.status} />
                    </div>
                  </div>
                  {/* Mini summary preview */}
                  {mtg.insights?.summary?.[0] && (
                    <p style={{ fontSize: 12, color: "#7c8da5", marginTop: 8, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mtg.insights.summary[0]}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Meeting Detail */}
      {selectedMeeting && meeting && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => { setSelectedMeeting(null); setTranscriptSearch(""); }} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.text }}>{meeting.title}</h2>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  {PLATFORMS[meeting.platform]?.icon} {PLATFORMS[meeting.platform]?.label} · {new Date(meeting.scheduledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {formatDuration(meeting.duration)} · {meeting.attendees.length} attendees
                </div>
              </div>
            </div>
            {meeting.status !== "analyzed" && (
              <button onClick={() => analyzeTranscript(meeting.id)} disabled={analyzing} style={{ background: analyzing ? T.greenDim : "#2D8CFF", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: analyzing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {analyzing ? "Analyzing..." : "🤖 Analyze with AI"}
              </button>
            )}
          </div>

          {/* Detail Tabs */}
          <div style={{ display: "flex", gap: 3, marginBottom: 16, background: T.surface, borderRadius: 10, padding: 3, border: `1px solid ${T.border}` }}>
            {[
              { id: "summary", label: "Summary", count: meeting.insights?.summary?.length },
              { id: "transcript", label: "Transcript", count: meeting.transcript?.length },
              { id: "actions", label: "Actions", count: meeting.insights?.actionItems?.length },
              { id: "risks", label: "Risks", count: meeting.insights?.riskSignals?.length },
              { id: "timeline", label: "Timeline" },
            ].map(t => (
              <button key={t.id} onClick={() => setDetailTab(t.id)} style={{
                flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer",
                background: detailTab === t.id ? "rgba(45,140,255,0.1)" : "transparent",
                color: detailTab === t.id ? "#2D8CFF" : "#475569", fontSize: 12, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {t.label}{t.count > 0 ? ` (${t.count})` : ""}
              </button>
            ))}
          </div>

          {/* ── Summary Tab ── */}
          {detailTab === "summary" && meeting.insights && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Key Takeaways */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#2D8CFF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Key Takeaways</div>
                  {meeting.insights.summary.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ color: "#2D8CFF", fontSize: 10, marginTop: 3, flexShrink: 0 }}>●</span>
                      <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{s}</span>
                    </div>
                  ))}
                </div>

                {/* Topics Discussed */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.purple, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Topics Discussed</div>
                  {meeting.insights.topics.map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < meeting.insights.topics.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{t.topic}</span>
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#2D8CFF", cursor: "pointer" }} onClick={() => { setDetailTab("transcript"); setTranscriptSearch(""); }}>{t.startTime} → {t.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar: Attendees + Sentiment */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Attendee Sentiment</div>
                  {meeting.insights.sentiment.map((s, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: i < meeting.insights.sentiment.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 4 }}>{s.name}</div>
                      <SentimentBadge sentiment={s.sentiment} confidence={s.confidence} />
                    </div>
                  ))}
                </div>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Attendees</div>
                  {meeting.attendees.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: a.side === "internal" ? "rgba(16,185,129,0.12)" : "rgba(45,140,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: a.side === "internal" ? T.green : "#2D8CFF", flexShrink: 0 }}>{a.name.split(" ").map(n => n[0]).join("")}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{a.name}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{a.role}{a.side === "internal" ? " (internal)" : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Transcript Tab ── */}
          {detailTab === "transcript" && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <input value={transcriptSearch} onChange={e => setTranscriptSearch(e.target.value)} placeholder="Search transcript — by speaker or keyword..." style={{ ...inputStyle, width: "100%" }} />
              </div>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px", maxHeight: 500, overflowY: "auto" }}>
                {filteredTranscript.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#475569", textAlign: "center", padding: 20 }}>No matches found.</p>
                ) : filteredTranscript.map((seg, i) => {
                  const isInternal = meeting.attendees.find(a => a.name === seg.speaker)?.side === "internal";
                  const highlight = transcriptSearch && seg.text.toLowerCase().includes(transcriptSearch.toLowerCase());
                  return (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}`, background: highlight ? "rgba(45,140,255,0.04)" : "transparent" }}>
                      <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#2D8CFF", minWidth: 40, paddingTop: 2, flexShrink: 0, cursor: "pointer" }}>{seg.start}</span>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isInternal ? T.green : "#e2e8f0", marginRight: 6 }}>{seg.speaker}</span>
                        <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{seg.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>
                {filteredTranscript.length} segment{filteredTranscript.length !== 1 ? "s" : ""} · {meeting.transcript?.length} total · Full-text search enabled
              </div>
            </div>
          )}

          {/* ── Actions Tab ── */}
          {detailTab === "actions" && meeting.insights && (
            <div>
              {meeting.insights.actionItems.length === 0 ? (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 40, textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#475569" }}>No action items extracted from this meeting.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {meeting.insights.actionItems.map((action, i) => {
                    const statusC = { pending: { color: T.warning, bg: "rgba(245,158,11,0.08)", label: "Pending" }, in_progress: { color: T.info, bg: "rgba(6,182,212,0.08)", label: "In Progress" }, done: { color: T.green, bg: "rgba(16,185,129,0.08)", label: "Done" } }[action.status] || { color: "#475569", bg: T.surface2, label: action.status };
                    return (
                      <div key={i} style={{ background: T.surface, border: `1px solid ${action.status === "done" ? T.green + "33" : T.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 500, color: action.status === "done" ? "#475569" : T.text, textDecoration: action.status === "done" ? "line-through" : "none", lineHeight: 1.5 }}>{action.description}</div>
                          <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: "#475569" }}>
                            <span>👤 {action.assignee}</span>
                            {action.dueDate && <span>📅 {action.dueDate}</span>}
                          </div>
                        </div>
                        <select value={action.status} onChange={e => updateActionStatus(meeting.id, i, e.target.value)} style={{ fontSize: 11, fontWeight: 600, color: statusC.color, background: statusC.bg, border: `1px solid ${statusC.color}33`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          <option value="pending">⏳ Pending</option>
                          <option value="in_progress">🔄 In Progress</option>
                          <option value="done">✓ Done</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Risks Tab ── */}
          {detailTab === "risks" && meeting.insights && (
            <div>
              {meeting.insights.riskSignals.length === 0 ? (
                <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 14, padding: 30, textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                  <p style={{ fontSize: 14, color: T.green, fontWeight: 600 }}>No risk signals detected</p>
                  <p style={{ fontSize: 12, color: "#475569" }}>This meeting had no competitor mentions, frustration, budget concerns, or timeline risks.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {meeting.insights.riskSignals.map((risk, i) => {
                    const rt = RISK_TYPES[risk.type] || { label: risk.type, icon: "⚠", color: "#f59e0b" };
                    return (
                      <div key={i} style={{ background: `rgba(${hexToRgb(rt.color)},0.03)`, border: `1px solid ${rt.color}22`, borderRadius: 12, padding: "16px 18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{rt.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: rt.color }}>{rt.label}</span>
                          </div>
                          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#2D8CFF", cursor: "pointer" }} onClick={() => { setDetailTab("transcript"); setTranscriptSearch(risk.quote.split(" ").slice(0, 3).join(" ")); }}>⏱ {risk.timestamp}</span>
                        </div>
                        <blockquote style={{ margin: 0, paddingLeft: 12, borderLeft: `3px solid ${rt.color}44`, fontSize: 13, color: "#94a3b8", lineHeight: 1.6, fontStyle: "italic" }}>"{risk.quote}"</blockquote>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Timeline Tab ── */}
          {detailTab === "timeline" && meeting.insights && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Account Timeline Card</div>
              {/* Meeting Summary Card (as it would appear in account timeline) */}
              <div style={{ background: "rgba(45,140,255,0.03)", border: "1px solid rgba(45,140,255,0.15)", borderRadius: 14, padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🎙️</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{meeting.title}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{new Date(meeting.scheduledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {formatDuration(meeting.duration)}</div>
                    </div>
                  </div>
                  <JobQueueBadge status="completed" />
                </div>
                {/* Summary bullets */}
                <div style={{ marginBottom: 14 }}>
                  {meeting.insights.summary.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4 }}>
                      <span style={{ color: "#2D8CFF", fontSize: 8, marginTop: 4 }}>●</span>
                      <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
                {/* Quick stats */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {meeting.insights.sentiment.map((s, i) => <SentimentBadge key={i} sentiment={s.sentiment} confidence={s.confidence} />)}
                </div>
                {/* Risk flags */}
                {meeting.insights.riskSignals.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {meeting.insights.riskSignals.map((r, i) => {
                      const rt = RISK_TYPES[r.type];
                      return <span key={i} style={{ fontSize: 10, fontWeight: 600, color: rt.color, background: `rgba(${hexToRgb(rt.color)},0.08)`, padding: "3px 8px", borderRadius: 5 }}>{rt.icon} {rt.label}</span>;
                    })}
                  </div>
                )}
                {/* Action items */}
                {meeting.insights.actionItems.length > 0 && (
                  <div style={{ background: T.bg, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.warning, textTransform: "uppercase", marginBottom: 6 }}>Action Items</div>
                    {meeting.insights.actionItems.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 0", fontSize: 12, color: "#94a3b8" }}>
                        <span style={{ color: a.status === "done" ? T.green : T.warning }}>○</span>
                        <span>{a.description}</span>
                        <span style={{ color: "#475569", fontSize: 10 }}>→ {a.assignee}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Clickable topic timestamps */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {meeting.insights.topics.map((t, i) => (
                    <span key={i} onClick={() => { setDetailTab("transcript"); setTranscriptSearch(""); }} style={{ fontSize: 10, color: "#2D8CFF", background: "rgba(45,140,255,0.06)", padding: "3px 10px", borderRadius: 5, cursor: "pointer" }}>
                      {t.startTime} — {t.topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Job Queue History */}
              {processingJobs.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Processing Queue</div>
                  {processingJobs.slice(0, 6).map(job => (
                    <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 12, color: T.text }}>{job.type.replace("_", " ")}</span>
                      <JobQueueBadge status={job.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No insights yet message */}
          {!meeting.insights && detailTab !== "transcript" && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>🤖</div>
              <p style={{ fontSize: 14, color: "#475569" }}>This meeting hasn't been analyzed yet.</p>
              <button onClick={() => analyzeTranscript(meeting.id)} disabled={analyzing} style={{ marginTop: 12, background: "#2D8CFF", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: analyzing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {analyzing ? "Analyzing..." : "🤖 Analyze Now"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NPS / CSAT SURVEY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
//
// PostgreSQL Schema:
//
// CREATE TABLE surveys (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   tenant_id UUID NOT NULL, name TEXT NOT NULL,
//   survey_type TEXT NOT NULL, -- 'nps','csat','combined'
//   delivery_method TEXT DEFAULT 'email', -- 'email','in_app','both'
//   status TEXT DEFAULT 'draft', -- draft,active,paused,closed
//   settings JSONB DEFAULT '{}', -- {anonymous,allow_resubmit,follow_up_enabled}
//   created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE survey_questions (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
//   question_type TEXT NOT NULL, -- 'nps','csat','open_text'
//   question_order INTEGER NOT NULL,
//   is_required BOOLEAN DEFAULT TRUE,
//   config JSONB DEFAULT '{}', -- {conditional_on,min_score,max_score}
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE survey_translations (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
//   locale TEXT NOT NULL, -- 'en','es','fr','de','pt','ja'
//   question_text TEXT NOT NULL,
//   helper_text TEXT,
//   labels JSONB DEFAULT '{}', -- {low_label, high_label, placeholder}
//   UNIQUE(question_id, locale)
// );
//
// CREATE TABLE survey_responses (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   survey_id UUID NOT NULL REFERENCES surveys(id),
//   question_id UUID NOT NULL REFERENCES survey_questions(id),
//   account_id UUID, respondent_email TEXT,
//   score INTEGER, text_feedback TEXT,
//   locale TEXT DEFAULT 'en',
//   metadata JSONB DEFAULT '{}',
//   submitted_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_sr_survey ON survey_responses(survey_id, submitted_at DESC);
// CREATE INDEX idx_sr_account ON survey_responses(account_id);
// ═══════════════════════════════════════════════════════════════════════════

const SURVEY_LOCALES = {
  en: { label: "English", flag: "🇺🇸" },
  es: { label: "Español", flag: "🇪🇸" },
  fr: { label: "Français", flag: "🇫🇷" },
  de: { label: "Deutsch", flag: "🇩🇪" },
  pt: { label: "Português", flag: "🇧🇷" },
  ja: { label: "日本語", flag: "🇯🇵" },
};

const NPS_TRANSLATIONS = {
  en: { q: "How likely are you to recommend us to a colleague?", low: "Not at all likely", high: "Extremely likely", followUp: "What's the primary reason for your score?", csatQ: "How satisfied are you with our product?", thanks: "Thank you for your feedback!" },
  es: { q: "¿Qué probabilidad hay de que nos recomiende a un colega?", low: "Nada probable", high: "Muy probable", followUp: "¿Cuál es la razón principal de su puntuación?", csatQ: "¿Qué tan satisfecho está con nuestro producto?", thanks: "¡Gracias por sus comentarios!" },
  fr: { q: "Quelle est la probabilité que vous nous recommandiez à un collègue?", low: "Pas du tout probable", high: "Extrêmement probable", followUp: "Quelle est la raison principale de votre note?", csatQ: "Dans quelle mesure êtes-vous satisfait de notre produit?", thanks: "Merci pour vos commentaires!" },
  de: { q: "Wie wahrscheinlich ist es, dass Sie uns einem Kollegen empfehlen?", low: "Überhaupt nicht wahrscheinlich", high: "Äußerst wahrscheinlich", followUp: "Was ist der Hauptgrund für Ihre Bewertung?", csatQ: "Wie zufrieden sind Sie mit unserem Produkt?", thanks: "Vielen Dank für Ihr Feedback!" },
  pt: { q: "Qual a probabilidade de nos recomendar a um colega?", low: "Nada provável", high: "Extremamente provável", followUp: "Qual o principal motivo da sua pontuação?", csatQ: "Quão satisfeito você está com nosso produto?", thanks: "Obrigado pelo seu feedback!" },
  ja: { q: "同僚に当社を勧める可能性はどのくらいですか？", low: "全くない", high: "非常にそう思う", followUp: "そのスコアの主な理由は何ですか？", csatQ: "当社の製品にどの程度満足していますか？", thanks: "フィードバックありがとうございます！" },
};

function npsCategory(score) {
  if (score >= 9) return { label: "Promoter", color: "#10b981", emoji: "😍" };
  if (score >= 7) return { label: "Passive", color: "#f59e0b", emoji: "😐" };
  return { label: "Detractor", color: "#ef4444", emoji: "😞" };
}

function csatStars(score) { return "★".repeat(score) + "☆".repeat(5 - score); }

// Generate demo response data
function generateDemoResponses() {
  const names = ["sarah.j@acmehealth.com","d.chen@pinpoint.io","marcus.w@talentforge.com","l.park@metroplex.com","t.reed@cloudsync.pro","amy.li@innovex.io","jorge.r@globalfin.com","nina.k@techstart.co","raj.p@dataflow.com","emma.s@brightpath.org","alex.t@scaleworks.io","chen.w@meditech.com"];
  const accts = ["d1","d2","d3","d4","d5","d1","d2","d3","d4","d5","d1","d2"];
  const locales = ["en","en","en","en","en","es","pt","fr","de","en","ja","en"];
  const feedbacks = [
    "Love the platform — our team uses it daily for compliance reporting.", "Good product but the mobile experience needs work.", "The analytics dashboard is incredibly powerful. Best investment this year.",
    "Frustrated with the frequent downtime last month. Need better reliability.", "Great customer support. Sarah is always responsive and helpful.", "La plataforma es muy útil pero necesita más integraciones.",
    "Boa ferramenta, mas o preço aumentou muito.", "L'interface est moderne mais manque quelques fonctionnalités.", "Gutes Produkt, aber die Onboarding-Dokumentation könnte besser sein.",
    "Product is solid. Integration was smooth.", "機能は優れていますが、日本語のサポートが不足しています。", "The ROI has been clear — we've cut processing time by 40%.",
  ];
  return names.map((email, i) => ({
    id: `resp-${i}`, surveyId: "sv-1", email, accountId: accts[i],
    npsScore: [10,7,9,3,8,9,6,8,7,10,5,9][i],
    csatScore: [5,3,5,2,4,5,3,4,4,5,3,5][i],
    feedback: feedbacks[i], locale: locales[i],
    submittedAt: new Date(Date.now() - (i * 86400000 * 2.5)).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
}

// ─── Survey Preview Widget ───────────────────────────────────────────────
function SurveyPreview({ locale, surveyType, onClose }) {
  const [npsVal, setNpsVal] = useState(null);
  const [csatVal, setCsatVal] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const t = NPS_TRANSLATIONS[locale] || NPS_TRANSLATIONS.en;

  if (submitted) {
    return (
      <div style={{ background: "#ffffff", borderRadius: 16, padding: "40px 32px", textAlign: "center", maxWidth: 480, width: "100%", animation: "panelIn 0.3s ease" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <p style={{ fontSize: 18, fontWeight: 600, color: "#1e293b" }}>{t.thanks}</p>
        {onClose && <button onClick={onClose} style={{ marginTop: 16, background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>Close</button>}
      </div>
    );
  }

  return (
    <div style={{ background: "#ffffff", borderRadius: 16, padding: "28px 32px", maxWidth: 480, width: "100%", animation: "panelIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {SURVEY_LOCALES[locale]?.flag} {SURVEY_LOCALES[locale]?.label} Preview
        </span>
        {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>✕</button>}
      </div>

      {/* NPS Question */}
      {(surveyType === "nps" || surveyType === "combined") && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 14, lineHeight: 1.5 }}>{t.q}</p>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 6 }}>
            {Array.from({ length: 11 }, (_, i) => {
              const cat = npsCategory(i);
              const isSelected = npsVal === i;
              return (
                <button key={i} onClick={() => setNpsVal(i)} style={{
                  width: 34, height: 34, borderRadius: 8, border: isSelected ? `2px solid ${cat.color}` : "1.5px solid #e2e8f0",
                  background: isSelected ? `${cat.color}15` : "#fff", color: isSelected ? cat.color : "#64748b",
                  fontSize: 13, fontWeight: isSelected ? 700 : 500, cursor: "pointer", transition: "all 0.1s",
                  fontFamily: "'DM Sans', sans-serif",
                }}>{i}</button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
            <span>{t.low}</span><span>{t.high}</span>
          </div>
          {npsVal !== null && <div style={{ textAlign: "center", marginTop: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: npsCategory(npsVal).color }}>{npsCategory(npsVal).emoji} {npsCategory(npsVal).label}</span></div>}
        </div>
      )}

      {/* CSAT Question */}
      {(surveyType === "csat" || surveyType === "combined") && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 12, lineHeight: 1.5 }}>{t.csatQ}</p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setCsatVal(s)} style={{
                fontSize: 28, background: "none", border: "none", cursor: "pointer",
                color: csatVal >= s ? "#f59e0b" : "#e2e8f0", transition: "color 0.1s",
              }}>★</button>
            ))}
          </div>
        </div>
      )}

      {/* Open-text follow-up */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}>{t.followUp}</p>
        <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={3} placeholder="..." style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: "vertical", color: "#1e293b", outline: "none", boxSizing: "border-box" }} />
      </div>

      <button onClick={() => setSubmitted(true)} style={{ width: "100%", background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Submit</button>
    </div>
  );
}

// ─── NPS Trend Chart ─────────────────────────────────────────────────────
function NPSTrendChart({ responses }) {
  // Group by week buckets
  const width = 440; const height = 120; const pad = 30;
  if (responses.length < 2) return null;
  const sorted = [...responses].sort((a, b) => a.npsScore - b.npsScore);
  const buckets = [];
  const chunkSize = Math.max(1, Math.floor(responses.length / 6));
  for (let i = 0; i < responses.length; i += chunkSize) {
    const chunk = responses.slice(i, i + chunkSize);
    const promoters = chunk.filter(r => r.npsScore >= 9).length;
    const detractors = chunk.filter(r => r.npsScore <= 6).length;
    const nps = Math.round(((promoters - detractors) / chunk.length) * 100);
    buckets.push({ nps, label: chunk[0]?.submittedAt || "" });
  }
  const max = Math.max(...buckets.map(b => b.nps), 50);
  const min = Math.min(...buckets.map(b => b.nps), -50);
  const range = max - min || 1;
  const points = buckets.map((b, i) => `${pad + (i / (buckets.length - 1)) * (width - pad * 2)},${pad + (1 - (b.nps - min) / range) * (height - pad * 2)}`).join(" ");
  const zeroY = pad + (1 - (0 - min) / range) * (height - pad * 2);

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <line x1={pad} y1={zeroY} x2={width - pad} y2={zeroY} stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
      <text x={pad - 4} y={zeroY + 3} fill="#475569" fontSize="9" textAnchor="end">0</text>
      <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {buckets.map((b, i) => {
        const x = pad + (i / (buckets.length - 1)) * (width - pad * 2);
        const y = pad + (1 - (b.nps - min) / range) * (height - pad * 2);
        return <g key={i}><circle cx={x} cy={y} r="4" fill={b.nps >= 0 ? "#10b981" : "#ef4444"} /><text x={x} y={y - 8} fill={b.nps >= 0 ? "#10b981" : "#ef4444"} fontSize="10" fontWeight="700" textAnchor="middle">{b.nps}</text></g>;
      })}
    </svg>
  );
}

// ─── Score Distribution Histogram ────────────────────────────────────────
function ScoreHistogram({ responses, type }) {
  const isNps = type === "nps";
  const maxScore = isNps ? 10 : 5;
  const buckets = Array(maxScore + 1).fill(0);
  responses.forEach(r => {
    const s = isNps ? r.npsScore : r.csatScore;
    if (s >= 0 && s <= maxScore) buckets[s]++;
  });
  const maxCount = Math.max(...buckets, 1);
  const barW = isNps ? 26 : 48;
  const gap = isNps ? 3 : 6;
  const chartH = 80;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap, height: chartH }}>
      {buckets.map((count, score) => {
        const pct = count / maxCount;
        const cat = isNps ? npsCategory(score) : { color: score >= 4 ? "#10b981" : score >= 3 ? "#f59e0b" : "#ef4444" };
        return (
          <div key={score} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: cat.color }}>{count || ""}</span>
            <div style={{ width: barW, height: Math.max(2, pct * (chartH - 20)), background: `rgba(${hexToRgb(cat.color)},${0.25 + pct * 0.5})`, borderRadius: 3, transition: "height 0.4s ease" }} />
            <span style={{ fontSize: 9, color: "#475569" }}>{isNps ? score : "★".repeat(score)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Survey Panel ────────────────────────────────────────────────────────
function SurveyPanel({ accounts }) {
  const [tab, setTab] = useState("dashboard"); // dashboard | builder | responses | analysis | preview
  const [responses] = useState(() => generateDemoResponses());
  const [previewLocale, setPreviewLocale] = useState("en");
  const [previewType, setPreviewType] = useState("combined");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [surveyName, setSurveyName] = useState("Q1 2026 Customer Satisfaction");
  const [surveyType, setSurveyType] = useState("combined");
  const [deliveryMethod, setDeliveryMethod] = useState("both");
  const [enabledLocales, setEnabledLocales] = useState(["en", "es", "fr"]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);
  const [responseFilter, setResponseFilter] = useState("all"); // all | promoter | passive | detractor
  const { tierId, incrementActions } = useTier();

  // NPS calculations
  const promoters = responses.filter(r => r.npsScore >= 9).length;
  const passives = responses.filter(r => r.npsScore >= 7 && r.npsScore <= 8).length;
  const detractors = responses.filter(r => r.npsScore <= 6).length;
  const npsScore = responses.length > 0 ? Math.round(((promoters - detractors) / responses.length) * 100) : 0;
  const avgCsat = responses.length > 0 ? (responses.reduce((s, r) => s + r.csatScore, 0) / responses.length).toFixed(1) : "—";
  const responseRate = 68; // Simulated

  const filteredResponses = responses.filter(r => {
    if (responseFilter === "promoter") return r.npsScore >= 9;
    if (responseFilter === "passive") return r.npsScore >= 7 && r.npsScore <= 8;
    if (responseFilter === "detractor") return r.npsScore <= 6;
    return true;
  });

  // AI Theme Analysis
  const runAiAnalysis = async () => {
    setAnalyzingAi(true);
    try {
      const feedbackTexts = responses.filter(r => r.feedback).map((r, i) => `[NPS:${r.npsScore}, CSAT:${r.csatScore}, ${r.locale}] "${r.feedback}"`).join("\n");
      const prompt = `Analyze these ${responses.length} customer survey responses and return JSON:

{
  "overallSentiment": "positive|mixed|negative",
  "themes": [{"theme":"...","count":N,"sentiment":"positive|negative|neutral","sampleQuotes":["..."]}],
  "recommendedActions": [{"action":"...","priority":"high|medium|low","rationale":"..."}],
  "keyInsight": "one sentence summary"
}

Responses:
${feedbackTexts}

Return ONLY valid JSON.`;

      const text = await callClaude("You are a survey analytics AI. Return only valid JSON, no markdown fences.", prompt, 1500, { action_type: "survey_analysis", tier: tierId });
      incrementActions();
      const cleaned = text.replace(/```json|```/g, "").trim();
      setAiAnalysis(JSON.parse(cleaned));
    } catch {
      setAiAnalysis({ overallSentiment: "mixed", themes: [{ theme: "Product Quality", count: 5, sentiment: "positive", sampleQuotes: ["Great product"] }, { theme: "Mobile Experience", count: 3, sentiment: "negative", sampleQuotes: ["Needs improvement"] }], recommendedActions: [{ action: "Improve mobile app", priority: "high", rationale: "Multiple detractors cited mobile issues" }], keyInsight: "Overall positive sentiment with mobile experience as the primary improvement area." });
    } finally {
      setAnalyzingAi(false);
    }
  };

  const toggleLocale = (loc) => {
    setEnabledLocales(prev => prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]);
  };

  // JS Snippet for in-app widget
  const widgetSnippet = `<script>
(function() {
  var s = document.createElement('script');
  s.src = 'https://surveys.proofpoint.app/widget.js';
  s.async = true;
  s.dataset.surveyId = 'sv-${Date.now().toString(36)}';
  s.dataset.locale = '${previewLocale}';
  s.dataset.type = '${surveyType}';
  s.dataset.position = 'bottom-right';
  document.head.appendChild(s);
})();
</script>`;

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="📋" title="NPS / CSAT Surveys" color="#f59e0b"
        bullets={[
          "Build and deploy NPS (0–10) and CSAT (1–5 star) surveys with open-text follow-up, delivered via embeddable email or in-app JavaScript widget. Responses feed directly into your health scoring engine.",
          "Multi-language support with 6 built-in locales (EN, ES, FR, DE, PT, JA). Each question's text, labels, and helper copy are stored in a translations table and swap automatically based on respondent locale.",
          "Conditional playbook triggers fire automatically: promoters (9–10) enter referral request workflows, detractors (0–6) trigger personal CSM outreach and manager escalation.",
        ]}
        workflow={[
          "Create a survey — pick NPS, CSAT, or combined with follow-up question",
          "Select delivery method (email embed or in-app widget) and languages",
          "Responses stream in with scores, feedback, account linking, and locale",
          "AI batch-analyzes open-text responses for themes and recommended actions",
        ]}
        outputLabel="Dashboards"
        outputItems={[
          { icon: "📈", text: "NPS trend over time with segment breakdown" },
          { icon: "📊", text: "Score distribution histogram" },
          { icon: "🤖", text: "AI theme extraction from open-text responses" },
          { icon: "❤️", text: "Auto-updates health scoring engine" },
        ]}
        audienceLabel="Integrations"
        audience={[
          { icon: "✉️", text: "Embeddable HTML email surveys" },
          { icon: "🧩", text: "In-app JS widget snippet" },
          { icon: "⚡", text: "Playbook triggers on promoter/detractor" },
        ]}
      />

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
        {[{ id: "dashboard", label: "Dashboard", icon: "📊" }, { id: "builder", label: "Survey Builder", icon: "🔧" }, { id: "responses", label: "Responses", icon: "📬" }, { id: "analysis", label: "AI Analysis", icon: "🤖" }, { id: "preview", label: "Preview & Deploy", icon: "👁️" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer",
            background: tab === t.id ? "rgba(245,158,11,0.12)" : "transparent",
            color: tab === t.id ? "#f59e0b" : "#475569", fontSize: 12, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ─── Dashboard Tab ─── */}
      {tab === "dashboard" && (
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>NPS Score</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: npsScore >= 50 ? T.green : npsScore >= 0 ? T.warning : T.error }}>{npsScore > 0 ? "+" : ""}{npsScore}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, fontSize: 10 }}>
                <span style={{ color: T.green }}>😍 {promoters}</span>
                <span style={{ color: T.warning }}>😐 {passives}</span>
                <span style={{ color: T.error }}>😞 {detractors}</span>
              </div>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Avg CSAT</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: parseFloat(avgCsat) >= 4 ? T.green : parseFloat(avgCsat) >= 3 ? T.warning : T.error }}>{avgCsat}<span style={{ fontSize: 16, color: "#475569" }}>/5</span></div>
              <div style={{ color: "#f59e0b", fontSize: 14, marginTop: 4 }}>{csatStars(Math.round(parseFloat(avgCsat) || 0))}</div>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Responses</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#2D8CFF" }}>{responses.length}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{responseRate}% response rate</div>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Playbook Triggers</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#8b5cf6" }}>{promoters + detractors}</div>
              <div style={{ fontSize: 10, marginTop: 4 }}><span style={{ color: T.green }}>{promoters} referral</span> · <span style={{ color: T.error }}>{detractors} outreach</span></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* NPS Trend */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>NPS Trend</div>
              <NPSTrendChart responses={responses} />
            </div>
            {/* NPS Distribution */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>NPS Score Distribution</div>
              <ScoreHistogram responses={responses} type="nps" />
            </div>
            {/* CSAT Distribution */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>CSAT Star Distribution</div>
              <ScoreHistogram responses={responses} type="csat" />
            </div>
            {/* Locale Breakdown */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Responses by Locale</div>
              {Object.entries(SURVEY_LOCALES).map(([code, loc]) => {
                const count = responses.filter(r => r.locale === code).length;
                if (count === 0) return null;
                const pct = Math.round((count / responses.length) * 100);
                return (
                  <div key={code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                    <span style={{ fontSize: 16 }}>{loc.flag}</span>
                    <span style={{ fontSize: 12, color: T.text, fontWeight: 500, width: 70 }}>{loc.label}</span>
                    <div style={{ flex: 1, height: 6, background: T.surface2, borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: T.green, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#475569", minWidth: 40, textAlign: "right" }}>{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Health Score Integration Notice */}
          <div style={{ marginTop: 14, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>❤️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.green }}>Health Score Integration Active</div>
              <div style={{ fontSize: 11, color: "#475569" }}>NPS and CSAT responses automatically update the Sentiment Score component in your Health Scoring Engine. Current NPS ({npsScore}) and CSAT ({avgCsat}) are feeding into account health calculations.</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Builder Tab ─── */}
      {tab === "builder" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Survey Config */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Survey Configuration</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div><label style={labelStyle}>Survey Name</label><input value={surveyName} onChange={e => setSurveyName(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Survey Type</label>
                  <select value={surveyType} onChange={e => setSurveyType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="nps">NPS Only (0–10)</option>
                    <option value="csat">CSAT Only (1–5 Stars)</option>
                    <option value="combined">Combined NPS + CSAT</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={labelStyle}>Delivery Method</label>
                  <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="email">Email Embed</option>
                    <option value="in_app">In-App Widget</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Follow-Up Question</label><input value="Open text (always included)" disabled style={{ ...inputStyle, opacity: 0.6 }} /></div>
              </div>
            </div>

            {/* Question Preview */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Questions</div>
              {(surveyType === "nps" || surveyType === "combined") && (
                <div style={{ padding: "12px 14px", background: T.bg, borderRadius: 10, marginBottom: 8, border: `1px solid rgba(16,185,129,0.1)` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 4 }}>NPS</span>
                      <span style={{ fontSize: 12.5, color: T.text }}>{NPS_TRANSLATIONS.en.q}</span>
                    </div>
                    <span style={{ fontSize: 10, color: T.error, fontWeight: 600 }}>Required</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>Scale: 0 (Not likely) → 10 (Extremely likely)</div>
                </div>
              )}
              {(surveyType === "csat" || surveyType === "combined") && (
                <div style={{ padding: "12px 14px", background: T.bg, borderRadius: 10, marginBottom: 8, border: `1px solid rgba(245,158,11,0.1)` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.warning, background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 4 }}>CSAT</span>
                      <span style={{ fontSize: 12.5, color: T.text }}>{NPS_TRANSLATIONS.en.csatQ}</span>
                    </div>
                    <span style={{ fontSize: 10, color: T.error, fontWeight: 600 }}>Required</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>Scale: ★ (Poor) → ★★★★★ (Excellent)</div>
                </div>
              )}
              <div style={{ padding: "12px 14px", background: T.bg, borderRadius: 10, border: `1px solid rgba(139,92,246,0.1)` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", background: "rgba(139,92,246,0.1)", padding: "2px 8px", borderRadius: 4 }}>TEXT</span>
                    <span style={{ fontSize: 12.5, color: T.text }}>{NPS_TRANSLATIONS.en.followUp}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>Optional</span>
                </div>
              </div>
            </div>

            {/* Conditional Playbook Triggers */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#ec4899", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Conditional Playbook Triggers</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ padding: "12px", background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>😍</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.green }}>Promoter (NPS 9–10)</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>→ Trigger referral request playbook + advocacy program invite</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.green, background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 4 }}>Active</span>
                </div>
                <div style={{ padding: "12px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>😐</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.warning }}>Passive (NPS 7–8)</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>→ Flag for CSM follow-up in next touchpoint</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.warning, background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 4 }}>Active</span>
                </div>
                <div style={{ padding: "12px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>😞</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.error }}>Detractor (NPS 0–6)</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>→ Trigger CSM personal outreach + manager escalation + at-risk flag</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.error, background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 4 }}>Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar: Locale config */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Languages</div>
              {Object.entries(SURVEY_LOCALES).map(([code, loc]) => {
                const enabled = enabledLocales.includes(code);
                return (
                  <div key={code} onClick={() => toggleLocale(code)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", cursor: "pointer" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${enabled ? T.green : T.border}`, background: enabled ? "rgba(16,185,129,0.12)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.green, flexShrink: 0 }}>{enabled ? "✓" : ""}</div>
                    <span style={{ fontSize: 14 }}>{loc.flag}</span>
                    <span style={{ fontSize: 12, color: enabled ? T.text : "#475569" }}>{loc.label}</span>
                  </div>
                );
              })}
              <p style={{ fontSize: 10, color: "#334155", marginTop: 8 }}>{enabledLocales.length} locale{enabledLocales.length !== 1 ? "s" : ""} enabled. Translations auto-loaded from survey_translations table.</p>
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Health Score Feed</div>
              <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>Responses auto-update the <strong style={{ color: T.green }}>NPS / CSAT</strong> component in the Health Scoring Engine for linked accounts.</p>
              <div style={{ marginTop: 8, padding: "8px 10px", background: T.bg, borderRadius: 8, fontSize: 10, color: "#475569" }}>
                NPS → npsScore field<br />
                CSAT → csatScore field<br />
                Timestamp → lastSurveyDays
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Responses Tab ─── */}
      {tab === "responses" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[{ id: "all", label: `All (${responses.length})` }, { id: "promoter", label: `😍 Promoters (${promoters})` }, { id: "passive", label: `😐 Passives (${passives})` }, { id: "detractor", label: `😞 Detractors (${detractors})` }].map(f => (
              <button key={f.id} onClick={() => setResponseFilter(f.id)} style={{
                fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", border: "none",
                background: responseFilter === f.id ? "rgba(245,158,11,0.12)" : T.surface,
                color: responseFilter === f.id ? "#f59e0b" : "#475569",
              }}>{f.label}</button>
            ))}
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", maxHeight: 520, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Respondent", "Account", "NPS", "CSAT", "Category", "Locale", "Feedback", "Date"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", borderBottom: `1px solid ${T.border}`, color: "#475569", fontWeight: 600, background: T.surface2, position: "sticky", top: 0, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map(r => {
                  const cat = npsCategory(r.npsScore);
                  const acct = accounts.find(a => a.id === r.accountId);
                  return (
                    <tr key={r.id}>
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: T.text, fontSize: 11 }}>{r.email}</td>
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: T.green, fontSize: 11, fontWeight: 500 }}>{acct?.company || "—"}</td>
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}><span style={{ fontWeight: 700, color: cat.color, fontSize: 14 }}>{r.npsScore}</span></td>
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: "#f59e0b", fontSize: 12 }}>{csatStars(r.csatScore)}</td>
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}><span style={{ fontSize: 10, fontWeight: 600, color: cat.color, background: `rgba(${hexToRgb(cat.color)},0.08)`, padding: "2px 8px", borderRadius: 4 }}>{cat.emoji} {cat.label}</span></td>
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>{SURVEY_LOCALES[r.locale]?.flag || "🌐"}</td>
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: "#94a3b8", fontSize: 11, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.feedback}</td>
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: "#475569", fontSize: 11 }}>{r.submittedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── AI Analysis Tab ─── */}
      {tab === "analysis" && (
        <div>
          {!aiAnalysis ? (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🤖</div>
              <p style={{ fontSize: 15, color: "#475569", marginBottom: 6 }}>AI Theme Analysis</p>
              <p style={{ fontSize: 12, color: "#334155", marginBottom: 16 }}>Batch-process {responses.filter(r => r.feedback).length} open-text responses through Claude to extract themes, sentiment, and recommended actions.</p>
              <button onClick={runAiAnalysis} disabled={analyzingAi} style={{
                background: analyzingAi ? T.greenDim : "linear-gradient(135deg, #f59e0b, #ec4899)",
                color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600,
                cursor: analyzingAi ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
                {analyzingAi ? "🤖 Analyzing responses..." : "🤖 Run AI Analysis"}
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Key Insight */}
                <div style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.warning, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Key Insight</div>
                  <p style={{ fontSize: 14, color: T.text, lineHeight: 1.6 }}>{aiAnalysis.keyInsight}</p>
                </div>
                {/* Themes */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Extracted Themes</div>
                  {(aiAnalysis.themes || []).map((theme, i) => {
                    const sc = { positive: T.green, negative: T.error, neutral: "#64748b" }[theme.sentiment] || "#475569";
                    return (
                      <div key={i} style={{ padding: "12px", background: T.bg, borderRadius: 10, marginBottom: 8, border: `1px solid ${sc}15` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{theme.theme}</span>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "#475569" }}>{theme.count} mentions</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: sc, background: `rgba(${hexToRgb(sc)},0.08)`, padding: "2px 8px", borderRadius: 4 }}>{theme.sentiment}</span>
                          </div>
                        </div>
                        {theme.sampleQuotes?.map((q, j) => (
                          <p key={j} style={{ fontSize: 11.5, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.5, marginTop: 4 }}>"{q}"</p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Recommended Actions sidebar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>AI-Recommended Actions</div>
                  {(aiAnalysis.recommendedActions || []).map((a, i) => {
                    const pc = { high: T.error, medium: T.warning, low: T.green }[a.priority] || "#475569";
                    return (
                      <div key={i} style={{ padding: "10px 0", borderBottom: i < aiAnalysis.recommendedActions.length - 1 ? `1px solid ${T.border}` : "none" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: pc, background: `rgba(${hexToRgb(pc)},0.08)`, padding: "1px 6px", borderRadius: 3, textTransform: "uppercase" }}>{a.priority}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.action}</span>
                        </div>
                        <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>{a.rationale}</p>
                      </div>
                    );
                  })}
                </div>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Overall Sentiment</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: { positive: T.green, negative: T.error, mixed: T.warning }[aiAnalysis.overallSentiment] || "#475569", fontFamily: "'Playfair Display', serif", textTransform: "capitalize" }}>{aiAnalysis.overallSentiment}</div>
                </div>
                <button onClick={() => { setAiAnalysis(null); }} style={{ fontSize: 11, color: "#475569", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↻ Re-run Analysis</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Preview & Deploy Tab ─── */}
      {tab === "preview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
          <div>
            {/* Locale selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {enabledLocales.map(code => (
                <button key={code} onClick={() => setPreviewLocale(code)} style={{
                  fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", border: "none",
                  background: previewLocale === code ? "rgba(245,158,11,0.12)" : T.surface,
                  color: previewLocale === code ? "#f59e0b" : "#475569",
                }}>{SURVEY_LOCALES[code]?.flag} {SURVEY_LOCALES[code]?.label}</button>
              ))}
              <div style={{ flex: 1 }} />
              {[{ id: "nps", label: "NPS" }, { id: "csat", label: "CSAT" }, { id: "combined", label: "Combined" }].map(t => (
                <button key={t.id} onClick={() => setPreviewType(t.id)} style={{
                  fontSize: 10, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  background: previewType === t.id ? "rgba(139,92,246,0.12)" : "transparent",
                  color: previewType === t.id ? "#a78bfa" : "#475569",
                  border: previewType === t.id ? "1px solid rgba(139,92,246,0.3)" : `1px solid ${T.border}`,
                }}>{t.label}</button>
              ))}
            </div>
            {/* Live Preview (simulates white bg embed) */}
            <div style={{ background: "#0f172a", borderRadius: 16, padding: "32px", display: "flex", justifyContent: "center", border: `1px solid ${T.border}` }}>
              <SurveyPreview locale={previewLocale} surveyType={previewType} />
            </div>
          </div>

          {/* Deploy panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Delivery Methods</div>
              <div style={{ padding: "10px", background: deliveryMethod === "email" || deliveryMethod === "both" ? "rgba(16,185,129,0.04)" : T.bg, border: `1px solid ${deliveryMethod === "email" || deliveryMethod === "both" ? T.green + "33" : T.border}`, borderRadius: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>✉️ Email Embed</div>
                <p style={{ fontSize: 10.5, color: "#475569", marginTop: 2 }}>Survey renders inline in email body. Compatible with Outlook, Gmail, Apple Mail.</p>
              </div>
              <div style={{ padding: "10px", background: deliveryMethod === "in_app" || deliveryMethod === "both" ? "rgba(139,92,246,0.04)" : T.bg, border: `1px solid ${deliveryMethod === "in_app" || deliveryMethod === "both" ? "#8b5cf6" + "33" : T.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>🧩 In-App Widget</div>
                <p style={{ fontSize: 10.5, color: "#475569", marginTop: 2 }}>JavaScript snippet for customer-facing products. Renders as bottom-right modal.</p>
              </div>
            </div>

            {/* JS Snippet */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>Widget Snippet</div>
                <button onClick={() => setShowSnippet(s => !s)} style={{ fontSize: 10, color: "#8b5cf6", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{showSnippet ? "Hide" : "Show"}</button>
              </div>
              {showSnippet && (
                <div>
                  <pre style={{ background: T.bg, borderRadius: 8, padding: "12px", fontSize: 10, color: "#94a3b8", overflow: "auto", maxHeight: 150, lineHeight: 1.6, border: `1px solid ${T.border}` }}>{widgetSnippet}</pre>
                  <button onClick={() => navigator.clipboard?.writeText(widgetSnippet)} style={{ marginTop: 6, width: "100%", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, padding: "7px", fontSize: 11, color: "#a78bfa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>📋 Copy Snippet</button>
                </div>
              )}
            </div>

            {/* API Endpoint Reference */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Response API</div>
              <pre style={{ background: T.bg, borderRadius: 8, padding: "10px", fontSize: 9.5, color: "#64748b", lineHeight: 1.6, overflow: "auto", border: `1px solid ${T.border}` }}>{`POST /api/v1/surveys/responses
Content-Type: application/json

{
  "survey_id": "sv-xxx",
  "question_id": "q-xxx",
  "account_id": "acct-xxx",
  "respondent_email": "user@co.com",
  "score": 9,
  "text_feedback": "Great!",
  "locale": "en"
}`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreviewModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowPreviewModal(false)}>
          <div onClick={e => e.stopPropagation()}>
            <SurveyPreview locale={previewLocale} surveyType={previewType} onClose={() => setShowPreviewModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// QBR DECK GENERATOR
// ═══════════════════════════════════════════════════════════════════════════
//
// PostgreSQL Schema:
//
// CREATE TABLE qbr_decks (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   tenant_id UUID NOT NULL, account_id UUID NOT NULL REFERENCES accounts(id),
//   title TEXT NOT NULL, quarter TEXT NOT NULL, -- 'Q1 2026'
//   date_range_start DATE NOT NULL, date_range_end DATE NOT NULL,
//   aggregated_data JSONB NOT NULL,  -- snapshot of all input data
//   generated_content JSONB NOT NULL, -- {sections: [{title, body, editable_body}]}
//   edited_content JSONB,            -- CSM-edited version
//   export_format TEXT,              -- 'pdf','pptx','both'
//   status TEXT DEFAULT 'generating', -- generating,draft,finalized,exported
//   generation_time_ms INTEGER,
//   created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW(), finalized_at TIMESTAMPTZ
// );
// CREATE INDEX idx_qbr_account ON qbr_decks(account_id, created_at DESC);
//
// CREATE TABLE qbr_generation_jobs (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   deck_id UUID NOT NULL REFERENCES qbr_decks(id),
//   status TEXT DEFAULT 'queued', -- queued,aggregating,generating,completed,failed
//   phase TEXT, -- 'data_aggregation','ai_generation','template_render'
//   progress INTEGER DEFAULT 0, -- 0-100
//   error TEXT, attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3,
//   queued_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ
// );
// ═══════════════════════════════════════════════════════════════════════════

const QBR_SECTIONS = [
  { key: "exec_summary", title: "Executive Summary", icon: "📋", color: "#8b5cf6", description: "High-level overview of account performance and relationship status" },
  { key: "value_delivered", title: "Value Delivered This Quarter", icon: "💎", color: "#10b981", description: "Measurable outcomes and ROI achieved during the period" },
  { key: "usage_adoption", title: "Usage & Adoption Report", icon: "📊", color: "#2D8CFF", description: "Feature adoption, login frequency, power user metrics" },
  { key: "health_trend", title: "Health Score Trend Analysis", icon: "❤️", color: "#ec4899", description: "Health score trajectory with component-level breakdown" },
  { key: "support_summary", title: "Support & Issue Summary", icon: "🎧", color: "#06b6d4", description: "Ticket volume, resolution times, open issues" },
  { key: "success_plan", title: "Success Plan Progress", icon: "🎯", color: "#14b8a6", description: "Milestone completion percentage and next milestones" },
  { key: "renewal_outlook", title: "Renewal & Expansion Outlook", icon: "📈", color: "#f59e0b", description: "MRR trend, expansion/contraction, renewal timeline" },
  { key: "next_steps", title: "Recommended Next Steps", icon: "🚀", color: "#8b5cf6", description: "AI-recommended actions for the upcoming quarter" },
];

function generateDemoAggregation(account) {
  return {
    account: { name: account?.company || "Acme Corp", industry: account?.industry || "saas", mrr: account?.mrr || "$12,500", contact: account?.contact || "Sarah Johnson", csm: "Sarah R.", renewalIn: account?.renewalIn || 90 },
    healthScores: { current: 74, trend: [68, 71, 72, 69, 74, 76, 73, 74], avgThisQ: 72, prevQ: 65, change: "+7" },
    usage: { dauMau: 32, sessionsPerWeek: 4.1, coreAdoption: 68, newFeatureUptake: 42, powerUsers: 18, loginsThisQ: 1247, topFeatures: ["Dashboard Analytics", "Report Builder", "API Integrations", "User Management"] },
    support: { ticketsThisQ: 14, avgResolutionHrs: 5.2, escalations: 2, openIssues: 1, csatOnTickets: 4.3, topCategories: ["Integration setup", "Report customization", "API rate limits"] },
    nps: { latestScore: 8, historicalScores: [7, 8, 8, 9, 7, 8], avgNps: 42, category: "Passive", lastSurveyDate: "Feb 12, 2026" },
    successPlan: { totalMilestones: 8, completed: 5, inProgress: 2, blocked: 1, completionPct: 62, milestones: [
      { name: "Onboarding complete", status: "done" }, { name: "Core feature training", status: "done" }, { name: "API integration live", status: "done" },
      { name: "Custom report templates", status: "done" }, { name: "SSO configuration", status: "done" }, { name: "Advanced analytics rollout", status: "in_progress" },
      { name: "Executive sponsor check-in", status: "in_progress" }, { name: "Expansion scoping", status: "blocked" },
    ] },
    meetings: { count: 6, keyMeetings: [
      { title: "QBR Prep Call", date: "Feb 26", summary: "Reviewed adoption metrics; competitor concern raised; ROI doc requested" },
      { title: "Technical Deep-Dive", date: "Feb 10", summary: "Resolved API rate limiting; discussed roadmap for Q2" },
      { title: "Executive Sponsor Sync", date: "Jan 22", summary: "VP expressed satisfaction; asked about enterprise tier features" },
    ] },
    revenue: { currentMRR: 12500, prevQMRR: 11200, expansion: 1300, contraction: 0, netGrowth: "+11.6%", renewalDate: "May 15, 2026", contractValue: 150000, ltv: 312000 },
  };
}

// ─── Mini bar chart for QBR sections ─────────────────────────────────────
function QBRMiniBar({ values, max, colors }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 36 }}>
      {values.map((v, i) => {
        const h = Math.max(3, (v / (max || 1)) * 36);
        return <div key={i} style={{ width: 14, height: h, borderRadius: 2, background: colors?.[i] || T.green, opacity: 0.6 + (i / values.length) * 0.4 }} />;
      })}
    </div>
  );
}

// ─── Milestone progress dots ─────────────────────────────────────────────
function MilestoneTracker({ milestones }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {milestones.map((m, i) => {
        const c = m.status === "done" ? T.green : m.status === "in_progress" ? T.warning : T.error;
        return <div key={i} title={`${m.name} — ${m.status}`} style={{ width: 18, height: 18, borderRadius: 4, background: `rgba(${hexToRgb(c)},0.15)`, border: `1.5px solid ${c}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: c, fontWeight: 700, cursor: "default" }}>{m.status === "done" ? "✓" : m.status === "in_progress" ? "◉" : "!"}</div>;
      })}
    </div>
  );
}

// ─── Job Progress Bar ────────────────────────────────────────────────────
function JobProgressBar({ phase, progress }) {
  const phases = ["data_aggregation", "ai_generation", "template_render"];
  const labels = ["Aggregating Data", "Generating with AI", "Rendering Template"];
  const currentIdx = phases.indexOf(phase);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {phases.map((p, i) => (
          <div key={p} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 2, background: i <= currentIdx ? T.green : T.surface2, transition: "background 0.3s" }}>
              {i === currentIdx && <div style={{ height: "100%", width: `${progress}%`, background: T.green, borderRadius: 2, transition: "width 0.4s" }} />}
            </div>
            <div style={{ fontSize: 9, color: i <= currentIdx ? T.green : "#475569", marginTop: 4, textAlign: "center", fontWeight: i === currentIdx ? 700 : 400 }}>{labels[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── QBR Deck Panel ──────────────────────────────────────────────────────
function QBRDeckPanel({ accounts }) {
  const [tab, setTab] = useState("generate"); // generate | editor | history
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || "");
  const [quarter, setQuarter] = useState("Q1 2026");
  const [dateStart, setDateStart] = useState("2026-01-01");
  const [dateEnd, setDateEnd] = useState("2026-03-31");
  const [generating, setGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState("");
  const [genProgress, setGenProgress] = useState(0);
  const [aggregatedData, setAggregatedData] = useState(null);
  const [generatedSections, setGeneratedSections] = useState(null);
  const [editedSections, setEditedSections] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editText, setEditText] = useState("");
  const [savedDecks, setSavedDecks] = useState([]);
  const [exportFormat, setExportFormat] = useState("both");
  const { tierId, incrementActions } = useTier();

  const account = accounts.find(a => a.id === selectedAccount);

  const runGeneration = async () => {
    setGenerating(true);
    setGenPhase("data_aggregation"); setGenProgress(0);

    // Phase 1: Aggregate data
    const data = generateDemoAggregation(account);
    setAggregatedData(data);
    for (let p = 0; p <= 100; p += 20) { await new Promise(r => setTimeout(r, 200)); setGenProgress(p); }

    // Phase 2: AI Generation
    setGenPhase("ai_generation"); setGenProgress(0);

    try {
      const prompt = `Generate a comprehensive Quarterly Business Review (QBR) document for ${data.account.name} (${data.account.industry} industry) for ${quarter}.

DATA SNAPSHOT:
- MRR: $${data.revenue.currentMRR}/mo (${data.revenue.netGrowth} QoQ), Contract: $${data.revenue.contractValue}, Renewal: ${data.revenue.renewalDate}
- Health Score: ${data.healthScores.current}/100 (was ${data.healthScores.prevQ} last quarter, ${data.healthScores.change} change)
- Usage: ${data.usage.dauMau}% DAU/MAU, ${data.usage.sessionsPerWeek} sessions/week, ${data.usage.coreAdoption}% core adoption, ${data.usage.loginsThisQ} logins
- Top features: ${data.usage.topFeatures.join(", ")}
- Support: ${data.support.ticketsThisQ} tickets, ${data.support.avgResolutionHrs}hr avg resolution, ${data.support.escalations} escalations, ${data.support.openIssues} open
- NPS: ${data.nps.latestScore}/10 (${data.nps.category}), average ${data.nps.avgNps}
- Success Plan: ${data.successPlan.completionPct}% complete (${data.successPlan.completed}/${data.successPlan.totalMilestones} milestones done)
- Key meetings: ${data.meetings.keyMeetings.map(m => `${m.title} (${m.date}): ${m.summary}`).join("; ")}
- Renewal in ${data.account.renewalIn} days, expansion of $${data.revenue.expansion} this quarter

Return a JSON object with exactly these keys, each containing 2-4 paragraphs of polished executive-ready content:
{
  "exec_summary": "...",
  "value_delivered": "...",
  "usage_adoption": "...",
  "health_trend": "...",
  "support_summary": "...",
  "success_plan": "...",
  "renewal_outlook": "...",
  "next_steps": "..."
}

Write in third-person professional tone. Include specific numbers from the data. Each section should be 100-200 words. Return ONLY valid JSON, no markdown fences.`;

      setGenProgress(30);
      const text = await callClaude("You are a QBR document generator for Customer Success teams. Return only valid JSON with polished executive content.", prompt, 4000, { action_type: "qbr_report", tier: tierId });
      incrementActions();
      setGenProgress(80);
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const sections = QBR_SECTIONS.map(s => ({
        ...s, body: parsed[s.key] || `Content for ${s.title} will be generated.`, edited: false,
      }));
      setGeneratedSections(sections);
      setEditedSections(sections.map(s => ({ ...s })));
      setGenProgress(100);

      // Phase 3: Template render
      setGenPhase("template_render"); setGenProgress(0);
      for (let p = 0; p <= 100; p += 25) { await new Promise(r => setTimeout(r, 150)); setGenProgress(p); }

      setTab("editor");
    } catch (err) {
      // Fallback content
      const sections = QBR_SECTIONS.map(s => ({
        ...s, body: `[AI generation error — please edit this section manually]\n\nThis section covers ${s.description} for ${account?.company || "the account"} during ${quarter}.`, edited: false,
      }));
      setGeneratedSections(sections);
      setEditedSections(sections.map(s => ({ ...s })));
      setTab("editor");
    } finally {
      setGenerating(false); setGenPhase(""); setGenProgress(0);
    }
  };

  const startEdit = (key) => {
    const section = editedSections?.find(s => s.key === key);
    if (section) { setEditingKey(key); setEditText(section.body); }
  };

  const saveEdit = () => {
    if (!editingKey) return;
    setEditedSections(prev => prev.map(s => s.key === editingKey ? { ...s, body: editText, edited: true } : s));
    setEditingKey(null); setEditText("");
  };

  const revertEdit = (key) => {
    const original = generatedSections?.find(s => s.key === key);
    if (original) setEditedSections(prev => prev.map(s => s.key === key ? { ...s, body: original.body, edited: false } : s));
  };

  const finalizeDeck = () => {
    const deck = {
      id: `qbr-${Date.now()}`, account: account?.company || "Unknown", quarter,
      dateRange: `${dateStart} to ${dateEnd}`, sections: editedSections,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      format: exportFormat, status: "finalized",
    };
    setSavedDecks(prev => [deck, ...prev]);
    setTab("history");
  };

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="🖥️" title="QBR Deck Generator" color="#8b5cf6"
        bullets={[
          "Generates complete Quarterly Business Review presentations by aggregating data from health scores, usage metrics, support tickets, NPS responses, success plans, meetings, and revenue — then sending it all to Claude AI for polished executive content.",
          "Eight structured sections cover every QBR need: Executive Summary, Value Delivered, Usage & Adoption, Health Trend, Support Summary, Success Plan Progress, Renewal Outlook, and Next Steps. Each section is fully editable before export.",
          "Export as branded PDF with charts and company logo, or PPTX via pptxgenjs. All generated QBRs are stored linked to the account for historical reference. Async job processing handles the 15–30 second generation time with a live progress indicator.",
        ]}
        workflow={[
          "Select account, quarter, and date range",
          "Engine aggregates data from 7 platform sources",
          "Claude AI generates 8 structured QBR sections",
          "CSM edits/customizes, then exports as PDF or PPTX",
        ]}
        outputLabel="8 QBR Sections"
        outputItems={[
          { icon: "📋", text: "Executive Summary + Value Delivered" },
          { icon: "📊", text: "Usage, Health, Support analysis" },
          { icon: "🎯", text: "Success Plan + Renewal Outlook" },
          { icon: "🚀", text: "AI-recommended next steps" },
        ]}
        audienceLabel="Export Options"
        audience={[
          { icon: "📄", text: "Branded PDF with charts & logo" },
          { icon: "📑", text: "PPTX via pptxgenjs" },
          { icon: "🗄️", text: "Stored per-account for history" },
        ]}
      />

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
        {[{ id: "generate", label: "Generate", icon: "⚡" }, { id: "editor", label: "Editor", icon: "✏️", disabled: !editedSections }, { id: "history", label: "History", icon: "🗄️" }].map(t => (
          <button key={t.id} onClick={() => !t.disabled && setTab(t.id)} style={{
            flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: t.disabled ? "not-allowed" : "pointer",
            background: tab === t.id ? "rgba(139,92,246,0.12)" : "transparent",
            color: tab === t.id ? "#a78bfa" : t.disabled ? "#334155" : "#475569", fontSize: 12, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif", opacity: t.disabled ? 0.4 : 1,
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ─── Generate Tab ─── */}
      {tab === "generate" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Input Form */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>QBR Configuration</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div><label style={labelStyle}>Account</label>
                  <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.company}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Quarter</label>
                  <select value={quarter} onChange={e => setQuarter(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {["Q1 2026", "Q4 2025", "Q3 2025", "Q2 2025"].map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div><label style={labelStyle}>Date Range Start</label><input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Date Range End</label><input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Export Format</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ id: "pdf", label: "📄 PDF", desc: "Branded report" }, { id: "pptx", label: "📑 PPTX", desc: "Slide deck" }, { id: "both", label: "📄+📑 Both", desc: "PDF & PPTX" }].map(f => (
                    <button key={f.id} onClick={() => setExportFormat(f.id)} style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                      background: exportFormat === f.id ? "rgba(139,92,246,0.08)" : T.bg,
                      border: exportFormat === f.id ? "1.5px solid rgba(139,92,246,0.3)" : `1px solid ${T.border}`,
                      fontFamily: "'DM Sans', sans-serif", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: exportFormat === f.id ? "#a78bfa" : T.text }}>{f.label}</div>
                      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Data Sources Preview */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Data Sources (7 aggregated)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {[
                  { icon: "❤️", label: "Health Scores", desc: "Trend over quarter", color: "#ec4899" },
                  { icon: "📊", label: "Usage Metrics", desc: "Adoption & logins", color: "#2D8CFF" },
                  { icon: "🎧", label: "Support Tickets", desc: "Volume & resolution", color: "#06b6d4" },
                  { icon: "😊", label: "NPS Responses", desc: "Latest scores", color: "#10b981" },
                  { icon: "🎯", label: "Success Plans", desc: "Milestone progress", color: "#14b8a6" },
                  { icon: "🎙️", label: "Meetings", desc: "Key discussion summaries", color: "#f59e0b" },
                  { icon: "💰", label: "Revenue", desc: "MRR & expansion data", color: "#8b5cf6" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: T.bg, borderRadius: 8 }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button + Progress */}
            {generating ? (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 18, height: 18, border: "2px solid rgba(139,92,246,0.3)", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>Generating QBR for {account?.company}...</span>
                </div>
                <JobProgressBar phase={genPhase} progress={genProgress} />
                <p style={{ fontSize: 11, color: "#475569", textAlign: "center" }}>This typically takes 15–30 seconds. Async job processing with retry logic.</p>
              </div>
            ) : (
              <button onClick={runGeneration} style={{
                width: "100%", background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 4px 20px rgba(139,92,246,0.2)",
              }}>🖥️ Generate QBR Deck for {account?.company || "Account"}</button>
            )}
          </div>

          {/* Right: Sections Preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>8 QBR Sections</div>
              {QBR_SECTIONS.map((s, i) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < QBR_SECTIONS.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: `rgba(${hexToRgb(s.color)},0.1)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.text }}>{s.title}</div>
                    <div style={{ fontSize: 9.5, color: "#475569" }}>{s.description.split(",")[0]}</div>
                  </div>
                </div>
              ))}
            </div>
            {account && (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Account Snapshot</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{account.company}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{account.mrr}/mo · {account.industry} · Contact: {account.contact}</div>
                <StatusBadge status={account.status} small />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Editor Tab ─── */}
      {tab === "editor" && editedSections && (
        <div>
          {/* Header bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: T.text }}>{account?.company} — {quarter} QBR</h3>
              <p style={{ fontSize: 11, color: "#475569" }}>{editedSections.filter(s => s.edited).length} of {editedSections.length} sections edited by CSM</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setTab("generate")} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
              <button onClick={finalizeDeck} style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {exportFormat === "both" ? "📄📑" : exportFormat === "pdf" ? "📄" : "📑"} Finalize & Export
              </button>
            </div>
          </div>

          {/* Data Sidebar Chips (aggregated snapshot) */}
          {aggregatedData && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, background: "rgba(236,72,153,0.08)", color: "#ec4899", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>❤️ Health: {aggregatedData.healthScores.current} ({aggregatedData.healthScores.change})</span>
              <span style={{ fontSize: 10, background: "rgba(45,140,255,0.08)", color: "#2D8CFF", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>📊 DAU/MAU: {aggregatedData.usage.dauMau}%</span>
              <span style={{ fontSize: 10, background: "rgba(6,182,212,0.08)", color: "#06b6d4", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>🎧 {aggregatedData.support.ticketsThisQ} tickets</span>
              <span style={{ fontSize: 10, background: "rgba(16,185,129,0.08)", color: "#10b981", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>😊 NPS: {aggregatedData.nps.latestScore}</span>
              <span style={{ fontSize: 10, background: "rgba(20,184,166,0.08)", color: "#14b8a6", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>🎯 Plan: {aggregatedData.successPlan.completionPct}%</span>
              <span style={{ fontSize: 10, background: "rgba(139,92,246,0.08)", color: "#8b5cf6", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>💰 MRR: ${aggregatedData.revenue.currentMRR} ({aggregatedData.revenue.netGrowth})</span>
            </div>
          )}

          {/* Section Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {editedSections.map((section, i) => (
              <div key={section.key} style={{
                background: T.surface, border: `1px solid ${section.edited ? T.green + "44" : T.border}`,
                borderRadius: 14, padding: "18px 20px", transition: "border-color 0.2s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `rgba(${hexToRgb(section.color)},0.1)`, border: `1px solid ${section.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{section.icon}</div>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{section.title}</span>
                      {section.edited && <span style={{ fontSize: 9, fontWeight: 600, color: T.green, background: "rgba(16,185,129,0.08)", padding: "1px 6px", borderRadius: 3, marginLeft: 8 }}>Edited</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {section.edited && <button onClick={() => revertEdit(section.key)} style={{ fontSize: 10, color: T.warning, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↩ Revert</button>}
                    <button onClick={() => startEdit(section.key)} style={{ fontSize: 10, color: "#a78bfa", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>✏️ Edit</button>
                  </div>
                </div>

                {editingKey === section.key ? (
                  <div>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={8} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7, fontSize: 13 }} />
                    <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => setEditingKey(null)} style={{ fontSize: 11, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 14px", color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                      <button onClick={saveEdit} style={{ fontSize: 11, background: T.green, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>✓ Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{section.body}</div>
                )}

                {/* Mini visualization per section */}
                {aggregatedData && section.key === "health_trend" && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: T.bg, borderRadius: 8, display: "flex", alignItems: "center", gap: 16 }}>
                    <QBRMiniBar values={aggregatedData.healthScores.trend} max={100} colors={aggregatedData.healthScores.trend.map(v => healthTier(v).color)} />
                    <div style={{ fontSize: 11, color: "#475569" }}>Score trend: {aggregatedData.healthScores.trend.join(" → ")}</div>
                  </div>
                )}
                {aggregatedData && section.key === "success_plan" && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: T.bg, borderRadius: 8 }}>
                    <MilestoneTracker milestones={aggregatedData.successPlan.milestones} />
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>{aggregatedData.successPlan.completed} done · {aggregatedData.successPlan.inProgress} in progress · {aggregatedData.successPlan.blocked} blocked</div>
                  </div>
                )}
                {aggregatedData && section.key === "usage_adoption" && (
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {aggregatedData.usage.topFeatures.map(f => (
                      <span key={f} style={{ fontSize: 10, color: "#2D8CFF", background: "rgba(45,140,255,0.06)", padding: "3px 8px", borderRadius: 4 }}>{f}</span>
                    ))}
                  </div>
                )}
                {aggregatedData && section.key === "renewal_outlook" && (
                  <div style={{ marginTop: 10, display: "flex", gap: 12, fontSize: 11, color: "#475569" }}>
                    <span>Renewal: <strong style={{ color: T.warning }}>{aggregatedData.revenue.renewalDate}</strong></span>
                    <span>Expansion: <strong style={{ color: T.green }}>+${aggregatedData.revenue.expansion}</strong></span>
                    <span>Net: <strong style={{ color: T.green }}>{aggregatedData.revenue.netGrowth}</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── History Tab ─── */}
      {tab === "history" && (
        <div>
          {savedDecks.length === 0 ? (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🗄️</div>
              <p style={{ fontSize: 15, color: "#475569", marginBottom: 6 }}>No saved QBR decks yet</p>
              <p style={{ fontSize: 12, color: "#334155" }}>Generate a QBR to see it here for historical reference.</p>
              <button onClick={() => setTab("generate")} style={{ marginTop: 14, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 8, padding: "9px 20px", fontSize: 13, color: "#a78bfa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>⚡ Generate a QBR →</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {savedDecks.map(deck => (
                <div key={deck.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🖥️</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{deck.account} — {deck.quarter} QBR</div>
                        <div style={{ fontSize: 11, color: "#475569" }}>
                          Created {deck.createdAt} · {deck.sections.length} sections · {deck.sections.filter(s => s.edited).length} edited
                          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: T.green, background: "rgba(16,185,129,0.08)", padding: "1px 8px", borderRadius: 4 }}>{deck.format === "both" ? "PDF + PPTX" : deck.format.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditedSections(deck.sections); setTab("editor"); }} style={{ fontSize: 11, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 6, padding: "6px 14px", color: "#a78bfa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>View / Edit</button>
                      <button style={{ fontSize: 11, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: "6px 14px", color: T.green, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>📥 Download</button>
                    </div>
                  </div>
                  {/* Section preview */}
                  <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
                    {deck.sections.map(s => (
                      <span key={s.key} style={{ fontSize: 9, color: s.color, background: `rgba(${hexToRgb(s.color)},0.06)`, padding: "2px 7px", borderRadius: 4 }}>
                        {s.icon} {s.title.split(" ").slice(0, 2).join(" ")}{s.edited ? " ✎" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMIZABLE DASHBOARD SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
//
// PostgreSQL Schema:
//
// CREATE TABLE user_dashboards (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id UUID NOT NULL, tenant_id UUID NOT NULL,
//   name TEXT DEFAULT 'My Dashboard',
//   widgets JSONB NOT NULL DEFAULT '[]',
//     -- [{widget_type, position:{x,y,w,h}, config:{...}}]
//   is_default BOOLEAN DEFAULT FALSE,
//   created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_ud_user ON user_dashboards(user_id);
//
// CREATE TABLE dashboard_templates (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   tenant_id UUID NOT NULL,
//   name TEXT NOT NULL, description TEXT,
//   widgets JSONB NOT NULL DEFAULT '[]',
//   is_default BOOLEAN DEFAULT FALSE, -- new users start with this
//   created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ═══════════════════════════════════════════════════════════════════════════

const WIDGET_TYPES = {
  health_overview:      { label: "Health Overview",       icon: "🥧", color: "#ec4899", minW: 1, minH: 1, desc: "Pie chart of portfolio by health band" },
  accounts_at_risk:     { label: "Accounts at Risk",     icon: "🚨", color: "#ef4444", minW: 1, minH: 1, desc: "Accounts below health threshold" },
  upcoming_renewals:    { label: "Upcoming Renewals",    icon: "📅", color: "#f59e0b", minW: 1, minH: 1, desc: "Renewals sorted by date" },
  task_queue:           { label: "Task Queue",           icon: "✓",  color: "#06b6d4", minW: 1, minH: 1, desc: "Filterable task list by priority" },
  nps_trend:            { label: "NPS Trend",            icon: "📈", color: "#10b981", minW: 1, minH: 1, desc: "NPS line chart over time" },
  activity_feed:        { label: "Activity Feed",        icon: "⚡", color: "#8b5cf6", minW: 1, minH: 1, desc: "Recent account activities" },
  revenue_chart:        { label: "Revenue Chart",        icon: "💰", color: "#14b8a6", minW: 1, minH: 1, desc: "MRR bar chart by account" },
  playbook_perf:        { label: "Playbook Performance", icon: "⚙️", color: "#2D8CFF", minW: 1, minH: 1, desc: "Active playbooks with completion %" },
  team_leaderboard:     { label: "Team Leaderboard",     icon: "🏆", color: "#f97316", minW: 1, minH: 1, desc: "CSMs ranked by key metrics" },
};

const DASHBOARD_TEMPLATES = [
  { id: "tpl-exec", name: "Executive Overview", desc: "High-level portfolio health and revenue view", isDefault: true, widgets: [
    { type: "health_overview", x: 0, y: 0, w: 1, h: 1 }, { type: "revenue_chart", x: 1, y: 0, w: 1, h: 1 },
    { type: "accounts_at_risk", x: 2, y: 0, w: 1, h: 1 }, { type: "nps_trend", x: 0, y: 1, w: 1, h: 1 },
    { type: "upcoming_renewals", x: 1, y: 1, w: 1, h: 1 }, { type: "team_leaderboard", x: 2, y: 1, w: 1, h: 1 },
  ] },
  { id: "tpl-csm", name: "CSM Daily Driver", desc: "Task-focused view for daily account management", widgets: [
    { type: "task_queue", x: 0, y: 0, w: 1, h: 1 }, { type: "accounts_at_risk", x: 1, y: 0, w: 1, h: 1 },
    { type: "activity_feed", x: 2, y: 0, w: 1, h: 1 }, { type: "upcoming_renewals", x: 0, y: 1, w: 1, h: 1 },
    { type: "playbook_perf", x: 1, y: 1, w: 1, h: 1 }, { type: "health_overview", x: 2, y: 1, w: 1, h: 1 },
  ] },
  { id: "tpl-ops", name: "CS Operations", desc: "Playbook and team performance metrics", widgets: [
    { type: "team_leaderboard", x: 0, y: 0, w: 1, h: 1 }, { type: "playbook_perf", x: 1, y: 0, w: 1, h: 1 },
    { type: "nps_trend", x: 2, y: 0, w: 1, h: 1 }, { type: "revenue_chart", x: 0, y: 1, w: 1, h: 1 },
    { type: "health_overview", x: 1, y: 1, w: 1, h: 1 }, { type: "activity_feed", x: 2, y: 1, w: 1, h: 1 },
  ] },
];

// Demo data generators for each widget
function widgetData(type, accounts) {
  const accts = accounts || [];
  switch (type) {
    case "health_overview": {
      const healthy = accts.filter(a => !["at-risk","churned"].includes(a.status)).length || 3;
      const attention = accts.filter(a => a.status === "renewal-due").length || 1;
      const atRisk = accts.filter(a => a.status === "at-risk").length || 1;
      const churned = accts.filter(a => a.status === "churned").length || 1;
      return { segments: [
        { label: "Healthy", value: healthy, color: "#10b981" }, { label: "Needs Attention", value: attention, color: "#f59e0b" },
        { label: "At Risk", value: atRisk, color: "#ef4444" }, { label: "Churned", value: churned, color: "#475569" },
      ], total: healthy + attention + atRisk + churned };
    }
    case "accounts_at_risk":
      return { accounts: [
        { name: "MetroPlex Realty", score: 34, trend: "down", days: 8 },
        { name: "Nextera Billing", score: 22, trend: "down", days: 0 },
        { name: "Acme Health", score: 48, trend: "up", days: 14 },
      ] };
    case "upcoming_renewals":
      return { renewals: accts.filter(a => a.renewalIn > 0).sort((a, b) => a.renewalIn - b.renewalIn).map(a => ({ name: a.company, days: a.renewalIn, mrr: a.mrr, status: a.status })) };
    case "task_queue":
      return { tasks: [
        { title: "Send ROI summary to Acme Health", priority: "high", due: "Feb 27", assignee: "Sarah R.", done: false },
        { title: "Schedule dashboard walkthrough — PinPoint", priority: "medium", due: "Mar 3", assignee: "Marcus K.", done: false },
        { title: "Mobile hotfix follow-up — MetroPlex", priority: "high", due: "Feb 28", assignee: "Sarah R.", done: false },
        { title: "QBR prep deck — CloudSync Pro", priority: "low", due: "Mar 10", assignee: "Alex P.", done: true },
        { title: "Renewal proposal — TalentForge", priority: "medium", due: "Mar 5", assignee: "Jin L.", done: false },
      ] };
    case "nps_trend":
      return { dataPoints: [
        { period: "Oct", nps: 32 }, { period: "Nov", nps: 38 }, { period: "Dec", nps: 35 },
        { period: "Jan", nps: 42 }, { period: "Feb", nps: 46 },
      ] };
    case "activity_feed":
      return { activities: [
        { type: "meeting", text: "QBR Prep Call with Acme Health", time: "2h ago", icon: "🎙️" },
        { type: "survey", text: "NPS response: 9/10 from CloudSync Pro", time: "4h ago", icon: "😍" },
        { type: "alert", text: "Health score dropped to 34 — MetroPlex Realty", time: "6h ago", icon: "🚨" },
        { type: "task", text: "ROI summary completed for Acme Health", time: "1d ago", icon: "✓" },
        { type: "playbook", text: "Onboarding playbook completed — TalentForge", time: "1d ago", icon: "⚡" },
        { type: "ticket", text: "Support ticket #482 resolved — PinPoint", time: "2d ago", icon: "🎧" },
      ] };
    case "revenue_chart":
      return { accounts: accts.slice(0, 5).map(a => ({ name: a.company.split(" ")[0], mrr: parseFloat(a.mrr?.replace(/[$,]/g, "")) || 0 })) };
    case "playbook_perf":
      return { playbooks: [
        { name: "90-Day Onboarding", active: 4, completion: 78, color: "#10b981" },
        { name: "Renewal Prep", active: 2, completion: 55, color: "#f59e0b" },
        { name: "At-Risk Intervention", active: 1, completion: 30, color: "#ef4444" },
        { name: "QBR Scheduling", active: 3, completion: 92, color: "#2D8CFF" },
      ] };
    case "team_leaderboard":
      return { members: [
        { name: "Sarah R.", role: "Senior CSM", healthImproved: 12, tasksDone: 34, npsAvg: 52, avatar: "SR" },
        { name: "Marcus K.", role: "CSM", healthImproved: 8, tasksDone: 28, npsAvg: 44, avatar: "MK" },
        { name: "Jin L.", role: "CSM", healthImproved: 6, tasksDone: 22, npsAvg: 48, avatar: "JL" },
        { name: "Alex P.", role: "CS Manager", healthImproved: 15, tasksDone: 41, npsAvg: 56, avatar: "AP" },
      ].sort((a, b) => b.healthImproved - a.healthImproved) };
    default: return {};
  }
}

// ─── Individual Widget Renderers ─────────────────────────────────────────
function WidgetHealthOverview({ data }) {
  const total = data.total || 1;
  let cumAngle = 0;
  const size = 100; const cx = 50; const cy = 50; const r = 38;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.segments.map((seg, i) => {
          const angle = (seg.value / total) * 360;
          const startAngle = cumAngle; cumAngle += angle;
          const start = { x: cx + r * Math.cos((startAngle - 90) * Math.PI / 180), y: cy + r * Math.sin((startAngle - 90) * Math.PI / 180) };
          const end = { x: cx + r * Math.cos((startAngle + angle - 90) * Math.PI / 180), y: cy + r * Math.sin((startAngle + angle - 90) * Math.PI / 180) };
          const large = angle > 180 ? 1 : 0;
          return <path key={i} d={`M${cx},${cy} L${start.x},${start.y} A${r},${r} 0 ${large} 1 ${end.x},${end.y} Z`} fill={seg.color} opacity="0.8" />;
        })}
        <circle cx={cx} cy={cy} r={18} fill={T.surface} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill={T.text} fontSize="12" fontWeight="700">{total}</text>
      </svg>
      <div style={{ flex: 1 }}>
        {data.segments.map(seg => (
          <div key={seg.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} /><span style={{ fontSize: 11, color: "#94a3b8" }}>{seg.label}</span></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WidgetAccountsAtRisk({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.accounts.map((a, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "rgba(239,68,68,0.03)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.1)" }}>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.name}</div><div style={{ fontSize: 10, color: "#475569" }}>{a.days > 0 ? `Renews in ${a.days}d` : "Churned"}</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: a.score < 40 ? T.error : T.warning }}>{a.score}</span>
            <span style={{ fontSize: 11, color: a.trend === "down" ? T.error : T.green }}>{a.trend === "down" ? "↓" : "↑"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WidgetUpcomingRenewals({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {(data.renewals || []).slice(0, 5).map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
          <div><div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{r.name}</div><div style={{ fontSize: 10, color: "#475569" }}>{r.mrr}</div></div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, color: r.days <= 14 ? T.error : r.days <= 45 ? T.warning : T.green, background: `rgba(${hexToRgb(r.days <= 14 ? T.error : r.days <= 45 ? T.warning : T.green)},0.08)` }}>{r.days}d</span>
        </div>
      ))}
    </div>
  );
}

function WidgetTaskQueue({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
      {data.tasks.map((t, i) => {
        const pc = { high: T.error, medium: T.warning, low: T.green }[t.priority];
        return (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${T.border}`, opacity: t.done ? 0.4 : 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: pc, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: T.text, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{t.assignee} · {t.due}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WidgetNPSTrend({ data }) {
  const pts = data.dataPoints || [];
  if (pts.length < 2) return <p style={{ color: "#475569", fontSize: 12 }}>Not enough data</p>;
  const w = 260; const h = 80; const pad = 24;
  const max = Math.max(...pts.map(p => p.nps), 60); const min = Math.min(...pts.map(p => p.nps), -20);
  const range = max - min || 1;
  const points = pts.map((p, i) => `${pad + (i / (pts.length - 1)) * (w - pad * 2)},${8 + (1 - (p.nps - min) / range) * (h - 20)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
        const y = 8 + (1 - (p.nps - min) / range) * (h - 20);
        return <g key={i}><circle cx={x} cy={y} r="3.5" fill={p.nps >= 0 ? T.green : T.error} /><text x={x} y={h - 2} fill="#475569" fontSize="9" textAnchor="middle">{p.period}</text><text x={x} y={y - 7} fill={T.green} fontSize="9" fontWeight="700" textAnchor="middle">{p.nps}</text></g>;
      })}
    </svg>
  );
}

function WidgetActivityFeed({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 190, overflowY: "auto" }}>
      {data.activities.map((a, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>{a.icon}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.4 }}>{a.text}</div><div style={{ fontSize: 10, color: "#334155" }}>{a.time}</div></div>
        </div>
      ))}
    </div>
  );
}

function WidgetRevenueChart({ data }) {
  const accts = data.accounts || [];
  const max = Math.max(...accts.map(a => a.mrr), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100, paddingTop: 10 }}>
      {accts.map((a, i) => {
        const h = Math.max(6, (a.mrr / max) * 80);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: T.green }}>${(a.mrr / 1000).toFixed(1)}k</span>
            <div style={{ width: "100%", height: h, background: `rgba(16,185,129,${0.3 + (i / accts.length) * 0.5})`, borderRadius: 4, transition: "height 0.4s" }} />
            <span style={{ fontSize: 9, color: "#475569", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 50 }}>{a.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function WidgetPlaybookPerf({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.playbooks.map((p, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: T.text, fontWeight: 500 }}>{p.name}</span>
            <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#475569" }}><span>{p.active} active</span><span style={{ fontWeight: 600, color: p.completion >= 70 ? T.green : p.completion >= 40 ? T.warning : T.error }}>{p.completion}%</span></div>
          </div>
          <div style={{ height: 5, background: T.surface2, borderRadius: 3 }}><div style={{ height: "100%", width: `${p.completion}%`, background: p.color, borderRadius: 3, transition: "width 0.4s" }} /></div>
        </div>
      ))}
    </div>
  );
}

function WidgetTeamLeaderboard({ data }) {
  return (
    <div>
      {data.members.map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: i === 0 ? "rgba(245,158,11,0.15)" : T.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: i === 0 ? "#f59e0b" : "#475569", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: T.green, flexShrink: 0 }}>{m.avatar}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{m.name}</div><div style={{ fontSize: 10, color: "#475569" }}>{m.role}</div></div>
          <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
            <span title="Health improved">❤️{m.healthImproved}</span>
            <span title="Tasks done">✓{m.tasksDone}</span>
            <span title="NPS avg">📈{m.npsAvg}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const WIDGET_RENDERERS = {
  health_overview: WidgetHealthOverview, accounts_at_risk: WidgetAccountsAtRisk,
  upcoming_renewals: WidgetUpcomingRenewals, task_queue: WidgetTaskQueue,
  nps_trend: WidgetNPSTrend, activity_feed: WidgetActivityFeed,
  revenue_chart: WidgetRevenueChart, playbook_perf: WidgetPlaybookPerf,
  team_leaderboard: WidgetTeamLeaderboard,
};

// ─── Dashboard Widget Wrapper ────────────────────────────────────────────
function DashWidget({ widget, accounts, isEditing, onRemove, onMoveUp, onMoveDown, isFirst, isLast, loading }) {
  const wt = WIDGET_TYPES[widget.type];
  const Renderer = WIDGET_RENDERERS[widget.type];
  const data = widgetData(widget.type, accounts);
  if (!wt || !Renderer) return null;

  return (
    <div style={{
      background: T.surface, border: `1px solid ${isEditing ? wt.color + "44" : T.border}`,
      borderRadius: 14, padding: "14px 16px", transition: "all 0.2s", position: "relative",
      opacity: loading ? 0.6 : 1,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>{wt.icon}</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: wt.color }}>{wt.label}</span>
        </div>
        {isEditing && (
          <div style={{ display: "flex", gap: 3 }}>
            {!isFirst && <button onClick={onMoveUp} style={{ background: T.surface2, border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer", color: "#475569" }}>↑</button>}
            {!isLast && <button onClick={onMoveDown} style={{ background: T.surface2, border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer", color: "#475569" }}>↓</button>}
            <button onClick={onRemove} style={{ background: "rgba(239,68,68,0.06)", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer", color: T.error }}>✕</button>
          </div>
        )}
        {loading && <span style={{ width: 12, height: 12, border: "2px solid rgba(16,185,129,0.2)", borderTopColor: T.green, borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />}
      </div>
      {/* Body */}
      <Renderer data={data} />
    </div>
  );
}

// ─── Custom Dashboard Panel ──────────────────────────────────────────────
function CustomDashPanel({ accounts }) {
  const [widgets, setWidgets] = useState(() => DASHBOARD_TEMPLATES[0].widgets.map((w, i) => ({ ...w, id: `w-${i}` })));
  const [isEditing, setIsEditing] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [dashName, setDashName] = useState("My Dashboard");
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [columns, setColumns] = useState(3);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => { setLastRefresh(Date.now()); setRefreshing(false); }, 800);
    }, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const addWidget = (type) => {
    const id = `w-${Date.now()}`;
    setWidgets(prev => [...prev, { type, id, x: 0, y: Math.floor(prev.length / columns), w: 1, h: 1 }]);
    setShowAddWidget(false);
  };

  const removeWidget = (id) => setWidgets(prev => prev.filter(w => w.id !== id));

  const moveWidget = (id, dir) => {
    setWidgets(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

  const applyTemplate = (tplId) => {
    const tpl = DASHBOARD_TEMPLATES.find(t => t.id === tplId);
    if (tpl) { setWidgets(tpl.widgets.map((w, i) => ({ ...w, id: `w-${i}-${Date.now()}` }))); setDashName(tpl.name); }
    setShowTemplates(false);
  };

  const manualRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setLastRefresh(Date.now()); setRefreshing(false); }, 800);
  };

  const timeSinceRefresh = () => {
    const diff = Math.floor((Date.now() - lastRefresh) / 1000);
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="🧩" title="Customizable Dashboard" color="#06b6d4"
        bullets={[
          "Drag-and-drop grid layout (react-grid-layout compatible) with 9 widget types covering every CS metric: health overview pie chart, accounts at risk, upcoming renewals, task queue, NPS trend, activity feed, revenue chart, playbook performance, and team leaderboard.",
          "Dashboard state is persisted per-user in a user_dashboards table storing widget configs as JSON (widget_type, position, size, config). Admin template system lets admins create starter layouts that new users begin with, stored in a dashboard_templates table.",
          "Each widget fetches data independently via dedicated API endpoints for fast parallel loading. Auto-refresh every 5 minutes with a live countdown indicator. Fully customizable: add, remove, reorder widgets and switch between pre-built templates.",
        ]}
        workflow={[
          "Start from a template (Executive, CSM Daily, or CS Ops) or build from scratch",
          "Add, remove, and reorder widgets in edit mode",
          "Each widget fetches its own data via dedicated API endpoint",
          "Dashboard auto-refreshes every 5 minutes with visual indicator",
        ]}
        outputLabel="9 Widget Types"
        outputItems={[
          { icon: "🥧", text: "Health Overview · Accounts at Risk" },
          { icon: "📅", text: "Upcoming Renewals · Task Queue" },
          { icon: "📈", text: "NPS Trend · Revenue Chart" },
          { icon: "🏆", text: "Team Leaderboard · Playbook Perf" },
        ]}
        audienceLabel="Persistence"
        audience={[
          { icon: "👤", text: "Per-user dashboard state (JSON)" },
          { icon: "📐", text: "Admin template system" },
          { icon: "🔄", text: "Auto-refresh every 5 min" },
        ]}
      />

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isEditing ? (
            <input value={dashName} onChange={e => setDashName(e.target.value)} style={{ ...inputStyle, width: 200, fontSize: 14, fontWeight: 600 }} />
          ) : (
            <span style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{dashName}</span>
          )}
          <span style={{ fontSize: 10, color: "#475569" }}>{widgets.length} widget{widgets.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Refresh indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: refreshing ? T.green : "#475569", padding: "4px 10px", background: refreshing ? "rgba(16,185,129,0.06)" : "transparent", borderRadius: 6, transition: "all 0.3s" }}>
            {refreshing ? <span style={{ width: 10, height: 10, border: "1.5px solid rgba(16,185,129,0.3)", borderTopColor: T.green, borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} /> : <span style={{ cursor: "pointer" }} onClick={manualRefresh}>🔄</span>}
            <span>{refreshing ? "Refreshing..." : timeSinceRefresh()}</span>
          </div>
          <button onClick={() => setAutoRefresh(a => !a)} title={autoRefresh ? "Auto-refresh ON (5m)" : "Auto-refresh OFF"} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 5, border: `1px solid ${autoRefresh ? T.green + "44" : T.border}`, background: autoRefresh ? "rgba(16,185,129,0.06)" : "transparent", color: autoRefresh ? T.green : "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{autoRefresh ? "⏱ 5m" : "⏸"}</button>
          {/* Column selector */}
          <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
            {[2, 3, 4].map(c => (
              <button key={c} onClick={() => setColumns(c)} style={{ padding: "4px 10px", fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: columns === c ? "rgba(6,182,212,0.12)" : "transparent", color: columns === c ? "#06b6d4" : "#475569" }}>{c}col</button>
            ))}
          </div>
          <button onClick={() => setShowTemplates(true)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, border: `1px solid rgba(139,92,246,0.2)`, background: "rgba(139,92,246,0.06)", color: "#a78bfa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>📐 Templates</button>
          {isEditing && (
            <button onClick={() => setShowAddWidget(true)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, border: `1px solid rgba(6,182,212,0.25)`, background: "rgba(6,182,212,0.06)", color: "#06b6d4", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>+ Add Widget</button>
          )}
          <button onClick={() => setIsEditing(!isEditing)} style={{
            fontSize: 11, padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
            background: isEditing ? T.green : "rgba(245,158,11,0.1)",
            color: isEditing ? "#fff" : "#f59e0b",
          }}>{isEditing ? "✓ Done" : "✏️ Edit"}</button>
        </div>
      </div>

      {/* Template Picker Modal */}
      {showTemplates && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowTemplates(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", width: 540, animation: "panelIn 0.2s ease" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.text, marginBottom: 4 }}>Dashboard Templates</h3>
            <p style={{ fontSize: 12, color: "#475569", marginBottom: 16 }}>Choose a template to replace your current layout. Admin-created templates stored in dashboard_templates table.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {DASHBOARD_TEMPLATES.map(tpl => (
                <div key={tpl.id} onClick={() => applyTemplate(tpl.id)} style={{ padding: "14px 16px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, cursor: "pointer", transition: "border-color 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{tpl.name}</span>
                    {tpl.isDefault && <span style={{ fontSize: 9, fontWeight: 700, color: T.green, background: "rgba(16,185,129,0.08)", padding: "2px 6px", borderRadius: 3 }}>DEFAULT</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>{tpl.desc}</p>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {tpl.widgets.map((w, i) => {
                      const wt = WIDGET_TYPES[w.type];
                      return <span key={i} style={{ fontSize: 9, color: wt?.color, background: `rgba(${hexToRgb(wt?.color || "#475569")},0.06)`, padding: "2px 6px", borderRadius: 3 }}>{wt?.icon} {wt?.label}</span>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowAddWidget(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", width: 480, animation: "panelIn 0.2s ease" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.text, marginBottom: 14 }}>Add Widget</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {Object.entries(WIDGET_TYPES).map(([key, wt]) => (
                <button key={key} onClick={() => addWidget(key)} style={{
                  padding: "12px 10px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
                  cursor: "pointer", textAlign: "center", transition: "border-color 0.15s", fontFamily: "'DM Sans', sans-serif",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{wt.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: wt.color }}>{wt.label}</div>
                  <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{wt.desc.split(" ").slice(0, 4).join(" ")}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Widget Grid */}
      {widgets.length === 0 ? (
        <div style={{ background: T.surface, border: `2px dashed ${T.border}`, borderRadius: 16, padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>🧩</div>
          <p style={{ fontSize: 15, color: "#475569", marginBottom: 8 }}>Your dashboard is empty</p>
          <p style={{ fontSize: 12, color: "#334155", marginBottom: 16 }}>Add widgets or apply a template to get started.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={() => setShowTemplates(true)} style={{ fontSize: 12, padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.06)", color: "#a78bfa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>📐 Choose Template</button>
            <button onClick={() => { setIsEditing(true); setShowAddWidget(true); }} style={{ fontSize: 12, padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(6,182,212,0.25)", background: "rgba(6,182,212,0.06)", color: "#06b6d4", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>+ Add Widget</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12 }}>
          {widgets.map((w, i) => (
            <DashWidget key={w.id} widget={w} accounts={accounts} isEditing={isEditing} loading={refreshing}
              onRemove={() => removeWidget(w.id)}
              onMoveUp={() => moveWidget(w.id, -1)}
              onMoveDown={() => moveWidget(w.id, 1)}
              isFirst={i === 0} isLast={i === widgets.length - 1} />
          ))}
        </div>
      )}

      {/* JSON State Preview (dev/persistence reference) */}
      {isEditing && (
        <div style={{ marginTop: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Persisted Widget Config (user_dashboards.widgets JSON)</span>
            <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(widgets.map(w => ({ type: w.type, x: w.x, y: w.y, w: w.w, h: w.h })), null, 2))} style={{ fontSize: 10, color: "#06b6d4", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>📋 Copy</button>
          </div>
          <pre style={{ fontSize: 9.5, color: "#64748b", overflowX: "auto", maxHeight: 80, lineHeight: 1.5 }}>{JSON.stringify(widgets.map(w => ({ type: w.type, x: w.x, y: w.y, w: w.w, h: w.h })), null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STAKEHOLDER MAPPING MODULE
// ═══════════════════════════════════════════════════════════════════════════
//
// PostgreSQL Schema:
//
// CREATE TABLE stakeholders (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   tenant_id UUID NOT NULL, account_id UUID NOT NULL REFERENCES accounts(id),
//   name TEXT NOT NULL, title TEXT, email TEXT, phone TEXT, linkedin_url TEXT,
//   role_type TEXT NOT NULL, -- decision_maker,influencer,champion,end_user,executive_sponsor,blocker
//   sentiment TEXT DEFAULT 'neutral', -- advocate,neutral,detractor
//   influence_score INTEGER DEFAULT 3 CHECK (influence_score BETWEEN 1 AND 5),
//   last_interaction_date DATE, interaction_count INTEGER DEFAULT 0,
//   relationship_summary TEXT, -- AI-generated
//   avatar_color TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_stake_account ON stakeholders(account_id);
//
// CREATE TABLE stakeholder_relationships (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   from_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
//   to_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
//   relationship_type TEXT NOT NULL, -- reports_to,influences,collaborates_with,blocks
//   strength INTEGER DEFAULT 3 CHECK (strength BETWEEN 1 AND 5),
//   notes TEXT,
//   UNIQUE(from_id, to_id, relationship_type)
// );
//
// CREATE TABLE stakeholder_interactions (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
//   interaction_type TEXT NOT NULL, -- meeting,email,call,note,survey,support_ticket
//   title TEXT NOT NULL, summary TEXT,
//   sentiment_at_time TEXT, -- advocate,neutral,detractor
//   source_id UUID, -- meeting_id, ticket_id, etc.
//   occurred_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_si_stake ON stakeholder_interactions(stakeholder_id, occurred_at DESC);
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_TYPES = {
  decision_maker:     { label: "Decision Maker", icon: "👔", color: "#8b5cf6" },
  influencer:         { label: "Influencer", icon: "🗣️", color: "#2D8CFF" },
  champion:           { label: "Champion", icon: "⭐", color: "#f59e0b" },
  end_user:           { label: "End User", icon: "👤", color: "#64748b" },
  executive_sponsor:  { label: "Executive Sponsor", icon: "🏛️", color: "#06b6d4" },
  blocker:            { label: "Blocker", icon: "🚫", color: "#ef4444" },
};

const SENTIMENT_MAP = {
  advocate:  { label: "Advocate", color: "#10b981", bg: "rgba(16,185,129,0.08)", icon: "😊" },
  neutral:   { label: "Neutral", color: "#64748b", bg: "rgba(100,116,139,0.08)", icon: "😐" },
  detractor: { label: "Detractor", color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: "😟" },
};

const REL_TYPES = {
  reports_to:        { label: "Reports To", color: "#8b5cf6", dash: "" },
  influences:        { label: "Influences", color: "#2D8CFF", dash: "6 3" },
  collaborates_with: { label: "Collaborates", color: "#10b981", dash: "3 3" },
  blocks:            { label: "Blocks", color: "#ef4444", dash: "8 4" },
};

function generateDemoStakeholders() {
  return {
    contacts: [
      { id: "s1", name: "Sarah Johnson", title: "VP Operations", email: "sarah.j@acmehealth.com", phone: "+1-555-0142", linkedin: "linkedin.com/in/sarahjohnson", role: "decision_maker", sentiment: "neutral", influence: 5, lastInteraction: "Feb 26, 2026", interactions: 14, accountId: "d1",
        summary: "Key decision maker for renewal. Engaged but price-sensitive. Requested ROI documentation for budget committee. Has final sign-off authority on renewals above $50K." },
      { id: "s2", name: "Dr. Michael Chen", title: "Chief Medical Officer", email: "m.chen@acmehealth.com", phone: "+1-555-0198", linkedin: "linkedin.com/in/drchen", role: "executive_sponsor", sentiment: "detractor", influence: 5, lastInteraction: "Feb 26, 2026", interactions: 8, accountId: "d1",
        summary: "Executive sponsor evaluating competitor alternatives. Expressed concern about pricing relative to CompetitorX. Clinical background means he values data-driven ROI proof points." },
      { id: "s3", name: "Lisa Torres", title: "Compliance Manager", email: "l.torres@acmehealth.com", phone: "+1-555-0156", linkedin: "linkedin.com/in/lisatorres", role: "champion", sentiment: "advocate", influence: 3, lastInteraction: "Feb 20, 2026", interactions: 22, accountId: "d1",
        summary: "Strongest internal champion. Uses the platform daily for compliance audits and actively promotes it to other departments. Key reference for case studies." },
      { id: "s4", name: "James Wu", title: "IT Director", email: "j.wu@acmehealth.com", phone: "+1-555-0177", linkedin: "linkedin.com/in/jameswu", role: "influencer", sentiment: "advocate", influence: 4, lastInteraction: "Feb 15, 2026", interactions: 11, accountId: "d1",
        summary: "Technical champion who led the integration. Appreciates the API quality and has implemented custom workflows. Influences the CTO on technology decisions." },
      { id: "s5", name: "Robert Kim", title: "CFO", email: "r.kim@acmehealth.com", phone: "+1-555-0134", linkedin: "linkedin.com/in/robertkim", role: "blocker", sentiment: "detractor", influence: 5, lastInteraction: "Jan 30, 2026", interactions: 3, accountId: "d1",
        summary: "Primary budget gatekeeper scrutinizing all renewals above $50K. Has not been directly engaged by CS team. Needs compelling ROI data to approve renewal." },
      { id: "s6", name: "Amy Patel", title: "Clinical Operations Lead", email: "a.patel@acmehealth.com", phone: "+1-555-0145", linkedin: "linkedin.com/in/amypatel", role: "end_user", sentiment: "advocate", influence: 2, lastInteraction: "Feb 22, 2026", interactions: 31, accountId: "d1",
        summary: "Power user with highest login frequency. Runs daily reports for the clinical team. Provided positive NPS (9/10) and volunteered for case study." },
      { id: "s7", name: "David Chen", title: "Head of Compliance", email: "d.chen@pinpoint.io", phone: "+1-555-0201", linkedin: "linkedin.com/in/davidchen", role: "decision_maker", sentiment: "advocate", influence: 4, lastInteraction: "Feb 24, 2026", interactions: 18, accountId: "d2",
        summary: "Highly satisfied decision maker. Fraud detection module results exceeded expectations. Interested in expanding to additional departments." },
      { id: "s8", name: "Linda Park", title: "Director of Sales", email: "l.park@metroplex.com", phone: "+1-555-0312", linkedin: "linkedin.com/in/lindapark", role: "decision_maker", sentiment: "detractor", influence: 4, lastInteraction: "Feb 25, 2026", interactions: 9, accountId: "d4",
        summary: "Frustrated with mobile app stability. Has threatened to evaluate alternatives if issues aren't resolved this week. Requires urgent escalation attention." },
    ],
    relationships: [
      { from: "s1", to: "s5", type: "reports_to", strength: 5 },
      { from: "s2", to: "s5", type: "reports_to", strength: 4 },
      { from: "s3", to: "s1", type: "reports_to", strength: 4 },
      { from: "s6", to: "s3", type: "reports_to", strength: 3 },
      { from: "s4", to: "s1", type: "influences", strength: 4 },
      { from: "s3", to: "s2", type: "influences", strength: 3 },
      { from: "s6", to: "s1", type: "influences", strength: 2 },
      { from: "s5", to: "s1", type: "blocks", strength: 4 },
    ],
  };
}

function generateDemoInteractions(contactId) {
  const all = {
    s1: [
      { type: "meeting", title: "QBR Prep Call", summary: "Discussed adoption metrics and competitor concerns. Requested ROI documentation.", sentiment: "neutral", date: "Feb 26, 2026" },
      { type: "email", title: "Follow-up: ROI Summary", summary: "Sent preliminary value metrics. She acknowledged receipt and said she'd share with CFO.", sentiment: "neutral", date: "Feb 22, 2026" },
      { type: "meeting", title: "Monthly Check-in", summary: "Positive tone. Team adoption growing. Mentioned budget pressure from above.", sentiment: "neutral", date: "Feb 10, 2026" },
      { type: "call", title: "Quick sync on renewal", summary: "Expressed interest in renewing but needs CFO approval. Asked for executive summary.", sentiment: "advocate", date: "Jan 28, 2026" },
    ],
    s2: [
      { type: "meeting", title: "QBR Prep Call", summary: "Mentioned evaluating CompetitorX for AI triage. Price is the primary concern.", sentiment: "detractor", date: "Feb 26, 2026" },
      { type: "email", title: "Product roadmap inquiry", summary: "Asked detailed questions about Q2 AI features. Seemed somewhat reassured.", sentiment: "neutral", date: "Feb 12, 2026" },
    ],
    s3: [
      { type: "meeting", title: "Feature training session", summary: "Enthusiastic about new compliance dashboard. Already sharing it with team.", sentiment: "advocate", date: "Feb 20, 2026" },
      { type: "survey", title: "NPS Response", summary: "Scored 10/10. Comment: 'Best compliance tool we've ever used.'", sentiment: "advocate", date: "Feb 14, 2026" },
      { type: "email", title: "Case study participation", summary: "Volunteered to participate in customer case study.", sentiment: "advocate", date: "Feb 5, 2026" },
    ],
    s5: [
      { type: "email", title: "Budget review notice", summary: "Sent blanket email about scrutinizing all renewals. No personal engagement.", sentiment: "detractor", date: "Jan 30, 2026" },
    ],
    s8: [
      { type: "meeting", title: "Escalation Call", summary: "Expressed strong frustration about mobile app crashes. Demanded fix by end of week.", sentiment: "detractor", date: "Feb 25, 2026" },
      { type: "support_ticket", title: "Ticket #471: App crashes", summary: "Reported app crashing twice daily. Impact: lost showings.", sentiment: "detractor", date: "Feb 23, 2026" },
    ],
  };
  return all[contactId] || [
    { type: "meeting", title: "Introduction call", summary: "Initial relationship building. Positive first impression.", sentiment: "neutral", date: "Feb 10, 2026" },
  ];
}

// ─── Network Graph (SVG-based force-directed simulation) ─────────────────
function StakeholderGraph({ contacts, relationships, selectedId, onSelect, accountFilter }) {
  const filtered = accountFilter ? contacts.filter(c => c.accountId === accountFilter) : contacts;
  const filteredIds = new Set(filtered.map(c => c.id));
  const filteredRels = relationships.filter(r => filteredIds.has(r.from) && filteredIds.has(r.to));

  const width = 580; const height = 400;
  const centerX = width / 2; const centerY = height / 2;

  // Simple circular layout with influence-based radius
  const nodes = filtered.map((c, i) => {
    const angle = (i / filtered.length) * 2 * Math.PI - Math.PI / 2;
    const radius = 120 + (5 - c.influence) * 25;
    return {
      ...c, x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle),
      r: 12 + c.influence * 5,
    };
  });
  const nodeMap = {}; nodes.forEach(n => { nodeMap[n.id] = n; });

  return (
    <svg width={width} height={height} style={{ display: "block", borderRadius: 12, background: "rgba(5,11,24,0.5)" }}>
      {/* Edges */}
      {filteredRels.map((rel, i) => {
        const from = nodeMap[rel.from]; const to = nodeMap[rel.to];
        if (!from || !to) return null;
        const rt = REL_TYPES[rel.type] || REL_TYPES.collaborates_with;
        return (
          <g key={`e-${i}`}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={rt.color} strokeWidth={rel.strength * 0.6} strokeOpacity="0.35" strokeDasharray={rt.dash} />
            {/* Arrowhead for reports_to */}
            {rel.type === "reports_to" && (() => {
              const dx = to.x - from.x; const dy = to.y - from.y; const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = dx / len; const ny = dy / len;
              const ax = to.x - nx * (to.r + 4); const ay = to.y - ny * (to.r + 4);
              return <polygon points={`${ax},${ay} ${ax - ny * 4 - nx * 8},${ay + nx * 4 - ny * 8} ${ax + ny * 4 - nx * 8},${ay - nx * 4 - ny * 8}`} fill={rt.color} opacity="0.5" />;
            })()}
          </g>
        );
      })}
      {/* Nodes */}
      {nodes.map(node => {
        const sentColor = SENTIMENT_MAP[node.sentiment]?.color || "#64748b";
        const isSelected = node.id === selectedId;
        return (
          <g key={node.id} style={{ cursor: "pointer" }} onClick={() => onSelect(node.id)}>
            {isSelected && <circle cx={node.x} cy={node.y} r={node.r + 6} fill="none" stroke={sentColor} strokeWidth="2" strokeDasharray="4 3" opacity="0.6" />}
            <circle cx={node.x} cy={node.y} r={node.r} fill={sentColor} opacity={isSelected ? 0.9 : 0.7} stroke={isSelected ? "#fff" : sentColor} strokeWidth={isSelected ? 2.5 : 1.5} />
            <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={node.r > 20 ? 11 : 9} fontWeight="700" fontFamily="'DM Sans', sans-serif">
              {node.name.split(" ").map(n => n[0]).join("")}
            </text>
            <text x={node.x} y={node.y + node.r + 12} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="'DM Sans', sans-serif">{node.name.split(" ")[0]}</text>
            {/* Role icon */}
            <text x={node.x + node.r - 2} y={node.y - node.r + 4} fontSize="10" textAnchor="middle">{ROLE_TYPES[node.role]?.icon || "👤"}</text>
          </g>
        );
      })}
      {/* Legend */}
      <g transform="translate(12, 12)">
        {Object.entries(SENTIMENT_MAP).map(([k, v], i) => (
          <g key={k} transform={`translate(0, ${i * 16})`}>
            <circle cx="5" cy="5" r="4" fill={v.color} opacity="0.7" />
            <text x="14" y="8" fill="#64748b" fontSize="9" fontFamily="'DM Sans', sans-serif">{v.label}</text>
          </g>
        ))}
        <text x="0" y={16 * 3 + 6} fill="#475569" fontSize="8" fontFamily="'DM Sans', sans-serif">Node size = influence</text>
      </g>
      {/* Edge type legend */}
      <g transform={`translate(${width - 110}, 12)`}>
        {Object.entries(REL_TYPES).map(([k, v], i) => (
          <g key={k} transform={`translate(0, ${i * 14})`}>
            <line x1="0" y1="5" x2="16" y2="5" stroke={v.color} strokeWidth="1.5" strokeDasharray={v.dash} />
            <text x="22" y="8" fill="#64748b" fontSize="8" fontFamily="'DM Sans', sans-serif">{v.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── AI Sentiment Suggestions ────────────────────────────────────────────
function AISuggestionCard({ suggestion, onAccept, onDismiss }) {
  const fromSent = SENTIMENT_MAP[suggestion.from];
  const toSent = SENTIMENT_MAP[suggestion.to];
  return (
    <div style={{ padding: "12px 14px", background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 10, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 12 }}>🤖</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#a78bfa" }}>AI Suggestion</span>
      </div>
      <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 8 }}>{suggestion.reason}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 11 }}>
        <span style={{ fontWeight: 600, color: T.text }}>{suggestion.contactName}</span>
        <span style={{ color: fromSent?.color, fontWeight: 600, background: fromSent?.bg, padding: "1px 6px", borderRadius: 3 }}>{fromSent?.icon} {suggestion.from}</span>
        <span style={{ color: "#475569" }}>→</span>
        <span style={{ color: toSent?.color, fontWeight: 600, background: toSent?.bg, padding: "1px 6px", borderRadius: 3 }}>{toSent?.icon} {suggestion.to}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onAccept} style={{ flex: 1, fontSize: 10, fontWeight: 600, padding: "5px 0", borderRadius: 6, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>✓ Accept</button>
        <button onClick={onDismiss} style={{ flex: 1, fontSize: 10, fontWeight: 600, padding: "5px 0", borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>✕ Dismiss</button>
      </div>
    </div>
  );
}

// ─── Stakeholder Panel ───────────────────────────────────────────────────
function StakeholderPanel({ accounts }) {
  const [demoData] = useState(() => generateDemoStakeholders());
  const [contacts, setContacts] = useState(demoData.contacts);
  const [relationships] = useState(demoData.relationships);
  const [selectedContact, setSelectedContact] = useState(null);
  const [tab, setTab] = useState("graph"); // graph | list | import
  const [detailTab, setDetailTab] = useState("info"); // info | timeline | ai
  const [accountFilter, setAccountFilter] = useState("d1");
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", title: "", email: "", phone: "", linkedin: "", role: "end_user", sentiment: "neutral", influence: 3 });
  const [aiSuggestions, setAiSuggestions] = useState([
    { id: "sug1", contactId: "s2", contactName: "Dr. Michael Chen", from: "neutral", to: "detractor", reason: "In the Feb 26 QBR Prep Call, Dr. Chen mentioned evaluating CompetitorX and expressed concern about pricing — suggesting growing dissatisfaction." },
    { id: "sug2", contactId: "s6", contactName: "Amy Patel", from: "neutral", to: "advocate", reason: "Amy submitted an NPS score of 9/10 and volunteered for a customer case study — consistent advocate behavior over the past month." },
  ]);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [importText, setImportText] = useState("");
  const { tierId, incrementActions } = useTier();

  const selected = contacts.find(c => c.id === selectedContact);
  const accountMap = {}; accounts.forEach(a => { accountMap[a.id] = a; });
  const filteredContacts = accountFilter ? contacts.filter(c => c.accountId === accountFilter) : contacts;

  const acceptSuggestion = (sug) => {
    setContacts(prev => prev.map(c => c.id === sug.contactId ? { ...c, sentiment: sug.to } : c));
    setAiSuggestions(prev => prev.filter(s => s.id !== sug.id));
  };

  const dismissSuggestion = (id) => setAiSuggestions(prev => prev.filter(s => s.id !== id));

  const runAiAnalysis = async () => {
    setAnalyzingAi(true);
    try {
      const contactSummaries = filteredContacts.map(c => `${c.name} (${c.title}, ${ROLE_TYPES[c.role]?.label}, current: ${c.sentiment}, influence: ${c.influence}/5): ${c.summary}`).join("\n");
      const prompt = `Analyze these stakeholder profiles and recent interactions. Suggest any sentiment changes based on the relationship summaries. Return a JSON array:
[{"contactName":"...","contactId":"...","from":"current_sentiment","to":"suggested_sentiment","reason":"explanation"}]

Stakeholders:
${contactSummaries}

Only suggest changes where evidence is strong. Return ONLY valid JSON array.`;
      const text = await callClaude("You are a stakeholder intelligence AI. Return only valid JSON.", prompt, 1000, { action_type: "stakeholder_analysis", tier: tierId });
      incrementActions();
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const newSugs = parsed.filter(s => s.from !== s.to).map((s, i) => ({ ...s, id: `sug-ai-${Date.now()}-${i}` }));
      if (newSugs.length > 0) setAiSuggestions(prev => [...newSugs, ...prev]);
    } catch { /* silent */ }
    setAnalyzingAi(false);
  };

  const addContact = () => {
    if (!newContact.name) return;
    const c = { ...newContact, id: `s-${Date.now()}`, accountId: accountFilter || "d1", lastInteraction: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), interactions: 0, summary: "" };
    setContacts(prev => [...prev, c]);
    setShowAddContact(false);
    setNewContact({ name: "", title: "", email: "", phone: "", linkedin: "", role: "end_user", sentiment: "neutral", influence: 3 });
  };

  const importContacts = () => {
    if (!importText.trim()) return;
    const lines = importText.split("\n").filter(l => l.trim());
    const imported = lines.map((line, i) => {
      const parts = line.split(",").map(s => s.trim());
      return { id: `imp-${Date.now()}-${i}`, name: parts[0] || "Unknown", title: parts[1] || "", email: parts[2] || "", phone: parts[3] || "", linkedin: "", role: parts[4] || "end_user", sentiment: "neutral", influence: 3, accountId: accountFilter || "d1", lastInteraction: "—", interactions: 0, summary: "" };
    });
    setContacts(prev => [...prev, ...imported]);
    setImportText("");
    setTab("list");
  };

  const updateField = (id, field, value) => setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

  const interactions = selected ? generateDemoInteractions(selected.id) : [];

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="🕸️" title="Stakeholder Mapping" color="#8b5cf6"
        bullets={[
          "Visual network graph showing contacts as nodes colored by sentiment (green=advocate, gray=neutral, red=detractor) with node size proportional to influence score. Relationship edges show reporting lines, influence connections, and blockers.",
          "AI auto-update: when meeting transcripts or email data reference contacts, Claude analyzes context and suggests sentiment changes — e.g. 'Dr. Chen expressed frustration about pricing → suggest changing from Neutral to Detractor.'",
          "Full contact profiles with role type (decision maker, champion, blocker, etc.), influence score (1–5), interaction timeline, and AI-generated relationship summaries. Bulk import from CRM contact lists via CSV.",
        ]}
        workflow={[
          "Add contacts manually or bulk import from CRM (CSV)",
          "Map relationships: reporting lines, influence, blockers",
          "View interactive network graph colored by sentiment",
          "AI analyzes meetings/emails and suggests sentiment updates",
        ]}
        outputLabel="Contact Intel"
        outputItems={[
          { icon: "🕸️", text: "Force-directed network graph (SVG)" },
          { icon: "🤖", text: "AI sentiment change suggestions" },
          { icon: "📅", text: "Per-contact interaction timeline" },
          { icon: "📥", text: "Bulk CRM import (CSV)" },
        ]}
        audienceLabel="Node Types"
        audience={[
          { icon: "👔", text: "Decision Maker · Executive Sponsor" },
          { icon: "⭐", text: "Champion · Influencer · End User" },
          { icon: "🚫", text: "Blocker — risk identification" },
        ]}
      />

      {/* Account Filter + Actions Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Account:</label>
          <select value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setSelectedContact(null); }} style={{ ...inputStyle, width: 180, fontSize: 12 }}>
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.company}</option>)}
          </select>
          <span style={{ fontSize: 11, color: "#475569" }}>{filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={runAiAnalysis} disabled={analyzingAi} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)", color: "#a78bfa", cursor: analyzingAi ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            {analyzingAi ? "🤖 Analyzing..." : "🤖 AI Analyze"}
          </button>
          <button onClick={() => setShowAddContact(true)} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, border: `1px solid rgba(16,185,129,0.2)`, background: "rgba(16,185,129,0.06)", color: T.green, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>+ Add Contact</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
        {[{ id: "graph", label: "Network Graph", icon: "🕸️" }, { id: "list", label: "Contact List", icon: "📋" }, { id: "import", label: "CRM Import", icon: "📥" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer",
            background: tab === t.id ? "rgba(139,92,246,0.12)" : "transparent",
            color: tab === t.id ? "#a78bfa" : "#475569", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowAddContact(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", width: 460, animation: "panelIn 0.2s ease" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: T.text, marginBottom: 14 }}>Add Stakeholder</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div><label style={labelStyle}>Name *</label><input value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Title</label><input value={newContact.title} onChange={e => setNewContact(p => ({ ...p, title: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Email</label><input value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} type="email" style={inputStyle} /></div>
              <div><label style={labelStyle}>Phone</label><input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Role</label><select value={newContact.role} onChange={e => setNewContact(p => ({ ...p, role: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>{Object.entries(ROLE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
              <div><label style={labelStyle}>Sentiment</label><select value={newContact.sentiment} onChange={e => setNewContact(p => ({ ...p, sentiment: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>{Object.entries(SENTIMENT_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
              <div><label style={labelStyle}>LinkedIn URL</label><input value={newContact.linkedin} onChange={e => setNewContact(p => ({ ...p, linkedin: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Influence (1–5)</label><input type="range" min="1" max="5" value={newContact.influence} onChange={e => setNewContact(p => ({ ...p, influence: parseInt(e.target.value) }))} style={{ width: "100%" }} /><div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: T.green }}>{newContact.influence}</div></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAddContact(false)} style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={addContact} disabled={!newContact.name} style={{ flex: 1, background: !newContact.name ? T.surface2 : T.green, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 600, cursor: !newContact.name ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>Add Stakeholder</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Graph Tab ─── */}
      {tab === "graph" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
          <div>
            <StakeholderGraph contacts={contacts} relationships={relationships} selectedId={selectedContact} onSelect={setSelectedContact} accountFilter={accountFilter} />
            {/* AI Suggestions (shown below graph) */}
            {aiSuggestions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>🤖 AI Sentiment Suggestions ({aiSuggestions.length})</div>
                {aiSuggestions.map(sug => (
                  <AISuggestionCard key={sug.id} suggestion={sug} onAccept={() => acceptSuggestion(sug)} onDismiss={() => dismissSuggestion(sug.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div>
            {selected ? (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px", position: "sticky", top: 0 }}>
                {/* Contact Header */}
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `rgba(${hexToRgb(SENTIMENT_MAP[selected.sentiment]?.color || "#64748b")},0.15)`, border: `2px solid ${SENTIMENT_MAP[selected.sentiment]?.color || "#64748b"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 16, fontWeight: 700, color: SENTIMENT_MAP[selected.sentiment]?.color }}>{selected.name.split(" ").map(n => n[0]).join("")}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{selected.name}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{selected.title}</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: ROLE_TYPES[selected.role]?.color, background: `rgba(${hexToRgb(ROLE_TYPES[selected.role]?.color || "#64748b")},0.08)`, padding: "2px 8px", borderRadius: 4 }}>{ROLE_TYPES[selected.role]?.icon} {ROLE_TYPES[selected.role]?.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: SENTIMENT_MAP[selected.sentiment]?.color, background: SENTIMENT_MAP[selected.sentiment]?.bg, padding: "2px 8px", borderRadius: 4 }}>{SENTIMENT_MAP[selected.sentiment]?.icon} {SENTIMENT_MAP[selected.sentiment]?.label}</span>
                  </div>
                </div>

                {/* Detail Tabs */}
                <div style={{ display: "flex", gap: 2, marginBottom: 10, background: T.bg, borderRadius: 6, padding: 2 }}>
                  {[{ id: "info", label: "Info" }, { id: "timeline", label: "Timeline" }, { id: "ai", label: "AI" }].map(t => (
                    <button key={t.id} onClick={() => setDetailTab(t.id)} style={{ flex: 1, padding: "5px", borderRadius: 5, border: "none", cursor: "pointer", background: detailTab === t.id ? "rgba(139,92,246,0.1)" : "transparent", color: detailTab === t.id ? "#a78bfa" : "#475569", fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{t.label}</button>
                  ))}
                </div>

                {/* Info tab */}
                {detailTab === "info" && (
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {[
                      { label: "Email", value: selected.email, icon: "✉️" },
                      { label: "Phone", value: selected.phone, icon: "📞" },
                      { label: "LinkedIn", value: selected.linkedin, icon: "🔗" },
                    ].map(f => f.value && (
                      <div key={f.label} style={{ display: "flex", gap: 6, padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
                        <span>{f.icon}</span><div><div style={{ fontSize: 9, color: "#475569" }}>{f.label}</div><div style={{ color: f.label === "LinkedIn" ? "#2D8CFF" : T.text }}>{f.value}</div></div>
                      </div>
                    ))}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div style={{ background: T.bg, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#475569" }}>Influence</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{"●".repeat(selected.influence)}{"○".repeat(5 - selected.influence)}</div>
                      </div>
                      <div style={{ background: T.bg, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#475569" }}>Interactions</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#2D8CFF" }}>{selected.interactions}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 9, color: "#475569" }}>Last interaction: {selected.lastInteraction}</div>
                    {/* Inline editable sentiment + influence */}
                    <div style={{ marginTop: 10, padding: "8px", background: T.bg, borderRadius: 8 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Quick Edit</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <select value={selected.sentiment} onChange={e => updateField(selected.id, "sentiment", e.target.value)} style={{ ...inputStyle, fontSize: 10, padding: "4px 6px", flex: 1 }}>
                          {Object.entries(SENTIMENT_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                        </select>
                        <select value={selected.influence} onChange={e => updateField(selected.id, "influence", parseInt(e.target.value))} style={{ ...inputStyle, fontSize: 10, padding: "4px 6px", width: 60 }}>
                          {[1,2,3,4,5].map(v => <option key={v} value={v}>⬤ {v}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline tab */}
                {detailTab === "timeline" && (
                  <div style={{ maxHeight: 300, overflowY: "auto" }}>
                    {interactions.length === 0 ? (
                      <p style={{ fontSize: 11, color: "#475569", textAlign: "center", padding: 12 }}>No recorded interactions.</p>
                    ) : interactions.map((ix, i) => {
                      const typeIcon = { meeting: "🎙️", email: "✉️", call: "📞", note: "📝", survey: "📊", support_ticket: "🎧" }[ix.type] || "📌";
                      const sentC = SENTIMENT_MAP[ix.sentiment];
                      return (
                        <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <span style={{ fontSize: 12 }}>{typeIcon}</span>
                            {i < interactions.length - 1 && <div style={{ width: 1, flex: 1, background: T.border }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.text }}>{ix.title}</span>
                              <span style={{ fontSize: 9, color: sentC?.color, background: sentC?.bg, padding: "1px 5px", borderRadius: 3 }}>{sentC?.icon}</span>
                            </div>
                            <p style={{ fontSize: 10.5, color: "#94a3b8", lineHeight: 1.4, marginTop: 2 }}>{ix.summary}</p>
                            <span style={{ fontSize: 9, color: "#475569" }}>{ix.date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* AI tab */}
                {detailTab === "ai" && (
                  <div>
                    {selected.summary ? (
                      <div style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>AI RELATIONSHIP SUMMARY</div>
                        <p style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.6 }}>{selected.summary}</p>
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, color: "#475569", textAlign: "center", padding: 12 }}>No AI summary generated yet.</p>
                    )}
                    {aiSuggestions.filter(s => s.contactId === selected.id).map(sug => (
                      <AISuggestionCard key={sug.id} suggestion={sug} onAccept={() => acceptSuggestion(sug)} onDismiss={() => dismissSuggestion(sug.id)} />
                    ))}
                  </div>
                )}

                <button onClick={() => setSelectedContact(null)} style={{ width: "100%", marginTop: 10, fontSize: 11, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px", color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Close Panel</button>
              </div>
            ) : (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "28px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.2 }}>🕸️</div>
                <p style={{ fontSize: 12, color: "#475569" }}>Click a node on the graph to view contact details, timeline, and AI analysis.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── List Tab ─── */}
      {tab === "list" && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{["Contact", "Title", "Role", "Sentiment", "Influence", "Interactions", "Last Contact", "Account"].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", borderBottom: `1px solid ${T.border}`, color: "#475569", fontWeight: 600, background: T.surface2, fontSize: 10, position: "sticky", top: 0 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filteredContacts.map(c => {
                const role = ROLE_TYPES[c.role]; const sent = SENTIMENT_MAP[c.sentiment]; const acct = accountMap[c.accountId];
                return (
                  <tr key={c.id} onClick={() => { setSelectedContact(c.id); setTab("graph"); setDetailTab("info"); }} style={{ cursor: "pointer" }}>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: `rgba(${hexToRgb(sent?.color || "#64748b")},0.12)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: sent?.color, flexShrink: 0 }}>{c.name.split(" ").map(n => n[0]).join("")}</div>
                        <div><div style={{ fontWeight: 600, color: T.text }}>{c.name}</div><div style={{ fontSize: 10, color: "#475569" }}>{c.email}</div></div>
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: "#94a3b8", fontSize: 11 }}>{c.title}</td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}><span style={{ fontSize: 10, fontWeight: 600, color: role?.color, background: `rgba(${hexToRgb(role?.color || "#64748b")},0.08)`, padding: "2px 7px", borderRadius: 4 }}>{role?.icon} {role?.label}</span></td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}><span style={{ fontSize: 10, fontWeight: 600, color: sent?.color, background: sent?.bg, padding: "2px 7px", borderRadius: 4 }}>{sent?.icon} {sent?.label}</span></td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: T.green, fontSize: 12 }}>{"●".repeat(c.influence)}{"○".repeat(5 - c.influence)}</td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: "#2D8CFF", fontWeight: 600 }}>{c.interactions}</td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: "#475569", fontSize: 11 }}>{c.lastInteraction}</td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${T.border}`, color: T.green, fontSize: 11 }}>{acct?.company || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Import Tab ─── */}
      {tab === "import" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Bulk Import from CRM</div>
            <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 12 }}>Paste CSV data below. Format: <code style={{ background: T.surface2, padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>Name, Title, Email, Phone, Role</code></p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={10} placeholder={"Jane Smith, VP Sales, jane@company.com, +1-555-0100, decision_maker\nBob Jones, Engineer, bob@company.com, , end_user\nAlex Kim, CTO, alex@company.com, +1-555-0200, executive_sponsor"} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontFamily: "'DM Mono', monospace", fontSize: 11 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={importContacts} disabled={!importText.trim()} style={{ flex: 1, background: !importText.trim() ? T.surface2 : T.green, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 600, cursor: !importText.trim() ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>📥 Import {importText.trim() ? `(${importText.split("\n").filter(l => l.trim()).length} contacts)` : ""}</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Valid Role Types</div>
              {Object.entries(ROLE_TYPES).map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 6, alignItems: "center", padding: "3px 0", fontSize: 11 }}>
                  <span>{v.icon}</span>
                  <span style={{ color: v.color, fontWeight: 500 }}>{v.label}</span>
                  <span style={{ color: "#334155", fontFamily: "'DM Mono', monospace", fontSize: 9 }}>{k}</span>
                </div>
              ))}
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Import Notes</div>
              <ul style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5, paddingLeft: 16, margin: 0 }}>
                <li>Imported contacts default to Neutral sentiment</li>
                <li>Influence score set to 3/5 (adjustable after)</li>
                <li>Contacts linked to selected account filter</li>
                <li>Duplicate emails not auto-merged</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GUIDED ONBOARDING WIZARD
// ═══════════════════════════════════════════════════════════════════════════
//
// PostgreSQL Schema:
//
// CREATE TABLE user_onboarding (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id UUID NOT NULL UNIQUE,
//   tenant_id UUID NOT NULL,
//   current_step INTEGER DEFAULT 0,       -- 0-4
//   completed_steps JSONB DEFAULT '[]',   -- [0,1,2] etc.
//   step_data JSONB DEFAULT '{}',         -- per-step saved state
//     -- { "0": {crm:"hubspot",connected:true}, "1": {mappings:{...}}, ... }
//   crm_provider TEXT,                    -- hubspot,salesforce,csv,null
//   crm_connected BOOLEAN DEFAULT FALSE,
//   health_weights JSONB DEFAULT '{"usage":30,"support":20,"nps":15,"engagement":20,"billing":15}',
//   activated_playbooks JSONB DEFAULT '[]',
//   invited_members JSONB DEFAULT '[]',
//   is_complete BOOLEAN DEFAULT FALSE,
//   started_at TIMESTAMPTZ DEFAULT NOW(),
//   completed_at TIMESTAMPTZ,
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_uo_user ON user_onboarding(user_id);
// ═══════════════════════════════════════════════════════════════════════════

const ONBOARDING_STEPS = [
  { key: "crm",       title: "Connect CRM",        icon: "🔗", time: "2 min",  desc: "Link your CRM or upload CSV" },
  { key: "import",    title: "Import Customers",    icon: "📥", time: "3 min",  desc: "Bring your customer data in" },
  { key: "health",    title: "Configure Health",    icon: "❤️", time: "2 min",  desc: "Set health score weights" },
  { key: "playbook",  title: "First Playbook",      icon: "⚡", time: "1 min",  desc: "Activate a workflow" },
  { key: "team",      title: "Invite Team",         icon: "👥", time: "1 min",  desc: "Add your CS team" },
];

const SYSTEM_FIELDS = [
  { key: "company_name",   label: "Company Name",    required: true },
  { key: "contact_email",  label: "Contact Email",   required: true },
  { key: "mrr",            label: "MRR ($)",          required: false },
  { key: "contract_start", label: "Contract Start",   required: false },
  { key: "contract_end",   label: "Contract End",     required: false },
  { key: "csm_assigned",   label: "CSM Assigned",     required: false },
];

const OB_PLAYBOOKS = [
  { id: "pb-onboard", name: "90-Day Onboarding", icon: "🚀", color: "#10b981",
    desc: "Guide new customers from sign-up through full adoption with structured 30/60/90-day milestones.",
    steps: ["Send welcome email + kickoff invite", "Day 3: Technical setup & SSO config", "Day 14: Core feature training session", "Day 30: First value check-in", "Day 60: Advanced feature workshop", "Day 90: Success plan review & expand discussion"] },
  { id: "pb-renewal", name: "Renewal Prep", icon: "📋", color: "#f59e0b",
    desc: "Start renewal preparation 90 days before contract end with stakeholder alignment and ROI documentation.",
    steps: ["T-90: Generate usage report & ROI summary", "T-75: Internal renewal risk assessment", "T-60: Schedule exec sponsor check-in", "T-45: Send renewal proposal draft", "T-30: Final negotiation & terms", "T-14: Contract execution & sign-off"] },
  { id: "pb-risk", name: "At-Risk Intervention", icon: "🚨", color: "#ef4444",
    desc: "Automated escalation workflow when health scores drop below threshold or detractor signals emerge.",
    steps: ["Alert: Health score drops below 50", "CSM personal outreach within 24h", "Root cause analysis & action plan", "Executive sponsor engagement", "Weekly recovery check-ins", "Health score recovery confirmation"] },
  { id: "pb-qbr", name: "QBR Schedule", icon: "🎯", color: "#2D8CFF",
    desc: "Quarterly business review scheduling and preparation pipeline for strategic accounts.",
    steps: ["Auto-schedule QBR 30 days before quarter end", "Aggregate data: usage, health, NPS, support", "Generate QBR deck via AI engine", "Send pre-read to stakeholders", "Conduct QBR meeting", "Document action items & follow up"] },
];

// ─── Floating AI Chat Widget ─────────────────────────────────────────────
function OnboardingAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi! I'm here to help with your ProofPoint setup. Ask me anything about connecting your CRM, importing data, or configuring your health scores. 🚀" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { tierId, incrementActions } = useTier();

  useEffect(() => { if (open && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput(""); setLoading(true);
    try {
      const reply = await callClaude(
        "You are a helpful onboarding assistant for ProofPoint, a Customer Success platform. Answer setup questions concisely. The platform has: CRM integration (HubSpot/Salesforce), CSV import with column mapping, health score configuration (Usage/Support/NPS/Engagement/Billing weights), playbook templates (Onboarding/Renewal/At-Risk/QBR), and team invitation with role-based access (Admin/CSM/Viewer). Keep answers under 100 words.",
        userMsg, 400, { action_type: "onboarding_chat", tier: tierId }
      );
      incrementActions();
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't process that. Try asking about CRM setup, data import, health scores, or playbooks!" }]);
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%",
        background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", border: "none", cursor: "pointer",
        boxShadow: "0 4px 20px rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, zIndex: 1100, transition: "transform 0.2s",
      }}>🤖</button>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, width: 340, height: 420, borderRadius: 16,
      background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column", zIndex: 1100, overflow: "hidden", animation: "panelIn 0.2s ease",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.08))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <div><div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Setup Assistant</div><div style={{ fontSize: 10, color: "#475569" }}>Powered by Claude AI</div></div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#475569", padding: 4 }}>✕</button>
      </div>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <div style={{
              padding: "8px 12px", borderRadius: 12, fontSize: 12, lineHeight: 1.5, color: m.role === "user" ? "#fff" : "#94a3b8",
              background: m.role === "user" ? "linear-gradient(135deg, #8b5cf6, #06b6d4)" : T.bg,
              border: m.role === "user" ? "none" : `1px solid ${T.border}`,
            }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ alignSelf: "flex-start", padding: "8px 12px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 12, color: "#475569" }}>Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about setup..." style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "8px 12px" }} />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: loading || !input.trim() ? 0.5 : 1 }}>Send</button>
      </div>
    </div>
  );
}

// ─── Onboarding Progress Bar ─────────────────────────────────────────────
function OnboardingProgress({ step, completedSteps }) {
  const totalMin = ONBOARDING_STEPS.reduce((s, st) => s + parseInt(st.time), 0);
  const doneMin = ONBOARDING_STEPS.filter((_, i) => completedSteps.includes(i)).reduce((s, st) => s + parseInt(st.time), 0);
  const remaining = totalMin - doneMin;
  const pct = completedSteps.length / ONBOARDING_STEPS.length * 100;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{completedSteps.length} of {ONBOARDING_STEPS.length} steps complete</span>
        <span style={{ fontSize: 11, color: "#475569" }}>~{remaining} min remaining</span>
      </div>
      <div style={{ height: 6, background: T.surface2, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #10b981, #06b6d4)", borderRadius: 3, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
        {ONBOARDING_STEPS.map((s, i) => {
          const done = completedSteps.includes(i); const active = i === step;
          return (
            <div key={s.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: done ? 14 : 13,
                background: done ? "rgba(16,185,129,0.12)" : active ? "rgba(139,92,246,0.12)" : T.surface2,
                border: active ? "2px solid #8b5cf6" : done ? `2px solid ${T.green}` : `1px solid ${T.border}`,
                color: done ? T.green : active ? "#a78bfa" : "#475569",
                fontWeight: 700, transition: "all 0.3s",
              }}>{done ? "✓" : s.icon}</div>
              <span style={{ fontSize: 9, color: active ? "#a78bfa" : done ? T.green : "#475569", fontWeight: active ? 700 : 400, textAlign: "center" }}>{s.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Onboarding Wizard ──────────────────────────────────────────────
function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Step 0: CRM
  const [crmProvider, setCrmProvider] = useState(null); // hubspot, salesforce, null
  const [crmConnecting, setCrmConnecting] = useState(false);
  const [crmConnected, setCrmConnected] = useState(false);
  const [csvMode, setCsvMode] = useState(false);

  // Step 1: Import
  const [csvText, setCsvText] = useState("");
  const [csvParsed, setCsvParsed] = useState(null); // { headers:[], rows:[] }
  const [columnMappings, setColumnMappings] = useState({}); // { 0: "company_name", 1: "contact_email", ... }
  const [importDone, setImportDone] = useState(false);
  const [crmSyncCount] = useState(47);

  // Step 2: Health
  const [healthWeights, setHealthWeights] = useState({ usage: 30, support: 20, nps: 15, engagement: 20, billing: 15 });

  // Step 3: Playbook
  const [previewPlaybook, setPreviewPlaybook] = useState(null);
  const [activatedPlaybooks, setActivatedPlaybooks] = useState([]);

  // Step 4: Team
  const [invites, setInvites] = useState([{ email: "", role: "csm" }]);
  const [invitesSent, setInvitesSent] = useState(false);

  const completeStep = (idx) => {
    if (!completedSteps.includes(idx)) setCompletedSteps(prev => [...prev, idx]);
  };

  const nextStep = () => {
    completeStep(step);
    if (step < 4) setStep(step + 1);
    else onComplete();
  };

  const prevStep = () => { if (step > 0) setStep(step - 1); };

  // CRM OAuth simulation
  const connectCRM = async (provider) => {
    setCrmProvider(provider); setCrmConnecting(true);
    await new Promise(r => setTimeout(r, 2000));
    setCrmConnected(true); setCrmConnecting(false);
  };

  // CSV parsing
  const parseCsv = (text) => {
    const lines = text.trim().split("\n").map(l => l.split(",").map(c => c.trim()));
    if (lines.length < 2) return;
    const headers = lines[0]; const rows = lines.slice(1);
    setCsvParsed({ headers, rows });
    // Auto-detect columns
    const auto = {};
    headers.forEach((h, i) => {
      const lower = h.toLowerCase().replace(/[_\s-]/g, "");
      if (lower.includes("company") || lower.includes("name") || lower.includes("account")) auto[i] = "company_name";
      else if (lower.includes("email") || lower.includes("contact")) auto[i] = "contact_email";
      else if (lower.includes("mrr") || lower.includes("revenue") || lower.includes("arr")) auto[i] = "mrr";
      else if (lower.includes("start") || lower.includes("signed")) auto[i] = "contract_start";
      else if (lower.includes("end") || lower.includes("expir") || lower.includes("renewal")) auto[i] = "contract_end";
      else if (lower.includes("csm") || lower.includes("owner") || lower.includes("assigned")) auto[i] = "csm_assigned";
    });
    setColumnMappings(auto);
  };

  // Health score preview calc
  const sampleHealthData = { usage: 72, support: 85, nps: 60, engagement: 68, billing: 95 };
  const previewScore = Math.round(Object.entries(healthWeights).reduce((sum, [k, w]) => sum + (sampleHealthData[k] * w / 100), 0));
  const totalWeight = Object.values(healthWeights).reduce((s, w) => s + w, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; }
        input:focus, textarea:focus, select:focus { border-color: ${T.green} !important; outline: none; }
        input::placeholder, textarea::placeholder { color: #334155; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes panelIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        button { transition: all 0.15s ease; } button:hover { opacity: 0.92; }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'DM Sans', sans-serif", color: T.text, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Header */}
        <div style={{ width: "100%", padding: "20px 28px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(5,11,24,0.8)" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.text }}>Proof<span style={{ color: T.green }}>point</span></span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#475569" }}>Setup Wizard</span>
            <button onClick={onComplete} style={{ fontSize: 11, color: "#475569", background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Skip Setup →</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ width: "100%", maxWidth: 760, padding: "28px 20px", flex: 1 }}>
          <OnboardingProgress step={step} completedSteps={completedSteps} />

          {/* Step Title */}
          <div style={{ marginBottom: 18, animation: "panelIn 0.3s ease" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.text }}>{ONBOARDING_STEPS[step].icon} {ONBOARDING_STEPS[step].title}</h2>
            <p style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>{ONBOARDING_STEPS[step].desc}</p>
          </div>

          {/* ─── Step 0: Connect CRM ─── */}
          {step === 0 && (
            <div style={{ animation: "panelIn 0.3s ease" }}>
              {!csvMode ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                    {/* HubSpot */}
                    <div style={{ background: T.surface, border: `1px solid ${crmProvider === "hubspot" && crmConnected ? T.green + "55" : T.border}`, borderRadius: 14, padding: "24px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🟠</div>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>HubSpot</h3>
                      <p style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>Connect via OAuth 2.0 to sync contacts, companies, and deals.</p>
                      {crmProvider === "hubspot" && crmConnected ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.green, fontSize: 13, fontWeight: 600 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />Connected
                        </div>
                      ) : crmProvider === "hubspot" && crmConnecting ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#f59e0b", fontSize: 12 }}>
                          <span style={{ width: 14, height: 14, border: "2px solid rgba(245,158,11,0.3)", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Authorizing...
                        </div>
                      ) : (
                        <button onClick={() => connectCRM("hubspot")} style={{ background: "#ff7a59", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Connect HubSpot</button>
                      )}
                    </div>
                    {/* Salesforce */}
                    <div style={{ background: T.surface, border: `1px solid ${crmProvider === "salesforce" && crmConnected ? T.green + "55" : T.border}`, borderRadius: 14, padding: "24px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>Salesforce</h3>
                      <p style={{ fontSize: 11, color: "#475569", marginBottom: 14 }}>Connect via OAuth 2.0 to sync accounts, contacts, and opportunities.</p>
                      {crmProvider === "salesforce" && crmConnected ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.green, fontSize: 13, fontWeight: 600 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />Connected
                        </div>
                      ) : crmProvider === "salesforce" && crmConnecting ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#00a1e0", fontSize: 12 }}>
                          <span style={{ width: 14, height: 14, border: "2px solid rgba(0,161,224,0.3)", borderTopColor: "#00a1e0", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />Authorizing...
                        </div>
                      ) : (
                        <button onClick={() => connectCRM("salesforce")} style={{ background: "#00a1e0", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Connect Salesforce</button>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button onClick={() => setCsvMode(true)} style={{ fontSize: 12, color: "#475569", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline" }}>Skip and use CSV import instead →</button>
                  </div>
                </>
              ) : (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>📄</div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>CSV Mode Selected</h3>
                  <p style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>You'll upload your customer data in the next step.</p>
                  <button onClick={() => setCsvMode(false)} style={{ fontSize: 11, color: "#475569", background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back to CRM options</button>
                </div>
              )}
            </div>
          )}

          {/* ─── Step 1: Import Customers ─── */}
          {step === 1 && (
            <div style={{ animation: "panelIn 0.3s ease" }}>
              {crmConnected && !csvMode ? (
                /* CRM Sync Mode */
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 24 }}>{crmProvider === "hubspot" ? "🟠" : "☁️"}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{crmProvider === "hubspot" ? "HubSpot" : "Salesforce"} Sync</div>
                      <div style={{ fontSize: 11, color: T.green, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />Connected
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {[{ label: "Companies", count: crmSyncCount }, { label: "Contacts", count: 132 }, { label: "Deals", count: 28 }].map(s => (
                      <div key={s.label} style={{ background: T.bg, borderRadius: 8, padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: T.green }}>{s.count}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>{s.label} found</div>
                      </div>
                    ))}
                  </div>
                  {importDone ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, background: "rgba(16,185,129,0.06)", borderRadius: 8, border: `1px solid ${T.green}33` }}>
                      <span style={{ color: T.green, fontWeight: 600, fontSize: 13 }}>✓ {crmSyncCount} accounts synced successfully</span>
                    </div>
                  ) : (
                    <button onClick={() => { setImportDone(true); }} style={{ width: "100%", background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Sync {crmSyncCount} Accounts Now</button>
                  )}
                </div>
              ) : (
                /* CSV Upload Mode */
                <div>
                  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>CSV Upload</div>
                    <textarea value={csvText} onChange={e => { setCsvText(e.target.value); if (e.target.value.trim()) parseCsv(e.target.value); else setCsvParsed(null); }} rows={6}
                      placeholder={"Company Name, Contact Email, MRR, Contract Start, Contract End, CSM\nAcme Corp, jane@acme.com, 12500, 2025-06-01, 2026-06-01, Sarah R.\nGlobal Tech, bob@global.tech, 8400, 2025-09-15, 2026-09-15, Marcus K."}
                      style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontFamily: "'DM Mono', monospace", fontSize: 11 }} />
                  </div>

                  {/* Column Mapping UI */}
                  {csvParsed && (
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.08em" }}>Column Mapping — {csvParsed.rows.length} rows detected</div>
                        {Object.values(columnMappings).length > 0 && <span style={{ fontSize: 10, color: T.green, fontWeight: 600 }}>✓ Auto-detected {Object.values(columnMappings).length} fields</span>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px 12px", alignItems: "center" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#475569" }}>CSV COLUMN</div>
                        <div />
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#475569" }}>SYSTEM FIELD</div>
                        {csvParsed.headers.map((header, i) => (
                          <React.Fragment key={i}>
                            <div style={{ padding: "6px 10px", background: T.bg, borderRadius: 6, fontSize: 12, color: T.text, fontFamily: "'DM Mono', monospace" }}>{header}</div>
                            <span style={{ color: "#475569", fontSize: 12 }}>→</span>
                            <select value={columnMappings[i] || ""} onChange={e => setColumnMappings(prev => ({ ...prev, [i]: e.target.value || undefined }))} style={{ ...inputStyle, fontSize: 11, padding: "6px 8px", cursor: "pointer", border: columnMappings[i] ? `1px solid ${T.green}44` : `1px solid ${T.border}` }}>
                              <option value="">— skip —</option>
                              {SYSTEM_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>)}
                            </select>
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Data Preview */}
                      {csvParsed.rows.length > 0 && (
                        <div style={{ marginTop: 12, maxHeight: 120, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                            <thead>
                              <tr>{csvParsed.headers.map((h, i) => <th key={i} style={{ padding: "5px 8px", textAlign: "left", borderBottom: `1px solid ${T.border}`, color: columnMappings[i] ? T.green : "#475569", background: T.surface2, fontWeight: 600, fontSize: 9 }}>{columnMappings[i] ? SYSTEM_FIELDS.find(f => f.key === columnMappings[i])?.label : h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {csvParsed.rows.slice(0, 3).map((row, r) => (
                                <tr key={r}>{row.map((cell, c) => <td key={c} style={{ padding: "4px 8px", borderBottom: `1px solid ${T.border}`, color: "#94a3b8" }}>{cell}</td>)}</tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {!importDone ? (
                        <button onClick={() => setImportDone(true)} disabled={!Object.values(columnMappings).includes("company_name")} style={{
                          width: "100%", marginTop: 14, background: !Object.values(columnMappings).includes("company_name") ? T.surface2 : T.green,
                          color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 600,
                          cursor: !Object.values(columnMappings).includes("company_name") ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif",
                        }}>📥 Import {csvParsed.rows.length} Accounts</button>
                      ) : (
                        <div style={{ marginTop: 14, padding: 12, background: "rgba(16,185,129,0.06)", borderRadius: 8, border: `1px solid ${T.green}33`, textAlign: "center" }}>
                          <span style={{ color: T.green, fontWeight: 600, fontSize: 13 }}>✓ {csvParsed.rows.length} accounts imported successfully</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── Step 2: Configure Health Scores ─── */}
          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 14, animation: "panelIn 0.3s ease" }}>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#ec4899", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Health Score Weights {totalWeight !== 100 && <span style={{ color: T.error, marginLeft: 8 }}>⚠ Total: {totalWeight}% (must be 100%)</span>}</div>
                {Object.entries(healthWeights).map(([key, value]) => {
                  const colors = { usage: "#2D8CFF", support: "#06b6d4", nps: "#10b981", engagement: "#f59e0b", billing: "#8b5cf6" };
                  const labels = { usage: "Usage", support: "Support", nps: "NPS", engagement: "Engagement", billing: "Billing" };
                  return (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: colors[key] }}>{labels[key]}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{value}%</span>
                      </div>
                      <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
                        <div style={{ position: "absolute", height: 6, width: "100%", background: T.surface2, borderRadius: 3 }}>
                          <div style={{ height: "100%", width: `${value}%`, background: colors[key], borderRadius: 3, transition: "width 0.15s" }} />
                        </div>
                        <input type="range" min="0" max="50" value={value} onChange={e => setHealthWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) }))} style={{ position: "relative", width: "100%", opacity: 0, cursor: "pointer", height: 24 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#475569" }}>Sample: {sampleHealthData[key]}/100</div>
                    </div>
                  );
                })}
              </div>

              {/* Preview Score */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 10 }}>Preview Score</div>
                  <div style={{ fontSize: 48, fontWeight: 700, color: healthTier(previewScore).color, lineHeight: 1 }}>{previewScore}</div>
                  <div style={{ fontSize: 12, color: healthTier(previewScore).color, fontWeight: 600, marginTop: 4 }}>{healthTier(previewScore).label}</div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>Based on sample data</div>
                </div>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 8 }}>Breakdown</div>
                  {Object.entries(healthWeights).map(([k, w]) => {
                    const labels = { usage: "Usage", support: "Support", nps: "NPS", engagement: "Engagement", billing: "Billing" };
                    const contrib = Math.round(sampleHealthData[k] * w / 100);
                    return (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", padding: "3px 0" }}>
                        <span>{labels[k]} ({sampleHealthData[k]} × {w}%)</span>
                        <span style={{ fontWeight: 600, color: T.text }}>{contrib}</span>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: T.green, padding: "6px 0 0", borderTop: `1px solid ${T.border}`, marginTop: 4 }}>
                    <span>Total</span><span>{previewScore}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3: First Playbook ─── */}
          {step === 3 && (
            <div style={{ animation: "panelIn 0.3s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {OB_PLAYBOOKS.map(pb => {
                  const activated = activatedPlaybooks.includes(pb.id);
                  const previewing = previewPlaybook === pb.id;
                  return (
                    <div key={pb.id} style={{
                      background: T.surface, border: `1px solid ${activated ? T.green + "55" : previewing ? pb.color + "44" : T.border}`,
                      borderRadius: 14, padding: "18px", transition: "border-color 0.2s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{pb.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{pb.name}</span>
                        </div>
                        {activated && <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: "rgba(16,185,129,0.08)", padding: "2px 8px", borderRadius: 4 }}>✓ Active</span>}
                      </div>
                      <p style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.5, marginBottom: 10 }}>{pb.desc}</p>

                      {previewing && (
                        <div style={{ background: T.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                          {pb.steps.map((s, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 11, color: "#94a3b8" }}>
                              <span style={{ color: pb.color, fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{i + 1}.</span>
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setPreviewPlaybook(previewing ? null : pb.id)} style={{
                          flex: 1, fontSize: 11, padding: "7px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                          background: "transparent", border: `1px solid ${T.border}`, color: "#475569",
                        }}>{previewing ? "Hide Steps" : "Preview Steps"}</button>
                        {!activated ? (
                          <button onClick={() => setActivatedPlaybooks(prev => [...prev, pb.id])} style={{
                            flex: 1, fontSize: 11, padding: "7px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                            background: pb.color, border: "none", color: "#fff",
                          }}>⚡ Activate</button>
                        ) : (
                          <button onClick={() => setActivatedPlaybooks(prev => prev.filter(p => p !== pb.id))} style={{
                            flex: 1, fontSize: 11, padding: "7px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                            background: "transparent", border: `1px solid ${T.border}`, color: "#475569",
                          }}>Deactivate</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Step 4: Invite Team ─── */}
          {step === 4 && (
            <div style={{ animation: "panelIn 0.3s ease" }}>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#2D8CFF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Team Invitations</div>
                {invites.map((inv, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <input value={inv.email} onChange={e => setInvites(prev => prev.map((p, j) => j === i ? { ...p, email: e.target.value } : p))} placeholder="colleague@company.com" type="email" style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
                    <select value={inv.role} onChange={e => setInvites(prev => prev.map((p, j) => j === i ? { ...p, role: e.target.value } : p))} style={{ ...inputStyle, width: 120, fontSize: 12, cursor: "pointer" }}>
                      <option value="admin">👑 Admin</option>
                      <option value="csm">👤 CSM</option>
                      <option value="viewer">👁️ Viewer</option>
                    </select>
                    {invites.length > 1 && (
                      <button onClick={() => setInvites(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#ef4444", padding: "4px" }}>✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setInvites(prev => [...prev, { email: "", role: "csm" }])} style={{ fontSize: 11, color: "#475569", background: "none", border: `1px dashed ${T.border}`, borderRadius: 8, padding: "8px", width: "100%", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 14 }}>+ Add another team member</button>

                {invitesSent ? (
                  <div style={{ padding: 14, background: "rgba(16,185,129,0.06)", borderRadius: 10, border: `1px solid ${T.green}33`, textAlign: "center" }}>
                    <span style={{ color: T.green, fontWeight: 600, fontSize: 14 }}>✓ {invites.filter(i => i.email).length} invite{invites.filter(i => i.email).length !== 1 ? "s" : ""} sent!</span>
                    <p style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Team members will receive an email with setup instructions.</p>
                  </div>
                ) : (
                  <button onClick={() => setInvitesSent(true)} disabled={!invites.some(i => i.email)} style={{
                    width: "100%", background: !invites.some(i => i.email) ? T.surface2 : "linear-gradient(135deg, #2D8CFF, #06b6d4)",
                    color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600,
                    cursor: !invites.some(i => i.email) ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>📧 Send Invites</button>
                )}

                {/* Role descriptions */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                  {[
                    { role: "Admin", icon: "👑", desc: "Full access, billing, user management", color: "#f59e0b" },
                    { role: "CSM", icon: "👤", desc: "Manage accounts, run playbooks, view reports", color: "#10b981" },
                    { role: "Viewer", icon: "👁️", desc: "Read-only dashboards and reports", color: "#64748b" },
                  ].map(r => (
                    <div key={r.role} style={{ background: T.bg, borderRadius: 8, padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, marginBottom: 2 }}>{r.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: r.color }}>{r.role}</div>
                      <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <button onClick={prevStep} disabled={step === 0} style={{
              fontSize: 13, padding: "10px 24px", borderRadius: 10, cursor: step === 0 ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              background: "transparent", border: `1px solid ${T.border}`, color: step === 0 ? "#334155" : "#475569",
              opacity: step === 0 ? 0.4 : 1,
            }}>← Previous</button>
            <button onClick={nextStep} style={{
              fontSize: 13, padding: "10px 28px", borderRadius: 10, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
              background: step === 4 ? "linear-gradient(135deg, #10b981, #06b6d4)" : T.green,
              border: "none", color: "#fff",
              boxShadow: step === 4 ? "0 4px 20px rgba(16,185,129,0.25)" : "none",
            }}>{step === 4 ? "🚀 Launch ProofPoint" : `Continue →`}</button>
          </div>
        </div>
      </div>

      {/* Floating AI Chat */}
      <OnboardingAIChat />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL CENTER PANEL — AI-drafted emails with 8 templates & SendGrid
// ═══════════════════════════════════════════════════════════════════════════

const EMAIL_TEMPLATES = [
  { id: "check-in", label: "Check-in", icon: "👋", desc: "Regular touchpoint to gauge satisfaction", tone: "warm", subject: "Checking In — How's Everything Going?" },
  { id: "renewal-reminder", label: "Renewal Reminder", icon: "🔄", desc: "Proactive renewal conversation starter", tone: "professional", subject: "Your Renewal is Coming Up — Let's Connect" },
  { id: "qbr-invite", label: "QBR Invite", icon: "📊", desc: "Quarterly business review scheduling", tone: "professional", subject: "Let's Review Your Q{quarter} Results" },
  { id: "at-risk-outreach", label: "At-Risk Outreach", icon: "⚠️", desc: "Re-engagement for disengaged accounts", tone: "consultative", subject: "We Want to Make Sure You're Getting Full Value" },
  { id: "onboarding-followup", label: "Onboarding Follow-up", icon: "🚀", desc: "Post-onboarding adoption check", tone: "warm", subject: "How's Your First {period} Going?" },
  { id: "feature-announcement", label: "Feature Announcement", icon: "✨", desc: "New capability relevant to account", tone: "direct", subject: "New Feature Alert: {feature} is Live" },
  { id: "expansion-proposal", label: "Expansion Proposal", icon: "📈", desc: "Upsell or cross-sell conversation", tone: "consultative", subject: "An Idea to Drive Even More Value" },
  { id: "escalation-response", label: "Escalation Response", icon: "🛡️", desc: "Response to reported issues", tone: "professional", subject: "Update on Your Recent Concern" },
];

const EMAIL_TONES = [
  { id: "professional", label: "Professional", desc: "Formal, business-appropriate" },
  { id: "warm", label: "Warm", desc: "Friendly, relationship-focused" },
  { id: "direct", label: "Direct", desc: "Concise, action-oriented" },
  { id: "consultative", label: "Consultative", desc: "Advisory, thought-leadership" },
];

function EmailCenterPanel({ accounts }) {
  const [activeTab, setActiveTab] = useState("compose");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedTone, setSelectedTone] = useState("professional");
  const [customContext, setCustomContext] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [sentEmails, setSentEmails] = useState([
    { id: "demo1", template: "check-in", account: "Acme Health", to: "sarah.johnson@acmehealth.com", subject: "Checking In — How's Everything Going?", sentAt: "Feb 28, 2026 2:30 PM", status: "delivered", opens: 2, clicks: 1 },
    { id: "demo2", template: "renewal-reminder", account: "PinPoint Financial", to: "david.chen@pinpoint.io", subject: "Your Renewal is Coming Up — Let's Connect", sentAt: "Feb 27, 2026 10:15 AM", status: "opened", opens: 5, clicks: 3 },
    { id: "demo3", template: "qbr-invite", account: "TalentForge", to: "marcus.w@talentforge.com", subject: "Let's Review Your Q1 Results", sentAt: "Feb 25, 2026 9:00 AM", status: "clicked", opens: 3, clicks: 2 },
  ]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { tierId, incrementActions } = useTier();

  const account = accounts.find(a => a.id === selectedAccount);

  function buildContextPayload(acct) {
    if (!acct) return "";
    return [
      `Company: ${acct.company}`, `Industry: ${acct.industry}`, `Contact: ${acct.contact || "N/A"}`,
      `MRR: ${acct.mrr || "N/A"}`, `Status: ${acct.status}`, `Renewal In: ${acct.renewalIn} days`,
      `Assigned To: ${TEAM_MEMBERS.find(t => t.id === acct.assignedTo)?.name || "Unassigned"}`,
      acct.preview ? `Recent Context: ${acct.preview.slice(0, 200)}` : "",
    ].filter(Boolean).join("\n");
  }

  async function generateEmail() {
    if (!selectedTemplate || !selectedAccount) return;
    setIsGenerating(true);
    setGeneratedEmail(null);
    const tmpl = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);
    const tone = EMAIL_TONES.find(t => t.id === selectedTone);
    const context = buildContextPayload(account);
    const system = `You are an expert Customer Success email writer. Write a ${tone.label.toLowerCase()} email using the "${tmpl.label}" template style. ${tone.desc}. Keep under 200 words. Be specific to the account context. No markdown — plain text paragraphs only. Sign off as the assigned CSM.`;
    const userMsg = `Template: ${tmpl.label} — ${tmpl.desc}\nTone: ${tone.label}\nAccount Context:\n${context}\n${customContext ? `Additional Context: ${customContext}` : ""}\n\nGenerate the email body only (no subject line). Be specific, reference real details from the account context.`;
    try {
      const result = await callClaude(system, userMsg, 800, { action_type: "email_draft", tier: tierId });
      incrementActions();
      const subj = tmpl.subject.replace("{quarter}", "Q1").replace("{period}", "30 Days").replace("{feature}", "Smart Alerts");
      setGeneratedEmail({ subject: subj, body: result });
      setEditedSubject(subj);
      setEditedBody(result);
    } catch (e) { setGeneratedEmail({ subject: "Error", body: "Failed to generate email. Please try again." }); }
    setIsGenerating(false);
  }

  async function sendEmail() {
    setSendingEmail(true);
    await new Promise(r => setTimeout(r, 1500));
    const newSent = {
      id: `sent-${Date.now()}`, template: selectedTemplate, account: account?.company || "",
      to: `${(account?.contact || "contact").toLowerCase().replace(/\s+/g, ".")}@${(account?.company || "company").toLowerCase().replace(/\s+/g, "")}.com`,
      subject: editedSubject, sentAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
      status: "delivered", opens: 0, clicks: 0,
    };
    setSentEmails(prev => [newSent, ...prev]);
    setSendingEmail(false); setShowConfirm(false); setGeneratedEmail(null); setSelectedTemplate(null); setCustomContext(""); setActiveTab("history");
  }

  const tabs = [{ id: "compose", label: "Compose", icon: "✏️" }, { id: "history", label: "Sent History", icon: "📬" }, { id: "templates", label: "Templates", icon: "📋" }, { id: "analytics", label: "Analytics", icon: "📈" }];
  const statusColors = { delivered: "#06b6d4", opened: "#10b981", clicked: "#8b5cf6", bounced: "#ef4444" };

  return (
    <div style={{ animation: "panelIn 0.25s ease" }}>
      <FeatureExplainer
        icon="✉️" title="Email Center" color="#8b5cf6"
        bullets={[
          "AI-generates fully personalized customer emails from templates — check-ins, renewal reminders, QBR invites, and more — tailored to each account's real data and health signals.",
          "Choose a template, select an account, pick the tone (professional, friendly, urgent, executive), and get a ready-to-send email in seconds.",
          "Track sent email history with delivery status, open rates, and click-through metrics to measure engagement effectiveness.",
        ]}
        workflow={[
          "Choose a template style and select the target account",
          "Pick a tone and add any additional context or special notes",
          "AI generates the email body using real account data and signals",
          "Review, edit, then send — with full delivery tracking in the history tab",
        ]}
        outputLabel="What You Get"
        outputItems={[
          { icon: "📝", text: "AI-drafted email personalized to account context" },
          { icon: "📬", text: "Delivery tracking — opens, clicks, and status" },
          { icon: "📋", text: "Template library for common CS touchpoints" },
          { icon: "📈", text: "Analytics on email engagement over time" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "👤", text: "CSMs who need thoughtful emails at scale" },
          { icon: "⏱️", text: "Teams saving time on repetitive email drafting" },
          { icon: "🎯", text: "Managers tracking team outreach effectiveness" },
        ]}
      />
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: activeTab === tab.id ? T.green : "transparent", color: activeTab === tab.id ? "#fff" : T.muted, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><span>{tab.icon}</span>{tab.label}</button>
        ))}
      </div>

      {activeTab === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: generatedEmail ? "1fr 1fr" : "1fr", gap: 20 }}>
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>1. Choose Template</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 6 }}>
                {EMAIL_TEMPLATES.map(tmpl => (
                  <button key={tmpl.id} onClick={() => setSelectedTemplate(tmpl.id)} style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${selectedTemplate === tmpl.id ? T.green : T.border}`, background: selectedTemplate === tmpl.id ? `rgba(${hexToRgb(T.green)},0.08)` : T.surface2, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                    <div style={{ fontSize: 15, marginBottom: 3 }}>{tmpl.icon}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: selectedTemplate === tmpl.id ? T.green : T.text }}>{tmpl.label}</div>
                    <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{tmpl.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>2. Select Account</label><select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}><option value="">Choose account...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.company}</option>)}</select></div>
              <div><label style={labelStyle}>3. Email Tone</label><select value={selectedTone} onChange={e => setSelectedTone(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>{EMAIL_TONES.map(t => <option key={t.id} value={t.id}>{t.label} — {t.desc}</option>)}</select></div>
            </div>
            <div style={{ marginBottom: 16 }}><label style={labelStyle}>4. Additional Context (optional)</label><textarea value={customContext} onChange={e => setCustomContext(e.target.value)} placeholder="e.g., They mentioned budget concerns last call, focus on ROI..." rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
            <button onClick={generateEmail} disabled={!selectedTemplate || !selectedAccount || isGenerating} style={{ width: "100%", padding: "13px 24px", borderRadius: 10, border: "none", background: (!selectedTemplate || !selectedAccount) ? T.border : T.green, color: "#fff", fontSize: 14, fontWeight: 600, cursor: (!selectedTemplate || !selectedAccount) ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isGenerating ? 0.7 : 1 }}>
              {isGenerating ? <><div style={{ width: 16, height: 16, border: "2px solid #fff3", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />Generating...</> : <>✦ Generate Email</>}
            </button>
          </div>
          {generatedEmail && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, animation: "panelIn 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.08em" }}>Preview & Edit</div>
                <button onClick={generateEmail} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↻ Regenerate</button>
              </div>
              {account && <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>To: <span style={{ color: T.subtle }}>{(account.contact || "Contact").toLowerCase().replace(/\s+/g, ".")}@{account.company.toLowerCase().replace(/\s+/g, "")}.com</span></div>}
              <div style={{ marginBottom: 12 }}><label style={{ ...labelStyle, fontSize: 10 }}>Subject</label><input value={editedSubject} onChange={e => setEditedSubject(e.target.value)} style={inputStyle} /></div>
              <div style={{ marginBottom: 16 }}><label style={{ ...labelStyle, fontSize: 10 }}>Body</label><textarea value={editedBody} onChange={e => setEditedBody(e.target.value)} rows={12} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`)} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface2, color: T.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>📋 Copy</button>
                <button onClick={() => setShowConfirm(true)} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: T.green, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>📤 Send via SendGrid</button>
              </div>
              {showConfirm && (
                <div style={{ marginTop: 12, background: `rgba(${hexToRgb(T.green)},0.06)`, border: `1px solid ${T.green}33`, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Confirm Send</div>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>This will send the email via SendGrid to {account?.contact || "the contact"} at {account?.company}.</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "8px 14px", borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                    <button onClick={sendEmail} disabled={sendingEmail} style={{ flex: 1, padding: "8px 14px", borderRadius: 6, border: "none", background: T.green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: sendingEmail ? 0.7 : 1 }}>{sendingEmail ? "Sending..." : "Confirm & Send"}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div>{sentEmails.length === 0 ? <div style={{ textAlign: "center", padding: 60, color: T.muted }}><div style={{ fontSize: 32, marginBottom: 12 }}>📭</div><div style={{ fontSize: 14 }}>No emails sent yet.</div></div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sentEmails.map(email => (
              <div key={email.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 20 }}>{EMAIL_TEMPLATES.find(t => t.id === email.template)?.icon || "✉️"}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{email.subject}</div><div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>To: {email.to} · {email.account} · {email.sentAt}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{email.opens}</div><div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase" }}>Opens</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{email.clicks}</div><div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase" }}>Clicks</div></div>
                  <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: `${statusColors[email.status] || T.muted}18`, color: statusColors[email.status] || T.muted }}>{email.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}</div>
      )}

      {activeTab === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {EMAIL_TEMPLATES.map(tmpl => (
            <div key={tmpl.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ fontSize: 24 }}>{tmpl.icon}</div><div><div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{tmpl.label}</div><div style={{ fontSize: 11, color: T.muted }}>{tmpl.desc}</div></div></div>
              <div style={{ fontSize: 11, color: T.subtle, marginBottom: 8 }}>Default Tone: <span style={{ color: T.green, fontWeight: 600 }}>{EMAIL_TONES.find(t => t.id === tmpl.tone)?.label}</span></div>
              <div style={{ fontSize: 11, color: "#334155" }}>Subject: <span style={{ color: T.muted, fontStyle: "italic" }}>{tmpl.subject}</span></div>
              <button onClick={() => { setSelectedTemplate(tmpl.id); setActiveTab("compose"); }} style={{ marginTop: 12, padding: "7px 14px", borderRadius: 6, border: `1px solid ${T.green}44`, background: `rgba(${hexToRgb(T.green)},0.06)`, color: T.green, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Use Template →</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "analytics" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Sent", value: sentEmails.length, icon: "📤", color: T.info },
              { label: "Open Rate", value: sentEmails.length ? Math.round((sentEmails.filter(e => e.opens > 0).length / sentEmails.length) * 100) + "%" : "—", icon: "👁", color: T.green },
              { label: "Click Rate", value: sentEmails.length ? Math.round((sentEmails.filter(e => e.clicks > 0).length / sentEmails.length) * 100) + "%" : "—", icon: "🖱", color: T.purple },
              { label: "Avg Opens", value: sentEmails.length ? (sentEmails.reduce((s, e) => s + e.opens, 0) / sentEmails.length).toFixed(1) : "—", icon: "📊", color: T.warning },
            ].map(stat => (
              <div key={stat.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.icon}</div>
                <div style={{ fontSize: 22, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em", marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Performance by Template</div>
            {EMAIL_TEMPLATES.map(tmpl => {
              const tmplEmails = sentEmails.filter(e => e.template === tmpl.id);
              return (
                <div key={tmpl.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${T.border}22` }}>
                  <span style={{ fontSize: 16 }}>{tmpl.icon}</span>
                  <div style={{ flex: 1, fontSize: 12.5, color: T.text }}>{tmpl.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, width: 60, textAlign: "right" }}>{tmplEmails.length} sent</div>
                  <div style={{ fontSize: 11, color: T.green, width: 60, textAlign: "right" }}>{tmplEmails.reduce((s, e) => s + e.opens, 0)} opens</div>
                  <div style={{ fontSize: 11, color: T.purple, width: 60, textAlign: "right" }}>{tmplEmails.reduce((s, e) => s + e.clicks, 0)} clicks</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC PAGES — Landing, Signup, Login, Blog, Terms, Privacy
// ═══════════════════════════════════════════════════════════════════════════

function TopNav({ onNavigate }) {
  const [hovered, setHovered] = useState(null);
  return (
    <nav style={{ padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}44`, background: "rgba(5,11,24,0.85)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
      <button onClick={() => onNavigate("landing")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.text, letterSpacing: -0.5, padding: 0 }}>Proof<span style={{ color: T.green }}>point</span></button>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {[{ id: "landing", label: "Home" }, { id: "blog", label: "Blog" }].map(link => (
          <button key={link.id} onClick={() => onNavigate(link.id)} onMouseEnter={() => setHovered(link.id)} onMouseLeave={() => setHovered(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, color: hovered === link.id ? T.text : T.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, padding: "4px 0", transition: "color 0.2s" }}>{link.label}</button>
        ))}
        <button onClick={() => onNavigate("login")} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Log In</button>
        <button onClick={() => onNavigate("signup")} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: T.green, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 0 20px rgba(16,185,129,0.25)" }}>Start Free Trial</button>
      </div>
    </nav>
  );
}

function LandingPage({ onNavigate }) {
  const [hf, setHf] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: T.text }}>
      <section style={{ padding: "100px 40px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 900, height: 500, background: "radial-gradient(ellipse at center, rgba(16,185,129,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, border: `1px solid ${T.green}33`, background: `rgba(${hexToRgb(T.green)},0.06)`, fontSize: 12, fontWeight: 600, color: T.green, marginBottom: 28, letterSpacing: "0.04em" }}>✦ AI-Powered Customer Success Intelligence</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 700, lineHeight: 1.15, marginBottom: 22 }}>Turn Customer Metrics Into <em style={{ fontStyle: "italic", color: T.green }}>Undeniable</em> ROI Proof</h1>
          <p style={{ fontSize: 17, color: T.muted, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 36px" }}>Proofpoint generates executive-ready ROI reports with industry benchmarks, AI-driven next actions, and customer-facing proof documents that make renewals effortless.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            <button onClick={() => onNavigate("signup")} style={{ padding: "14px 32px", borderRadius: 10, border: "none", background: T.green, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 0 30px rgba(16,185,129,0.3)" }}>Start 30-Day Free Trial</button>
            <button onClick={() => onNavigate("sandbox")} style={{ padding: "14px 28px", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.text, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Try Sandbox →</button>
          </div>
          <p style={{ fontSize: 12, color: "#334155", marginTop: 14 }}>No credit card required · 30-day trial · Cancel anytime</p>
        </div>
      </section>

      <section style={{ padding: "20px 40px", borderTop: `1px solid ${T.border}22`, borderBottom: `1px solid ${T.border}22`, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Trusted by Customer Success teams at innovative SaaS companies</div>
      </section>

      <section style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, marginBottom: 14 }}>23 Tools, One <span style={{ color: T.green }}>Platform</span></h2>
          <p style={{ fontSize: 15, color: T.muted, maxWidth: 500, margin: "0 auto" }}>Everything a Customer Success team needs to prove value, prevent churn, and drive expansion.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { icon: "📊", title: "Custom Dashboard", desc: "Configurable widgets with auto-refresh, team leaderboards, and revenue charts" },
            { icon: "🗂", title: "Account Portfolio", desc: "Full CRUD with CSV import, 8 lifecycle statuses, team assignment, and search" },
            { icon: "❤️", title: "Health Score Engine", desc: "AI-powered scoring with configurable signal weights and trend analysis" },
            { icon: "⚡", title: "Playbook Automation", desc: "6 pre-built templates with trigger-action workflows and execution simulation" },
            { icon: "🎙", title: "Meeting Intelligence", desc: "Transcript analysis, sentiment detection, action item extraction" },
            { icon: "📋", title: "NPS / CSAT Surveys", desc: "Multi-language surveys with score histograms and trend analysis" },
            { icon: "👥", title: "Stakeholder Mapping", desc: "Visual relationship graph with AI-powered sentiment and influence analysis" },
            { icon: "📈", title: "QBR Deck Generator", desc: "Automated quarterly business review decks with data aggregation" },
            { icon: "✉️", title: "Email Center", desc: "8 AI templates, 4 tones, SendGrid delivery with open/click tracking" },
            { icon: "✦", title: "ROI Report Generator", desc: "5 industries × 3 formats with benchmark citations and scorecard" },
            { icon: "🎯", title: "Next Action Intelligence", desc: "AI-driven recommendations that explain what actions change outcomes" },
            { icon: "💰", title: "CS ROI Calculator", desc: "VP/Director-level program justification with before/after projections" },
          ].map((f, i) => (
            <div key={i} onMouseEnter={() => setHf(i)} onMouseLeave={() => setHf(null)} style={{ background: hf === i ? T.surface2 : T.surface, border: `1px solid ${hf === i ? T.green + "33" : T.border}`, borderRadius: 12, padding: "22px 20px", transition: "all 0.2s", cursor: "default" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "80px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, marginBottom: 50 }}>How It <span style={{ color: T.green }}>Works</span></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
            {[
              { step: "01", title: "Connect Your Data", desc: "Import accounts via CSV or connect your CRM. The onboarding wizard maps your fields automatically." },
              { step: "02", title: "Generate AI Reports", desc: "Choose an industry, input metrics, and get benchmark-driven ROI narratives your champions can forward to their CFO." },
              { step: "03", title: "Act on Intelligence", desc: "Next Action recommendations tell you exactly what to do — and why it will change the outcome." },
            ].map(s => (
              <div key={s.step}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: `rgba(${hexToRgb(T.green)},0.1)`, border: `2px solid ${T.green}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: T.green }}>{s.step}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" style={{ padding: "80px 40px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, marginBottom: 14 }}>Simple <span style={{ color: T.green }}>Pricing</span></h2>
          <p style={{ fontSize: 15, color: T.muted, marginBottom: 20 }}>Start free. Upgrade when you're ready.</p>
          <div style={{ display: "inline-flex", background: T.surface2, borderRadius: 8, border: `1px solid ${T.border}`, padding: 2 }}>
            {[false, true].map(annual => (
              <button key={annual ? "a" : "m"} onClick={() => setIsAnnual(annual)} style={{ background: isAnnual === annual ? T.green : "transparent", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 12.5, fontWeight: isAnnual === annual ? 600 : 400, color: isAnnual === annual ? "#fff" : T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{annual ? "Annual (save 15%)" : "Monthly"}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
          {[
            { plan: "Starter", price: isAnnual ? 33 : 39, desc: "For individual CSMs", seats: "1–5 seats", accounts: "100 accounts", ai: "500 actions/seat/mo", model: "Haiku (Fast)", features: ["Health scoring (basic)", "3 playbook templates", "3 email templates", "ROI calculator", "Report generator", "Activity timeline"], cta: "Start Free Trial" },
            { plan: "Growth", price: isAnnual ? 67 : 79, desc: "For growing CS teams", seats: "5–15 seats", accounts: "300 accounts", ai: "1,000 actions/seat/mo", model: "Sonnet (Balanced)", features: ["Everything in Starter", "Meeting intelligence", "NPS/CSAT surveys", "QBR deck generation", "Churn prediction AI", "CRM integrations", "Team performance", "Revenue dashboard"], cta: "Start Free Trial", featured: true },
            { plan: "Scale", price: isAnnual ? 99 : 119, desc: "For enterprise CS orgs", seats: "10–25+ seats", accounts: "Unlimited", ai: "2,000 actions/seat/mo", model: "Opus (Premium)", features: ["Everything in Growth", "AI agents", "Coaching analytics", "API access", "Dedicated CSM", "Custom integrations"], cta: "Start Free Trial" },
          ].map(p => (
            <div key={p.plan} style={{ background: p.featured ? T.surface2 : T.surface, border: `1px solid ${p.featured ? T.green + "44" : T.border}`, borderRadius: 16, padding: "28px 24px", position: "relative" }}>
              {p.featured && <div style={{ position: "absolute", top: -10, right: 20, padding: "4px 12px", borderRadius: 6, background: T.green, color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Most Popular</div>}
              <div style={{ fontSize: 14, fontWeight: 600, color: T.green, marginBottom: 4 }}>{p.plan}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}><span style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: T.text }}>${p.price}</span><span style={{ fontSize: 13, color: T.muted }}>/seat/mo</span></div>
              <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>{p.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14, padding: "10px 0", borderTop: `1px solid ${T.border}22`, borderBottom: `1px solid ${T.border}22` }}>
                {[{ l: "Seats", v: p.seats }, { l: "Accounts", v: p.accounts }, { l: "AI Actions", v: p.ai }, { l: "AI Model", v: p.model }].map(r => <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}><span style={{ color: T.muted }}>{r.l}</span><span style={{ color: T.subtle, fontWeight: 500 }}>{r.v}</span></div>)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>{p.features.map(f => <div key={f} style={{ fontSize: 12.5, color: T.subtle, display: "flex", alignItems: "center", gap: 7 }}><span style={{ color: T.green, fontSize: 13 }}>✓</span>{f}</div>)}</div>
              <button onClick={() => onNavigate("signup")} style={{ width: "100%", padding: "12px 20px", borderRadius: 10, border: p.featured ? "none" : `1px solid ${T.border}`, background: p.featured ? T.green : "transparent", color: p.featured ? "#fff" : T.text, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{p.cta}</button>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 16 }}>All plans include a 30-day free trial with full Scale-tier access · No credit card required</p>
      </section>

      <section style={{ padding: "60px 40px", textAlign: "center", background: T.surface, borderTop: `1px solid ${T.border}` }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 14 }}>Ready to Prove Your <span style={{ color: T.green }}>Value</span>?</h2>
        <p style={{ fontSize: 15, color: T.muted, marginBottom: 28 }}>Join CS teams who are turning passive metrics into executive-ready proof.</p>
        <button onClick={() => onNavigate("signup")} style={{ padding: "14px 36px", borderRadius: 10, border: "none", background: T.green, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 0 30px rgba(16,185,129,0.3)" }}>Start Your Free Trial</button>
      </section>

      <footer style={{ padding: "30px 40px", borderTop: `1px solid ${T.border}22`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.muted }}>Proof<span style={{ color: T.green }}>point</span></div>
        <div style={{ display: "flex", gap: 20 }}>{[{ id: "blog", label: "Blog" }, { id: "terms", label: "Terms" }, { id: "privacy", label: "Privacy" }].map(link => <button key={link.id} onClick={() => onNavigate(link.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#334155", fontFamily: "'DM Sans', sans-serif" }}>{link.label}</button>)}</div>
        <div style={{ fontSize: 11, color: "#1e293b" }}>© 2026 Proofpoint. All rights reserved.</div>
      </footer>
    </div>
  );
}

function SignupPage({ onNavigate, onAuth }) {
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [company, setCompany] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: 420, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`, padding: "60px 50px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.green, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 24 }}>Start Your Journey</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 20, color: T.text }}>Turn metrics into <em style={{ fontStyle: "italic", color: T.green }}>proof</em></h2>
        <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.7, marginBottom: 32 }}>Join Customer Success teams using AI-powered ROI reports to drive renewals and expansion.</p>
        <div style={{ background: `rgba(${hexToRgb(T.green)},0.06)`, border: `1px solid ${T.green}22`, borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.greenLight, marginBottom: 8 }}>🎉 30-Day Free Trial</div>
          <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>Full Scale-tier access to all 23 tools for 30 days. No credit card required. Plans start at $39/seat/month.</div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>Create your account</h3>
          <p style={{ fontSize: 13, color: T.muted, marginBottom: 28 }}>In production, this uses Clerk authentication</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={labelStyle}>Full Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} /></div>
            <div><label style={labelStyle}>Work Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" style={inputStyle} /></div>
            <div><label style={labelStyle}>Company</label><input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" style={inputStyle} /></div>
            <button onClick={() => onAuth()} style={{ width: "100%", padding: "13px 24px", borderRadius: 10, border: "none", background: T.green, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 8, boxShadow: "0 0 24px rgba(16,185,129,0.22)" }}>Create Account & Start Trial</button>
          </div>
          <p style={{ fontSize: 12, color: "#334155", textAlign: "center", marginTop: 16 }}>Already have an account? <button onClick={() => onNavigate("login")} style={{ background: "none", border: "none", color: T.green, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Log in</button></p>
          <p style={{ fontSize: 10.5, color: "#1e293b", textAlign: "center", marginTop: 12 }}>By creating an account, you agree to our <button onClick={() => onNavigate("terms")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 10.5, textDecoration: "underline", fontFamily: "'DM Sans', sans-serif" }}>Terms</button> and <button onClick={() => onNavigate("privacy")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 10.5, textDecoration: "underline", fontFamily: "'DM Sans', sans-serif" }}>Privacy Policy</button></p>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onNavigate, onAuth }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: 400, animation: "panelIn 0.3s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}><div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: T.text, marginBottom: 8 }}>Proof<span style={{ color: T.green }}>point</span></div><p style={{ fontSize: 14, color: T.muted }}>Welcome back</p></div>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "28px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={labelStyle}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" style={inputStyle} /></div>
            <div><label style={labelStyle}>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" style={inputStyle} /></div>
            <button onClick={() => onAuth()} style={{ width: "100%", padding: "13px 24px", borderRadius: 10, border: "none", background: T.green, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 0 24px rgba(16,185,129,0.22)" }}>Log In</button>
          </div>
          <p style={{ fontSize: 12, color: "#334155", textAlign: "center", marginTop: 16 }}>Don't have an account? <button onClick={() => onNavigate("signup")} style={{ background: "none", border: "none", color: T.green, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Sign up free</button></p>
        </div>
      </div>
    </div>
  );
}

const BLOG_ARTICLES = [
  { id: "custify", title: "Proofpoint vs Custify: Why Internal Health Scores Aren't Enough", date: "Feb 28, 2026", readTime: "6 min", excerpt: "Custify excels at internal health scoring and lifecycle automation. But when your champion needs to justify renewal to their CFO, internal scores don't cut it. Proofpoint generates customer-facing ROI proof with industry benchmarks that executives can fact-check.", tags: ["Comparison", "Custify"] },
  { id: "churnzero", title: "Proofpoint vs ChurnZero: From Churn Prevention to Value Proof", date: "Feb 26, 2026", readTime: "7 min", excerpt: "ChurnZero is a powerful engagement and churn prevention platform. But it focuses on what you track internally — not what you present externally. Proofpoint fills the gap with benchmark-driven ROI narratives that make the business case for renewal undeniable.", tags: ["Comparison", "ChurnZero"] },
  { id: "vitally", title: "Proofpoint vs Vitally: Beautiful Dashboards vs. Defensible ROI", date: "Feb 24, 2026", readTime: "5 min", excerpt: "Vitally offers gorgeous dashboards and productivity hubs for CS teams. But dashboards are internal tools. Proofpoint creates the external-facing proof documents that your customers' procurement teams need to approve renewals.", tags: ["Comparison", "Vitally"] },
  { id: "totango", title: "Proofpoint vs Totango: Composable CS vs. Actionable Intelligence", date: "Feb 22, 2026", readTime: "6 min", excerpt: "Totango's composable approach lets you build custom CS workflows. Proofpoint takes a different angle: instead of customizing internal operations, it generates executive-ready output with AI that explains what actions will change outcomes.", tags: ["Comparison", "Totango"] },
  { id: "zapscale", title: "Proofpoint vs ZapScale: Beyond 40 KPIs to Benchmark-Driven Proof", date: "Feb 20, 2026", readTime: "5 min", excerpt: "ZapScale tracks 40 KPIs and offers AI-powered churn prediction. Proofpoint transforms those KPIs into industry-benchmarked ROI reports with transparent source citations that executives trust.", tags: ["Comparison", "ZapScale"] },
];

function BlogPage({ onNavigate }) {
  const [sel, setSel] = useState(null);
  if (sel) {
    const a = BLOG_ARTICLES.find(x => x.id === sel);
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px", fontFamily: "'DM Sans', sans-serif" }}>
        <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginBottom: 24 }}>← Back to Blog</button>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{a.tags.map(tag => <span key={tag} style={{ padding: "3px 10px", borderRadius: 6, background: `rgba(${hexToRgb(T.green)},0.08)`, fontSize: 11, fontWeight: 600, color: T.green }}>{tag}</span>)}</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, color: T.text, marginBottom: 12, lineHeight: 1.2 }}>{a.title}</h1>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 32 }}>{a.date} · {a.readTime} read</div>
        <div style={{ fontSize: 15, color: T.subtle, lineHeight: 1.9, marginBottom: 16 }}>{a.excerpt}</div>
        <div style={{ fontSize: 14.5, color: "#94a3b8", lineHeight: 1.9 }}>
          <p style={{ marginBottom: 16 }}>The Customer Success software market is crowded with platforms that solve internal team operations — health scoring, task management, lifecycle automation. These are valuable capabilities. But they all share a blind spot: none of them generate the external-facing proof that actually drives renewal decisions.</p>
          <p style={{ marginBottom: 16 }}>When a champion needs to justify a six-figure renewal to their CFO, they don't forward a health score dashboard. They need a document that speaks the language of business impact — with benchmarks their stakeholders can independently verify.</p>
          <p style={{ marginBottom: 16 }}>That's the gap Proofpoint fills. Instead of scoring customers for your team, it generates ROI narratives for their team — with industry benchmarks sourced from ChartMogul, TSIA, Recurly, and other authoritative research, complete with citations.</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: T.text, marginTop: 32, marginBottom: 12 }}>The Key Difference</h3>
          <p style={{ marginBottom: 16 }}>Most CS platforms ask: "How healthy is this account?" Proofpoint asks: "Can this account's stakeholders see the value?" — and then generates the proof to make sure they can.</p>
        </div>
        <div style={{ marginTop: 40, padding: "24px 28px", background: T.surface, border: `1px solid ${T.green}33`, borderRadius: 14, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 8 }}>Ready to see it in action?</div>
          <button onClick={() => onNavigate("signup")} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: T.green, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Start Your Free Trial</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "50px 20px", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: T.text, marginBottom: 10 }}>Proof<span style={{ color: T.green }}>point</span> Blog</h1>
        <p style={{ fontSize: 15, color: T.muted }}>How Proofpoint compares to the CS platforms you already know</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {BLOG_ARTICLES.map(article => (
          <button key={article.id} onClick={() => setSel(article.id)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px 28px", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif", width: "100%" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>{article.tags.map(tag => <span key={tag} style={{ padding: "2px 8px", borderRadius: 5, background: `rgba(${hexToRgb(T.green)},0.06)`, fontSize: 10, fontWeight: 600, color: T.green }}>{tag}</span>)}</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 6, lineHeight: 1.3 }}>{article.title}</div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 8 }}>{article.excerpt}</div>
            <div style={{ fontSize: 11, color: "#334155" }}>{article.date} · {article.readTime} read</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TermsPage({ onNavigate }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "50px 20px", fontFamily: "'DM Sans', sans-serif" }}>
      <button onClick={() => onNavigate("landing")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginBottom: 24 }}>← Back to Home</button>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: T.text, marginBottom: 8 }}>Terms & Conditions</h1>
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 32 }}>Last updated: March 1, 2026</p>
      {[
        { title: "1. Service Description", content: "Proofpoint provides AI-powered Customer Success tools including ROI report generation, industry benchmarking, next action intelligence, and email drafting. Reports are generated using AI and should be reviewed for accuracy before distribution." },
        { title: "2. Account Terms", content: "You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. One person or entity may not maintain more than one free trial." },
        { title: "3. Acceptable Use", content: "You agree to use Proofpoint only for lawful business purposes. You may not use the service to generate misleading ROI claims, falsify benchmark data, or misrepresent business metrics to customers or stakeholders." },
        { title: "4. Subscription & Billing", content: "Starter plan: $39/seat/month. Growth plan: $79/seat/month. Scale plan: $119/seat/month. Annual billing available at 15% discount. All plans include a 30-day free trial with full Scale-tier access. You may cancel at any time. Refunds are not provided for partial billing periods." },
        { title: "5. Data Ownership", content: "You retain ownership of all data you input into Proofpoint. We do not share your data with third parties except as necessary to provide the service (e.g., AI processing, email delivery)." },
        { title: "6. AI-Generated Content", content: "Reports and recommendations generated by Proofpoint's AI are provided as business tools, not financial or legal advice. You are responsible for reviewing and verifying all AI-generated content before use." },
        { title: "7. Limitation of Liability", content: "Proofpoint is provided 'as is' without warranties. We are not liable for business decisions made based on AI-generated reports. Our total liability shall not exceed the amount you paid in the preceding 12 months." },
        { title: "8. Termination", content: "Either party may terminate at any time. Upon termination, your data will be available for export for 30 days, after which it may be permanently deleted." },
      ].map(s => <div key={s.title} style={{ marginBottom: 24 }}><h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>{s.title}</h3><p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.8 }}>{s.content}</p></div>)}
    </div>
  );
}

function PrivacyPage({ onNavigate }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "50px 20px", fontFamily: "'DM Sans', sans-serif" }}>
      <button onClick={() => onNavigate("landing")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginBottom: 24 }}>← Back to Home</button>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: T.text, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 32 }}>Last updated: March 1, 2026</p>
      {[
        { title: "Information We Collect", content: "We collect account information (name, email, company), customer data you input for report generation (company metrics, contact details), usage analytics, and payment information processed via Stripe." },
        { title: "How We Use Your Data", content: "Your data is used to generate AI-powered reports and recommendations, deliver emails via SendGrid, improve our service quality, and communicate about your account. We do not sell your data to third parties." },
        { title: "AI Processing", content: "Customer data submitted for report generation is processed through Anthropic's Claude API. Data is sent securely and is not retained by the AI provider beyond the generation request. We do not use your data to train AI models." },
        { title: "Data Storage & Security", content: "Data is stored in Supabase with encryption at rest and in transit. We implement industry-standard security practices including role-based access controls, secure authentication via Clerk, and regular security audits." },
        { title: "Email Tracking", content: "If you use our email sending features, we track delivery status, open rates, and click rates via SendGrid. Recipients are not individually identified beyond what you provide as sender." },
        { title: "Data Retention & Deletion", content: "Your data is retained while your account is active. You may request deletion of your account and all associated data at any time. Deletion requests are processed within 30 days." },
        { title: "Third-Party Services", content: "We use: Clerk (authentication), Supabase (database), Anthropic Claude (AI generation), SendGrid (email delivery), Stripe (payments), and Vercel (hosting). Each provider has their own privacy policy." },
        { title: "Your Rights", content: "You have the right to access, correct, export, or delete your personal data. Contact privacy@getproofpoint.com for any privacy-related requests." },
      ].map(s => <div key={s.title} style={{ marginBottom: 24 }}><h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>{s.title}</h3><p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.8 }}>{s.content}</p></div>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// APP SHELL — with auth routing between public pages and authenticated app
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE 1: CRM INTEGRATION HUB
// Deep bidirectional sync with HubSpot, Salesforce, and Stripe
// ═══════════════════════════════════════════════════════════════════════════

const CRM_PROVIDERS = {
  hubspot: {
    name: "HubSpot", icon: "🟠", color: "#ff7a59", bgColor: "rgba(255,122,89,0.08)",
    objects: ["Companies", "Contacts", "Deals", "Tickets", "Notes"],
    description: "Full CRM with marketing, sales, and service hubs",
  },
  salesforce: {
    name: "Salesforce", icon: "☁️", color: "#00a1e0", bgColor: "rgba(0,161,224,0.08)",
    objects: ["Accounts", "Contacts", "Opportunities", "Cases", "Tasks"],
    description: "Enterprise CRM with customizable objects and workflows",
  },
  stripe: {
    name: "Stripe", icon: "💳", color: "#635bff", bgColor: "rgba(99,91,255,0.08)",
    objects: ["Customers", "Subscriptions", "Invoices", "Payments", "Products"],
    description: "Billing and subscription management platform",
  },
};

const FIELD_MAPPINGS_HUBSPOT = [
  { crm: "Company Name", proofpoint: "company", direction: "bidirectional", required: true, synced: true },
  { crm: "Associated Contact", proofpoint: "contact", direction: "bidirectional", required: true, synced: true },
  { crm: "Deal Amount (MRR)", proofpoint: "mrr", direction: "crm_to_pp", required: false, synced: true },
  { crm: "Industry", proofpoint: "industry", direction: "crm_to_pp", required: false, synced: true },
  { crm: "Lifecycle Stage", proofpoint: "status", direction: "bidirectional", required: false, synced: true },
  { crm: "Close Date", proofpoint: "contractStart", direction: "crm_to_pp", required: false, synced: true },
  { crm: "Deal Owner", proofpoint: "assignedTo", direction: "crm_to_pp", required: false, synced: false },
  { crm: "Health Score", proofpoint: "healthScore", direction: "pp_to_crm", required: false, synced: true },
  { crm: "Churn Risk", proofpoint: "churnRisk", direction: "pp_to_crm", required: false, synced: true },
  { crm: "Last Activity", proofpoint: "lastActivity", direction: "bidirectional", required: false, synced: false },
  { crm: "NPS Score", proofpoint: "npsScore", direction: "pp_to_crm", required: false, synced: false },
  { crm: "Renewal Date", proofpoint: "renewalDate", direction: "bidirectional", required: false, synced: true },
];

const FIELD_MAPPINGS_SALESFORCE = [
  { crm: "Account Name", proofpoint: "company", direction: "bidirectional", required: true, synced: true },
  { crm: "Primary Contact", proofpoint: "contact", direction: "bidirectional", required: true, synced: true },
  { crm: "Opportunity Amount", proofpoint: "mrr", direction: "crm_to_pp", required: false, synced: true },
  { crm: "Industry", proofpoint: "industry", direction: "crm_to_pp", required: false, synced: true },
  { crm: "Account Status", proofpoint: "status", direction: "bidirectional", required: false, synced: true },
  { crm: "Close Date", proofpoint: "contractStart", direction: "crm_to_pp", required: false, synced: true },
  { crm: "Account Owner", proofpoint: "assignedTo", direction: "crm_to_pp", required: false, synced: true },
  { crm: "Health Score (Custom)", proofpoint: "healthScore", direction: "pp_to_crm", required: false, synced: true },
  { crm: "Churn Probability (Custom)", proofpoint: "churnRisk", direction: "pp_to_crm", required: false, synced: false },
  { crm: "Last Touch Date", proofpoint: "lastActivity", direction: "bidirectional", required: false, synced: true },
  { crm: "NPS (Custom)", proofpoint: "npsScore", direction: "pp_to_crm", required: false, synced: false },
  { crm: "Contract End Date", proofpoint: "renewalDate", direction: "bidirectional", required: false, synced: true },
];

const SYNC_HISTORY = [
  { id: 1, provider: "hubspot", type: "full_sync", direction: "bidirectional", recordsSynced: 47, recordsFailed: 0, duration: "12s", timestamp: "Mar 1, 2026 10:30 AM", status: "success" },
  { id: 2, provider: "hubspot", type: "incremental", direction: "crm_to_pp", recordsSynced: 3, recordsFailed: 0, duration: "2s", timestamp: "Mar 1, 2026 10:15 AM", status: "success" },
  { id: 3, provider: "hubspot", type: "incremental", direction: "pp_to_crm", recordsSynced: 5, recordsFailed: 1, duration: "4s", timestamp: "Mar 1, 2026 10:00 AM", status: "partial" },
  { id: 4, provider: "salesforce", type: "full_sync", direction: "bidirectional", recordsSynced: 89, recordsFailed: 2, duration: "28s", timestamp: "Mar 1, 2026 09:30 AM", status: "partial" },
  { id: 5, provider: "stripe", type: "incremental", direction: "crm_to_pp", recordsSynced: 12, recordsFailed: 0, duration: "3s", timestamp: "Mar 1, 2026 09:15 AM", status: "success" },
  { id: 6, provider: "hubspot", type: "webhook", direction: "crm_to_pp", recordsSynced: 1, recordsFailed: 0, duration: "<1s", timestamp: "Mar 1, 2026 09:02 AM", status: "success" },
  { id: 7, provider: "salesforce", type: "incremental", direction: "bidirectional", recordsSynced: 7, recordsFailed: 0, duration: "5s", timestamp: "Mar 1, 2026 08:30 AM", status: "success" },
  { id: 8, provider: "hubspot", type: "full_sync", direction: "bidirectional", recordsSynced: 47, recordsFailed: 0, duration: "11s", timestamp: "Feb 28, 2026 10:30 PM", status: "success" },
];

function DirectionBadge({ direction }) {
  const config = {
    bidirectional: { label: "⇄ Bi-directional", color: T.green },
    crm_to_pp: { label: "→ CRM → Proofpoint", color: T.info },
    pp_to_crm: { label: "← Proofpoint → CRM", color: T.purple },
  };
  const c = config[direction] || config.bidirectional;
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `rgba(${hexToRgb(c.color)},0.1)`, color: c.color, fontWeight: 600 }}>{c.label}</span>;
}

function SyncStatusDot({ status }) {
  const colors = { success: T.green, partial: T.warning, failed: T.error, syncing: T.info };
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status] || T.muted, display: "inline-block", animation: status === "syncing" ? "pulse 1.5s infinite" : "none" }} />;
}

function CRMIntegrationPanel({ accounts }) {
  const [tab, setTab] = useState("connections"); // connections | mappings | sync-log | settings
  const [connections, setConnections] = useState({
    hubspot: { connected: true, lastSync: "2 min ago", status: "active", autoSync: true, interval: 15, webhooks: true, recordCount: 47 },
    salesforce: { connected: true, lastSync: "32 min ago", status: "active", autoSync: true, interval: 30, webhooks: false, recordCount: 89 },
    stripe: { connected: false, lastSync: null, status: "disconnected", autoSync: false, interval: 60, webhooks: false, recordCount: 0 },
  });
  const [selectedProvider, setSelectedProvider] = useState("hubspot");
  const [syncing, setSyncing] = useState(null);
  const [showOAuth, setShowOAuth] = useState(null);
  const [mappings, setMappings] = useState({ hubspot: FIELD_MAPPINGS_HUBSPOT, salesforce: FIELD_MAPPINGS_SALESFORCE });
  const [conflictStrategy, setConflictStrategy] = useState("crm_wins"); // crm_wins | pp_wins | newest | manual

  const tabs = [
    { id: "connections", label: "Connections", icon: "🔗" },
    { id: "mappings", label: "Field Mapping", icon: "🗺️" },
    { id: "sync-log", label: "Sync History", icon: "📋" },
    { id: "settings", label: "Sync Settings", icon: "⚙️" },
  ];

  const handleSync = (provider) => {
    setSyncing(provider);
    setTimeout(() => {
      setConnections(prev => ({
        ...prev,
        [provider]: { ...prev[provider], lastSync: "Just now", status: "active" }
      }));
      setSyncing(null);
    }, 2500);
  };

  const handleConnect = (provider) => {
    setShowOAuth(provider);
    setTimeout(() => {
      setConnections(prev => ({
        ...prev,
        [provider]: { ...prev[provider], connected: true, status: "active", lastSync: "Just now", recordCount: provider === "stripe" ? 156 : prev[provider].recordCount }
      }));
      setShowOAuth(null);
    }, 3000);
  };

  const handleDisconnect = (provider) => {
    setConnections(prev => ({
      ...prev,
      [provider]: { ...prev[provider], connected: false, status: "disconnected", lastSync: null, recordCount: 0 }
    }));
  };

  const toggleMapping = (provider, idx) => {
    setMappings(prev => ({
      ...prev,
      [provider]: prev[provider].map((m, i) => i === idx ? { ...m, synced: !m.synced } : m)
    }));
  };

  const connectedCount = Object.values(connections).filter(c => c.connected).length;
  const totalRecords = Object.values(connections).reduce((s, c) => s + (c.connected ? c.recordCount : 0), 0);

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="🔗" title="CRM Integration Hub" color={T.info}
        bullets={[
          "Deep bidirectional sync with HubSpot, Salesforce, and Stripe — connect with one click via OAuth, map fields precisely, and keep your CS platform and CRM perfectly in sync.",
          "Visual field mapping lets you control exactly which data flows where, with conflict resolution strategies (CRM wins, ProofPoint wins, newest wins, or manual review).",
          "Full sync history log with success/failure tracking so you always know exactly what synced, when, and whether any records need attention.",
        ]}
        workflow={[
          "Connect your CRM via secure OAuth flow (one-click setup)",
          "Map ProofPoint fields to CRM fields with drag-and-drop precision",
          "Configure sync frequency, conflict resolution, and webhook triggers",
          "Monitor sync health and review history in the Sync History tab",
        ]}
        outputLabel="Integrations"
        outputItems={[
          { icon: "🟠", text: "HubSpot — contacts, deals, and engagement" },
          { icon: "☁️", text: "Salesforce — accounts, opportunities, tasks" },
          { icon: "💳", text: "Stripe — billing, invoices, and MRR data" },
          { icon: "🔄", text: "Webhooks — real-time event-driven updates" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "⚙️", text: "CS ops teams setting up integrations" },
          { icon: "👤", text: "CSMs who need CRM data without tab-switching" },
          { icon: "🔐", text: "Admins managing data governance and mapping" },
        ]}
      />
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Connected CRMs", value: `${connectedCount}/3`, color: T.green, sub: "Active integrations" },
          { label: "Total Records Synced", value: totalRecords.toLocaleString(), color: T.info, sub: "Across all providers" },
          { label: "Last Sync", value: "2 min ago", color: T.green, sub: "All providers" },
          { label: "Sync Health", value: "98.7%", color: T.green, sub: "Success rate (30d)" },
        ].map((card, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: card.color, fontFamily: "'Playfair Display', serif" }}>{card.value}</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            background: tab === t.id ? `rgba(${hexToRgb(T.green)},0.12)` : "transparent",
            color: tab === t.id ? T.green : "#475569", fontSize: 12, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ═══ Connections Tab ═══ */}
      {tab === "connections" && (
        <div style={{ display: "grid", gap: 14 }}>
          {Object.entries(CRM_PROVIDERS).map(([key, provider]) => {
            const conn = connections[key];
            const isSyncing = syncing === key;
            const isConnecting = showOAuth === key;
            return (
              <div key={key} style={{ background: T.surface, border: `1px solid ${conn.connected ? T.green + "33" : T.border}`, borderRadius: 14, padding: "20px 24px", transition: "border-color 0.3s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: provider.bgColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{provider.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{provider.name}</div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 1 }}>{provider.description}</div>
                      {conn.connected && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <SyncStatusDot status={isSyncing ? "syncing" : "success"} />
                          <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>{isSyncing ? "Syncing..." : "Connected"}</span>
                          <span style={{ fontSize: 10, color: "#475569" }}>· Last sync: {conn.lastSync}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {conn.connected ? (
                      <>
                        <button onClick={() => handleSync(key)} disabled={isSyncing} style={{ background: `rgba(${hexToRgb(provider.color)},0.1)`, color: provider.color, border: `1px solid ${provider.color}33`, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: isSyncing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: isSyncing ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                          {isSyncing && <span style={{ width: 12, height: 12, border: `2px solid ${provider.color}44`, borderTopColor: provider.color, borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />}
                          {isSyncing ? "Syncing..." : "⟳ Sync Now"}
                        </button>
                        <button onClick={() => handleDisconnect(key)} style={{ background: "rgba(239,68,68,0.06)", color: T.error, border: `1px solid ${T.error}22`, borderRadius: 8, padding: "8px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Disconnect</button>
                      </>
                    ) : isConnecting ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: provider.color, fontSize: 12 }}>
                        <span style={{ width: 14, height: 14, border: `2px solid ${provider.color}44`, borderTopColor: provider.color, borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                        Authorizing via OAuth 2.0...
                      </div>
                    ) : (
                      <button onClick={() => handleConnect(key)} style={{ background: provider.color, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Connect {provider.name}</button>
                    )}
                  </div>
                </div>

                {/* Connection Details */}
                {conn.connected && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                    {provider.objects.map(obj => (
                      <div key={obj} style={{ background: T.bg, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>{obj}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: "'Playfair Display', serif" }}>
                          {Math.floor(Math.random() * 80 + 10)}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 4 }}>
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(16,185,129,0.1)", color: T.green }}>↓ In</span>
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(139,92,246,0.1)", color: T.purple }}>↑ Out</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sync Configuration */}
                {conn.connected && (
                  <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}`, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569", cursor: "pointer" }}>
                      <input type="checkbox" checked={conn.autoSync} onChange={() => setConnections(prev => ({ ...prev, [key]: { ...prev[key], autoSync: !prev[key].autoSync } }))} style={{ accentColor: T.green }} />
                      Auto-sync every
                      <select value={conn.interval} onChange={(e) => setConnections(prev => ({ ...prev, [key]: { ...prev[key], interval: parseInt(e.target.value) } }))} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 6px", color: T.text, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                        <option value={5}>5 min</option><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>1 hour</option>
                      </select>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569", cursor: "pointer" }}>
                      <input type="checkbox" checked={conn.webhooks} onChange={() => setConnections(prev => ({ ...prev, [key]: { ...prev[key], webhooks: !prev[key].webhooks } }))} style={{ accentColor: T.green }} />
                      Real-time webhooks
                    </label>
                    <span style={{ fontSize: 10, color: "#334155", marginLeft: "auto" }}>
                      {conn.recordCount} records · {conn.webhooks ? "Real-time + " : ""}{conn.autoSync ? `Every ${conn.interval}m` : "Manual only"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Field Mapping Tab ═══ */}
      {tab === "mappings" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["hubspot", "salesforce"].map(p => (
              <button key={p} onClick={() => setSelectedProvider(p)} style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${selectedProvider === p ? CRM_PROVIDERS[p].color + "55" : T.border}`,
                background: selectedProvider === p ? CRM_PROVIDERS[p].bgColor : "transparent",
                color: selectedProvider === p ? CRM_PROVIDERS[p].color : "#475569",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 6,
              }}>{CRM_PROVIDERS[p].icon} {CRM_PROVIDERS[p].name}</button>
            ))}
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr 120px 70px", gap: 10, padding: "12px 18px", background: T.surface2, borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <div>{CRM_PROVIDERS[selectedProvider].name} Field</div>
              <div></div>
              <div>Proofpoint Field</div>
              <div>Direction</div>
              <div style={{ textAlign: "center" }}>Active</div>
            </div>
            {/* Rows */}
            {(mappings[selectedProvider] || []).map((m, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr 120px 70px", gap: 10, padding: "12px 18px", borderBottom: `1px solid ${T.border}`, alignItems: "center", background: m.synced ? "transparent" : "rgba(100,116,139,0.03)" }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: m.required ? 600 : 400 }}>
                  {m.crm} {m.required && <span style={{ color: T.error, fontSize: 10 }}>*</span>}
                </div>
                <div style={{ textAlign: "center", color: m.synced ? T.green : "#334155", fontSize: 14 }}>
                  {m.direction === "bidirectional" ? "⇄" : m.direction === "crm_to_pp" ? "→" : "←"}
                </div>
                <div style={{ fontSize: 13, color: m.synced ? T.text : "#475569" }}>{m.proofpoint}</div>
                <DirectionBadge direction={m.direction} />
                <div style={{ textAlign: "center" }}>
                  <button onClick={() => toggleMapping(selectedProvider, idx)} disabled={m.required} style={{ width: 36, height: 20, borderRadius: 10, border: "none", background: m.synced ? T.green : "#334155", cursor: m.required ? "not-allowed" : "pointer", position: "relative", transition: "background 0.2s", opacity: m.required ? 0.6 : 1 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: m.synced ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: "14px 18px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Conflict Resolution Strategy</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "crm_wins", label: "CRM Always Wins", desc: "CRM data overwrites Proofpoint on conflict" },
                { id: "pp_wins", label: "Proofpoint Wins", desc: "Proofpoint data overwrites CRM on conflict" },
                { id: "newest", label: "Newest Wins", desc: "Most recently updated record takes priority" },
                { id: "manual", label: "Manual Review", desc: "Flag conflicts for CSM to resolve manually" },
              ].map(s => (
                <button key={s.id} onClick={() => setConflictStrategy(s.id)} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 8, textAlign: "left",
                  background: conflictStrategy === s.id ? `rgba(${hexToRgb(T.green)},0.08)` : T.bg,
                  border: `1px solid ${conflictStrategy === s.id ? T.green + "44" : T.border}`,
                  cursor: "pointer",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: conflictStrategy === s.id ? T.green : T.text, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Sync History Tab ═══ */}
      {tab === "sync-log" && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "100px 100px 100px 120px 80px 60px 80px 100px", gap: 8, padding: "12px 18px", background: T.surface2, borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            <div>Provider</div><div>Type</div><div>Direction</div><div>Timestamp</div><div>Records</div><div>Failed</div><div>Duration</div><div>Status</div>
          </div>
          {SYNC_HISTORY.map(entry => (
            <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "100px 100px 100px 120px 80px 60px 80px 100px", gap: 8, padding: "11px 18px", borderBottom: `1px solid ${T.border}`, alignItems: "center", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>{CRM_PROVIDERS[entry.provider]?.icon}</span>
                <span style={{ color: T.text, fontWeight: 500 }}>{CRM_PROVIDERS[entry.provider]?.name}</span>
              </div>
              <div><span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: entry.type === "full_sync" ? "rgba(139,92,246,0.1)" : entry.type === "webhook" ? "rgba(6,182,212,0.1)" : "rgba(16,185,129,0.1)", color: entry.type === "full_sync" ? T.purple : entry.type === "webhook" ? T.info : T.green, fontWeight: 600 }}>{entry.type === "full_sync" ? "Full Sync" : entry.type === "webhook" ? "Webhook" : "Incremental"}</span></div>
              <DirectionBadge direction={entry.direction} />
              <div style={{ color: "#475569", fontSize: 11 }}>{entry.timestamp}</div>
              <div style={{ color: T.text, fontWeight: 600 }}>{entry.recordsSynced}</div>
              <div style={{ color: entry.recordsFailed > 0 ? T.error : "#334155", fontWeight: entry.recordsFailed > 0 ? 600 : 400 }}>{entry.recordsFailed}</div>
              <div style={{ color: "#475569" }}>{entry.duration}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <SyncStatusDot status={entry.status} />
                <span style={{ fontSize: 11, color: entry.status === "success" ? T.green : entry.status === "partial" ? T.warning : T.error, fontWeight: 500, textTransform: "capitalize" }}>{entry.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Settings Tab ═══ */}
      {tab === "settings" && (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Sync Schedule */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Sync Schedule & Automation</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Default Sync Interval</label>
                <select style={inputStyle} defaultValue="15">
                  <option value="5">Every 5 minutes (Real-time)</option>
                  <option value="15">Every 15 minutes (Recommended)</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every hour</option>
                  <option value="360">Every 6 hours</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Full Sync Schedule</label>
                <select style={inputStyle} defaultValue="daily">
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily at midnight</option>
                  <option value="weekly">Weekly (Sunday midnight)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Write-back Settings */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Proofpoint → CRM Write-back</div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 14 }}>Automatically push Proofpoint data back to your CRM. These fields will be created as custom properties if they don't exist.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                { label: "Health Score", desc: "Push composite health score to CRM custom field", enabled: true },
                { label: "Churn Probability", desc: "Write AI-predicted churn risk percentage", enabled: true },
                { label: "NPS Score", desc: "Sync latest NPS response score", enabled: false },
                { label: "Success Plan Status", desc: "Write current success plan completion %", enabled: true },
                { label: "Last CSM Touch", desc: "Update last activity timestamp from meetings/emails", enabled: false },
                { label: "Renewal Risk Flag", desc: "Set renewal risk indicator based on health + churn model", enabled: true },
              ].map((setting, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{setting.label}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{setting.desc}</div>
                  </div>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: setting.enabled ? T.green : "#334155", cursor: "pointer", position: "relative" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: setting.enabled ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webhook Configuration */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Webhook Endpoints</div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 14 }}>Configure incoming webhooks for real-time CRM events. Add these URLs to your CRM's webhook settings.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                { provider: "HubSpot", url: "https://app.getproofpoint.com/api/webhooks/hubspot", events: "Contact Updated, Deal Stage Changed, Company Created" },
                { provider: "Salesforce", url: "https://app.getproofpoint.com/api/webhooks/salesforce", events: "Account Modified, Opportunity Closed, Task Completed" },
                { provider: "Stripe", url: "https://app.getproofpoint.com/api/webhooks/stripe", events: "Subscription Updated, Payment Failed, Invoice Paid" },
              ].map((wh, i) => (
                <div key={i} style={{ padding: "12px 14px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 4 }}>{wh.provider} Webhook</div>
                  <div style={{ fontSize: 11, color: T.green, fontFamily: "monospace", background: T.surface2, padding: "6px 10px", borderRadius: 4, marginBottom: 4, wordBreak: "break-all" }}>{wh.url}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>Events: {wh.events}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// FEATURE 2: CHURN PREDICTION AI
// ML-powered churn forecasting with confidence scores
// ═══════════════════════════════════════════════════════════════════════════

const CHURN_FACTORS = {
  usage_decline: { label: "Usage Decline", icon: "📉", color: T.error, description: "Login frequency and feature usage dropping" },
  support_surge: { label: "Support Surge", icon: "🎫", color: T.warning, description: "Abnormal increase in support ticket volume" },
  nps_drop: { label: "NPS Deterioration", icon: "😐", color: T.warning, description: "Net Promoter Score trending downward" },
  engagement_gap: { label: "Engagement Gap", icon: "👻", color: T.error, description: "No meaningful product interactions in 30+ days" },
  champion_loss: { label: "Champion Departure", icon: "👤", color: T.error, description: "Key sponsor or champion has left the organization" },
  billing_issues: { label: "Billing Problems", icon: "💳", color: T.warning, description: "Failed payments, disputed invoices, or downgrades" },
  competitor_signals: { label: "Competitor Signals", icon: "🏁", color: T.purple, description: "Detected competitor evaluation or RFP activity" },
  contract_friction: { label: "Contract Friction", icon: "📋", color: T.warning, description: "Renewal negotiations stalling or price objections" },
  adoption_plateau: { label: "Adoption Plateau", icon: "📊", color: T.info, description: "Feature adoption has flatlined below target" },
  sentiment_shift: { label: "Sentiment Shift", icon: "💬", color: T.warning, description: "Negative sentiment detected in communications" },
};

function generateChurnData(accounts) {
  return accounts.map(acc => {
    const baseRisk = acc.status === "at-risk" ? 72 : acc.status === "churned" ? 95 : acc.status === "renewal-due" ? 38 : acc.status === "onboarding" ? 15 : acc.status === "expanded" ? 8 : Math.floor(Math.random() * 35 + 5);
    const risk = Math.min(98, Math.max(3, baseRisk + Math.floor(Math.random() * 16 - 8)));
    const confidence = Math.min(97, Math.max(55, 70 + Math.floor(Math.random() * 25)));
    const factorKeys = Object.keys(CHURN_FACTORS);
    const numFactors = acc.status === "at-risk" ? 4 : acc.status === "churned" ? 5 : Math.floor(Math.random() * 3 + 1);
    const selectedFactors = factorKeys.sort(() => Math.random() - 0.5).slice(0, numFactors).map(k => ({
      key: k,
      ...CHURN_FACTORS[k],
      impact: Math.floor(Math.random() * 30 + 10),
      trend: ["rising", "stable", "falling"][Math.floor(Math.random() * 3)],
    })).sort((a, b) => b.impact - a.impact);
    const history = Array.from({ length: 12 }, (_, i) => {
      const base = risk - (11 - i) * (risk > 50 ? 3 : -1) + Math.floor(Math.random() * 12 - 6);
      return Math.min(98, Math.max(2, base));
    });

    return {
      ...acc,
      churnRisk: risk,
      confidence,
      factors: selectedFactors,
      history,
      predictedChurnDate: risk > 60 ? `${["Apr", "May", "Jun"][Math.floor(Math.random() * 3)]} 2026` : null,
      recommendation: risk > 60
        ? "Immediate executive sponsor outreach and value reinforcement meeting recommended within 48 hours."
        : risk > 30
        ? "Schedule proactive check-in and prepare ROI summary for stakeholder review."
        : "Continue standard engagement cadence. Account health is stable.",
    };
  });
}

function ChurnRiskGauge({ risk, size = 120 }) {
  const angle = (risk / 100) * 180 - 90;
  const color = risk > 70 ? T.error : risk > 40 ? T.warning : T.green;
  const radius = size / 2 - 10;
  return (
    <div style={{ position: "relative", width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        {/* Background arc */}
        <path d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`} fill="none" stroke={T.border} strokeWidth="8" strokeLinecap="round" />
        {/* Colored arc */}
        <path d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(risk / 100) * Math.PI * radius} ${Math.PI * radius}`} style={{ filter: `drop-shadow(0 0 6px ${color}44)` }} />
        {/* Needle */}
        <line x1={size / 2} y1={size / 2} x2={size / 2 + Math.cos(angle * Math.PI / 180) * (radius - 15)} y2={size / 2 + Math.sin(angle * Math.PI / 180) * (radius - 15)} stroke={T.text} strokeWidth="2" strokeLinecap="round" />
        <circle cx={size / 2} cy={size / 2} r="4" fill={color} />
      </svg>
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 700, color, fontFamily: "'Playfair Display', serif" }}>{risk}%</div>
      </div>
    </div>
  );
}

function MiniSparkline({ data, color, width = 100, height = 28 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * width} cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2} r="2.5" fill={color} />
    </svg>
  );
}

function ChurnPredictionPanel({ accounts }) {
  const [tab, setTab] = useState("portfolio"); // portfolio | detail | matrix
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [sortBy, setSortBy] = useState("risk_desc");
  const [filterRisk, setFilterRisk] = useState("all");
  const [analyzing, setAnalyzing] = useState(false);

  const churnData = useMemo(() => generateChurnData(accounts), [accounts]);

  const filtered = useMemo(() => {
    let data = [...churnData];
    if (filterRisk === "critical") data = data.filter(d => d.churnRisk >= 70);
    if (filterRisk === "warning") data = data.filter(d => d.churnRisk >= 30 && d.churnRisk < 70);
    if (filterRisk === "healthy") data = data.filter(d => d.churnRisk < 30);
    if (sortBy === "risk_desc") data.sort((a, b) => b.churnRisk - a.churnRisk);
    if (sortBy === "risk_asc") data.sort((a, b) => a.churnRisk - b.churnRisk);
    if (sortBy === "confidence") data.sort((a, b) => b.confidence - a.confidence);
    if (sortBy === "mrr") data.sort((a, b) => parseFloat(b.mrr?.replace(/[$,]/g, "") || 0) - parseFloat(a.mrr?.replace(/[$,]/g, "") || 0));
    return data;
  }, [churnData, filterRisk, sortBy]);

  const criticalCount = churnData.filter(d => d.churnRisk >= 70).length;
  const warningCount = churnData.filter(d => d.churnRisk >= 30 && d.churnRisk < 70).length;
  const healthyCount = churnData.filter(d => d.churnRisk < 30).length;
  const avgRisk = Math.round(churnData.reduce((s, d) => s + d.churnRisk, 0) / churnData.length);
  const atRiskMRR = churnData.filter(d => d.churnRisk >= 50).reduce((s, d) => s + parseFloat(d.mrr?.replace(/[$,]/g, "") || 0), 0);

  const runAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => setAnalyzing(false), 3000);
  };

  const tabs = [
    { id: "portfolio", label: "Portfolio Risk", icon: "📊" },
    { id: "matrix", label: "Risk Matrix", icon: "🎯" },
    { id: "detail", label: "Account Deep-Dive", icon: "🔬" },
  ];

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="🔮" title="Churn Prediction AI" color={T.error}
        bullets={[
          "AI-powered churn probability scoring for every account — each score comes with a confidence level and the specific risk signals driving it.",
          "Portfolio Risk view ranks all accounts by churn probability so you can triage the most at-risk first. Risk Matrix plots risk vs. revenue to prioritize by business impact.",
          "Account Deep-Dive breaks down each prediction into contributing factors — usage drops, NPS declines, support spikes — with actionable mitigation recommendations.",
        ]}
        workflow={[
          "AI ingests health signals, usage data, support patterns, and engagement history",
          "Each account gets a churn probability score (0-100%) with confidence rating",
          "Portfolio view highlights critical, warning, and healthy segments",
          "Deep-dive into any account for full risk factor breakdown and actions",
        ]}
        outputLabel="What You Get"
        outputItems={[
          { icon: "📊", text: "Portfolio-wide risk heatmap with MRR at risk" },
          { icon: "🎯", text: "Risk matrix — churn probability vs. revenue" },
          { icon: "🔬", text: "Account deep-dive with contributing risk factors" },
          { icon: "💡", text: "AI-recommended mitigation actions per account" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "🚨", text: "CSMs triaging at-risk accounts by urgency" },
          { icon: "📈", text: "CS leaders protecting revenue with early warnings" },
          { icon: "💰", text: "Revenue teams quantifying MRR at risk" },
        ]}
      />
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Critical Risk", value: criticalCount, color: T.error, sub: "Churn probability > 70%", icon: "🔴" },
          { label: "Warning", value: warningCount, color: T.warning, sub: "Churn probability 30-70%", icon: "🟡" },
          { label: "Healthy", value: healthyCount, color: T.green, sub: "Churn probability < 30%", icon: "🟢" },
          { label: "Avg Risk Score", value: `${avgRisk}%`, color: avgRisk > 40 ? T.warning : T.green, sub: "Portfolio average", icon: "📈" },
          { label: "At-Risk MRR", value: `$${(atRiskMRR/1000).toFixed(1)}K`, color: T.error, sub: "Revenue in jeopardy", icon: "💰" },
        ].map((card, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>{card.label}</span>
              <span style={{ fontSize: 14 }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color, fontFamily: "'Playfair Display', serif" }}>{card.value}</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: tab === t.id ? `rgba(${hexToRgb(T.green)},0.12)` : "transparent",
              color: tab === t.id ? T.green : "#475569", fontSize: 12, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 5,
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
        <button onClick={runAnalysis} disabled={analyzing} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: analyzing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, opacity: analyzing ? 0.7 : 1 }}>
          {analyzing && <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />}
          {analyzing ? "Running AI Analysis..." : "⟳ Re-analyze All Accounts"}
        </button>
      </div>

      {/* ═══ Portfolio Risk Tab ═══ */}
      {tab === "portfolio" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { id: "all", label: `All (${churnData.length})` },
              { id: "critical", label: `Critical (${criticalCount})`, color: T.error },
              { id: "warning", label: `Warning (${warningCount})`, color: T.warning },
              { id: "healthy", label: `Healthy (${healthyCount})`, color: T.green },
            ].map(f => (
              <button key={f.id} onClick={() => setFilterRisk(f.id)} style={{
                padding: "6px 14px", borderRadius: 6, border: `1px solid ${filterRisk === f.id ? (f.color || T.green) + "44" : T.border}`,
                background: filterRisk === f.id ? `rgba(${hexToRgb(f.color || T.green)},0.08)` : "transparent",
                color: filterRisk === f.id ? (f.color || T.green) : "#475569",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>{f.label}</button>
            ))}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 12px", fontSize: 11, marginLeft: "auto" }}>
              <option value="risk_desc">Highest Risk First</option>
              <option value="risk_asc">Lowest Risk First</option>
              <option value="confidence">Highest Confidence</option>
              <option value="mrr">Highest MRR</option>
            </select>
          </div>

          {/* Account List */}
          <div style={{ display: "grid", gap: 8 }}>
            {filtered.map(acc => {
              const riskColor = acc.churnRisk >= 70 ? T.error : acc.churnRisk >= 30 ? T.warning : T.green;
              return (
                <div key={acc.id} onClick={() => { setSelectedAccount(acc); setTab("detail"); }} style={{
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px", cursor: "pointer",
                  display: "grid", gridTemplateColumns: "1fr 120px 180px 100px 100px", gap: 16, alignItems: "center",
                  transition: "border-color 0.2s", borderLeft: `3px solid ${riskColor}`,
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{acc.company}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{acc.contact} · {acc.mrr}/mo</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: riskColor, fontFamily: "'Playfair Display', serif" }}>{acc.churnRisk}%</div>
                    <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase" }}>Churn Risk</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>Contributing Factors</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {acc.factors.slice(0, 3).map((f, i) => (
                        <span key={i} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `rgba(${hexToRgb(f.color)},0.1)`, color: f.color, fontWeight: 600 }}>{f.icon} {f.label}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.info }}>{acc.confidence}%</div>
                    <div style={{ fontSize: 9, color: "#475569" }}>Confidence</div>
                  </div>
                  <MiniSparkline data={acc.history} color={riskColor} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Risk Matrix Tab ═══ */}
      {tab === "matrix" && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Churn Probability vs. Revenue Impact Matrix</div>
          <div style={{ position: "relative", height: 400, border: `1px solid ${T.border}`, borderRadius: 8, background: T.bg, overflow: "hidden" }}>
            {/* Quadrant labels */}
            <div style={{ position: "absolute", top: 12, left: 12, fontSize: 10, fontWeight: 700, color: T.warning + "88", textTransform: "uppercase" }}>Watch · Low MRR, High Risk</div>
            <div style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 700, color: T.error + "88", textTransform: "uppercase", textAlign: "right" }}>Critical · High MRR, High Risk</div>
            <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 10, fontWeight: 700, color: T.green + "66", textTransform: "uppercase" }}>Safe · Low MRR, Low Risk</div>
            <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 10, fontWeight: 700, color: T.info + "88", textTransform: "uppercase", textAlign: "right" }}>Monitor · High MRR, Low Risk</div>
            {/* Grid lines */}
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: T.border }} />
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: T.border }} />
            {/* Axis labels */}
            <div style={{ position: "absolute", left: "50%", bottom: -2, transform: "translateX(-50%)", fontSize: 9, color: "#334155", fontWeight: 700, textTransform: "uppercase", background: T.bg, padding: "0 6px" }}>Monthly Revenue →</div>
            <div style={{ position: "absolute", top: "50%", left: -2, transform: "translateY(-50%) rotate(-90deg)", fontSize: 9, color: "#334155", fontWeight: 700, textTransform: "uppercase", background: T.bg, padding: "0 6px" }}>Churn Risk →</div>
            {/* Account dots */}
            {churnData.map(acc => {
              const mrr = parseFloat(acc.mrr?.replace(/[$,]/g, "") || 0);
              const maxMrr = Math.max(...churnData.map(a => parseFloat(a.mrr?.replace(/[$,]/g, "") || 0)));
              const x = Math.max(20, Math.min(380, (mrr / (maxMrr || 1)) * 360 + 20));
              const y = Math.max(20, Math.min(380, (1 - acc.churnRisk / 100) * 360 + 20));
              const riskColor = acc.churnRisk >= 70 ? T.error : acc.churnRisk >= 30 ? T.warning : T.green;
              const size = Math.max(8, mrr / (maxMrr || 1) * 24 + 6);
              return (
                <div key={acc.id} onClick={() => { setSelectedAccount(acc); setTab("detail"); }} title={`${acc.company}: ${acc.churnRisk}% risk, ${acc.mrr}/mo`} style={{
                  position: "absolute", left: `${(x / 400) * 100}%`, top: `${(y / 400) * 100}%`,
                  width: size, height: size, borderRadius: "50%", background: riskColor,
                  border: `2px solid ${riskColor}`, opacity: 0.8, cursor: "pointer",
                  transform: "translate(-50%, -50%)", transition: "all 0.2s",
                  boxShadow: `0 0 8px ${riskColor}44`,
                }} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 14 }}>
            {[
              { color: T.error, label: "Critical (>70%)" },
              { color: T.warning, label: "Warning (30-70%)" },
              { color: T.green, label: "Healthy (<30%)" },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }} />{l.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Account Deep-Dive Tab ═══ */}
      {tab === "detail" && (
        <div>
          {!selectedAccount ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🔬</div>
              <div style={{ fontSize: 14 }}>Select an account from the Portfolio Risk tab to view detailed churn analysis</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Left: Risk Overview */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: "'Playfair Display', serif" }}>{selectedAccount.company}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{selectedAccount.contact} · {selectedAccount.mrr}/mo · {selectedAccount.industry}</div>
                  </div>
                  <button onClick={() => { setSelectedAccount(null); setTab("portfolio"); }} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
                </div>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <ChurnRiskGauge risk={selectedAccount.churnRisk} size={160} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <div style={{ background: T.bg, borderRadius: 8, padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>AI Confidence</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.info, fontFamily: "'Playfair Display', serif" }}>{selectedAccount.confidence}%</div>
                  </div>
                  <div style={{ background: T.bg, borderRadius: 8, padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>Predicted Churn</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: selectedAccount.predictedChurnDate ? T.error : T.green }}>{selectedAccount.predictedChurnDate || "Not expected"}</div>
                  </div>
                </div>

                {/* Risk Trend */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>12-Month Risk Trend</div>
                  <div style={{ height: 60, display: "flex", alignItems: "flex-end", gap: 3 }}>
                    {selectedAccount.history.map((v, i) => {
                      const color = v >= 70 ? T.error : v >= 30 ? T.warning : T.green;
                      return (
                        <div key={i} style={{ flex: 1, position: "relative" }}>
                          <div title={`Month ${i + 1}: ${v}%`} style={{ height: `${v * 0.55}px`, background: color, borderRadius: "3px 3px 0 0", opacity: 0.7 + (i / 12) * 0.3, transition: "height 0.3s" }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: "#334155" }}>12 months ago</span>
                    <span style={{ fontSize: 9, color: "#334155" }}>Today</span>
                  </div>
                </div>

                {/* AI Recommendation */}
                <div style={{ background: `rgba(${hexToRgb(T.green)},0.06)`, border: `1px solid ${T.green}22`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>✦ AI Recommendation</div>
                  <div style={{ fontSize: 12, color: T.subtle, lineHeight: 1.6 }}>{selectedAccount.recommendation}</div>
                </div>
              </div>

              {/* Right: Contributing Factors */}
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Contributing Factors</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {selectedAccount.factors.map((factor, i) => (
                      <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{factor.icon}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{factor.label}</div>
                              <div style={{ fontSize: 10, color: "#475569" }}>{factor.description}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: factor.color, fontFamily: "'Playfair Display', serif" }}>+{factor.impact}%</div>
                            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: factor.trend === "rising" ? "rgba(239,68,68,0.1)" : factor.trend === "falling" ? "rgba(16,185,129,0.1)" : "rgba(100,116,139,0.1)", color: factor.trend === "rising" ? T.error : factor.trend === "falling" ? T.green : T.muted, fontWeight: 600 }}>
                              {factor.trend === "rising" ? "↑ Rising" : factor.trend === "falling" ? "↓ Falling" : "→ Stable"}
                            </span>
                          </div>
                        </div>
                        {/* Impact bar */}
                        <div style={{ height: 4, borderRadius: 2, background: T.border, marginTop: 6 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: factor.color, width: `${factor.impact}%`, transition: "width 0.5s" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model Details */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Model Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                    {[
                      { label: "Model Version", value: "ChurnNet v3.2" },
                      { label: "Last Trained", value: "Feb 28, 2026" },
                      { label: "Training Data", value: "12,847 accounts" },
                      { label: "Feature Inputs", value: "47 signals" },
                      { label: "Prediction Window", value: "90 days" },
                      { label: "Accuracy (AUC)", value: "0.91" },
                    ].map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ color: "#475569" }}>{d.label}</span>
                        <span style={{ color: T.text, fontWeight: 600 }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// FEATURE 3: SUCCESS PLANS
// Goal tracking with milestones, owners, and progress visualization
// ═══════════════════════════════════════════════════════════════════════════

const OBJECTIVE_CATEGORIES = [
  { id: "revenue_growth", label: "Revenue Growth", icon: "💰", color: T.green },
  { id: "cost_reduction", label: "Cost Reduction", icon: "📉", color: T.info },
  { id: "efficiency", label: "Operational Efficiency", icon: "⚡", color: T.warning },
  { id: "risk_mitigation", label: "Risk Mitigation", icon: "🛡️", color: T.purple },
  { id: "adoption", label: "Product Adoption", icon: "🚀", color: "#14b8a6" },
  { id: "other", label: "Other", icon: "📋", color: T.muted },
];

const MILESTONE_STATUSES = {
  pending: { label: "Pending", color: "#475569", icon: "○" },
  in_progress: { label: "In Progress", color: T.warning, icon: "◉" },
  completed: { label: "Completed", color: T.green, icon: "✓" },
  overdue: { label: "Overdue", color: T.error, icon: "!" },
  blocked: { label: "Blocked", color: T.error, icon: "⊘" },
};

const DEMO_SUCCESS_PLANS = [
  {
    id: "sp1", accountId: "d1", accountName: "Acme Health", status: "active",
    name: "Q1 2026 Value Realization Plan",
    createdBy: "Sarah R.", createdAt: "Jan 15, 2026", sharedWithCustomer: true,
    objectives: [
      {
        id: "obj1", title: "Reduce Claims Processing Time by 40%", category: "efficiency",
        targetMetric: "Avg Processing Time", targetValue: 3.6, currentValue: 4.1, unit: "days", dueDate: "Apr 30, 2026",
        milestones: [
          { id: "m1", title: "Complete initial workflow audit", assigneeType: "csm", assigneeName: "Sarah R.", dueDate: "Jan 31, 2026", status: "completed", completedAt: "Jan 28, 2026" },
          { id: "m2", title: "Deploy automation rules for Tier 1 claims", assigneeType: "customer", assigneeName: "Dr. James Chen", dueDate: "Feb 15, 2026", status: "completed", completedAt: "Feb 13, 2026" },
          { id: "m3", title: "Staff training on new dashboard", assigneeType: "customer", assigneeName: "Lisa Park", dueDate: "Mar 1, 2026", status: "completed", completedAt: "Feb 28, 2026" },
          { id: "m4", title: "Enable real-time exception routing", assigneeType: "csm", assigneeName: "Sarah R.", dueDate: "Mar 15, 2026", status: "in_progress" },
          { id: "m5", title: "30-day measurement period", assigneeType: "csm", assigneeName: "Sarah R.", dueDate: "Apr 15, 2026", status: "pending" },
          { id: "m6", title: "Final ROI assessment and report", assigneeType: "csm", assigneeName: "Sarah R.", dueDate: "Apr 30, 2026", status: "pending" },
        ],
      },
      {
        id: "obj2", title: "Achieve 95% User Adoption Across Clinical Staff", category: "adoption",
        targetMetric: "Adoption Rate", targetValue: 95, currentValue: 72, unit: "%", dueDate: "May 31, 2026",
        milestones: [
          { id: "m7", title: "Identify adoption blockers via survey", assigneeType: "csm", assigneeName: "Sarah R.", dueDate: "Feb 1, 2026", status: "completed", completedAt: "Jan 30, 2026" },
          { id: "m8", title: "Deploy targeted training for low-usage departments", assigneeType: "customer", assigneeName: "Lisa Park", dueDate: "Feb 28, 2026", status: "completed", completedAt: "Mar 1, 2026" },
          { id: "m9", title: "Implement in-app guidance tooltips", assigneeType: "csm", assigneeName: "Sarah R.", dueDate: "Mar 15, 2026", status: "in_progress" },
          { id: "m10", title: "Monthly adoption review with champions", assigneeType: "csm", assigneeName: "Sarah R.", dueDate: "Apr 30, 2026", status: "pending" },
        ],
      },
      {
        id: "obj3", title: "Reduce Annual Support Ticket Volume by 25%", category: "cost_reduction",
        targetMetric: "Tickets per Quarter", targetValue: 12, currentValue: 14, unit: "tickets", dueDate: "Jun 30, 2026",
        milestones: [
          { id: "m11", title: "Analyze top ticket categories", assigneeType: "csm", assigneeName: "Sarah R.", dueDate: "Feb 15, 2026", status: "completed", completedAt: "Feb 12, 2026" },
          { id: "m12", title: "Build self-service knowledge base articles", assigneeType: "csm", assigneeName: "Sarah R.", dueDate: "Mar 31, 2026", status: "in_progress" },
          { id: "m13", title: "Enable chatbot for common queries", assigneeType: "customer", assigneeName: "Dr. James Chen", dueDate: "May 15, 2026", status: "pending" },
        ],
      },
    ],
    valueRealized: [
      { metric: "Claims Processing Time Saved", value: "$84,000", evidence: "4,200 hours saved × $20/hr average labor cost", date: "Feb 2026" },
      { metric: "Error Rate Reduction", value: "$42,000", evidence: "14% fewer resubmissions × $300 avg cost per resubmission", date: "Feb 2026" },
      { metric: "Staff Productivity Gain", value: "$31,000", evidence: "8 FTE hours recovered per week across clinical staff", date: "Jan 2026" },
    ],
  },
  {
    id: "sp2", accountId: "d2", accountName: "PinPoint Financial", status: "active",
    name: "Fraud Reduction & Compliance Roadmap",
    createdBy: "Marcus K.", createdAt: "Feb 1, 2026", sharedWithCustomer: true,
    objectives: [
      {
        id: "obj4", title: "Maintain 60%+ Fraud Detection Rate", category: "risk_mitigation",
        targetMetric: "Fraud Detection Rate", targetValue: 65, currentValue: 62, unit: "%", dueDate: "Jun 30, 2026",
        milestones: [
          { id: "m14", title: "Baseline fraud detection audit", assigneeType: "csm", assigneeName: "Marcus K.", dueDate: "Feb 10, 2026", status: "completed", completedAt: "Feb 8, 2026" },
          { id: "m15", title: "Tune ML model thresholds", assigneeType: "customer", assigneeName: "David Chen", dueDate: "Mar 1, 2026", status: "in_progress" },
          { id: "m16", title: "Quarterly detection review", assigneeType: "csm", assigneeName: "Marcus K.", dueDate: "Apr 30, 2026", status: "pending" },
        ],
      },
      {
        id: "obj5", title: "Achieve SOC 2 Type II Audit Readiness", category: "risk_mitigation",
        targetMetric: "Compliance Score", targetValue: 100, currentValue: 78, unit: "%", dueDate: "Jul 31, 2026",
        milestones: [
          { id: "m17", title: "Gap analysis on current controls", assigneeType: "csm", assigneeName: "Marcus K.", dueDate: "Feb 28, 2026", status: "completed", completedAt: "Feb 25, 2026" },
          { id: "m18", title: "Remediate critical findings", assigneeType: "customer", assigneeName: "David Chen", dueDate: "Apr 15, 2026", status: "in_progress" },
          { id: "m19", title: "Pre-audit readiness check", assigneeType: "csm", assigneeName: "Marcus K.", dueDate: "Jun 30, 2026", status: "pending" },
        ],
      },
    ],
    valueRealized: [
      { metric: "Fraud Losses Prevented", value: "$1,200,000", evidence: "62% detection rate on $1.94M attempted fraud", date: "Feb 2026" },
      { metric: "Compliance Audit Savings", value: "$85,000", evidence: "Automated evidence collection reduced audit prep by 70%", date: "Jan 2026" },
    ],
  },
  {
    id: "sp3", accountId: "d3", accountName: "TalentForge", status: "active",
    name: "Hiring Velocity Improvement Plan",
    createdBy: "Jamie L.", createdAt: "Jan 20, 2026", sharedWithCustomer: false,
    objectives: [
      {
        id: "obj6", title: "Reduce Time-to-Hire by 35%", category: "efficiency",
        targetMetric: "Avg Time-to-Hire", targetValue: 24, currentValue: 28, unit: "days", dueDate: "May 31, 2026",
        milestones: [
          { id: "m20", title: "Implement automated screening", assigneeType: "customer", assigneeName: "Marcus Williams", dueDate: "Feb 15, 2026", status: "completed", completedAt: "Feb 14, 2026" },
          { id: "m21", title: "Configure interview scheduling automation", assigneeType: "csm", assigneeName: "Jamie L.", dueDate: "Mar 15, 2026", status: "in_progress" },
          { id: "m22", title: "Deploy candidate experience survey", assigneeType: "csm", assigneeName: "Jamie L.", dueDate: "Apr 30, 2026", status: "pending" },
        ],
      },
    ],
    valueRealized: [
      { metric: "Recruiter Time Saved", value: "$18,000", evidence: "12 hrs/week saved across 3 recruiters × $500/hr", date: "Feb 2026" },
    ],
  },
];

const AI_SUGGESTED_GOALS = {
  healthcare: [
    { title: "Reduce Average Claims Processing Time by 30%", metric: "Avg Processing Time", unit: "days", target: 3.5, category: "efficiency" },
    { title: "Achieve 90%+ User Adoption Across Departments", metric: "Adoption Rate", unit: "%", target: 90, category: "adoption" },
    { title: "Reduce Compliance Audit Findings by 50%", metric: "Audit Findings", unit: "count", target: 3, category: "risk_mitigation" },
    { title: "Increase Revenue Cycle Efficiency by 20%", metric: "Days in AR", unit: "days", target: 28, category: "revenue_growth" },
  ],
  fintech: [
    { title: "Achieve 60%+ Fraud Detection Rate", metric: "Detection Rate", unit: "%", target: 60, category: "risk_mitigation" },
    { title: "Reduce Transaction Processing Latency by 40%", metric: "Avg Latency", unit: "ms", target: 120, category: "efficiency" },
    { title: "Reach SOC 2 Type II Compliance Readiness", metric: "Compliance Score", unit: "%", target: 100, category: "risk_mitigation" },
  ],
  saas: [
    { title: "Increase Daily Active Users by 25%", metric: "DAU/MAU", unit: "%", target: 45, category: "adoption" },
    { title: "Reduce Churn Rate Below Industry Average", metric: "Annual Churn", unit: "%", target: 4.0, category: "risk_mitigation" },
    { title: "Grow Net Revenue Retention to 110%+", metric: "NRR", unit: "%", target: 110, category: "revenue_growth" },
  ],
  hrtech: [
    { title: "Reduce Time-to-Hire by 35%", metric: "Avg Time-to-Hire", unit: "days", target: 24, category: "efficiency" },
    { title: "Improve Employee Retention Rate by 15%", metric: "Retention Rate", unit: "%", target: 88, category: "cost_reduction" },
    { title: "Achieve 85%+ Platform Adoption", metric: "Adoption Rate", unit: "%", target: 85, category: "adoption" },
  ],
  realestate: [
    { title: "Increase Agent Productivity by 20%", metric: "Deals per Agent", unit: "deals/mo", target: 4.8, category: "revenue_growth" },
    { title: "Reduce Days on Market by 15%", metric: "Avg Days on Market", unit: "days", target: 32, category: "efficiency" },
    { title: "Grow Conversion Rate to 4%+", metric: "Lead Conversion", unit: "%", target: 4.0, category: "revenue_growth" },
  ],
};

function SuccessPlansPanel({ accounts, navigate }) {
  const [plans, setPlans] = useState(DEMO_SUCCESS_PLANS);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [view, setView] = useState("list"); // list | detail | create
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [expandedObjective, setExpandedObjective] = useState(null);

  // New plan creation state
  const [newPlan, setNewPlan] = useState({
    accountId: "", name: "", objectives: [],
  });
  const [newObjective, setNewObjective] = useState({
    title: "", category: "efficiency", targetMetric: "", targetValue: "", currentValue: "", unit: "", dueDate: "",
  });
  const [newMilestone, setNewMilestone] = useState({
    title: "", assigneeType: "csm", assigneeName: "", dueDate: "",
  });
  const [addingMilestone, setAddingMilestone] = useState(null); // objective id

  const getCompletionPct = (plan) => {
    const allMilestones = plan.objectives.flatMap(o => o.milestones);
    if (allMilestones.length === 0) return 0;
    return Math.round((allMilestones.filter(m => m.status === "completed").length / allMilestones.length) * 100);
  };

  const getTotalValue = (plan) => {
    return plan.valueRealized.reduce((s, v) => {
      const num = parseFloat(v.value.replace(/[$,]/g, ""));
      return s + (isNaN(num) ? 0 : num);
    }, 0);
  };

  const toggleMilestoneStatus = (planId, objectiveId, milestoneId) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return {
        ...p,
        objectives: p.objectives.map(o => {
          if (o.id !== objectiveId) return o;
          return {
            ...o,
            milestones: o.milestones.map(m => {
              if (m.id !== milestoneId) return m;
              const nextStatus = m.status === "pending" ? "in_progress" : m.status === "in_progress" ? "completed" : m.status === "completed" ? "pending" : "in_progress";
              return { ...m, status: nextStatus, completedAt: nextStatus === "completed" ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null };
            }),
          };
        }),
      };
    }));
  };

  const requestAiSuggestions = (industry) => {
    setAiLoading(true);
    setShowAiSuggestions(true);
    setTimeout(() => {
      setAiSuggestions(AI_SUGGESTED_GOALS[industry] || AI_SUGGESTED_GOALS.saas);
      setAiLoading(false);
    }, 2000);
  };

  const addSuggestedGoal = (goal) => {
    const newObj = {
      id: `obj-${Date.now()}`, title: goal.title, category: goal.category,
      targetMetric: goal.metric, targetValue: goal.target, currentValue: 0, unit: goal.unit,
      dueDate: "Jun 30, 2026", milestones: [],
    };
    setNewPlan(prev => ({ ...prev, objectives: [...prev.objectives, newObj] }));
    setAiSuggestions(prev => prev.filter(s => s.title !== goal.title));
  };

  const savePlan = () => {
    if (!newPlan.accountId || !newPlan.name) return;
    const account = accounts.find(a => a.id === newPlan.accountId);
    const plan = {
      id: `sp-${Date.now()}`, accountId: newPlan.accountId, accountName: account?.company || "Unknown",
      status: "active", name: newPlan.name, createdBy: "Sarah R.",
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      sharedWithCustomer: false, objectives: newPlan.objectives, valueRealized: [],
    };
    setPlans(prev => [plan, ...prev]);
    setNewPlan({ accountId: "", name: "", objectives: [] });
    setView("list");
  };

  const addObjectiveToPlan = () => {
    if (!newObjective.title) return;
    const obj = {
      id: `obj-${Date.now()}`, ...newObjective,
      targetValue: parseFloat(newObjective.targetValue) || 0,
      currentValue: parseFloat(newObjective.currentValue) || 0,
      milestones: [],
    };
    setNewPlan(prev => ({ ...prev, objectives: [...prev.objectives, obj] }));
    setNewObjective({ title: "", category: "efficiency", targetMetric: "", targetValue: "", currentValue: "", unit: "", dueDate: "" });
  };

  const addMilestoneToObjective = (planId, objectiveId) => {
    if (!newMilestone.title) return;
    const milestone = {
      id: `m-${Date.now()}`, ...newMilestone, status: "pending", completedAt: null,
    };
    if (planId) {
      // Adding to existing plan
      setPlans(prev => prev.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          objectives: p.objectives.map(o => {
            if (o.id !== objectiveId) return o;
            return { ...o, milestones: [...o.milestones, milestone] };
          }),
        };
      }));
    } else {
      // Adding to new plan being created
      setNewPlan(prev => ({
        ...prev,
        objectives: prev.objectives.map(o => {
          if (o.id !== objectiveId) return o;
          return { ...o, milestones: [...o.milestones, milestone] };
        }),
      }));
    }
    setNewMilestone({ title: "", assigneeType: "csm", assigneeName: "", dueDate: "" });
    setAddingMilestone(null);
  };

  const totalPlans = plans.length;
  const activePlans = plans.filter(p => p.status === "active").length;
  const totalValue = plans.reduce((s, p) => s + getTotalValue(p), 0);
  const avgCompletion = plans.length > 0 ? Math.round(plans.reduce((s, p) => s + getCompletionPct(p), 0) / plans.length) : 0;

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="📋" title="Success Plans" color={T.green}
        bullets={[
          "Create structured success plans with measurable objectives, milestones, and owners — track progress visually and share with customers to align on value delivery.",
          "AI suggests goals based on industry best practices. Each objective has a target metric, current baseline, and milestone checklist with status tracking.",
          "Quantify value realized across all plans so you can walk into any renewal or QBR with hard numbers on ROI delivered.",
        ]}
        workflow={[
          "Create a plan for an account and define objectives with target metrics",
          "Add milestones with owners (CSM or customer-side) and due dates",
          "Track progress by toggling milestone status as work gets done",
          "Share with customers and reference value realized at renewals",
        ]}
        outputLabel="What You Track"
        outputItems={[
          { icon: "🎯", text: "Objectives with measurable targets and baselines" },
          { icon: "✅", text: "Milestones with owners, dates, and status" },
          { icon: "💰", text: "Value realized — quantified ROI delivered" },
          { icon: "🤖", text: "AI-suggested goals by industry" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "👤", text: "CSMs building joint action plans with customers" },
          { icon: "🤝", text: "Champions who want visibility into progress" },
          { icon: "📊", text: "CS leaders measuring value delivery across the book" },
        ]}
      />
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Active Plans", value: activePlans, color: T.green, sub: `${totalPlans} total`, icon: "📋" },
          { label: "Avg Completion", value: `${avgCompletion}%`, color: T.info, sub: "Across all plans", icon: "📊" },
          { label: "Value Realized", value: `$${(totalValue / 1000).toFixed(0)}K`, color: T.green, sub: "Quantified ROI delivered", icon: "💰" },
          { label: "Milestones Due", value: plans.reduce((s, p) => s + p.objectives.flatMap(o => o.milestones).filter(m => m.status === "in_progress" || m.status === "pending").length, 0), color: T.warning, sub: "Open items", icon: "⏳" },
        ].map((card, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>{card.label}</span>
              <span style={{ fontSize: 14 }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color, fontFamily: "'Playfair Display', serif" }}>{card.value}</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
          {[
            { id: "list", label: "All Plans", icon: "📋" },
            { id: "create", label: "Create Plan", icon: "✦" },
          ].map(t => (
            <button key={t.id} onClick={() => { setView(t.id); if (t.id === "list") setSelectedPlan(null); }} style={{
              padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: view === t.id ? `rgba(${hexToRgb(T.green)},0.12)` : "transparent",
              color: view === t.id ? T.green : "#475569", fontSize: 12, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 5,
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {/* ═══ Plan List View ═══ */}
      {view === "list" && !selectedPlan && (
        <div style={{ display: "grid", gap: 12 }}>
          {plans.map(plan => {
            const completion = getCompletionPct(plan);
            const totalVal = getTotalValue(plan);
            const allMilestones = plan.objectives.flatMap(o => o.milestones);
            const overdue = allMilestones.filter(m => m.status === "overdue").length;
            return (
              <div key={plan.id} onClick={() => { setSelectedPlan(plan); setView("detail"); }} style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", cursor: "pointer",
                transition: "border-color 0.2s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "'Playfair Display', serif" }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{plan.accountName} · Created {plan.createdAt} by {plan.createdBy}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {plan.sharedWithCustomer && (
                      <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(16,185,129,0.08)", color: T.green, fontWeight: 600 }}>🔗 Shared</span>
                    )}
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(16,185,129,0.08)", color: T.green, fontWeight: 600, textTransform: "capitalize" }}>{plan.status}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#475569" }}>{completion}% complete</span>
                    <span style={{ fontSize: 11, color: "#475569" }}>{allMilestones.filter(m => m.status === "completed").length}/{allMilestones.length} milestones</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: T.border }}>
                    <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${T.green}, ${T.greenLight})`, width: `${completion}%`, transition: "width 0.5s" }} />
                  </div>
                </div>

                {/* Objectives summary */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {plan.objectives.map(obj => {
                    const cat = OBJECTIVE_CATEGORIES.find(c => c.id === obj.category);
                    const objCompletion = obj.milestones.length > 0
                      ? Math.round((obj.milestones.filter(m => m.status === "completed").length / obj.milestones.length) * 100)
                      : 0;
                    return (
                      <div key={obj.id} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", flex: "1 1 200px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 12 }}>{cat?.icon}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{obj.title.length > 40 ? obj.title.slice(0, 40) + "..." : obj.title}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "#475569" }}>{obj.currentValue}/{obj.targetValue} {obj.unit}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: objCompletion === 100 ? T.green : T.info }}>{objCompletion}%</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: T.border, marginTop: 4 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: cat?.color || T.green, width: `${objCompletion}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Value realized */}
                {totalVal > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#475569" }}>Value Realized</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.green, fontFamily: "'Playfair Display', serif" }}>${(totalVal / 1000).toFixed(0)}K</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Plan Detail View ═══ */}
      {view === "detail" && selectedPlan && (
        <div>
          <button onClick={() => { setSelectedPlan(null); setView("list"); }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 11, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 14 }}>← Back to All Plans</button>

          {/* Plan Header */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.text, fontFamily: "'Playfair Display', serif" }}>{selectedPlan.name}</div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>{selectedPlan.accountName} · Created {selectedPlan.createdAt}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, color: T.subtle, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>🔗 Share with Customer</button>
                <button style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, color: T.green, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>✦ Generate Value Report</button>
              </div>
            </div>

            {/* Overall progress */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {(() => {
                const allM = selectedPlan.objectives.flatMap(o => o.milestones);
                const comp = getCompletionPct(selectedPlan);
                return [
                  { label: "Completion", value: `${comp}%`, color: T.green },
                  { label: "Objectives", value: selectedPlan.objectives.length, color: T.info },
                  { label: "Open Milestones", value: allM.filter(m => m.status !== "completed").length, color: T.warning },
                  { label: "Value Delivered", value: `$${(getTotalValue(selectedPlan)/1000).toFixed(0)}K`, color: T.green },
                ].map((s, i) => (
                  <div key={i} style={{ background: T.bg, borderRadius: 8, padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Objectives */}
          {selectedPlan.objectives.map(obj => {
            const cat = OBJECTIVE_CATEGORIES.find(c => c.id === obj.category);
            const objCompletion = obj.milestones.length > 0
              ? Math.round((obj.milestones.filter(m => m.status === "completed").length / obj.milestones.length) * 100)
              : 0;
            const progressPct = obj.targetValue > 0 ? Math.min(100, Math.round((obj.currentValue / obj.targetValue) * 100)) : 0;
            const isExpanded = expandedObjective === obj.id;
            return (
              <div key={obj.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 12 }}>
                <div onClick={() => setExpandedObjective(isExpanded ? null : obj.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer", marginBottom: isExpanded ? 16 : 0 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(${hexToRgb(cat?.color || T.green)},0.1)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{cat?.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{obj.title}</div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                        Target: {obj.targetValue} {obj.unit} · Current: {obj.currentValue} {obj.unit} · Due: {obj.dueDate}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                        <div style={{ width: 120, height: 5, borderRadius: 3, background: T.border }}>
                          <div style={{ height: "100%", borderRadius: 3, background: cat?.color || T.green, width: `${progressPct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: cat?.color || T.green, fontWeight: 600 }}>{progressPct}% to target</span>
                        <span style={{ fontSize: 10, color: "#475569" }}>· {objCompletion}% milestones done</span>
                      </div>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, marginTop: 4 }}><polyline points="6 9 12 15 18 9"/></svg>
                </div>

                {/* Expanded milestones */}
                {isExpanded && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Milestones</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {obj.milestones.map(m => {
                        const ms = MILESTONE_STATUSES[m.status];
                        return (
                          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                            <button onClick={(e) => { e.stopPropagation(); toggleMilestoneStatus(selectedPlan.id, obj.id, m.id); }} style={{
                              width: 24, height: 24, borderRadius: 6, border: `2px solid ${ms.color}`,
                              background: m.status === "completed" ? ms.color : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", fontSize: 12, color: m.status === "completed" ? "#fff" : ms.color, fontWeight: 700, flexShrink: 0,
                            }}>{ms.icon}</button>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: m.status === "completed" ? "#475569" : T.text, textDecoration: m.status === "completed" ? "line-through" : "none", fontWeight: 500 }}>{m.title}</div>
                              <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>
                                {m.assigneeType === "csm" ? "👤" : "🏢"} {m.assigneeName} · Due: {m.dueDate}
                                {m.completedAt && <span style={{ color: T.green }}> · Completed: {m.completedAt}</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `rgba(${hexToRgb(ms.color)},0.1)`, color: ms.color, fontWeight: 600 }}>{ms.label}</span>
                          </div>
                        );
                      })}

                      {/* Add milestone inline */}
                      {addingMilestone === obj.id ? (
                        <div style={{ padding: "12px 14px", background: T.bg, borderRadius: 8, border: `1px dashed ${T.green}44` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr 100px", gap: 8, marginBottom: 8 }}>
                            <input placeholder="Milestone title" value={newMilestone.title} onChange={e => setNewMilestone(p => ({ ...p, title: e.target.value }))} style={{ ...inputStyle, fontSize: 12, padding: "7px 10px" }} />
                            <select value={newMilestone.assigneeType} onChange={e => setNewMilestone(p => ({ ...p, assigneeType: e.target.value }))} style={{ ...inputStyle, fontSize: 11, padding: "7px 8px" }}>
                              <option value="csm">CSM</option><option value="customer">Customer</option>
                            </select>
                            <input placeholder="Assignee name" value={newMilestone.assigneeName} onChange={e => setNewMilestone(p => ({ ...p, assigneeName: e.target.value }))} style={{ ...inputStyle, fontSize: 12, padding: "7px 10px" }} />
                            <input type="date" value={newMilestone.dueDate} onChange={e => setNewMilestone(p => ({ ...p, dueDate: e.target.value }))} style={{ ...inputStyle, fontSize: 11, padding: "7px 8px" }} />
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => addMilestoneToObjective(selectedPlan.id, obj.id)} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Add</button>
                            <button onClick={() => setAddingMilestone(null)} style={{ background: "none", color: "#475569", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAddingMilestone(obj.id)} style={{ padding: "10px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "transparent", color: "#475569", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Add Milestone</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Value Realized */}
          {selectedPlan.valueRealized.length > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.green}22`, borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.green, marginBottom: 14 }}>💰 Value Realized</div>
              <div style={{ display: "grid", gap: 8 }}>
                {selectedPlan.valueRealized.map((v, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: `rgba(${hexToRgb(T.green)},0.04)`, borderRadius: 8, border: `1px solid ${T.green}11` }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v.metric}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{v.evidence}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: T.green, fontFamily: "'Playfair Display', serif" }}>{v.value}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{v.date}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#475569", marginRight: 10 }}>Total Value Delivered:</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: T.green, fontFamily: "'Playfair Display', serif" }}>${(getTotalValue(selectedPlan)/1000).toFixed(0)}K</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Create Plan View ═══ */}
      {view === "create" && (
        <div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px", marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "'Playfair Display', serif", marginBottom: 16 }}>Create New Success Plan</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Account</label>
                <select value={newPlan.accountId} onChange={e => setNewPlan(p => ({ ...p, accountId: e.target.value }))} style={inputStyle}>
                  <option value="">Select account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.company}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Plan Name</label>
                <input value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Q1 2026 Value Realization Plan" style={inputStyle} />
              </div>
            </div>

            {/* AI Suggestions */}
            {newPlan.accountId && (
              <div style={{ marginBottom: 16 }}>
                <button onClick={() => {
                  const acc = accounts.find(a => a.id === newPlan.accountId);
                  requestAiSuggestions(acc?.industry || "saas");
                }} disabled={aiLoading} style={{ background: `rgba(${hexToRgb(T.green)},0.08)`, color: T.green, border: `1px solid ${T.green}33`, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                  {aiLoading ? <span style={{ width: 12, height: 12, border: "2px solid rgba(16,185,129,0.3)", borderTopColor: T.green, borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> : "✦"}
                  {aiLoading ? "Generating AI Suggestions..." : "Suggest Goals with AI"}
                </button>

                {showAiSuggestions && !aiLoading && aiSuggestions.length > 0 && (
                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI-Suggested Objectives</div>
                    {aiSuggestions.map((goal, i) => {
                      const cat = OBJECTIVE_CATEGORIES.find(c => c.id === goal.category);
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: `rgba(${hexToRgb(T.green)},0.04)`, borderRadius: 8, border: `1px solid ${T.green}22` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{cat?.icon}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{goal.title}</div>
                              <div style={{ fontSize: 10, color: "#475569" }}>Target: {goal.target} {goal.unit}</div>
                            </div>
                          </div>
                          <button onClick={() => addSuggestedGoal(goal)} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Add</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Manual Objective Add */}
            <div style={{ background: T.bg, borderRadius: 10, padding: "16px", border: `1px solid ${T.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Add Objective Manually</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10, marginBottom: 8 }}>
                <div>
                  <label style={labelStyle}>Objective Title</label>
                  <input value={newObjective.title} onChange={e => setNewObjective(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Reduce processing time by 30%" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={newObjective.category} onChange={e => setNewObjective(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                    {OBJECTIVE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 60px 120px", gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Metric</label><input value={newObjective.targetMetric} onChange={e => setNewObjective(p => ({ ...p, targetMetric: e.target.value }))} placeholder="e.g., Processing Time" style={inputStyle} /></div>
                <div><label style={labelStyle}>Target</label><input type="number" value={newObjective.targetValue} onChange={e => setNewObjective(p => ({ ...p, targetValue: e.target.value }))} placeholder="3.5" style={inputStyle} /></div>
                <div><label style={labelStyle}>Current</label><input type="number" value={newObjective.currentValue} onChange={e => setNewObjective(p => ({ ...p, currentValue: e.target.value }))} placeholder="5.0" style={inputStyle} /></div>
                <div><label style={labelStyle}>Unit</label><input value={newObjective.unit} onChange={e => setNewObjective(p => ({ ...p, unit: e.target.value }))} placeholder="days" style={inputStyle} /></div>
                <div><label style={labelStyle}>Due Date</label><input type="date" value={newObjective.dueDate} onChange={e => setNewObjective(p => ({ ...p, dueDate: e.target.value }))} style={inputStyle} /></div>
              </div>
              <button onClick={addObjectiveToPlan} disabled={!newObjective.title} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: newObjective.title ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", opacity: newObjective.title ? 1 : 0.5 }}>+ Add Objective</button>
            </div>

            {/* Added objectives preview */}
            {newPlan.objectives.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Plan Objectives ({newPlan.objectives.length})</div>
                {newPlan.objectives.map(obj => {
                  const cat = OBJECTIVE_CATEGORIES.find(c => c.id === obj.category);
                  return (
                    <div key={obj.id} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{cat?.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{obj.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>
                        {obj.targetMetric}: {obj.currentValue} → {obj.targetValue} {obj.unit} · Due: {obj.dueDate}
                      </div>
                      {/* Milestones for this objective */}
                      {obj.milestones.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          {obj.milestones.map(m => (
                            <div key={m.id} style={{ fontSize: 11, color: "#475569", padding: "4px 0 4px 20px", borderLeft: `2px solid ${T.border}` }}>
                              {m.title} · {m.assigneeName} · {m.dueDate}
                            </div>
                          ))}
                        </div>
                      )}
                      {addingMilestone === obj.id ? (
                        <div style={{ padding: "10px", background: T.surface, borderRadius: 6, border: `1px dashed ${T.green}44` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 100px", gap: 6, marginBottom: 6 }}>
                            <input placeholder="Milestone title" value={newMilestone.title} onChange={e => setNewMilestone(p => ({ ...p, title: e.target.value }))} style={{ ...inputStyle, fontSize: 11, padding: "6px 8px" }} />
                            <select value={newMilestone.assigneeType} onChange={e => setNewMilestone(p => ({ ...p, assigneeType: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: "6px" }}>
                              <option value="csm">CSM</option><option value="customer">Customer</option>
                            </select>
                            <input placeholder="Assignee" value={newMilestone.assigneeName} onChange={e => setNewMilestone(p => ({ ...p, assigneeName: e.target.value }))} style={{ ...inputStyle, fontSize: 11, padding: "6px 8px" }} />
                            <input type="date" value={newMilestone.dueDate} onChange={e => setNewMilestone(p => ({ ...p, dueDate: e.target.value }))} style={{ ...inputStyle, fontSize: 10, padding: "6px" }} />
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => addMilestoneToObjective(null, obj.id)} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Add</button>
                            <button onClick={() => setAddingMilestone(null)} style={{ background: "none", color: "#475569", border: `1px solid ${T.border}`, borderRadius: 4, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAddingMilestone(obj.id)} style={{ fontSize: 10, color: "#475569", background: "none", border: `1px dashed ${T.border}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Add Milestone</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save Plan */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={savePlan} disabled={!newPlan.accountId || !newPlan.name || newPlan.objectives.length === 0} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: newPlan.accountId && newPlan.name && newPlan.objectives.length > 0 ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", opacity: newPlan.accountId && newPlan.name && newPlan.objectives.length > 0 ? 1 : 0.5 }}>Create Success Plan</button>
              <button onClick={() => setView("list")} style={{ background: "none", color: "#475569", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 28px", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER LIFECYCLE TRACKER (Blueprint §3.14, P1)
// ═══════════════════════════════════════════════════════════════════════════
function LifecycleTrackerPanel({ accounts }) {
  const STAGES = [
    { id: "onboarding", label: "Onboarding", color: "#06b6d4", icon: "🚀", milestones: ["Kickoff call", "Data integration", "First report run", "Training complete"] },
    { id: "implementation", label: "Implementation", color: "#8b5cf6", icon: "⚙️", milestones: ["Workflows configured", "Team trained", "Integrations live", "Admin handoff"] },
    { id: "adoption", label: "Adoption", color: "#f59e0b", icon: "📈", milestones: ["50% DAU reached", "Key features adopted", "Self-serve achieved", "First QBR delivered"] },
    { id: "growth", label: "Growth", color: "#10b981", icon: "🌱", milestones: ["Expansion identified", "Champion developed", "Use case expanded", "ROI documented"] },
    { id: "renewal", label: "Renewal", color: "#3b82f6", icon: "🔄", milestones: ["Renewal prep started", "Business case delivered", "Stakeholder aligned", "Contract signed"] },
    { id: "expansion", label: "Expansion", color: "#ec4899", icon: "⬆️", milestones: ["Upsell proposed", "POC approved", "Deal closed", "Onboarding (new)"] },
  ];
  const [accountData, setAccountData] = useState(() =>
    accounts.map((a, i) => ({
      ...a, currentStage: STAGES[Math.min(i % 5, 4)].id,
      completedMilestones: STAGES[Math.min(i % 5, 4)].milestones.slice(0, 1 + (i % 3)),
      stageEnteredAt: new Date(Date.now() - (10 + i * 5) * 86400000).toISOString(),
    }))
  );
  const [selectedAccount, setSelectedAccount] = useState(accountData[0]?.id || null);
  const selected = accountData.find(a => a.id === selectedAccount);
  const currentStageObj = STAGES.find(s => s.id === selected?.currentStage);
  const currentIdx = STAGES.findIndex(s => s.id === selected?.currentStage);

  const toggleMilestone = (ms) => {
    setAccountData(prev => prev.map(a => {
      if (a.id !== selectedAccount) return a;
      const has = a.completedMilestones.includes(ms);
      return { ...a, completedMilestones: has ? a.completedMilestones.filter(m => m !== ms) : [...a.completedMilestones, ms] };
    }));
  };
  const moveStage = (dir) => {
    const newIdx = currentIdx + dir;
    if (newIdx < 0 || newIdx >= STAGES.length) return;
    setAccountData(prev => prev.map(a => a.id !== selectedAccount ? a : { ...a, currentStage: STAGES[newIdx].id, completedMilestones: [], stageEnteredAt: new Date().toISOString() }));
  };

  const stageCounts = {};
  STAGES.forEach(s => { stageCounts[s.id] = accountData.filter(a => a.currentStage === s.id).length; });

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="🔄" title="Customer Lifecycle Tracker" color="#8b5cf6"
        bullets={[
          "Visualizes every account's journey through lifecycle stages — Onboarding, Adoption, Growth, Renewal, and Expansion — with milestone tracking at each stage.",
          "Each stage has defined milestones that you check off as the customer progresses. When all milestones are complete, advance the account to the next stage.",
          "Stage funnel overview shows how many accounts sit at each phase so you can spot bottlenecks — too many stuck in Onboarding? Not enough reaching Growth?",
        ]}
        workflow={[
          "Accounts are assigned a lifecycle stage based on their maturity",
          "Complete milestones within each stage as the customer progresses",
          "Advance accounts to the next stage when milestones are met",
          "Monitor the funnel to identify bottlenecks and stalled accounts",
        ]}
        outputLabel="Lifecycle Stages"
        outputItems={[
          { icon: "🚀", text: "Onboarding — kickoff, integration, training" },
          { icon: "⚙️", text: "Implementation — config, go-live, handoff" },
          { icon: "📈", text: "Adoption & Growth — usage, expansion, ROI" },
          { icon: "🔄", text: "Renewal & Expansion — retention and upsell" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "👤", text: "CSMs tracking account maturity and next steps" },
          { icon: "📊", text: "CS leaders identifying funnel bottlenecks" },
          { icon: "🔧", text: "Onboarding teams tracking implementation progress" },
        ]}
      />
      {/* Stage funnel overview */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {STAGES.map((s, i) => (
          <div key={s.id} style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: s.color }} />
            <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: s.color, fontWeight: 700 }}>{stageCounts[s.id]}</div>
            <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>accounts</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {/* Account list */}
        <div style={{ width: 280, flexShrink: 0, overflowY: "auto", maxHeight: 600 }}>
          {accountData.map(a => {
            const stage = STAGES.find(s => s.id === a.currentStage);
            return (
              <button key={a.id} onClick={() => setSelectedAccount(a.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: selectedAccount === a.id ? `rgba(${hexToRgb(T.green)},0.08)` : "transparent", marginBottom: 2, textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: stage?.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.company}</div>
                  <div style={{ fontSize: 10.5, color: "#475569" }}>{stage?.label}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail view */}
        {selected && currentStageObj && (
          <div style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: T.text }}>{selected.company}</h3>
                <p style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Stage entered: {new Date(selected.stageEnteredAt).toLocaleDateString()}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => moveStage(-1)} disabled={currentIdx === 0} style={{ background: T.surface3, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, color: currentIdx === 0 ? "#334155" : T.subtle, cursor: currentIdx === 0 ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Prev Stage</button>
                <button onClick={() => moveStage(1)} disabled={currentIdx === STAGES.length - 1} style={{ background: T.green, border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#fff", cursor: currentIdx === STAGES.length - 1 ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: currentIdx === STAGES.length - 1 ? 0.5 : 1 }}>Next Stage →</button>
              </div>
            </div>

            {/* Visual stage tracker */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24, padding: "16px 0" }}>
              {STAGES.map((s, i) => {
                const isActive = s.id === selected.currentStage;
                const isPast = i < currentIdx;
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: isPast ? s.color : isActive ? s.color : T.surface3, border: `2px solid ${isPast || isActive ? s.color : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isActive ? 14 : 12, transition: "all 0.3s" }}>
                        {isPast ? "✓" : s.icon}
                      </div>
                      <div style={{ fontSize: 9, color: isActive ? s.color : "#475569", fontWeight: isActive ? 700 : 400, marginTop: 4, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                    </div>
                    {i < STAGES.length - 1 && <div style={{ flex: 1, height: 2, background: isPast ? STAGES[i+1]?.color || T.border : T.border, margin: "0 4px", marginBottom: 18 }} />}
                  </div>
                );
              })}
            </div>

            {/* Milestones for current stage */}
            <div style={{ background: T.bg, borderRadius: 12, padding: "18px 20px", border: `1px solid ${currentStageObj.color}22` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: currentStageObj.color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{currentStageObj.icon} {currentStageObj.label} Milestones</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {currentStageObj.milestones.map(ms => {
                  const done = selected.completedMilestones.includes(ms);
                  return (
                    <button key={ms} onClick={() => toggleMilestone(ms)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${done ? currentStageObj.color + "33" : T.border}`, background: done ? `rgba(${hexToRgb(currentStageObj.color)},0.06)` : "transparent", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${done ? currentStageObj.color : T.border}`, background: done ? currentStageObj.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", flexShrink: 0 }}>{done ? "✓" : ""}</div>
                      <span style={{ fontSize: 12.5, color: done ? T.text : T.subtle, fontWeight: done ? 600 : 400 }}>{ms}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: T.surface3, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${(selected.completedMilestones.filter(m => currentStageObj.milestones.includes(m)).length / currentStageObj.milestones.length) * 100}%`, height: "100%", background: currentStageObj.color, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 11, color: currentStageObj.color, fontWeight: 700 }}>{selected.completedMilestones.filter(m => currentStageObj.milestones.includes(m)).length}/{currentStageObj.milestones.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM PERFORMANCE & COACHING ANALYTICS (Blueprint §3.13, P2)
// ═══════════════════════════════════════════════════════════════════════════
function TeamPerformancePanel({ accounts }) {
  const [period, setPeriod] = useState("month");
  const [selectedCSM, setSelectedCSM] = useState(null);

  const csmStats = TEAM_MEMBERS.filter(m => m.id !== "unassigned").map(m => {
    const assigned = accounts.filter(a => a.assignedTo === m.id);
    const atRisk = assigned.filter(a => a.status === "at-risk").length;
    const renewed = assigned.filter(a => a.status === "renewed").length;
    const expanded = assigned.filter(a => a.status === "expanded").length;
    const healthAvg = assigned.length > 0 ? Math.round(60 + Math.random() * 30) : 0;
    const responseTime = Math.round(1.5 + Math.random() * 6);
    const npsAvg = Math.round(30 + Math.random() * 55);
    const tasksCompleted = Math.round(8 + Math.random() * 20);
    const emailsSent = Math.round(15 + Math.random() * 40);
    return { ...m, assigned: assigned.length, atRisk, renewed, expanded, healthAvg, responseTime, npsAvg, tasksCompleted, emailsSent };
  });

  const totalAccounts = accounts.length;
  const avgHealth = csmStats.length > 0 ? Math.round(csmStats.reduce((s, c) => s + c.healthAvg, 0) / csmStats.length) : 0;
  const totalRenewed = csmStats.reduce((s, c) => s + c.renewed, 0);
  const totalAtRisk = csmStats.reduce((s, c) => s + c.atRisk, 0);
  const selected = csmStats.find(c => c.id === selectedCSM);

  const coachingInsights = [
    { csm: "Sarah R.", insight: "Highest renewal rate — consider having her mentor newer CSMs on QBR preparation techniques.", type: "strength", color: T.green },
    { csm: "Marcus K.", insight: "Response time trending up (4.2h → 6.1h). Suggest redistributing 2 accounts or automating check-in emails.", type: "watch", color: T.warning },
    { csm: "Jamie L.", insight: "Strong NPS scores but low expansion rate. Coach on identifying upsell signals during health check calls.", type: "opportunity", color: T.info },
  ];

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="👥" title="Team Performance" color={T.warning}
        bullets={[
          "CSM leaderboards with accounts managed, health scores, renewal rates, response times, NPS averages, and task completion — see who's crushing it and who needs support.",
          "Click any CSM for a detailed profile showing their full account breakdown, performance metrics, and trends over the selected time period.",
          "AI-powered coaching insights identify strengths, watch items, and growth opportunities for each team member with actionable recommendations.",
        ]}
        workflow={[
          "Team KPIs populate automatically from account health, renewal, and engagement data",
          "Select a time period (week, month, quarter) to see trending performance",
          "Click a CSM name for detailed account-level breakdown and metrics",
          "Review AI coaching insights to guide 1:1s and performance conversations",
        ]}
        outputLabel="Metrics Tracked"
        outputItems={[
          { icon: "📊", text: "Accounts managed, health scores, renewal rates" },
          { icon: "⏱️", text: "Response times and task completion rates" },
          { icon: "⭐", text: "NPS averages and customer sentiment" },
          { icon: "💡", text: "AI coaching insights per CSM" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "🎯", text: "CS leaders running team 1:1s and reviews" },
          { icon: "📈", text: "VP of CS reporting on team capacity and output" },
          { icon: "👤", text: "CSMs tracking their own metrics and growth" },
        ]}
      />
      {/* Top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Team Size", value: csmStats.length, icon: "👥", color: T.text },
          { label: "Avg Health Score", value: avgHealth, icon: "💚", color: avgHealth > 70 ? T.green : T.warning },
          { label: "Accounts / CSM", value: csmStats.length > 0 ? Math.round(totalAccounts / csmStats.length) : 0, icon: "📊", color: T.info },
          { label: "Renewals", value: totalRenewed, icon: "🔄", color: T.green },
          { label: "At Risk", value: totalAtRisk, icon: "⚠️", color: totalAtRisk > 2 ? T.error : T.warning },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: s.color, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* CSM Leaderboard */}
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.text }}>CSM Leaderboard</h3>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 12px", fontSize: 11.5 }}>
              <option value="week">This Week</option><option value="month">This Month</option><option value="quarter">This Quarter</option>
            </select>
          </div>
          <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["CSM", "Accounts", "Health Avg", "Renewed", "At Risk", "Response Time", "NPS"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csmStats.sort((a, b) => b.healthAvg - a.healthAvg).map((csm, i) => (
                  <tr key={csm.id} onClick={() => setSelectedCSM(csm.id)} style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: selectedCSM === csm.id ? `rgba(${hexToRgb(T.green)},0.04)` : "transparent" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7f32" : T.surface3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: i < 3 ? "#fff" : "#475569" }}>{i + 1}</div>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: `rgba(${hexToRgb(csm.color)},0.15)`, border: `1px solid ${csm.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: csm.color }}>{csm.initials}</div>
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{csm.name}</div><div style={{ fontSize: 10, color: "#475569" }}>{csm.role}</div></div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: T.text }}>{csm.assigned}</td>
                    <td style={{ padding: "12px 14px" }}><span style={{ fontSize: 13, fontWeight: 600, color: csm.healthAvg > 75 ? T.green : csm.healthAvg > 60 ? T.warning : T.error }}>{csm.healthAvg}</span></td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: T.green, fontWeight: 600 }}>{csm.renewed}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: csm.atRisk > 1 ? T.error : T.warning, fontWeight: 600 }}>{csm.atRisk}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: csm.responseTime > 4 ? T.warning : T.text }}>{csm.responseTime}h</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: csm.npsAvg > 50 ? T.green : T.warning, fontWeight: 600 }}>{csm.npsAvg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coaching Insights sidebar */}
        <div style={{ width: 320, flexShrink: 0 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.text, marginBottom: 12 }}>AI Coaching Insights</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {coachingInsights.map((ci, i) => (
              <div key={i} style={{ background: T.surface2, border: `1px solid ${ci.color}22`, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${ci.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: ci.color, textTransform: "uppercase", letterSpacing: "0.08em", background: `rgba(${hexToRgb(ci.color)},0.1)`, padding: "2px 8px", borderRadius: 4 }}>{ci.type}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{ci.csm}</span>
                </div>
                <p style={{ fontSize: 12, color: T.subtle, lineHeight: 1.55 }}>{ci.insight}</p>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ marginTop: 16, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", marginBottom: 10 }}>1:1 Prep — {selected.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "Tasks Done", value: selected.tasksCompleted },
                  { label: "Emails Sent", value: selected.emailsSent },
                  { label: "Avg NPS", value: selected.npsAvg },
                  { label: "Portfolio $", value: "$" + (selected.assigned * 2400).toLocaleString() },
                ].map(m => (
                  <div key={m.label} style={{ background: T.bg, borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: "#475569" }}>{m.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REVENUE DASHBOARD (Blueprint §3.9 — Stripe Billing Integration)
// ═══════════════════════════════════════════════════════════════════════════
function RevenueDashboardPanel({ accounts }) {
  const [view, setView] = useState("overview");
  const totalMRR = accounts.reduce((sum, a) => { const v = parseFloat((a.mrr || "").replace(/[$,]/g, "")); return sum + (isNaN(v) ? 2400 : v); }, 0);
  const totalARR = totalMRR * 12;
  const expansionRev = Math.round(totalMRR * 0.12);
  const churnedRev = Math.round(totalMRR * 0.03);
  const nrr = Math.round(((totalMRR + expansionRev - churnedRev) / totalMRR) * 100);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(2025, i).toLocaleString("default", { month: "short" });
    const base = totalMRR * (0.82 + i * 0.018);
    return { month, mrr: Math.round(base), arr: Math.round(base * 12), expansion: Math.round(base * 0.08 * (1 + i * 0.03)), churn: Math.round(base * 0.025 * (1 - i * 0.005)) };
  });

  const revenueByIndustry = Object.entries(BENCHMARKS).map(([key, val]) => {
    const inds = accounts.filter(a => a.industry === key);
    const rev = inds.reduce((s, a) => { const v = parseFloat((a.mrr || "").replace(/[$,]/g, "")); return s + (isNaN(v) ? 2400 : v); }, 0);
    return { industry: val.label, icon: val.icon, color: val.color, accounts: inds.length, mrr: rev, arr: rev * 12 };
  }).sort((a, b) => b.mrr - a.mrr);

  const maxMRR = Math.max(...monthlyData.map(d => d.mrr), 1);

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="💰" title="Revenue Dashboard" color={T.green}
        bullets={[
          "Track MRR, ARR, expansion revenue, churned revenue, and net revenue retention in real time — the five numbers every CS leader needs to know.",
          "12-month MRR trend chart with month-over-month growth visualization. Switch to Industry view to see which verticals drive the most revenue.",
          "Revenue breakdown by industry shows account count, MRR, and ARR per segment so you can identify your highest-value verticals and growth opportunities.",
        ]}
        workflow={[
          "Revenue metrics calculate automatically from account MRR data",
          "View the 12-month MRR trend to spot growth or contraction patterns",
          "Switch to By Industry view to see revenue concentration by vertical",
          "Use NRR to gauge whether expansion outpaces churn",
        ]}
        outputLabel="Key Metrics"
        outputItems={[
          { icon: "📈", text: "MRR & ARR — monthly and annual recurring revenue" },
          { icon: "⬆️", text: "Expansion revenue — upsell and cross-sell growth" },
          { icon: "📉", text: "Churned revenue — lost MRR tracking" },
          { icon: "🔄", text: "NRR — net revenue retention percentage" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "📊", text: "CS leaders reporting revenue to the board" },
          { icon: "💼", text: "VP of CS tracking retention and expansion" },
          { icon: "🎯", text: "Revenue teams aligning on growth strategy" },
        ]}
      />
      {/* Top metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Monthly Recurring Revenue", value: `$${(totalMRR).toLocaleString()}`, color: T.green, icon: "💰" },
          { label: "Annual Recurring Revenue", value: `$${totalARR.toLocaleString()}`, color: T.text, icon: "📈" },
          { label: "Expansion Revenue", value: `$${expansionRev.toLocaleString()}`, sub: "+12% MoM", color: "#8b5cf6", icon: "⬆️" },
          { label: "Churned Revenue", value: `$${churnedRev.toLocaleString()}`, sub: "-3% MoM", color: T.error, icon: "📉" },
          { label: "Net Revenue Retention", value: `${nrr}%`, color: nrr > 100 ? T.green : T.warning, icon: "🔄" },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: s.color, fontWeight: 700 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 11, color: s.color, marginTop: 2, fontWeight: 600 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* MRR Trend Chart */}
      <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.text }}>MRR Trend</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {["overview", "byIndustry"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ background: view === v ? T.green : "transparent", border: `1px solid ${view === v ? T.green : T.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 11, color: view === v ? "#fff" : T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: view === v ? 600 : 400 }}>{v === "overview" ? "Overview" : "By Industry"}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 180 }}>
          {monthlyData.map(d => (
            <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 10, color: T.green, fontWeight: 600 }}>${Math.round(d.mrr / 1000)}k</div>
              <div style={{ width: "100%", background: `linear-gradient(to top, ${T.green}22, ${T.green}88)`, borderRadius: "4px 4px 0 0", height: `${(d.mrr / maxMRR) * 140}px`, transition: "height 0.3s" }} />
              <div style={{ fontSize: 9, color: "#475569" }}>{d.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by Industry */}
      <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.text }}>Revenue by Industry</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["Industry", "Accounts", "MRR", "ARR", "% of Revenue"].map(h => (
                <th key={h} style={{ padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {revenueByIndustry.map(r => (
              <tr key={r.industry} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{r.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{r.industry}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: T.text }}>{r.accounts}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: T.green, fontWeight: 600 }}>${r.mrr.toLocaleString()}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: T.text }}>${r.arr.toLocaleString()}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 60, height: 6, background: T.surface3, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${totalMRR > 0 ? (r.mrr / totalMRR) * 100 : 0}%`, height: "100%", background: r.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: T.subtle }}>{totalMRR > 0 ? Math.round((r.mrr / totalMRR) * 100) : 0}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ANOMALY DETECTION & SMART ALERTS (Must-Have Report, P0)
// ═══════════════════════════════════════════════════════════════════════════
function AnomalyAlertsPanel({ accounts }) {
  const [filter, setFilter] = useState("all");
  const severities = { critical: { color: "#ef4444", label: "Critical", icon: "🔴" }, warning: { color: "#f59e0b", label: "Warning", icon: "🟡" }, info: { color: "#06b6d4", label: "Info", icon: "🔵" } };

  const alerts = [
    { id: 1, account: accounts[0]?.company || "MedFlow Pro", type: "usage_drop", severity: "critical", title: "Login frequency dropped 62% in 14 days", description: "Daily active users fell from 34 to 13. This pattern precedes churn in 78% of similar accounts.", timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), actions: ["Schedule urgent health check", "Generate ROI report", "Escalate to manager"], dismissed: false },
    { id: 2, account: accounts[1]?.company || "PayStack Analytics", type: "health_drop", severity: "critical", title: "Health score dropped below 40 (was 72)", description: "Three concurrent risk signals: support ticket spike, NPS decline, and missed QBR.", timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), actions: ["Review health breakdown", "Draft re-engagement email", "Prepare rescue playbook"], dismissed: false },
    { id: 3, account: accounts[2]?.company || "TalentSync HR", type: "renewal_risk", severity: "warning", title: "Renewal in 21 days with no stakeholder alignment", description: "No executive touchpoint in 60+ days. Budget holder has not viewed latest QBR deck.", timestamp: new Date(Date.now() - 12 * 3600000).toISOString(), actions: ["Schedule executive check-in", "Send ROI summary", "Prepare renewal deck"], dismissed: false },
    { id: 4, account: accounts[3]?.company || "CloudMetrics", type: "nps_drop", severity: "warning", title: "NPS score dropped from 8 to 4", description: "Primary contact submitted negative survey response citing 'lack of proactive communication'.", timestamp: new Date(Date.now() - 18 * 3600000).toISOString(), actions: ["Review survey response", "Schedule call", "Draft recovery email"], dismissed: false },
    { id: 5, account: accounts[4]?.company || "PropTech Solutions", type: "expansion_signal", severity: "info", title: "Expansion signal: 3 new departments onboarded", description: "Account added 3 new team workspaces this month. Usage up 140%. Strong expansion candidate.", timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), actions: ["Prepare expansion proposal", "Schedule business review", "Update success plan"], dismissed: false },
    { id: 6, account: accounts[5]?.company || "DataBridge", type: "support_spike", severity: "warning", title: "Support ticket volume 3x above baseline", description: "12 tickets in 7 days vs. average of 4. Topics: integration errors (7), performance (3), billing (2).", timestamp: new Date(Date.now() - 30 * 3600000).toISOString(), actions: ["Coordinate with support", "Schedule technical review", "Update health score"], dismissed: false },
  ];

  const [alertState, setAlertState] = useState(alerts.map(a => ({ ...a })));
  const filtered = alertState.filter(a => !a.dismissed).filter(a => filter === "all" || a.severity === filter);

  const dismiss = (id) => setAlertState(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="🔔" title="Smart Alerts" color={T.warning}
        bullets={[
          "AI-powered anomaly detection that surfaces critical account signals before they become problems, monitoring engagement patterns, usage metrics, and sentiment indicators.",
          "Severity-based prioritization — critical, warning, and opportunity alerts ranked by potential revenue impact.",
          "One-click dismiss with configurable re-alert thresholds and suggested remediation actions."
        ]}
        workflow={[
          "Activities are continuously monitored for anomalies across engagement, usage, and sentiment",
          "AI detects statistically significant pattern breaks and flags them by severity",
          "Alerts are ranked by potential revenue impact and delivered in real time",
          "One-click actions let you address each alert with suggested remediation steps",
        ]}
        outputLabel="Alert Types"
        outputItems={[
          { icon: "🔔", text: "Real-time alert feed with severity classification" },
          { icon: "📊", text: "Anomaly detail cards with historical context" },
          { icon: "🚨", text: "Critical risk notifications with escalation paths" },
          { icon: "📅", text: "Weekly anomaly summary with trend analysis" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "👤", text: "CSMs needing early warning on at-risk accounts" },
          { icon: "📈", text: "CS leaders monitoring portfolio-wide risk signals" },
          { icon: "⚙️", text: "Ops teams building proactive intervention workflows" },
        ]}
      />
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Active Alerts", value: alertState.filter(a => !a.dismissed).length, color: T.text, icon: "🔔" },
          { label: "Critical", value: alertState.filter(a => !a.dismissed && a.severity === "critical").length, color: "#ef4444", icon: "🔴" },
          { label: "Warnings", value: alertState.filter(a => !a.dismissed && a.severity === "warning").length, color: "#f59e0b", icon: "🟡" },
          { label: "Opportunities", value: alertState.filter(a => !a.dismissed && a.severity === "info").length, color: "#06b6d4", icon: "🔵" },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: s.color, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "critical", "warning", "info"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? (f === "all" ? T.green : severities[f]?.color || T.green) : "transparent", border: `1px solid ${filter === f ? "transparent" : T.border}`, borderRadius: 8, padding: "7px 16px", fontSize: 12, color: filter === f ? "#fff" : T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: filter === f ? 600 : 400 }}>
            {f === "all" ? "All Alerts" : `${severities[f]?.icon} ${severities[f]?.label}`}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(alert => {
          const sev = severities[alert.severity];
          return (
            <div key={alert.id} style={{ background: T.surface2, border: `1px solid ${sev.color}22`, borderRadius: 14, padding: "18px 22px", borderLeft: `4px solid ${sev.color}`, animation: "panelIn 0.25s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: sev.color, textTransform: "uppercase", letterSpacing: "0.08em", background: `rgba(${hexToRgb(sev.color)},0.12)`, padding: "3px 10px", borderRadius: 5 }}>{sev.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{alert.account}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#475569" }}>{new Date(alert.timestamp).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} · {Math.round((Date.now() - new Date(alert.timestamp)) / 3600000)}h ago</span>
                  <button onClick={() => dismiss(alert.id)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", cursor: "pointer", fontSize: 11 }}>✕</button>
                </div>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>{alert.title}</h4>
              <p style={{ fontSize: 12.5, color: T.subtle, lineHeight: 1.6, marginBottom: 12 }}>{alert.description}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {alert.actions.map((action, i) => (
                  <button key={i} style={{ background: i === 0 ? `rgba(${hexToRgb(sev.color)},0.1)` : "transparent", border: `1px solid ${i === 0 ? sev.color + "33" : T.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 11.5, color: i === 0 ? sev.color : T.subtle, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: i === 0 ? 600 : 400 }}>{action}</button>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 15, color: T.text, fontWeight: 600, marginBottom: 4 }}>All clear!</div>
            <div style={{ fontSize: 13, color: "#475569" }}>No active alerts. Your portfolio is healthy.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER 360 UNIFIED DATA HUB (Must-Have Report, P0)
// ═══════════════════════════════════════════════════════════════════════════
function Customer360Panel({ accounts }) {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || null);
  const selected = accounts.find(a => a.id === selectedAccount);
  const ind = selected ? (BENCHMARKS[selected.industry] || BENCHMARKS.saas) : BENCHMARKS.saas;
  const status = selected ? (ACCOUNT_STATUSES[selected.status] || ACCOUNT_STATUSES.active) : ACCOUNT_STATUSES.active;

  if (!selected) return <div style={{ textAlign: "center", padding: 60, color: T.muted }}>No accounts to display</div>;

  const healthScore = Math.round(55 + Math.random() * 35);
  const nps = Math.round(20 + Math.random() * 60);
  const daysToRenewal = selected.renewalIn || 90;
  const contactCount = 2 + Math.floor(Math.random() * 4);
  const openTasks = Math.floor(Math.random() * 5);
  const lastActivity = Math.floor(1 + Math.random() * 10);

  const sections = [
    { title: "Health & Risk", icon: "💚", items: [
      { label: "Health Score", value: healthScore, color: healthScore > 70 ? T.green : healthScore > 50 ? T.warning : T.error },
      { label: "NPS Score", value: nps, color: nps > 50 ? T.green : nps > 20 ? T.warning : T.error },
      { label: "Risk Level", value: healthScore > 70 ? "Low" : healthScore > 50 ? "Medium" : "High", color: healthScore > 70 ? T.green : healthScore > 50 ? T.warning : T.error },
      { label: "Churn Probability", value: `${Math.max(5, 100 - healthScore)}%`, color: healthScore > 70 ? T.green : T.error },
    ]},
    { title: "Revenue", icon: "💰", items: [
      { label: "MRR", value: selected.mrr || "$2,400", color: T.green },
      { label: "ARR", value: `$${(parseFloat((selected.mrr || "$2400").replace(/[$,]/g, "")) * 12).toLocaleString()}`, color: T.text },
      { label: "Expansion $", value: `$${Math.round(parseFloat((selected.mrr || "$2400").replace(/[$,]/g, "")) * 0.15).toLocaleString()}`, color: "#8b5cf6" },
      { label: "Lifetime Value", value: `$${Math.round(parseFloat((selected.mrr || "$2400").replace(/[$,]/g, "")) * 28).toLocaleString()}`, color: T.text },
    ]},
    { title: "Engagement", icon: "📊", items: [
      { label: "Last Activity", value: `${lastActivity}d ago`, color: lastActivity < 5 ? T.green : T.warning },
      { label: "Stakeholders", value: contactCount, color: T.text },
      { label: "Open Tasks", value: openTasks, color: openTasks > 3 ? T.warning : T.green },
      { label: "Days to Renewal", value: daysToRenewal, color: daysToRenewal < 30 ? T.error : daysToRenewal < 60 ? T.warning : T.green },
    ]},
  ];

  const recentActivities = [
    { type: "email", text: "QBR follow-up email sent", time: "2h ago", icon: "✉️" },
    { type: "meeting", text: "Check-in call with Sarah Chen", time: "3d ago", icon: "📞" },
    { type: "report", text: "ROI report generated (Executive)", time: "5d ago", icon: "📄" },
    { type: "nps", text: "NPS survey response: 8", time: "1w ago", icon: "⭐" },
    { type: "task", text: "Success plan milestone completed", time: "2w ago", icon: "✓" },
  ];

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="🌐" title="Customer 360" color={T.info}
        bullets={[
          "A unified, real-time view of every customer account combining health metrics, revenue data, engagement history, and relationship context — eliminating the need to switch between tools.",
          "Interactive account selector with quick search across your entire portfolio to load full profiles instantly.",
          "Activity timeline showing every touchpoint and milestone with stakeholder mapping and risk indicators."
        ]}
        workflow={[
          "Select an account from the searchable sidebar to load its full profile",
          "Review health scores, NPS, risk level, and churn probability at a glance",
          "Dive into revenue metrics, engagement patterns, and stakeholder details",
          "Use insights to plan next steps, escalate risks, or identify expansion opportunities",
        ]}
        outputLabel="Account Intel"
        outputItems={[
          { icon: "💚", text: "Health dashboard with risk indicators and trends" },
          { icon: "💰", text: "Revenue breakdown — MRR, ARR, expansion, LTV" },
          { icon: "📊", text: "Engagement timeline with all touchpoints" },
          { icon: "👥", text: "Stakeholder map with contact details" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "👤", text: "CSMs preparing for account reviews or QBRs" },
          { icon: "🔥", text: "CS leaders needing quick context for escalations" },
          { icon: "💼", text: "AEs identifying upsell and expansion opportunities" },
        ]}
      />
      <div style={{ display: "flex", gap: 16 }}>
        {/* Account selector */}
        <div style={{ width: 240, flexShrink: 0, overflowY: "auto", maxHeight: 700 }}>
          <input placeholder="Search accounts..." style={{ ...inputStyle, marginBottom: 8, fontSize: 12 }} />
          {accounts.map(a => {
            const st = ACCOUNT_STATUSES[a.status] || ACCOUNT_STATUSES.active;
            return (
              <button key={a.id} onClick={() => setSelectedAccount(a.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: selectedAccount === a.id ? `rgba(${hexToRgb(T.green)},0.08)` : "transparent", marginBottom: 1, textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: st.color }} />
                <div style={{ fontSize: 12.5, fontWeight: selectedAccount === a.id ? 600 : 400, color: selectedAccount === a.id ? T.text : T.subtle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.company}</div>
              </button>
            );
          })}
        </div>

        {/* 360 view */}
        <div style={{ flex: 1 }}>
          {/* Account header */}
          <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.text }}>{selected.company}</h2>
                  <span style={{ fontSize: 11, fontWeight: 600, color: status.color, background: status.bg, padding: "3px 10px", borderRadius: 6 }}>{status.icon} {status.label}</span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#475569" }}>
                  <span>{ind.icon} {ind.label}</span>
                  <span>Contact: {selected.contact || "—"}</span>
                  <span>Assigned: {TEAM_MEMBERS.find(t => t.id === selected.assignedTo)?.name || "Unassigned"}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Generate Report</button>
                <button style={{ background: T.surface3, color: T.subtle, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>View Success Plan</button>
              </div>
            </div>
          </div>

          {/* Metric sections */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            {sections.map(sec => (
              <div key={sec.title} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{sec.icon} {sec.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {sec.items.map(item => (
                    <div key={item.label} style={{ background: T.bg, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, color: "#475569", marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color, fontFamily: "'Playfair Display', serif" }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>📋 Recent Activity</div>
            {recentActivities.map((act, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < recentActivities.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{act.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: T.text }}>{act.text}</div>
                </div>
                <div style={{ fontSize: 11, color: "#475569" }}>{act.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD (from proofpoint-admin.html — integrated)
// ═══════════════════════════════════════════════════════════════════════════
function AdminPanel() {
  const [connected, setConnected] = useState(false);
  const [waitlist, setWaitlist] = useState([
    { id: 1, email: "sarah.c@techcorp.io", source: "landing-page", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 2, email: "mike.j@startupinc.com", source: "blog-churnzero", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 3, email: "jennifer.k@healthco.org", source: "google-organic", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: 4, email: "alex@fintechpro.io", source: "direct", created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 5, email: "diana.r@hrplatform.com", source: "blog-vitally", created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
    { id: 6, email: "chris@cloudops.dev", source: "landing-page", created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
    { id: 7, email: "pat@realtysaas.com", source: "referral", created_at: new Date(Date.now() - 0.5 * 86400000).toISOString() },
  ]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("waitlist");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now - 7 * 86400000);
  const filtered = waitlist.filter(r => r.email.toLowerCase().includes(search.toLowerCase()));
  const today = waitlist.filter(r => new Date(r.created_at) >= todayStart).length;
  const week = waitlist.filter(r => new Date(r.created_at) >= weekStart).length;

  const sources = {};
  waitlist.forEach(r => { const s = r.source || "direct"; sources[s] = (sources[s] || 0) + 1; });
  const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];

  const exportCSV = () => {
    const csv = ["email,source,signed_up", ...waitlist.map(r => `${r.email},${r.source},${new Date(r.created_at).toISOString()}`)].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `proofpoint-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div style={{ animation: "panelIn 0.3s ease" }}>
      <FeatureExplainer
        icon="⚙️" title="Admin Dashboard" color={T.muted}
        bullets={[
          "Central command center for managing your Proofpoint instance — monitor waitlist signups, manage users, and track platform usage analytics from one hub.",
          "Real-time waitlist tracking with signup source attribution and weekly trend analysis.",
          "User management with role-based access controls and platform adoption metrics."
        ]}
        workflow={[
          "Track new signups, weekly trends, and top acquisition sources in real time",
          "Review user accounts, approve access, and assign roles from the users tab",
          "View platform usage patterns and feature adoption rates on the usage tab",
          "Export waitlist and user data as CSV for external analysis and reporting",
        ]}
        outputLabel="Admin Views"
        outputItems={[
          { icon: "✉️", text: "Signup analytics with source breakdowns" },
          { icon: "👥", text: "User management with search and roles" },
          { icon: "📊", text: "Usage dashboard with session tracking" },
          { icon: "📥", text: "CSV export for waitlist and user data" },
        ]}
        audienceLabel="Who It's For"
        audience={[
          { icon: "⚙️", text: "Admins managing user access and config" },
          { icon: "📈", text: "Growth teams tracking signup funnels" },
          { icon: "🔄", text: "CS ops monitoring platform adoption" },
        ]}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["waitlist", "users", "usage"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? T.green : "transparent", border: `1px solid ${tab === t ? T.green : T.border}`, borderRadius: 8, padding: "8px 20px", fontSize: 12.5, color: tab === t ? "#fff" : T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: tab === t ? 600 : 400, textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Signups", value: waitlist.length, sub: `${waitlist.length} people`, icon: "✉️" },
          { label: "Last 7 Days", value: week, sub: week > 0 ? `+${week} this week` : "None", icon: "📅", color: T.green },
          { label: "Today", value: today, sub: today > 0 ? `+${today} today` : "None today", icon: "⚡", color: T.info },
          { label: "Top Source", value: topSource ? topSource[0].split("-").join(" ") : "—", sub: topSource ? `${topSource[1]} signups` : "", icon: "🎯" },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: s.color || T.text, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email..." style={{ ...inputStyle, width: 280, padding: "8px 12px", fontSize: 12.5 }} />
        <button onClick={exportCSV} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, color: T.subtle, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["#", "Email", "Source", "Signed Up"].map(h => (
                <th key={h} style={{ padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "10px 16px", fontSize: 12, color: "#475569" }}>{i + 1}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, color: T.text, fontWeight: 500 }}>{r.email}</td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, background: r.source.includes("blog") ? "rgba(139,92,246,0.1)" : r.source.includes("google") ? "rgba(16,185,129,0.1)" : "rgba(100,116,139,0.1)", color: r.source.includes("blog") ? "#8b5cf6" : r.source.includes("google") ? T.green : "#94a3b8", fontWeight: 600 }}>{r.source}</span>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: T.subtle }}>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const [publicPage, setPublicPage] = useState("landing");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [activePage, setActivePage] = useState("custom-dash");
  const [savedReports, setSavedReports] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoverNav, setHoverNav] = useState(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const contentRef = useRef(null);

  // ─── Accounts state (with demo data) ──────────────
  const [accounts, setAccounts] = useState([
    { id: "d1", company: "Acme Health", industry: "healthcare", format: "executive", date: "Feb 24, 2026", mrr: "$12,500", metric: "$1.2M recovered", renewalIn: 14, status: "renewal-due", assignedTo: "sr", contact: "Sarah Johnson", preview: "In just nine months, Acme Health has transformed its claims processing operation from a manual bottleneck into a competitive advantage, recovering over $1.2M in operational capacity..." },
    { id: "d2", company: "PinPoint Financial", industry: "fintech", format: "qbr", date: "Feb 20, 2026", mrr: "$28,000", metric: "62% fraud reduction", renewalIn: 90, status: "active", assignedTo: "mk", contact: "David Chen", preview: "PinPoint Financial's investment in automated compliance monitoring has paid dividends far beyond initial projections..." },
    { id: "d3", company: "TalentForge", industry: "hrtech", format: "email", date: "Feb 18, 2026", mrr: "$7,200", metric: "31% faster hiring", renewalIn: 45, status: "renewed", assignedTo: "jl", contact: "Marcus Williams", preview: "Subject: TalentForge — 6 months of results worth celebrating..." },
    { id: "d4", company: "MetroPlex Realty", industry: "realestate", format: "executive", date: "Jan 30, 2026", mrr: "$9,100", metric: "22 more deals closed", renewalIn: 8, status: "at-risk", assignedTo: "sr", contact: "Linda Park", preview: "MetroPlex Realty's agent productivity has seen measurable improvement, with the team closing 22 additional transactions..." },
    { id: "d5", company: "CloudSync Pro", industry: "saas", format: "executive", date: "Feb 10, 2026", mrr: "$18,400", metric: "40% faster deploys", renewalIn: 120, status: "expanded", assignedTo: "ap", contact: "Tom Reed", preview: "CloudSync Pro has achieved measurable gains in deployment velocity since adopting the platform..." },
    { id: "d6", company: "Nextera Billing", industry: "fintech", format: "qbr", date: "Dec 15, 2025", mrr: "$5,800", metric: "—", renewalIn: 0, status: "churned", assignedTo: "mk", contact: "James Ortiz", preview: "Despite early engagement, Nextera Billing's internal restructuring led to a change in strategic direction..." },
  ]);

  const navigate = useCallback((p) => { setActivePage(p); if (contentRef.current) contentRef.current.scrollTop = 0; }, []);
  const saveReport = useCallback((report) => {
    setSavedReports(prev => [report, ...prev]);
    setAccounts(prev => [{
      id: `s-${Date.now()}`, company: report.companyName, industry: report.industry, format: report.format,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      mrr: `$${report.mrr || "—"}`, metric: "AI-generated", renewalIn: 60, status: "active", assignedTo: "sr",
      contact: report.form?.contactName || "", preview: report.report?.slice(0, 180) || "",
    }, ...prev]);
  }, []);

  const updateAccount = useCallback((id, updates) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const importAccounts = useCallback((newAccounts) => {
    setAccounts(prev => [...newAccounts, ...prev]);
  }, []);

  const sidebarW = sidebarCollapsed ? 64 : 220;
  const PAGE_TITLES = { "custom-dash": "My Dashboard", dashboard: "Portfolio", "health-score": "Health Scores", playbooks: "Playbooks", meetings: "Meeting Intelligence", surveys: "NPS / CSAT Surveys", stakeholders: "Stakeholder Mapping", "qbr-deck": "QBR Deck Generator", "email-center": "Email Center", generator: "Report Generator", "next-action": "Next Actions", "roi-calc": "CS ROI Calculator", "crm-hub": "CRM Integration Hub", "churn-ai": "Churn Prediction AI", "success-plans": "Success Plans", "activity-timeline": "Activity Timeline", "renewal-pipeline": "Renewal & Expansion Pipeline", lifecycle: "Customer Lifecycle Tracker", "team-perf": "Team Performance", revenue: "Revenue Dashboard", "anomaly-alerts": "Smart Alerts", "customer-360": "Customer 360", billing: "Billing & Plan", admin: "Admin Dashboard" };
  const PAGE_SUBTITLES = { "custom-dash": "Customizable widget dashboard with auto-refresh", dashboard: "Overview of your customer portfolio", "health-score": "AI-powered customer health scoring engine", playbooks: "Automated workflow engine for customer lifecycle", meetings: "AI-powered meeting analysis and action extraction", surveys: "Customer sentiment collection and analysis", stakeholders: "Visual relationship network with AI sentiment analysis", "qbr-deck": "AI-powered quarterly business review generation", "email-center": "AI-drafted emails with templates, tracking, and delivery", generator: "Create AI-powered ROI reports", "next-action": "AI-driven action recommendations", "roi-calc": "Justify your CS program investment", "crm-hub": "Deep bidirectional sync with HubSpot, Salesforce, and Stripe", "churn-ai": "AI-powered churn probability forecasting with confidence scores", "success-plans": "Goal tracking with milestones, owners, and progress visualization", "activity-timeline": "Multi-channel activity feed across all accounts and interactions", "renewal-pipeline": "Track renewals, expansion opportunities, and revenue forecasts", lifecycle: "Visual stage progression with milestone tracking and SLA management", "team-perf": "CSM leaderboards, coaching insights, and performance analytics", revenue: "MRR/ARR tracking, expansion revenue, and industry revenue breakdown", "anomaly-alerts": "Real-time anomaly detection with AI-powered smart alerts and actions", "customer-360": "Unified view of every account — health, revenue, engagement, and activity", billing: "Manage your subscription, seats, and usage", admin: "Waitlist management, user analytics, and platform administration" };

  // ─── Public Page Navigation ──────────────
  const navigatePublic = useCallback((page) => {
    if (page === "sandbox") { setIsAuthenticated(true); setOnboardingComplete(true); setIsSandbox(true); return; }
    if (page === "landing-pricing") { setPublicPage("landing"); return; }
    setPublicPage(page);
    window.scrollTo(0, 0);
  }, []);

  const handleAuth = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  // ─── PUBLIC ROUTES (unauthenticated) ──────────────
  if (!isAuthenticated) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; } body { background: ${T.bg}; }
          input:focus, textarea:focus, select:focus { border-color: ${T.green} !important; outline: none; }
          input::placeholder, textarea::placeholder { color: #334155; }
          ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
          @keyframes panelIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          button { transition: all 0.15s ease; } button:hover { opacity: 0.92; }
        `}</style>
        <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
          {publicPage !== "signup" && publicPage !== "login" && <TopNav onNavigate={navigatePublic} />}
          {publicPage === "landing" && <LandingPage onNavigate={navigatePublic} />}
          {publicPage === "signup" && <SignupPage onNavigate={navigatePublic} onAuth={handleAuth} />}
          {publicPage === "login" && <LoginPage onNavigate={navigatePublic} onAuth={handleAuth} />}
          {publicPage === "blog" && <BlogPage onNavigate={navigatePublic} />}
          {publicPage === "terms" && <TermsPage onNavigate={navigatePublic} />}
          {publicPage === "privacy" && <PrivacyPage onNavigate={navigatePublic} />}
        </div>
      </>
    );
  }

  // ─── Onboarding wizard ──────────────
  if (!onboardingComplete) {
    return <TierProvider><OnboardingWizard onComplete={() => setOnboardingComplete(true)} /></TierProvider>;
  }

  // ─── Logout screen ──────────────
  if (loggedOut) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@400;500;600&display=swap'); *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${T.bg}; }`}</style>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ textAlign: "center", animation: "panelIn 0.3s ease" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: T.text, marginBottom: 12 }}>Proof<span style={{ color: T.green }}>point</span></div>
            <p style={{ fontSize: 15, color: T.muted, marginBottom: 28 }}>You've been logged out successfully.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => { setLoggedOut(false); setIsAuthenticated(false); setPublicPage("landing"); }} style={{ background: "transparent", color: T.muted, border: `1px solid ${T.border}`, padding: "13px 28px", borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Back to Home</button>
              <button onClick={() => setLoggedOut(false)} style={{ background: T.green, color: "#fff", border: "none", padding: "13px 32px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 0 24px rgba(16,185,129,0.22)" }}>Log Back In</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <TierProvider>
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; } body { background: ${T.bg}; }
        input:focus, textarea:focus, select:focus { border-color: ${T.green} !important; outline: none; }
        input::placeholder, textarea::placeholder { color: #334155; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes panelIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        button { transition: all 0.15s ease; } button:hover { opacity: 0.92; } select { cursor: pointer; }
        table tr:hover td { background: rgba(255,255,255,0.015); }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: T.bg, fontFamily: "'DM Sans', sans-serif", color: T.text }}>
        {/* ─── Sidebar ─── */}
        <div style={{ width: sidebarW, flexShrink: 0, background: "#060d1b", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", transition: "width 0.25s ease", overflow: "hidden", position: "relative", zIndex: 10 }}>
          <div style={{ padding: sidebarCollapsed ? "22px 0" : "22px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "space-between", minHeight: 66 }}>
            {!sidebarCollapsed && <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: T.text, letterSpacing: -0.5 }}>Proof<span style={{ color: T.green }}>point</span></span>}
            <button onClick={() => setSidebarCollapsed(c => !c)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#475569", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">{sidebarCollapsed ? <><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></> : <><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></>}</svg>
            </button>
          </div>
          <nav style={{ padding: sidebarCollapsed ? "14px 8px" : "14px 12px", flex: 1, overflowY: "auto", minHeight: 0 }}>
            {NAV_ITEMS.map(item => { const isActive = activePage === item.id; const isHover = hoverNav === item.id; return (
              <button key={item.id} onClick={() => navigate(item.id)} onMouseEnter={() => setHoverNav(item.id)} onMouseLeave={() => setHoverNav(null)} title={sidebarCollapsed ? item.label : undefined} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: sidebarCollapsed ? "11px 0" : "10px 12px", justifyContent: sidebarCollapsed ? "center" : "flex-start", borderRadius: 10, border: "none", cursor: "pointer", background: isActive ? `rgba(${hexToRgb(T.green)},0.08)` : isHover ? "rgba(255,255,255,0.03)" : "transparent", marginBottom: 2, textAlign: "left", fontFamily: "'DM Sans', sans-serif", position: "relative", transition: "all 0.15s" }}>
                {isActive && <div style={{ position: "absolute", left: sidebarCollapsed ? "50%" : -12, top: sidebarCollapsed ? "auto" : "50%", bottom: sidebarCollapsed ? -2 : "auto", transform: sidebarCollapsed ? "translateX(-50%)" : "translateY(-50%)", width: sidebarCollapsed ? "100%" : 3, height: sidebarCollapsed ? 3 : 20, background: T.green, borderRadius: 2 }} />}
                {item.icon(isActive)}
                {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? T.text : "#475569", whiteSpace: "nowrap" }}>{item.label}</span>}
              </button>
            ); })}
          </nav>
          {!sidebarCollapsed && <div style={{ padding: "0 12px" }}><UsageMeter onNavigate={navigate} /></div>}
          <div style={{ padding: sidebarCollapsed ? "14px 8px" : "14px 16px", borderTop: `1px solid ${T.border}` }}>
            {!sidebarCollapsed ? <AccountMenu onLogout={() => setLoggedOut(true)} onNavigate={navigate} /> : (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={() => setSidebarCollapsed(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(${hexToRgb(T.green)},0.15)`, border: `1px solid ${T.green}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.green }}>SR</div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 28px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(5,11,24,0.8)", backdropFilter: "blur(8px)", minHeight: 66 }}>
            <div><h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: T.text, fontWeight: 700 }}>{PAGE_TITLES[activePage]}</h1><p style={{ fontSize: 12, color: "#475569", marginTop: 1 }}>{PAGE_SUBTITLES[activePage]}</p></div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isSandbox && <button onClick={() => { setIsAuthenticated(false); setPublicPage("landing"); setIsSandbox(false); }} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 500, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Return to Main Site</button>}
              {activePage !== "generator" && <button onClick={() => navigate("generator")} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Report</button>}
            </div>
          </div>
          <div ref={contentRef} style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            <TrialBanner onNavigate={navigate} />
            {activePage === "custom-dash" && <FeatureGate feature={PANEL_FEATURE_MAP["custom-dash"]} panelName="My Dashboard" onNavigate={navigate}><CustomDashPanel accounts={accounts} /></FeatureGate>}
            {activePage === "dashboard" && <DashboardPanel navigate={navigate} savedReports={savedReports} accounts={accounts} onUpdateAccount={updateAccount} onImportAccounts={importAccounts} />}
            {activePage === "health-score" && <FeatureGate feature={PANEL_FEATURE_MAP["health-score"]} panelName="Health Scores" onNavigate={navigate}><HealthScorePanel accounts={accounts} /></FeatureGate>}
            {activePage === "playbooks" && <FeatureGate feature={PANEL_FEATURE_MAP["playbooks"]} panelName="Playbooks" onNavigate={navigate}><PlaybookPanel accounts={accounts} /></FeatureGate>}
            {activePage === "meetings" && <FeatureGate feature={PANEL_FEATURE_MAP["meetings"]} panelName="Meeting Intelligence" onNavigate={navigate}><MeetingIntelPanel accounts={accounts} /></FeatureGate>}
            {activePage === "surveys" && <FeatureGate feature={PANEL_FEATURE_MAP["surveys"]} panelName="NPS/CSAT Surveys" onNavigate={navigate}><SurveyPanel accounts={accounts} /></FeatureGate>}
            {activePage === "stakeholders" && <FeatureGate feature={PANEL_FEATURE_MAP["stakeholders"]} panelName="Stakeholder Mapping" onNavigate={navigate}><StakeholderPanel accounts={accounts} /></FeatureGate>}
            {activePage === "qbr-deck" && <FeatureGate feature={PANEL_FEATURE_MAP["qbr-deck"]} panelName="QBR Deck Generator" onNavigate={navigate}><QBRDeckPanel accounts={accounts} /></FeatureGate>}
            {activePage === "email-center" && <FeatureGate feature={PANEL_FEATURE_MAP["email-center"]} panelName="Email Center" onNavigate={navigate}><EmailCenterPanel accounts={accounts} /></FeatureGate>}
            {activePage === "generator" && <FeatureGate feature={PANEL_FEATURE_MAP["generator"]} panelName="Report Generator" onNavigate={navigate}><GeneratorPanel onSaveReport={saveReport} /></FeatureGate>}
            {activePage === "next-action" && <FeatureGate feature={PANEL_FEATURE_MAP["next-action"]} panelName="Next Actions" onNavigate={navigate}><NextActionPanel /></FeatureGate>}
            {activePage === "roi-calc" && <FeatureGate feature={PANEL_FEATURE_MAP["roi-calc"]} panelName="CS ROI Calculator" onNavigate={navigate}><ROICalcPanel /></FeatureGate>}
            {activePage === "crm-hub" && <FeatureGate feature={PANEL_FEATURE_MAP["crm-hub"]} panelName="CRM Integration Hub" onNavigate={navigate}><CRMIntegrationPanel accounts={accounts} /></FeatureGate>}
            {activePage === "churn-ai" && <FeatureGate feature={PANEL_FEATURE_MAP["churn-ai"]} panelName="Churn Prediction" onNavigate={navigate}><ChurnPredictionPanel accounts={accounts} /></FeatureGate>}
            {activePage === "success-plans" && <FeatureGate feature={PANEL_FEATURE_MAP["success-plans"]} panelName="Success Plans" onNavigate={navigate}><SuccessPlansPanel accounts={accounts} navigate={navigate} /></FeatureGate>}
            {activePage === "activity-timeline" && <FeatureGate feature={PANEL_FEATURE_MAP["activity-timeline"]} panelName="Activity Timeline" onNavigate={navigate}><ActivityTimelinePanel accounts={accounts} /></FeatureGate>}
            {activePage === "renewal-pipeline" && <FeatureGate feature={PANEL_FEATURE_MAP["renewal-pipeline"]} panelName="Renewal Pipeline" onNavigate={navigate}><RenewalPipelinePanel accounts={accounts} onNavigate={navigate} /></FeatureGate>}
            {activePage === "lifecycle" && <FeatureGate feature={PANEL_FEATURE_MAP["lifecycle"]} panelName="Lifecycle Tracker" onNavigate={navigate}><LifecycleTrackerPanel accounts={accounts} /></FeatureGate>}
            {activePage === "team-perf" && <FeatureGate feature={PANEL_FEATURE_MAP["team-perf"]} panelName="Team Performance" onNavigate={navigate}><TeamPerformancePanel accounts={accounts} /></FeatureGate>}
            {activePage === "revenue" && <FeatureGate feature={PANEL_FEATURE_MAP["revenue"]} panelName="Revenue Dashboard" onNavigate={navigate}><RevenueDashboardPanel accounts={accounts} /></FeatureGate>}
            {activePage === "anomaly-alerts" && <FeatureGate feature={PANEL_FEATURE_MAP["anomaly-alerts"]} panelName="Smart Alerts" onNavigate={navigate}><AnomalyAlertsPanel accounts={accounts} /></FeatureGate>}
            {activePage === "customer-360" && <FeatureGate feature={PANEL_FEATURE_MAP["customer-360"]} panelName="Customer 360" onNavigate={navigate}><Customer360Panel accounts={accounts} /></FeatureGate>}
            {activePage === "admin" && <FeatureGate feature={PANEL_FEATURE_MAP["admin"]} panelName="Admin Dashboard" onNavigate={navigate}><AdminPanel /></FeatureGate>}
            {activePage === "billing" && <BillingSettings onNavigate={navigate} />}
          </div>
        </div>
      </div>
    </>
    </TierProvider>
  );
}
