"use client";

import { useState } from "react";
import { Nav, PageWrapper } from "@/components/Nav";
import {
  BENCHMARKS,
  scoreTier,
  TIER_LABELS,
  type BenchmarkMetric,
  type TierKey,
} from "@/lib/constants";

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
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const hexToRgb = (hex: string) =>
  [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ].join(",");

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

// ── Urgency config (specific to Next Action tool) ───────────────────────────
type UrgencyKey = "critical" | "soon" | "growth";

interface UrgencyInfo {
  label: string;
  color: string;
  icon: string;
}

const URGENCY: Record<UrgencyKey, UrgencyInfo> = {
  critical: { label: "Do This Week", color: T.error, icon: "\u26A1" },
  soon: { label: "This Month", color: T.warning, icon: "\u25C6" },
  growth: { label: "Opportunity", color: T.green, icon: "\u25B2" },
};

// ── Tier display config (maps scoreTier output → visual display) ────────────
const TIER_DISPLAY: Record<TierKey, { label: string; color: string }> = {
  top: { label: "Top Quartile", color: T.green },
  good: { label: "Above Average", color: T.info },
  average: { label: "Watch", color: T.warning },
  risk: { label: "At Risk", color: T.error },
};

// ── Action shape from Claude ────────────────────────────────────────────────
interface ActionItem {
  urgency: UrgencyKey;
  title: string;
  signal: string;
  talkingPoints?: string[];
  outcome: string;
  deadline?: string;
}

// ── Form state ──────────────────────────────────────────────────────────────
interface FormState {
  companyName: string;
  contactName: string;
  contactTitle: string;
  mrr: string;
  renewalDate: string;
  championEngagement: string;
  recentChange: string;
  context: string;
  annualChurn: string;
  adoptionRate: string;
  supportTickets: string;
  nrr: string;
  [key: string]: string;
}

const INITIAL_FORM: FormState = {
  companyName: "",
  contactName: "",
  contactTitle: "",
  mrr: "",
  renewalDate: "",
  championEngagement: "",
  recentChange: "",
  context: "",
  annualChurn: "",
  adoptionRate: "",
  supportTickets: "",
  nrr: "",
};

// ── Sub-components ──────────────────────────────────────────────────────────
function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  labelColor,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  placeholder?: string;
  labelColor?: string;
}) {
  return (
    <div>
      <label style={{ ...labelStyle, color: labelColor || T.muted }}>{label}</label>
      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
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
  return data.content?.map((b: { text?: string }) => b.text || "").join("") || "";
}

async function saveReport(
  companyName: string,
  industry: string,
  mrr: string,
  formData: FormState,
  report: string,
): Promise<void> {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: companyName,
      report_type: "next_action",
      industry,
      mrr: mrr ? parseFloat(mrr) : null,
      input_data: formData,
      generated_report: report,
    }),
  });
  if (!res.ok) throw new Error("Failed to save report");
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function NextActionPage() {
  const [industry, setIndustry] = useState("saas");
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(0);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const ind = BENCHMARKS[industry];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ── Generate action plan ────────────────────────────────────────────────
  const generate = async () => {
    if (!form.companyName) {
      setError("Company name is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const signals = Object.entries(ind.metrics)
        .filter(([k]) => form[k])
        .map(([k, m]) => {
          const tier = scoreTier(form[k], m);
          return {
            label: m.label,
            value: form[k],
            unit: m.unit,
            industry: m.industry,
            tierLabel: tier ? TIER_DISPLAY[tier].label : "Watch",
          };
        });

      const renewalDays = form.renewalDate
        ? Math.round(
            (new Date(form.renewalDate).getTime() - Date.now()) / 86400000,
          )
        : null;

      const signalLines = signals
        .map(
          (s) =>
            `\u2022 ${s.label}: ${s.value}${s.unit} \u2014 ${s.tierLabel} vs avg ${s.industry}${s.unit}`,
        )
        .join("\n");

      const prompt = `You are a senior CS strategist. Analyze this customer and generate exactly 4 next actions ranked by urgency.

CUSTOMER:
Company: ${form.companyName}
Industry: ${ind.label}
Contact: ${form.contactName || "unknown"}, ${form.contactTitle || ""}
Renewal: ${renewalDays !== null ? `${renewalDays} days` : "unknown"}
MRR: $${form.mrr || "unknown"}
Champion: ${form.championEngagement || "unknown"}
Recent change: ${form.recentChange || "none"}

SIGNALS:
${signalLines}

Context: ${form.context || "None"}

Return a JSON array of 4 objects with: urgency ("critical"|"soon"|"growth"), title (max 8 words), signal (1 sentence), talkingPoints (array of 2-3 phrases), outcome (1 sentence), deadline. Start with [ end with ]. No markdown.`;

      const text = await callClaude(
        "You are a senior Customer Success strategist. Return only valid JSON.",
        prompt,
      );

      const parsed: ActionItem[] = JSON.parse(
        text.replace(/```json?/g, "").replace(/```/g, "").trim(),
      );
      setActions(parsed);
      setStep(2);
      setExpanded(0);
      setSaved(false);
    } catch {
      setError("Failed to generate actions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Save as report ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const reportText = actions
        .map((a, i) => {
          const u = URGENCY[a.urgency] || URGENCY.soon;
          return `## ${i + 1}. ${a.title} [${u.label}]\n\n**Signal:** ${a.signal}\n\n**Talking Points:**\n${(a.talkingPoints || []).map((tp) => `- ${tp}`).join("\n")}\n\n**Outcome:** ${a.outcome}${a.deadline ? `\n**Deadline:** ${a.deadline}` : ""}`;
        })
        .join("\n\n---\n\n");

      const fullReport = `# Next Action Plan \u2014 ${form.companyName}\n**Industry:** ${ind.label} | **MRR:** $${form.mrr || "N/A"} | **Generated:** ${new Date().toLocaleDateString()}\n\n${reportText}`;

      await saveReport(form.companyName, industry, form.mrr, form, fullReport);
      setSaved(true);
    } catch {
      setError("Failed to save report.");
    } finally {
      setSaving(false);
    }
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
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `rgba(${hexToRgb(T.info)},0.12)`,
                  border: `1px solid ${T.info}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                {"\uD83C\uDFAF"}
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
                  Next Action Planner
                </h1>
                <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
                  AI-driven priority recommendations for customer accounts
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

            {/* ─── STEP 1: Input ─── */}
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
                  Customer Signals
                </h2>

                {/* Industry selector */}
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
                            ? `rgba(${hexToRgb(b.color)},0.12)`
                            : T.surface2,
                        border: `1px solid ${industry === key ? b.color : T.border}`,
                        borderRadius: 10,
                        padding: "10px 8px",
                        cursor: "pointer",
                        textAlign: "center",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 3 }}>{b.icon}</div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: industry === key ? b.color : "#475569",
                        }}
                      >
                        {b.label.split(" ")[0]}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Core fields */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 18px",
                    marginBottom: 14,
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
                    label="MRR ($)"
                    name="mrr"
                    value={form.mrr}
                    onChange={handleChange}
                    placeholder="12,500"
                  />
                  <Field
                    label="Contact Name"
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    placeholder="Sarah Johnson"
                  />
                  <Field
                    label="Title"
                    name="contactTitle"
                    value={form.contactTitle}
                    onChange={handleChange}
                    placeholder="VP Ops"
                  />
                  <Field
                    label="Renewal Date"
                    name="renewalDate"
                    value={form.renewalDate}
                    onChange={handleChange}
                    type="date"
                  />
                  <Field
                    label="Champion Engagement"
                    name="championEngagement"
                    value={form.championEngagement}
                    onChange={handleChange}
                    placeholder="High / Low / Left company"
                  />
                </div>

                {/* Health signals section */}
                <div
                  style={{
                    background: `rgba(${hexToRgb(ind.color)},0.05)`,
                    border: `1px solid ${ind.color}33`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: ind.color,
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    {ind.icon} Health Signals
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px 18px",
                    }}
                  >
                    {Object.entries(ind.metrics).map(([key, metric]) => {
                      const tier = form[key] ? scoreTier(form[key], metric) : null;
                      const display = tier ? TIER_DISPLAY[tier] : null;
                      return (
                        <div key={key}>
                          <label style={{ ...labelStyle, color: ind.color + "cc" }}>
                            {metric.label}
                          </label>
                          <input
                            type="number"
                            name={key}
                            value={form[key]}
                            onChange={handleChange}
                            placeholder={`Avg: ${metric.industry}`}
                            style={inputStyle}
                          />
                          {display && (
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: display.color,
                                marginTop: 3,
                              }}
                            >
                              {"\u2726"} {display.label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Context fields */}
                <Field
                  label="Recent Changes"
                  name="recentChange"
                  value={form.recentChange}
                  onChange={handleChange}
                  placeholder="Champion left, budget cuts..."
                />
                <div style={{ marginTop: 10 }}>
                  <Field
                    label="Additional Context"
                    name="context"
                    value={form.context}
                    onChange={handleChange}
                    type="textarea"
                    placeholder="Any other signals..."
                  />
                </div>

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
                    marginTop: 14,
                    background: loading ? T.greenDim : T.green,
                    color: "#fff",
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
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                          display: "inline-block",
                        }}
                      />
                      Analyzing...
                    </span>
                  ) : (
                    "\uD83C\uDFAF Generate Next Actions"
                  )}
                </button>
              </div>
            )}

            {/* ─── STEP 2: Results ─── */}
            {step === 2 && actions.length > 0 && (
              <div>
                {/* Header row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 19,
                        color: T.text,
                        marginBottom: 2,
                        marginTop: 0,
                      }}
                    >
                      {form.companyName} &mdash; Action Plan
                    </h2>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {ind.icon} {ind.label} &middot; {actions.length} actions
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Save as Report button */}
                    <button
                      onClick={handleSave}
                      disabled={saving || saved}
                      style={{
                        background: saved
                          ? `rgba(${hexToRgb(T.green)},0.1)`
                          : T.surface2,
                        border: `1px solid ${saved ? T.green + "44" : T.border}`,
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 12,
                        color: saved ? T.green : T.muted,
                        cursor: saving || saved ? "default" : "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 600,
                        transition: "all 0.2s",
                      }}
                    >
                      {saved
                        ? "\u2713 Saved"
                        : saving
                          ? "Saving..."
                          : "\uD83D\uDCBE Save as Report"}
                    </button>
                    {/* New analysis button */}
                    <button
                      onClick={() => {
                        setStep(1);
                        setActions([]);
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
                      &larr; New
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p style={{ fontSize: 13, color: T.error, marginBottom: 10 }}>
                    {error}
                  </p>
                )}

                {/* Action cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {actions.map((action, i) => {
                    const u: UrgencyInfo =
                      URGENCY[action.urgency] || URGENCY.soon;
                    const isExp = expanded === i;
                    return (
                      <div
                        key={i}
                        onClick={() => setExpanded(isExp ? -1 : i)}
                        style={{
                          background: isExp
                            ? `rgba(${hexToRgb(u.color)},0.04)`
                            : T.surface2,
                          border: `1px solid ${isExp ? u.color + "44" : T.border}`,
                          borderRadius: 12,
                          padding: "14px 18px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {/* Card header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: `rgba(${hexToRgb(u.color)},0.12)`,
                              border: `1px solid ${u.color}33`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {u.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: T.text,
                              }}
                            >
                              {action.title}
                            </div>
                            <div style={{ fontSize: 12, color: "#475569" }}>
                              {action.signal}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: u.color,
                              background: `rgba(${hexToRgb(u.color)},0.1)`,
                              padding: "3px 10px",
                              borderRadius: 20,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {u.label}
                          </span>
                        </div>

                        {/* Expanded details */}
                        {isExp && (
                          <div
                            style={{
                              marginTop: 14,
                              paddingTop: 14,
                              borderTop: `1px solid ${T.border}`,
                              animation: "panelIn 0.2s ease",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#334155",
                                textTransform: "uppercase",
                                marginBottom: 8,
                              }}
                            >
                              Talking Points
                            </div>
                            {action.talkingPoints?.map((tp, j) => (
                              <div
                                key={j}
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "flex-start",
                                  marginBottom: 6,
                                }}
                              >
                                <span
                                  style={{
                                    color: u.color,
                                    fontSize: 10,
                                    marginTop: 2,
                                  }}
                                >
                                  {"\u25CF"}
                                </span>
                                <span
                                  style={{
                                    fontSize: 13,
                                    color: T.subtle,
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {tp}
                                </span>
                              </div>
                            ))}

                            {/* Outcome + Deadline */}
                            <div
                              style={{
                                display: "flex",
                                gap: 16,
                                marginTop: 12,
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  background: T.bg,
                                  borderRadius: 8,
                                  padding: "10px 12px",
                                  border: `1px solid ${T.border}`,
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
                                  Outcome
                                </div>
                                <div
                                  style={{ fontSize: 12.5, color: T.subtle }}
                                >
                                  {action.outcome}
                                </div>
                              </div>
                              {action.deadline && (
                                <div
                                  style={{
                                    background: T.bg,
                                    borderRadius: 8,
                                    padding: "10px 14px",
                                    border: `1px solid ${T.border}`,
                                    minWidth: 90,
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
                                    Deadline
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12.5,
                                      color: u.color,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {action.deadline}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
