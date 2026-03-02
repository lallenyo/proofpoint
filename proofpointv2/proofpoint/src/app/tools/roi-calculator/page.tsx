"use client";

import { useState } from "react";
import { Nav, PageWrapper } from "@/components/Nav";

// ── Theme tokens (matches global dark theme) ───────────────────────────────
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

// ── Shared inline styles ────────────────────────────────────────────────────
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
  n >= 1e6
    ? `$${(n / 1e6).toFixed(1)}M`
    : n >= 1e3
      ? `$${(n / 1e3).toFixed(0)}K`
      : `$${n}`;

// ── Markdown renderer ───────────────────────────────────────────────────────
function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## "))
      return (
        <h3
          key={i}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 16,
            color: T.green,
            fontWeight: 700,
            margin: "22px 0 8px",
            borderBottom: `1px solid ${T.border}`,
            paddingBottom: 6,
          }}
        >
          {line.replace("## ", "")}
        </h3>
      );
    if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
    // Highlight source citations like (Source 2024)
    const parts = line.split(/(\([^)]*\d{4}[^)]*\))/g);
    return (
      <p
        key={i}
        style={{
          fontSize: 13.5,
          color: "#cbd5e1",
          lineHeight: 1.8,
          margin: "0 0 2px",
        }}
      >
        {parts.map((part, j) =>
          /\([^)]*\d{4}[^)]*\)/.test(part) ? (
            <span
              key={j}
              style={{ color: T.green, fontWeight: 600, fontSize: 11.5 }}
            >
              {part}
            </span>
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
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

// ── API helpers ─────────────────────────────────────────────────────────────
async function callClaude(
  system: string,
  userMessage: string,
  maxTokens = 1500,
): Promise<string> {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system,
      messages: [{ role: "user", content: userMessage }],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return (
    data.content?.map((b: { text?: string }) => b.text || "").join("") || ""
  );
}

async function saveReport(
  formData: FormState,
  report: string,
  roiMultiple: string,
): Promise<void> {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: "CS Program ROI",
      report_type: "cs_roi",
      industry: "saas",
      mrr: formData.totalArr ? parseFloat(formData.totalArr) / 12 : null,
      input_data: { ...formData, roiMultiple },
      generated_report: report,
    }),
  });
  if (!res.ok) throw new Error("Failed to save report");
}

// ── Form state ──────────────────────────────────────────────────────────────
interface FormState {
  teamSize: string;
  avgSalary: string;
  totalCustomers: string;
  avgArr: string;
  totalArr: string;
  expansionRevenue: string;
  grossRetention: string;
  netRetention: string;
  monthlyChurn: string;
}

const INITIAL_FORM: FormState = {
  teamSize: "",
  avgSalary: "85000",
  totalCustomers: "",
  avgArr: "",
  totalArr: "",
  expansionRevenue: "",
  grossRetention: "92",
  netRetention: "112",
  monthlyChurn: "1.2",
};

// ── Stat card shape ─────────────────────────────────────────────────────────
interface StatCard {
  l: string;
  v: string;
  c?: string;
  h?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function RoiCalculatorPage() {
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ── Client-side ROI calculations (no AI needed) ─────────────────────────
  const ts = parseFloat(form.teamSize) || 0;
  const sal = parseFloat(form.avgSalary) || 85000;
  const totalCust = parseFloat(form.totalCustomers) || 0;
  const expansion = parseFloat(form.expansionRevenue) || 0;
  const grr = parseFloat(form.grossRetention) || 92;
  const nrr = parseFloat(form.netRetention) || 112;
  const totalArr = parseFloat(form.totalArr) || 0;

  const teamCost = ts * sal;
  const revenueRetained = totalArr * (grr / 100);
  const roiMultiple =
    teamCost > 0
      ? ((revenueRetained + expansion) / teamCost).toFixed(1)
      : "\u2014";
  const custPerCSM = ts > 0 ? String(Math.round(totalCust / ts)) : "\u2014";
  const costPerDollar =
    teamCost > 0 && revenueRetained > 0
      ? `$${(teamCost / revenueRetained).toFixed(2)}`
      : "\u2014";

  // ── Generate narrative report with Claude ───────────────────────────────
  const generate = async () => {
    if (!form.teamSize || !form.totalArr) {
      setError("Team size and Total ARR are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const prompt = `Analyze this CS program:

Team: ${ts} CSMs, avg salary ${fmt(sal)}, total cost ${fmt(teamCost)}
Portfolio: ${totalCust} customers, ${fmt(totalArr)} ARR
Retention: ${grr}% GRR, ${nrr}% NRR
Expansion: ${fmt(expansion)}

Calculated: ROI ${roiMultiple}x, ${custPerCSM} customers/CSM, ${costPerDollar} cost per $1 retained

Generate a board-ready CS program ROI report with ## section headers.`;

      const text = await callClaude(
        "You are a strategic CS advisor writing for VP/C-suite executives. Write a comprehensive CS program ROI report with sections: Executive Summary, Program ROI Analysis, Revenue Protection & Growth, Benchmarking, Investment Efficiency, Strategic Recommendations, Board-Level Narrative. Use ## markdown headers.",
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

  // ── Save as report ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const metricsHeader = `# CS Program ROI Report\n**Generated:** ${new Date().toLocaleDateString()}\n\n**Key Metrics:** ROI ${roiMultiple}x | Team Cost ${fmt(teamCost)} | Revenue Protected ${fmt(revenueRetained)} | Expansion ${fmt(expansion)} | GRR ${grr}% | NRR ${nrr}% | ${custPerCSM} Customers/CSM\n\n---\n\n`;
      await saveReport(form, metricsHeader + report, roiMultiple);
      setSaved(true);
    } catch {
      setError("Failed to save report.");
    } finally {
      setSaving(false);
    }
  };

  // ── Copy to clipboard ───────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(report);
  };

  // ── PDF export ──────────────────────────────────────────────────────────
  const handlePdf = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>CS ROI Report</title>
      <style>body{font-family:'Helvetica Neue',sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1e293b}
      h1{font-size:26px;border-bottom:2px solid #10b981;padding-bottom:8px}
      h2{font-size:18px;color:#10b981;margin-top:28px}
      p{line-height:1.7;font-size:14px}
      .metrics{display:flex;gap:16px;margin:20px 0;flex-wrap:wrap}
      .metric{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;flex:1;min-width:150px}
      .metric-label{font-size:11px;text-transform:uppercase;color:#64748b;margin-bottom:4px}
      .metric-value{font-size:24px;font-weight:700;color:#0f172a}
      </style></head><body>
      <h1>CS Program ROI Report</h1>
      <div class="metrics">
        <div class="metric"><div class="metric-label">ROI Multiple</div><div class="metric-value">${roiMultiple}x</div></div>
        <div class="metric"><div class="metric-label">Revenue Protected</div><div class="metric-value">${fmt(revenueRetained)}</div></div>
        <div class="metric"><div class="metric-label">Team Investment</div><div class="metric-value">${fmt(teamCost)}</div></div>
        <div class="metric"><div class="metric-label">Expansion</div><div class="metric-value">${fmt(expansion)}</div></div>
      </div>
      ${report.replace(/## (.*)/g, "<h2>$1</h2>").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}
      </body></html>`);
    win.document.close();
    win.print();
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <Nav />
      <PageWrapper>
        <div
          style={{
            animation: "panelIn 0.3s ease",
            maxWidth: 820,
            margin: "0 auto",
            padding: "32px 24px 60px",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(245,158,11,0.12)",
                  border: `1px solid ${T.warning}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                {"\uD83D\uDCC8"}
              </div>
              <div>
                <h1
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 24,
                    color: T.text,
                    margin: 0,
                  }}
                >
                  CS ROI Calculator
                </h1>
                <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
                  Prove your CS team is a revenue engine, not a cost center
                </p>
              </div>
            </div>
          </div>

          {/* Main card */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: "28px 32px",
            }}
          >
            {/* Progress bar */}
            <div
              style={{
                height: 3,
                background: T.surface2,
                borderRadius: 2,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: step === 1 ? "50%" : "100%",
                  background: `linear-gradient(90deg, ${T.warning}, ${T.green})`,
                  transition: "width 0.5s",
                  borderRadius: 2,
                }}
              />
            </div>

            {/* ─── STEP 1: Inputs ─── */}
            {step === 1 && (
              <div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 21,
                    color: T.text,
                    marginBottom: 20,
                    marginTop: 0,
                  }}
                >
                  CS Program Inputs
                </h2>

                {/* Team section */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.warning,
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Team
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 18px",
                    marginBottom: 18,
                  }}
                >
                  <Field
                    label="Team Size *"
                    name="teamSize"
                    value={form.teamSize}
                    onChange={handleChange}
                    placeholder="5"
                  />
                  <Field
                    label="Avg Salary ($)"
                    name="avgSalary"
                    value={form.avgSalary}
                    onChange={handleChange}
                    placeholder="85000"
                  />
                </div>

                {/* Portfolio section */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.info,
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Portfolio
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 18px",
                    marginBottom: 18,
                  }}
                >
                  <Field
                    label="Total Customers"
                    name="totalCustomers"
                    value={form.totalCustomers}
                    onChange={handleChange}
                    placeholder="120"
                  />
                  <Field
                    label="Avg ARR/Customer ($)"
                    name="avgArr"
                    value={form.avgArr}
                    onChange={handleChange}
                    placeholder="24000"
                  />
                  <Field
                    label="Total ARR ($) *"
                    name="totalArr"
                    value={form.totalArr}
                    onChange={handleChange}
                    placeholder="2880000"
                  />
                  <Field
                    label="Expansion Revenue ($)"
                    name="expansionRevenue"
                    value={form.expansionRevenue}
                    onChange={handleChange}
                    placeholder="432000"
                  />
                </div>

                {/* Retention section */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.green,
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Retention
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "10px 18px",
                    marginBottom: 18,
                  }}
                >
                  <Field
                    label="GRR (%)"
                    name="grossRetention"
                    value={form.grossRetention}
                    onChange={handleChange}
                    placeholder="92"
                  />
                  <Field
                    label="NRR (%)"
                    name="netRetention"
                    value={form.netRetention}
                    onChange={handleChange}
                    placeholder="112"
                  />
                  <Field
                    label="Monthly Churn (%)"
                    name="monthlyChurn"
                    value={form.monthlyChurn}
                    onChange={handleChange}
                    placeholder="1.2"
                  />
                </div>

                {/* Live ROI metrics (client-side calculation) */}
                {teamCost > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {(
                      [
                        { l: "ROI Multiple", v: `${roiMultiple}x`, h: true },
                        { l: "Team Cost", v: fmt(teamCost) },
                        { l: "Customers/CSM", v: custPerCSM },
                        { l: "Cost per $1", v: costPerDollar },
                      ] as StatCard[]
                    ).map((s) => (
                      <div
                        key={s.l}
                        style={{
                          background: s.h
                            ? "rgba(245,158,11,0.08)"
                            : T.bg,
                          border: `1px solid ${s.h ? T.warning : T.border}`,
                          borderRadius: 10,
                          padding: "12px 14px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: s.h ? T.warning : "#334155",
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          {s.l}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 22,
                            fontWeight: 700,
                            color: s.h ? "#fbbf24" : T.text,
                          }}
                        >
                          {s.v}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <p style={{ fontSize: 13, color: T.error, marginTop: 10 }}>
                    {error}
                  </p>
                )}

                {/* Generate button */}
                <button
                  onClick={generate}
                  disabled={loading}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    background: loading ? T.greenDim : T.warning,
                    color: "#000",
                    border: "none",
                    borderRadius: 10,
                    padding: "13px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {loading ? (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(0,0,0,0.3)",
                          borderTopColor: "#000",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                          display: "inline-block",
                        }}
                      />
                      Running analysis...
                    </span>
                  ) : (
                    "\uD83D\uDCC8 Generate Board-Ready ROI Report"
                  )}
                </button>
              </div>
            )}

            {/* ─── STEP 2: Report ─── */}
            {step === 2 && report && (
              <div>
                {/* Header row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 19,
                      color: T.text,
                      margin: 0,
                    }}
                  >
                    CS Program ROI Report
                  </h2>
                  <div style={{ display: "flex", gap: 6 }}>
                    {/* Save */}
                    <button
                      onClick={handleSave}
                      disabled={saving || saved}
                      style={{
                        background: saved
                          ? "rgba(16,185,129,0.1)"
                          : T.surface2,
                        border: `1px solid ${saved ? T.green + "44" : T.border}`,
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 12,
                        color: saved ? T.green : T.muted,
                        cursor: saving || saved ? "default" : "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      {saved
                        ? "\u2713 Saved"
                        : saving
                          ? "Saving..."
                          : "\uD83D\uDCBE Save"}
                    </button>
                    {/* PDF */}
                    <button
                      onClick={handlePdf}
                      style={{
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "7px 12px",
                        fontSize: 12,
                        color: T.muted,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      PDF
                    </button>
                    {/* Copy */}
                    <button
                      onClick={handleCopy}
                      style={{
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "7px 12px",
                        fontSize: 12,
                        color: T.muted,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Copy
                    </button>
                    {/* Back to edit */}
                    <button
                      onClick={() => {
                        setStep(1);
                        setReport("");
                        setSaved(false);
                      }}
                      style={{
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 12,
                        color: T.muted,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      &larr; Edit
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p style={{ fontSize: 13, color: T.error, marginBottom: 10 }}>
                    {error}
                  </p>
                )}

                {/* Summary stat cards */}
                {teamCost > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {(
                      [
                        { l: "ROI", v: `${roiMultiple}x`, c: T.warning },
                        { l: "Protected", v: fmt(revenueRetained), c: T.green },
                        { l: "Investment", v: fmt(teamCost), c: T.info },
                        { l: "Expansion", v: fmt(expansion), c: T.purple },
                      ] as StatCard[]
                    ).map((s) => (
                      <div
                        key={s.l}
                        style={{
                          background: T.bg,
                          border: `1px solid ${T.border}`,
                          borderRadius: 10,
                          padding: "12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#334155",
                            textTransform: "uppercase",
                            marginBottom: 3,
                          }}
                        >
                          {s.l}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 20,
                            fontWeight: 700,
                            color: s.c || T.text,
                          }}
                        >
                          {s.v}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Report body */}
                <div
                  style={{
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: "22px 24px",
                  }}
                >
                  {renderMarkdown(report)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyframe animations */}
        <style>{`
          @keyframes panelIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </PageWrapper>
    </>
  );
}
