"use client";

import { useState } from "react";
import { Nav, PageWrapper } from "@/components/Nav";
import { BENCHMARKS } from "@/lib/constants";
import { toast } from "sonner";

// ── Theme tokens ────────────────────────────────────────────────────────────
const T = {
  green: "#10b981",
  greenDim: "#064e3b",
  bg: "#050b18",
  surface: "#0a1628",
  surface2: "#0f172a",
  border: "#1e293b",
  text: "#f1f5f9",
  muted: "#64748b",
  subtle: "#94a3b8",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#06b6d4",
  purple: "#8b5cf6",
};

const hexToRgb = (hex: string) =>
  [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)].join(",");

// ── Styles ──────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: T.surface2,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: "10px 13px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: "#e2e8f0",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: T.muted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 5,
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

const pct = (n: number) => `${n.toFixed(1)}%`;

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## "))
      return (
        <h3 key={i} style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.green, fontWeight: 700, margin: "22px 0 8px", borderBottom: `1px solid ${T.border}`, paddingBottom: 6 }}>
          {line.replace("## ", "")}
        </h3>
      );
    if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
    const parts = line.split(/(\([^)]*\d{4}[^)]*\))/g);
    return (
      <p key={i} style={{ fontSize: 13.5, color: "#cbd5e1", lineHeight: 1.8, margin: "0 0 2px" }}>
        {parts.map((part, j) =>
          /\([^)]*\d{4}[^)]*\)/.test(part) ? (
            <span key={j} style={{ color: T.green, fontWeight: 600, fontSize: 11.5 }}>{part}</span>
          ) : (
            part
          ),
        )}
      </p>
    );
  });
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: T.muted, pointerEvents: "none" }}>
            {prefix}
          </span>
        )}
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingLeft: prefix ? 24 : 13, paddingRight: suffix ? 32 : 13 }}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: T.muted, pointerEvents: "none" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ── API helpers ─────────────────────────────────────────────────────────────
async function callClaude(system: string, userMessage: string, maxTokens = 2000): Promise<string> {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages: [{ role: "user", content: userMessage }], max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.content?.map((b: { text?: string }) => b.text || "").join("") || "";
}

async function saveReport(formData: FormState, report: string, metrics: Record<string, string>): Promise<void> {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: "CS Program ROI Analysis",
      report_type: "cs_program_roi",
      industry: formData.industry,
      mrr: formData.totalArr ? parseFloat(formData.totalArr) / 12 : null,
      input_data: { ...formData, calculatedMetrics: metrics },
      generated_report: report,
    }),
  });
  if (!res.ok) throw new Error("Failed to save report");
}

// ── Form state ──────────────────────────────────────────────────────────────
interface FormState {
  // Team costs
  csmCount: string;
  avgCsmSalary: string;
  csLeaderCount: string;
  avgLeaderSalary: string;
  // Tools & overhead
  toolsCost: string;
  trainingCost: string;
  overheadPct: string;
  // Portfolio
  industry: string;
  totalCustomers: string;
  totalArr: string;
  avgArr: string;
  // Value outputs
  grossRetention: string;
  netRetention: string;
  expansionRevenue: string;
  churnedRevenue: string;
  // Efficiency
  avgOnboardDays: string;
  ticketsPerMonth: string;
  csmHoursPerWeek: string;
  automatedTasks: string;
  [key: string]: string;
}

const INITIAL_FORM: FormState = {
  csmCount: "",
  avgCsmSalary: "85000",
  csLeaderCount: "1",
  avgLeaderSalary: "140000",
  toolsCost: "",
  trainingCost: "",
  overheadPct: "25",
  industry: "saas",
  totalCustomers: "",
  totalArr: "",
  avgArr: "",
  grossRetention: "92",
  netRetention: "112",
  expansionRevenue: "",
  churnedRevenue: "",
  avgOnboardDays: "",
  ticketsPerMonth: "",
  csmHoursPerWeek: "40",
  automatedTasks: "20",
};

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function CsRoiPage() {
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const ind = BENCHMARKS[form.industry] || BENCHMARKS.saas;

  // ── Client-side calculations ────────────────────────────────────────────
  const csmCount = parseFloat(form.csmCount) || 0;
  const avgCsmSalary = parseFloat(form.avgCsmSalary) || 85000;
  const leaderCount = parseFloat(form.csLeaderCount) || 0;
  const avgLeaderSalary = parseFloat(form.avgLeaderSalary) || 140000;
  const toolsCost = parseFloat(form.toolsCost) || 0;
  const trainingCost = parseFloat(form.trainingCost) || 0;
  const overheadPct = parseFloat(form.overheadPct) || 25;

  const totalCustomers = parseFloat(form.totalCustomers) || 0;
  const totalArr = parseFloat(form.totalArr) || 0;
  const expansion = parseFloat(form.expansionRevenue) || 0;
  const churnedRev = parseFloat(form.churnedRevenue) || 0;
  const grr = parseFloat(form.grossRetention) || 92;
  const nrr = parseFloat(form.netRetention) || 112;

  // Cost breakdown
  const peopleCost = csmCount * avgCsmSalary + leaderCount * avgLeaderSalary;
  const overheadCost = peopleCost * (overheadPct / 100);
  const totalProgramCost = peopleCost + toolsCost + trainingCost + overheadCost;

  // Value breakdown
  const revenueRetained = totalArr * (grr / 100);
  const netRevenueImpact = revenueRetained + expansion;
  const churnPrevented = totalArr - revenueRetained > 0 ? totalArr - revenueRetained : 0;

  // ROI metrics
  const roiMultiple = totalProgramCost > 0 ? ((netRevenueImpact) / totalProgramCost).toFixed(1) : "\u2014";
  const roiPercent = totalProgramCost > 0 ? (((netRevenueImpact - totalProgramCost) / totalProgramCost) * 100).toFixed(0) : "\u2014";
  const custPerCSM = csmCount > 0 ? Math.round(totalCustomers / csmCount) : 0;
  const arrPerCSM = csmCount > 0 ? totalArr / csmCount : 0;
  const costPerDollar = totalProgramCost > 0 && revenueRetained > 0 ? (totalProgramCost / revenueRetained).toFixed(2) : "\u2014";

  const headcount = csmCount + leaderCount;

  const calculatedMetrics: Record<string, string> = {
    roiMultiple: `${roiMultiple}x`,
    roiPercent: `${roiPercent}%`,
    totalProgramCost: fmt(totalProgramCost),
    revenueRetained: fmt(revenueRetained),
    netRevenueImpact: fmt(netRevenueImpact),
    custPerCSM: String(custPerCSM),
    arrPerCSM: fmt(arrPerCSM),
    costPerDollar: `$${costPerDollar}`,
    headcount: String(headcount),
  };

  // ── Generate narrative ──────────────────────────────────────────────────
  const generate = async () => {
    if (!form.csmCount || !form.totalArr) {
      setError("CSM count and Total ARR are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const prompt = `Analyze this CS program investment and generate a comprehensive ROI report for board/executive presentation.

CS PROGRAM INVESTMENT:
- People: ${headcount} total headcount (${csmCount} CSMs + ${leaderCount} leaders)
  CSM comp: ${fmt(csmCount * avgCsmSalary)} | Leadership comp: ${fmt(leaderCount * avgLeaderSalary)}
- Tools & Software: ${fmt(toolsCost)}
- Training & Development: ${fmt(trainingCost)}
- Overhead (${overheadPct}%): ${fmt(overheadCost)}
- TOTAL PROGRAM COST: ${fmt(totalProgramCost)}

PORTFOLIO & REVENUE IMPACT:
- Industry: ${ind.label}
- Total Customers: ${totalCustomers}
- Total ARR: ${fmt(totalArr)}
- Gross Retention Rate: ${grr}%
- Net Revenue Retention: ${nrr}%
- Revenue Retained: ${fmt(revenueRetained)}
- Expansion Revenue: ${fmt(expansion)}
- Churned Revenue: ${fmt(churnedRev)}
- Net Revenue Impact: ${fmt(netRevenueImpact)}

EFFICIENCY METRICS:
- Customers per CSM: ${custPerCSM}
- ARR per CSM: ${fmt(arrPerCSM)}
- Cost per $1 Retained: $${costPerDollar}

CALCULATED ROI:
- ROI Multiple: ${roiMultiple}x
- ROI Percentage: ${roiPercent}%
- For every $1 invested in CS, the program protects/generates $${roiMultiple} in revenue

INDUSTRY BENCHMARKS (${ind.label}):
- Industry avg churn: ${ind.metrics.annualChurn.industry}% | Top quartile: ${ind.metrics.annualChurn.topQuartile}%
- Industry avg NRR: ${ind.metrics.nrr.industry}% | Top quartile: ${ind.metrics.nrr.topQuartile}%
- Industry avg adoption: ${ind.metrics.adoptionRate.industry}% | Top quartile: ${ind.metrics.adoptionRate.topQuartile}%

Generate a board-ready report with these ## sections:
## Executive Summary
## Total Program Investment Breakdown
## Revenue Impact Analysis
## ROI Calculation & Justification
## Industry Benchmarking
## Efficiency & Scalability Assessment
## Strategic Recommendations
## Board-Ready Summary`;

      const text = await callClaude(
        "You are a strategic CS advisor writing for CFOs, board members, and VP-level executives. Write a comprehensive CS program ROI report that justifies the customer success investment. Use specific numbers from the data provided. Frame CS as a revenue engine, not a cost center. Be data-forward and include industry comparisons. Use ## markdown headers.",
        prompt,
      );

      setReport(text);
      setStep(2);
      setSaved(false);
    } catch {
      setError("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const header = `# CS Program ROI Analysis\n**Generated:** ${new Date().toLocaleDateString()}\n**Industry:** ${ind.label}\n\n**Key Metrics:** ROI ${roiMultiple}x | Program Cost ${fmt(totalProgramCost)} | Revenue Protected ${fmt(revenueRetained)} | Expansion ${fmt(expansion)} | ${headcount} Headcount | ${custPerCSM} Customers/CSM\n\n---\n\n`;
      await saveReport(form, header + report, calculatedMetrics);
      setSaved(true);
      toast.success("Report saved to your library");
    } catch {
      toast.error("Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    toast.success("Report copied to clipboard");
  };

  const handlePdf = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>CS Program ROI</title>
      <style>body{font-family:'Helvetica Neue',sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1e293b}
      h1{font-size:26px;border-bottom:2px solid #10b981;padding-bottom:8px}h2{font-size:18px;color:#10b981;margin-top:28px}
      p{line-height:1.7;font-size:14px}.metrics{display:flex;gap:12px;margin:20px 0;flex-wrap:wrap}
      .metric{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;flex:1;min-width:120px}
      .metric-label{font-size:10px;text-transform:uppercase;color:#64748b;margin-bottom:4px}
      .metric-value{font-size:22px;font-weight:700;color:#0f172a}</style></head><body>
      <h1>CS Program ROI Analysis</h1>
      <div class="metrics">
        <div class="metric"><div class="metric-label">ROI Multiple</div><div class="metric-value">${roiMultiple}x</div></div>
        <div class="metric"><div class="metric-label">Program Cost</div><div class="metric-value">${fmt(totalProgramCost)}</div></div>
        <div class="metric"><div class="metric-label">Revenue Protected</div><div class="metric-value">${fmt(revenueRetained)}</div></div>
        <div class="metric"><div class="metric-label">Expansion</div><div class="metric-value">${fmt(expansion)}</div></div>
        <div class="metric"><div class="metric-label">Headcount</div><div class="metric-value">${headcount}</div></div>
      </div>
      ${report.replace(/## (.*)/g, "<h2>$1</h2>").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}
      </body></html>`);
    win.document.close();
    win.print();
  };

  // ── Stat card renderer ──────────────────────────────────────────────────
  const StatCard = ({ label, value, color, highlight }: { label: string; value: string; color?: string; highlight?: boolean }) => (
    <div
      style={{
        background: highlight ? `rgba(${hexToRgb(color || T.warning)},0.08)` : T.bg,
        border: `1px solid ${highlight ? (color || T.warning) : T.border}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 10, color: highlight ? color || T.warning : "#334155", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: color || T.text }}>{value}</div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <Nav />
      <PageWrapper>
        <div style={{ animation: "panelIn 0.3s ease", maxWidth: 860, margin: "0 auto", padding: "32px 24px 60px" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(245,158,11,0.12)", border: `1px solid ${T.warning}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {"\uD83D\uDCCA"}
              </div>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: T.text, margin: 0 }}>CS Program ROI</h1>
                <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Prove your CS team is a revenue engine — justify budget, headcount, and tools</p>
              </div>
            </div>
          </div>

          {/* Main card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "28px 32px" }}>
            {/* Progress bar */}
            <div style={{ height: 3, background: T.surface2, borderRadius: 2, marginBottom: 24 }}>
              <div style={{ height: "100%", width: step === 1 ? "50%" : "100%", background: `linear-gradient(90deg, ${T.warning}, ${T.green})`, transition: "width 0.5s", borderRadius: 2 }} />
            </div>

            {/* ─── STEP 1: Inputs ─── */}
            {step === 1 && (
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: T.text, marginBottom: 20, marginTop: 0 }}>
                  Program Investment & Impact
                </h2>

                {/* Industry selector */}
                <label style={labelStyle}>Industry</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 20 }}>
                  {Object.entries(BENCHMARKS).map(([key, b]) => (
                    <button
                      key={key}
                      onClick={() => setForm((p) => ({ ...p, industry: key }))}
                      style={{
                        background: form.industry === key ? `rgba(${hexToRgb(b.color)},0.12)` : T.surface2,
                        border: `1px solid ${form.industry === key ? b.color : T.border}`,
                        borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center",
                        fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 3 }}>{b.icon}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: form.industry === key ? b.color : "#475569" }}>
                        {b.label.split(" ")[0]}
                      </div>
                    </button>
                  ))}
                </div>

                {/* People costs */}
                <div style={{ fontSize: 11, fontWeight: 700, color: T.warning, textTransform: "uppercase", marginBottom: 12 }}>
                  {"\uD83D\uDC65"} People Investment
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px", marginBottom: 18 }}>
                  <Field label="CSM Headcount *" name="csmCount" value={form.csmCount} onChange={handleChange} placeholder="5" />
                  <Field label="Avg CSM Salary ($)" name="avgCsmSalary" value={form.avgCsmSalary} onChange={handleChange} placeholder="85000" />
                  <Field label="CS Leaders" name="csLeaderCount" value={form.csLeaderCount} onChange={handleChange} placeholder="1" />
                  <Field label="Avg Leader Salary ($)" name="avgLeaderSalary" value={form.avgLeaderSalary} onChange={handleChange} placeholder="140000" />
                </div>

                {/* Tools & overhead */}
                <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, textTransform: "uppercase", marginBottom: 12 }}>
                  {"\uD83D\uDEE0\uFE0F"} Tools & Overhead
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 18px", marginBottom: 18 }}>
                  <Field label="CS Tools/Software ($)" name="toolsCost" value={form.toolsCost} onChange={handleChange} placeholder="36000" />
                  <Field label="Training ($)" name="trainingCost" value={form.trainingCost} onChange={handleChange} placeholder="12000" />
                  <Field label="Overhead (%)" name="overheadPct" value={form.overheadPct} onChange={handleChange} placeholder="25" suffix="%" />
                </div>

                {/* Portfolio */}
                <div style={{ fontSize: 11, fontWeight: 700, color: T.info, textTransform: "uppercase", marginBottom: 12 }}>
                  {"\uD83D\uDCBC"} Portfolio
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 18px", marginBottom: 18 }}>
                  <Field label="Total Customers" name="totalCustomers" value={form.totalCustomers} onChange={handleChange} placeholder="120" />
                  <Field label="Total ARR ($) *" name="totalArr" value={form.totalArr} onChange={handleChange} placeholder="2880000" />
                  <Field label="Avg ARR/Customer ($)" name="avgArr" value={form.avgArr} onChange={handleChange} placeholder="24000" />
                </div>

                {/* Revenue impact */}
                <div style={{ fontSize: 11, fontWeight: 700, color: T.green, textTransform: "uppercase", marginBottom: 12 }}>
                  {"\uD83D\uDCC8"} Revenue Impact
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 18px", marginBottom: 18 }}>
                  <Field label="GRR (%)" name="grossRetention" value={form.grossRetention} onChange={handleChange} placeholder="92" />
                  <Field label="NRR (%)" name="netRetention" value={form.netRetention} onChange={handleChange} placeholder="112" />
                  <Field label="Expansion ($)" name="expansionRevenue" value={form.expansionRevenue} onChange={handleChange} placeholder="432000" />
                  <Field label="Churned ($)" name="churnedRevenue" value={form.churnedRevenue} onChange={handleChange} placeholder="230000" />
                </div>

                {/* Live calculated metrics */}
                {totalProgramCost > 0 && (
                  <>
                    {/* Cost breakdown mini */}
                    <div style={{ background: `rgba(${hexToRgb(T.purple)},0.04)`, border: `1px solid ${T.purple}22`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.purple, textTransform: "uppercase", marginBottom: 8 }}>
                        Cost Breakdown
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {[
                          { l: "People", v: fmt(peopleCost), p: pct((peopleCost / totalProgramCost) * 100) },
                          { l: "Tools", v: fmt(toolsCost), p: pct((toolsCost / totalProgramCost) * 100) },
                          { l: "Training", v: fmt(trainingCost), p: pct((trainingCost / totalProgramCost) * 100) },
                          { l: "Overhead", v: fmt(overheadCost), p: pct((overheadCost / totalProgramCost) * 100) },
                        ].map((item) => (
                          <div key={item.l} style={{ fontSize: 12, color: T.subtle }}>
                            <span style={{ fontWeight: 600, color: T.text }}>{item.v}</span>{" "}
                            <span style={{ color: T.muted }}>{item.l} ({item.p})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key ROI metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
                      <StatCard label="ROI Multiple" value={`${roiMultiple}x`} color={T.warning} highlight />
                      <StatCard label="Program Cost" value={fmt(totalProgramCost)} color={T.purple} />
                      <StatCard label="Revenue Protected" value={fmt(revenueRetained)} color={T.green} />
                      <StatCard label="Customers/CSM" value={String(custPerCSM)} color={T.info} />
                      <StatCard label="Cost per $1" value={`$${costPerDollar}`} />
                    </div>
                  </>
                )}

                {/* ── 3-Year Projection ── */}
                {totalProgramCost > 0 && totalArr > 0 && (
                  <div style={{
                    background: `rgba(6,182,212,0.04)`,
                    border: `1px solid ${T.info}22`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.info, textTransform: "uppercase", marginBottom: 12 }}>
                      📈 3-Year Revenue Projection
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {[1, 2, 3].map((year) => {
                        const compoundedArr = totalArr * Math.pow(nrr / 100, year);
                        const cumulativeRetained = totalArr * (grr / 100) * year;
                        const yearCost = totalProgramCost * (1 + 0.05 * (year - 1));
                        const yearRoi = yearCost > 0 ? (compoundedArr / yearCost).toFixed(1) : "—";
                        return (
                          <div key={year} style={{
                            background: T.bg,
                            border: `1px solid ${T.border}`,
                            borderRadius: 8,
                            padding: "12px 14px",
                          }}>
                            <div style={{ fontSize: 11, color: T.info, fontWeight: 600, marginBottom: 6 }}>
                              Year {year}
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: "'Playfair Display', serif" }}>
                              {fmt(compoundedArr)}
                            </div>
                            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                              Projected ARR at {nrr}% NRR
                            </div>
                            <div style={{ fontSize: 12, color: T.green, fontWeight: 600, marginTop: 4 }}>
                              {yearRoi}x ROI
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 8, fontStyle: "italic" }}>
                      Assumes {pct(nrr)} NRR compounds annually, 5% annual cost increase
                    </div>
                  </div>
                )}

                {error && <p style={{ fontSize: 13, color: T.error, marginTop: 10 }}>{error}</p>}

                <button
                  onClick={generate}
                  disabled={loading}
                  style={{
                    width: "100%", marginTop: 8, background: loading ? T.greenDim : T.warning,
                    color: "#000", border: "none", borderRadius: 10, padding: "13px", fontSize: 14,
                    fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <span style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                      Generating board-ready report...
                    </span>
                  ) : (
                    "\uD83D\uDCCA Generate CS Program ROI Report"
                  )}
                </button>
              </div>
            )}

            {/* ─── STEP 2: Report ─── */}
            {step === 2 && report && (
              <div>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: T.text, margin: 0 }}>
                    CS Program ROI Report
                  </h2>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={handleSave} disabled={saving || saved}
                      style={{ background: saved ? "rgba(16,185,129,0.1)" : T.surface2, border: `1px solid ${saved ? T.green + "44" : T.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, color: saved ? T.green : T.muted, cursor: saving || saved ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                      {saved ? "\u2713 Saved" : saving ? "Saving..." : "\uD83D\uDCBE Save"}
                    </button>
                    <button onClick={handlePdf} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>PDF</button>
                    <button onClick={handleCopy} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Copy</button>
                    <button onClick={() => { setStep(1); setReport(""); setSaved(false); }}
                      style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      &larr; Edit
                    </button>
                  </div>
                </div>

                {error && <p style={{ fontSize: 13, color: T.error, marginBottom: 10 }}>{error}</p>}

                {/* Summary stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
                  <StatCard label="ROI" value={`${roiMultiple}x`} color={T.warning} highlight />
                  <StatCard label="Protected" value={fmt(revenueRetained)} color={T.green} />
                  <StatCard label="Investment" value={fmt(totalProgramCost)} color={T.purple} />
                  <StatCard label="Expansion" value={fmt(expansion)} color={T.info} />
                  <StatCard label="Headcount" value={String(headcount)} />
                </div>

                {/* Report body */}
                <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: "22px 24px" }}>
                  {renderMarkdown(report)}
                </div>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes panelIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </PageWrapper>
    </>
  );
}
