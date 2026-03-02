"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Nav, PageWrapper } from "@/components/Nav";
import {
  BENCHMARKS,
  INDUSTRY_PROMPTS,
  REPORT_FORMATS,
  TIER_LABELS,
  scoreTier,
  buildBenchmarkContext,
  type TierKey,
  type BenchmarkMetric,
} from "@/lib/constants";

// ── Theme tokens (matches global dark theme) ──────────────────────────────
const T = {
  bg: "#050b18",
  surface: "#0a1628",
  surface2: "#0d1d35",
  border: "#1e293b",
  text: "#e2e8f0",
  muted: "#64748b",
  subtle: "#94a3b8",
  green: "#10b981",
  greenLight: "#6ee7b7",
  greenDim: "#065f46",
  error: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  warning: "#f59e0b",
};

// ── Shared inline styles ──────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#334155",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 5,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: T.surface2,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: T.text,
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
};

// ── Field component ───────────────────────────────────────────────────────
function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          style={{ ...inputStyle, resize: "none" }}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );
}

// ── HubSpot Auto-fill ─────────────────────────────────────────────────────
interface HubSpotResult {
  companyName: string;
  contactName: string;
  contactTitle: string;
  mrr: string;
  contractStart: string;
}

function HubSpotAutoFill({
  onFill,
}: {
  onFill: (data: Partial<FormState>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<HubSpotResult[]>([]);
  const [filled, setFilled] = useState(false);
  const [error, setError] = useState("");

  async function searchCompanies() {
    if (!token || !search) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch("/api/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: search,
          token,
          saveToken: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Search failed");
        setResults([]);
      } else {
        const data: HubSpotResult = await res.json();
        setResults([data]);
      }
    } catch {
      setError("Failed to reach HubSpot API");
      setResults([]);
    }
    setSearching(false);
  }

  function selectCompany(company: HubSpotResult) {
    onFill({
      companyName: company.companyName,
      contactName: company.contactName,
      contactTitle: company.contactTitle,
      mrr: company.mrr,
      contractStart: company.contractStart,
    });
    setFilled(true);
    setTimeout(() => setExpanded(false), 600);
  }

  return (
    <div
      style={{
        marginBottom: 16,
        border: `1px solid ${expanded ? "#f9731644" : T.border}`,
        borderRadius: 10,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: "100%",
          padding: "11px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: expanded ? "rgba(249,115,22,0.06)" : T.surface2,
          border: "none",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{"\u{1F7E0}"}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: filled ? "#10b981" : "#f97316",
            }}
          >
            {filled ? "\u2713 Filled from HubSpot" : "Auto-fill from HubSpot"}
          </span>
          <span style={{ fontSize: 10, color: T.muted }}>(optional)</span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: T.muted,
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          {"\u25BE"}
        </span>
      </button>
      {expanded && (
        <div
          style={{
            padding: "14px 16px",
            borderTop: `1px solid ${T.border}`,
            animation: "panelIn 0.2s ease",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <label style={{ ...labelStyle, color: "#f97316" }}>
              HubSpot API Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your HubSpot private app token"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company name..."
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => e.key === "Enter" && searchCompanies()}
            />
            <button
              onClick={searchCompanies}
              disabled={!token || !search || searching}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: !token || !search ? T.border : "#f97316",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: !token || !search ? "default" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {searching ? "..." : "Search"}
            </button>
          </div>
          {error && (
            <p style={{ fontSize: 12, color: T.error, marginBottom: 8 }}>
              {error}
            </p>
          )}
          {results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {results.map((r, idx) => (
                <button
                  key={idx}
                  onClick={() => selectCompany(r)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    background: T.surface,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "'DM Sans', sans-serif",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 13, fontWeight: 600, color: T.text }}
                    >
                      {r.companyName}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted }}>
                      {r.contactName} {"\u00B7"} {r.contactTitle}{" "}
                      {r.mrr && `\u00B7 MRR: $${r.mrr}`}
                    </div>
                  </div>
                  <span
                    style={{ fontSize: 11, color: "#f97316", fontWeight: 600 }}
                  >
                    Select {"\u2192"}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#334155", marginTop: 8 }}>
            Token is used for this session only and routes through /api/hubspot.{" "}
            <a
              href="https://developers.hubspot.com/docs/api/private-apps"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#f97316" }}
            >
              Get token {"\u2192"}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Benchmark Scorecard ───────────────────────────────────────────────────
function BenchmarkScorecard({
  industry,
  formData,
}: {
  industry: string;
  formData: FormState;
}) {
  const ind = BENCHMARKS[industry];
  if (!ind) return null;

  const entries = Object.entries(ind.metrics).filter(
    ([key]) =>
      formData[key as keyof FormState] && formData[key as keyof FormState] !== ""
  );
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: 16,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${entries.length}, 1fr)`,
          gap: 0,
        }}
      >
        {entries.map(([key, metric]) => {
          const val = formData[key as keyof FormState];
          const tier = scoreTier(val, metric);
          const tc = tier ? TIER_LABELS[tier] : null;
          return (
            <div
              key={key}
              style={{
                padding: "14px 16px",
                textAlign: "center",
                borderRight: `1px solid ${T.border}`,
                background: tc
                  ? `${tc.color}08`
                  : "transparent",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: tc?.color || T.text,
                }}
              >
                {val}
                {metric.unit}
              </div>
              {tc && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: tc.color,
                    marginTop: 2,
                  }}
                >
                  {tc.label}
                </div>
              )}
              <div
                style={{ fontSize: 9, color: "#334155", marginTop: 2 }}
              >
                Avg: {metric.industry}
                {metric.unit} | Top: {metric.topQuartile}
                {metric.unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────
function renderMarkdown(text: string): ReactNode[] {
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
    if (line.startsWith("Subject:"))
      return (
        <div
          key={i}
          style={{
            background: T.surface2,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "#475569",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Subject:{" "}
          </span>
          <span
            style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}
          >
            {line.replace("Subject: ", "")}
          </span>
        </div>
      );
    if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
    // Highlight citation parentheses (e.g., "(ChartMogul 2024)")
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
          )
        )}
      </p>
    );
  });
}

// ── API helpers ───────────────────────────────────────────────────────────
async function callClaude(
  system: string,
  userMessage: string,
  maxTokens = 1500
): Promise<string> {
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  const data = await response.json();
  return (
    data.content
      ?.map((b: { text?: string }) => b.text || "")
      .join("") || ""
  );
}

async function saveReport(payload: {
  companyName: string;
  format: string;
  form: FormState;
  report: string;
  industry: string;
  mrr: string;
}): Promise<void> {
  await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName: payload.companyName,
      format: payload.format,
      form: payload.form,
      report: payload.report,
      industry: payload.industry,
      mrr: payload.mrr,
    }),
  });
}

// ── Form state type ───────────────────────────────────────────────────────
interface FormState {
  companyName: string;
  contactName: string;
  contactTitle: string;
  contractStart: string;
  mrr: string;
  annualChurn: string;
  adoptionRate: string;
  supportTickets: string;
  nrr: string;
  m1Label: string;
  m1Value: string;
  m2Label: string;
  m2Value: string;
  m3Label: string;
  m3Value: string;
  primaryGoal: string;
  additionalContext: string;
  [key: string]: string;
}

const INITIAL_FORM: FormState = {
  companyName: "",
  contactName: "",
  contactTitle: "",
  contractStart: "",
  mrr: "",
  annualChurn: "",
  adoptionRate: "",
  supportTickets: "",
  nrr: "",
  m1Label: "",
  m1Value: "",
  m2Label: "",
  m2Value: "",
  m3Label: "",
  m3Value: "",
  primaryGoal: "",
  additionalContext: "",
};

// ═══════════════════════════════════════════════════════════════════════════
// Main page component
// ═══════════════════════════════════════════════════════════════════════════
export default function GeneratorPage() {
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState("saas");
  const [format, setFormat] = useState("executive");
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [report, setReport] = useState("");
  const [editableReport, setEditableReport] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const ind = BENCHMARKS[industry];
  const fmt = REPORT_FORMATS[format];

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ── Generate report via Claude ────────────────────────────────────────
  const generate = async () => {
    if (!form.companyName || !form.primaryGoal) {
      setError("Company Name and Primary Goal are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const months = form.contractStart
        ? Math.floor(
            (Date.now() - new Date(form.contractStart).getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          )
        : "unknown";
      const benchCtx = buildBenchmarkContext(industry, form);
      const userPrompt = `${fmt.prompt}\n\n---\nCUSTOMER DATA:\nCompany: ${form.companyName}\nContact: ${form.contactName || "Not specified"}, ${form.contactTitle || ""}\nIndustry: ${ind.label}\nContract Start: ${form.contractStart} (${months} months)\nMRR: $${form.mrr}\nAdoption: ${form.adoptionRate}%\nSupport Tickets (90d): ${form.supportTickets}\n${form.nrr ? `NRR: ${form.nrr}%` : ""}\n${form.annualChurn ? `Churn: ${form.annualChurn}%` : ""}\n\nKey Metrics:\n${form.m1Label ? `\u2022 ${form.m1Label}: ${form.m1Value}` : ""}\n${form.m2Label ? `\u2022 ${form.m2Label}: ${form.m2Value}` : ""}\n${form.m3Label ? `\u2022 ${form.m3Label}: ${form.m3Value}` : ""}\n\nPrimary Goal: ${form.primaryGoal}\nContext: ${form.additionalContext || "None"}\n\n---\n${benchCtx}`;

      const text = await callClaude(INDUSTRY_PROMPTS[industry], userPrompt);
      setReport(text);
      setEditableReport(text);
      setStep(3);
    } catch {
      setError("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Save report to Supabase ───────────────────────────────────────────
  const handleSave = async () => {
    try {
      await saveReport({
        companyName: form.companyName,
        format,
        form,
        report: isEditing ? editableReport : report,
        industry,
        mrr: form.mrr,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Save failed. Please try again.");
    }
  };

  // ── Export to PDF (print) ─────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const content = isEditing ? editableReport : report;
    const benchmarkRows = Object.entries(ind.metrics)
      .filter(
        ([k]) => form[k as keyof FormState] && form[k as keyof FormState] !== ""
      )
      .map(([k, m]) => {
        const tier = scoreTier(form[k as keyof FormState], m);
        const tc = tier ? TIER_LABELS[tier] : null;
        return `<tr><td>${m.label}</td><td><strong>${form[k as keyof FormState]}${m.unit}</strong></td><td>${m.industry}${m.unit}</td><td>${m.topQuartile}${m.unit}</td><td style="color:${tc?.color || "#333"};font-weight:700">${tc?.label || "\u2014"}</td></tr>`;
      })
      .join("");
    win.document.write(
      `<html><head><title>${form.companyName} \u2014 ${fmt.label}</title><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"><style>body{font-family:'DM Sans',sans-serif;max-width:720px;margin:60px auto;color:#1e293b;line-height:1.7;font-size:14px}h1{font-family:'Playfair Display',serif;font-size:30px;margin-bottom:4px}.meta{color:#64748b;font-size:13px;margin-bottom:32px;border-bottom:2px solid #e2e8f0;padding-bottom:16px}h3{font-family:'Playfair Display',serif;font-size:17px;color:#0f172a;margin:28px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}p{margin:0 0 10px}.bt{width:100%;border-collapse:collapse;margin:16px 0 28px;font-size:12px}.bt th{background:#f8fafc;padding:8px 12px;text-align:left;border:1px solid #e2e8f0;font-weight:600;color:#475569;font-size:11px}.bt td{padding:8px 12px;border:1px solid #e2e8f0}.footer{margin-top:60px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}</style></head><body><h1>${form.companyName}</h1><div class="meta">${fmt.label} \u00B7 ${ind.icon} ${ind.label} \u00B7 ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>${content
        .split("\n")
        .map((l) =>
          l.startsWith("## ")
            ? `<h3>${l.slice(3)}</h3>`
            : l.startsWith("Subject:")
              ? `<p><strong>${l}</strong></p>`
              : !l.trim()
                ? "<br/>"
                : `<p>${l}</p>`
        )
        .join("")}${benchmarkRows ? `<h3>Benchmark Reference</h3><table class="bt"><tr><th>Metric</th><th>Customer</th><th>${ind.label} Avg</th><th>Top Q</th><th>Standing</th></tr>${benchmarkRows}</table>` : ""}<div class="footer">Generated by Proofpoint \u00B7 Benchmarks 2024\u20132026</div></body></html>`
    );
    win.document.close();
    win.print();
  };

  // ═════════════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <>
      <Nav />
      <PageWrapper>
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "32px 24px 80px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {/* ── Step indicator ──────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 22,
            }}
          >
            {["Configure", "Customer Data", "Report"].map((l, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background:
                      step > i + 1
                        ? T.green
                        : step === i + 1
                          ? "rgba(16,185,129,0.15)"
                          : T.surface2,
                    border: `1.5px solid ${step >= i + 1 ? T.green : T.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color:
                      step > i + 1
                        ? "#fff"
                        : step === i + 1
                          ? T.green
                          : "#475569",
                    transition: "all 0.3s",
                  }}
                >
                  {step > i + 1 ? "\u2713" : i + 1}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: step === i + 1 ? T.text : "#475569",
                    fontWeight: step === i + 1 ? 600 : 400,
                  }}
                >
                  {l}
                </span>
                {i < 2 && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {/* ── Card container ──────────────────────────────────────── */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: "28px 32px",
            }}
          >
            {/* ══════════════ Step 1: Configure ══════════════ */}
            {step === 1 && (
              <div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 21,
                    color: T.text,
                    marginBottom: 20,
                  }}
                >
                  Configure Report
                </h2>

                <label style={labelStyle}>Industry</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  {Object.entries(BENCHMARKS).map(([key, b]) => (
                    <button
                      key={key}
                      onClick={() => setIndustry(key)}
                      style={{
                        background:
                          industry === key
                            ? `${b.color}1f`
                            : T.surface2,
                        border: `1px solid ${industry === key ? b.color : T.border}`,
                        borderRadius: 10,
                        padding: "12px 8px",
                        cursor: "pointer",
                        textAlign: "center",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 4 }}>
                        {b.icon}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: industry === key ? b.color : "#475569",
                        }}
                      >
                        {b.label.split(" ")[0]}
                      </div>
                    </button>
                  ))}
                </div>

                <label style={labelStyle}>Report Format</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  {Object.entries(REPORT_FORMATS).map(([key, f]) => (
                    <button
                      key={key}
                      onClick={() => setFormat(key)}
                      style={{
                        background:
                          format === key
                            ? "rgba(16,185,129,0.1)"
                            : T.surface2,
                        border: `1px solid ${format === key ? T.green : T.border}`,
                        borderRadius: 10,
                        padding: "14px",
                        cursor: "pointer",
                        textAlign: "center",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 5 }}>
                        {f.icon}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: format === key ? T.green : "#475569",
                        }}
                      >
                        {f.label}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep(2)}
                  style={{
                    width: "100%",
                    background: ind.color,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "13px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Continue {"\u2192"}
                </button>
              </div>
            )}

            {/* ══════════════ Step 2: Customer Data ══════════════ */}
            {step === 2 && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 21,
                      color: T.text,
                    }}
                  >
                    Customer Data
                  </h2>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      background: "none",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      color: T.muted,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {"\u2190"} Back
                  </button>
                </div>

                <HubSpotAutoFill
                  onFill={(data) => setForm((p) => {
                    const next = { ...p };
                    Object.entries(data).forEach(([k, v]) => { if (v !== undefined) next[k] = v; });
                    return next;
                  })}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 18px",
                    marginBottom: 16,
                  }}
                >
                  <Field
                    label="Company Name *"
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    placeholder="Acme Health"
                  />
                  <Field
                    label="Contact Name"
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    placeholder="Sarah Johnson"
                  />
                  <Field
                    label="Contact Title"
                    name="contactTitle"
                    value={form.contactTitle}
                    onChange={handleChange}
                    placeholder="VP Operations"
                  />
                  <Field
                    label="Contract Start"
                    name="contractStart"
                    value={form.contractStart}
                    onChange={handleChange}
                    type="date"
                  />
                  <Field
                    label="Monthly Revenue ($)"
                    name="mrr"
                    value={form.mrr}
                    onChange={handleChange}
                    placeholder="12,500"
                  />
                </div>

                {/* Industry-specific benchmark inputs */}
                <div
                  style={{
                    background: `${ind.color}0d`,
                    border: `1px solid ${ind.color}33`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: ind.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 10,
                    }}
                  >
                    {ind.icon} {ind.label} Benchmarks
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px 18px",
                    }}
                  >
                    {Object.entries(ind.metrics).map(([key, metric]) => (
                      <div key={key}>
                        <label
                          style={{ ...labelStyle, color: `${ind.color}cc` }}
                        >
                          {metric.label}
                        </label>
                        <input
                          type="number"
                          name={key}
                          value={form[key] || ""}
                          onChange={handleChange}
                          placeholder={`Avg: ${metric.industry}`}
                          style={inputStyle}
                        />
                        {form[key] &&
                          (() => {
                            const tier = scoreTier(form[key], metric);
                            const tc = tier ? TIER_LABELS[tier] : null;
                            return tc ? (
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: tc.color,
                                  marginTop: 3,
                                }}
                              >
                                {"\u2726"} {tc.label}
                              </div>
                            ) : null;
                          })()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional metrics */}
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#334155",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 10,
                    }}
                  >
                    Additional Metrics
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px 18px",
                    }}
                  >
                    {(
                      [
                        [0, "m1Label", "m1Value"],
                        [1, "m2Label", "m2Value"],
                        [2, "m3Label", "m3Value"],
                      ] as const
                    ).map(([i, lk, vk]) => (
                      <div key={lk} style={{ display: "contents" }}>
                        <Field
                          label={`Metric ${i + 1} Name`}
                          name={lk}
                          value={form[lk]}
                          onChange={handleChange}
                          placeholder={
                            [
                              "Hours saved/week",
                              "Error rate reduction",
                              "Revenue influenced",
                            ][i]
                          }
                        />
                        <Field
                          label="Value"
                          name={vk}
                          value={form[vk]}
                          onChange={handleChange}
                          placeholder={["14 hours", "62%", "$340K"][i]}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Field
                  label="Customer's Primary Goal *"
                  name="primaryGoal"
                  value={form.primaryGoal}
                  onChange={handleChange}
                  type="textarea"
                  placeholder="Reduce claim processing time by 50%..."
                />
                <div style={{ marginTop: 10 }}>
                  <Field
                    label="Additional Context"
                    name="additionalContext"
                    value={form.additionalContext}
                    onChange={handleChange}
                    type="textarea"
                    placeholder="Renewal in 60 days..."
                  />
                </div>

                {error && (
                  <p
                    style={{ fontSize: 13, color: T.error, marginTop: 10 }}
                  >
                    {error}
                  </p>
                )}

                <button
                  onClick={generate}
                  disabled={loading}
                  style={{
                    width: "100%",
                    marginTop: 14,
                    background: loading ? T.greenDim : ind.color,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "13px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: loading ? 0.8 : 1,
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
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                          display: "inline-block",
                        }}
                      />
                      Generating...
                    </span>
                  ) : (
                    `\u2726 Generate ${fmt.label}`
                  )}
                </button>
              </div>
            )}

            {/* ══════════════ Step 3: Report Output ══════════════ */}
            {step === 3 && report && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 19,
                        color: T.text,
                        marginBottom: 2,
                      }}
                    >
                      {form.companyName} {"\u2014"} {fmt.label}
                    </h2>
                    <div style={{ fontSize: 12, color: "#334155" }}>
                      {ind.icon} {ind.label} {"\u00B7"}{" "}
                      {new Date().toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                  >
                    <button
                      onClick={() => {
                        setStep(2);
                        setReport("");
                      }}
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
                      {"\u2190"} Edit
                    </button>
                    <button
                      onClick={() => setIsEditing((e) => !e)}
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
                      {isEditing ? "Preview" : "\u270F\uFE0F Edit"}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          isEditing ? editableReport : report
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      style={{
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "7px 12px",
                        fontSize: 12,
                        color: copied ? T.green : T.muted,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {copied ? "\u2713 Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={handleSave}
                      style={{
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "7px 12px",
                        fontSize: 12,
                        color: saved ? T.green : T.green,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {saved ? "\u2713 Saved!" : "\u{1F4BE} Save"}
                    </button>
                    <button
                      onClick={handlePrint}
                      style={{
                        background: ind.color,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {"\u2193"} PDF
                    </button>
                  </div>
                </div>

                <BenchmarkScorecard industry={industry} formData={form} />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                    padding: "8px 14px",
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.15)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{"\u{1F4DA}"}</span>
                  <span style={{ fontSize: 11.5, color: "#6ee7b7" }}>
                    Citations in{" "}
                    <strong style={{ color: T.green }}>green</strong>{" "}
                    {"\u2014"} every benchmark is traceable.
                  </span>
                </div>

                <div
                  style={{
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {isEditing ? (
                    <textarea
                      value={editableReport}
                      onChange={(e) => setEditableReport(e.target.value)}
                      style={{
                        ...inputStyle,
                        background: T.bg,
                        border: "none",
                        borderRadius: 0,
                        padding: "22px 24px",
                        minHeight: 400,
                        fontSize: 13.5,
                        lineHeight: 1.85,
                        resize: "none",
                        width: "100%",
                      }}
                    />
                  ) : (
                    <div style={{ padding: "22px 24px" }}>
                      {renderMarkdown(report)}
                    </div>
                  )}
                </div>

                {/* Generate another format */}
                <div
                  style={{
                    marginTop: 12,
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: "#334155",
                      fontWeight: 600,
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Generate another format
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {Object.entries(REPORT_FORMATS)
                      .filter(([k]) => k !== format)
                      .map(([key, f]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setFormat(key);
                            setStep(2);
                            setReport("");
                          }}
                          style={{
                            background: T.bg,
                            border: `1px solid ${T.border}`,
                            borderRadius: 8,
                            padding: "7px 14px",
                            fontSize: 12,
                            color: T.muted,
                            cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {f.icon} {f.label}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
