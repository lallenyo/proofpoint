"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Nav, PageWrapper } from "@/components/Nav";
import type { ClientAccount, LifecycleStage } from "@/lib/supabase";
import { LIFECYCLE_COLORS, LIFECYCLE_LABELS } from "@/lib/supabase";
import { getHealthColor, getHealthLabel } from "@/lib/health-score";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

function formatDate(date: string | null): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_STAGES: LifecycleStage[] = [
  "onboarding",
  "active",
  "renewal-due",
  "renewed",
  "expanded",
  "at-risk",
  "churned",
  "paused",
];

const HEALTH_FILTERS = [
  { label: "All", min: 0, max: 100 },
  { label: "Healthy 70+", min: 70, max: 100 },
  { label: "Needs Attention 40\u201369", min: 40, max: 69 },
  { label: "At Risk 0\u201339", min: 0, max: 39 },
] as const;

const INDUSTRY_OPTIONS = [
  { value: "", label: "All Industries" },
  { value: "healthcare", label: "Healthcare" },
  { value: "fintech", label: "Fintech" },
  { value: "hrtech", label: "HR Tech" },
  { value: "saas", label: "SaaS" },
  { value: "realestate", label: "Real Estate" },
];

const SORT_OPTIONS = [
  { value: "health_score", label: "Health Score" },
  { value: "mrr", label: "MRR" },
  { value: "contract_end", label: "Contract End" },
  { value: "last_contact_date", label: "Last Contact" },
  { value: "company_name", label: "Company Name" },
];

const INDUSTRY_LABELS: Record<string, string> = {
  healthcare: "Healthcare",
  fintech: "Fintech",
  hrtech: "HR Tech",
  saas: "SaaS",
  realestate: "Real Estate",
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = {
  card: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "18px 20px",
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,
  label: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    fontWeight: 600,
    marginBottom: 6,
    fontFamily: "'DM Sans', sans-serif",
  } as React.CSSProperties,
  bigNumber: {
    fontSize: 26,
    fontWeight: 700,
    color: "#f1f5f9",
    fontFamily: "'Playfair Display', serif",
  } as React.CSSProperties,
  pillBase: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  } as React.CSSProperties,
  input: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 6,
    padding: "8px 12px",
    color: "#f1f5f9",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    width: "100%",
  } as React.CSSProperties,
  select: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 6,
    padding: "8px 12px",
    color: "#f1f5f9",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    cursor: "pointer",
    appearance: "none" as const,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: 30,
  } as React.CSSProperties,
  button: {
    padding: "8px 16px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s",
  } as React.CSSProperties,
  th: {
    padding: "10px 14px",
    textAlign: "left" as const,
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    borderBottom: "1px solid #1e293b",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  td: {
    padding: "12px 14px",
    fontSize: 13,
    color: "#f1f5f9",
    fontFamily: "'DM Sans', sans-serif",
    borderBottom: "1px solid rgba(30,41,59,0.5)",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  // Data
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStages, setSelectedStages] = useState<Set<LifecycleStage>>(
    new Set()
  );
  const [healthFilter, setHealthFilter] = useState(0); // index into HEALTH_FILTERS
  const [industryFilter, setIndustryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("health_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Add account form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    domain: "",
    industry: "",
    lifecycle_stage: "onboarding",
    mrr: "",
    contract_start: "",
    contract_end: "",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Batch recalc state
  const [recalculating, setRecalculating] = useState(false);

  // Hover states for table rows
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // ── Fetch accounts ─────────────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();

    if (selectedStages.size > 0) {
      params.set("stage", Array.from(selectedStages).join(","));
    }
    if (industryFilter) {
      params.set("industry", industryFilter);
    }

    const hf = HEALTH_FILTERS[healthFilter];
    if (healthFilter !== 0) {
      params.set("healthMin", String(hf.min));
      params.set("healthMax", String(hf.max));
    }

    if (search.trim()) {
      params.set("search", search.trim());
    }

    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);

    try {
      const res = await fetch(`/api/accounts?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch accounts");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStages, healthFilter, industryFilter, search, sortBy, sortDir]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // ── Summary computations ──────────────────────────────────────────────────

  const totalMrr = accounts.reduce((sum, a) => sum + (a.mrr || 0), 0);

  const avgHealth =
    accounts.length > 0
      ? Math.round(
          accounts.reduce((sum, a) => sum + a.health_score, 0) /
            accounts.length
        )
      : 0;

  const stageCounts: Partial<Record<LifecycleStage, number>> = {};
  accounts.forEach((a) => {
    stageCounts[a.lifecycle_stage] =
      (stageCounts[a.lifecycle_stage] || 0) + 1;
  });

  const renewals30 = accounts.filter((a) => {
    const d = daysUntil(a.contract_end);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const renewals60 = accounts.filter((a) => {
    const d = daysUntil(a.contract_end);
    return d !== null && d >= 0 && d <= 60;
  }).length;
  const renewals90 = accounts.filter((a) => {
    const d = daysUntil(a.contract_end);
    return d !== null && d >= 0 && d <= 90;
  }).length;

  // ── Stage toggle ──────────────────────────────────────────────────────────

  function toggleStage(stage: LifecycleStage) {
    setSelectedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }

  // ── Add account ───────────────────────────────────────────────────────────

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      setFormError("Company name is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: Record<string, unknown> = {
        company_name: formData.company_name.trim(),
        domain: formData.domain.trim() || null,
        industry: formData.industry || null,
        lifecycle_stage: formData.lifecycle_stage || "onboarding",
        mrr: formData.mrr ? parseFloat(formData.mrr) : 0,
        contract_start: formData.contract_start || null,
        contract_end: formData.contract_end || null,
        notes: formData.notes.trim() || null,
      };

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }

      // Reset form and refetch
      setFormData({
        company_name: "",
        domain: "",
        industry: "",
        lifecycle_stage: "onboarding",
        mrr: "",
        contract_start: "",
        contract_end: "",
        notes: "",
      });
      setShowAddForm(false);
      fetchAccounts();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create account"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Batch recalculate ─────────────────────────────────────────────────────

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const res = await fetch("/api/health/batch", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      fetchAccounts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to recalculate scores"
      );
    } finally {
      setRecalculating(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />
      <PageWrapper>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "32px 24px 64px",
            fontFamily: "'DM Sans', sans-serif",
            color: "#f1f5f9",
          }}
        >
          {/* ── Summary Stats ─────────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {/* Total MRR */}
            <div style={styles.card}>
              <div style={styles.label}>Total MRR</div>
              <div style={styles.bigNumber}>{formatCurrency(totalMrr)}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {formatCurrency(totalMrr * 12)} ARR
              </div>
            </div>

            {/* Average Health */}
            <div style={styles.card}>
              <div style={styles.label}>Avg Health Score</div>
              <div
                style={{
                  ...styles.bigNumber,
                  color: accounts.length > 0 ? getHealthColor(avgHealth) : "#64748b",
                }}
              >
                {accounts.length > 0 ? avgHealth : "\u2014"}
              </div>
              {accounts.length > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: getHealthColor(avgHealth),
                    marginTop: 4,
                  }}
                >
                  {getHealthLabel(avgHealth)}
                </div>
              )}
            </div>

            {/* Accounts by Stage */}
            <div style={styles.card}>
              <div style={styles.label}>Accounts by Stage</div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  marginTop: 4,
                }}
              >
                {ALL_STAGES.filter((s) => (stageCounts[s] || 0) > 0).map(
                  (stage) => (
                    <span
                      key={stage}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        background: `${LIFECYCLE_COLORS[stage]}20`,
                        color: LIFECYCLE_COLORS[stage],
                      }}
                    >
                      {LIFECYCLE_LABELS[stage]}
                      <span
                        style={{
                          background: LIFECYCLE_COLORS[stage],
                          color: "#050b18",
                          borderRadius: 8,
                          padding: "0 5px",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {stageCounts[stage]}
                      </span>
                    </span>
                  )
                )}
                {accounts.length === 0 && !loading && (
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    No accounts yet
                  </span>
                )}
              </div>
            </div>

            {/* Renewals */}
            <div style={styles.card}>
              <div style={styles.label}>Upcoming Renewals</div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 6,
                  alignItems: "baseline",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: renewals30 > 0 ? "#f59e0b" : "#f1f5f9",
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {renewals30}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>30 days</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#f1f5f9",
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {renewals60}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>60 days</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#f1f5f9",
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {renewals90}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>90 days</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Header + Actions ──────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 28,
                  fontWeight: 700,
                  margin: 0,
                  color: "#f1f5f9",
                }}
              >
                My Portfolio
              </h1>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                {loading
                  ? "Loading accounts..."
                  : `${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                style={{
                  ...styles.button,
                  background: recalculating ? "#1e293b" : "rgba(16,185,129,0.1)",
                  color: recalculating ? "#64748b" : "#10b981",
                  border: "1px solid",
                  borderColor: recalculating ? "#1e293b" : "rgba(16,185,129,0.3)",
                }}
              >
                {recalculating ? "Recalculating..." : "Recalculate All Health Scores"}
              </button>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                style={{
                  ...styles.button,
                  background: "#10b981",
                  color: "#050b18",
                }}
              >
                {showAddForm ? "Cancel" : "Add Account"}
              </button>
            </div>
          </div>

          {/* ── Add Account Form ──────────────────────────────────────────── */}
          {showAddForm && (
            <div
              style={{
                ...styles.card,
                marginBottom: 24,
                padding: 24,
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18,
                  margin: "0 0 20px",
                  color: "#f1f5f9",
                }}
              >
                New Account
              </h3>
              <form onSubmit={handleAddAccount}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  {/* Company Name */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          company_name: e.target.value,
                        }))
                      }
                      placeholder="Acme Corp"
                      style={styles.input}
                      required
                    />
                  </div>

                  {/* Domain */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      Domain
                    </label>
                    <input
                      type="text"
                      value={formData.domain}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, domain: e.target.value }))
                      }
                      placeholder="acme.com"
                      style={styles.input}
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      Industry
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          industry: e.target.value,
                        }))
                      }
                      style={styles.select}
                    >
                      <option value="">Select industry</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="fintech">Fintech</option>
                      <option value="hrtech">HR Tech</option>
                      <option value="saas">SaaS</option>
                      <option value="realestate">Real Estate</option>
                    </select>
                  </div>

                  {/* Lifecycle Stage */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      Lifecycle Stage
                    </label>
                    <select
                      value={formData.lifecycle_stage}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          lifecycle_stage: e.target.value,
                        }))
                      }
                      style={styles.select}
                    >
                      {ALL_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {LIFECYCLE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* MRR */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      MRR ($)
                    </label>
                    <input
                      type="number"
                      value={formData.mrr}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, mrr: e.target.value }))
                      }
                      placeholder="5000"
                      min="0"
                      step="100"
                      style={styles.input}
                    />
                  </div>

                  {/* Contract Start */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      Contract Start
                    </label>
                    <input
                      type="date"
                      value={formData.contract_start}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          contract_start: e.target.value,
                        }))
                      }
                      style={{
                        ...styles.input,
                        colorScheme: "dark",
                      }}
                    />
                  </div>

                  {/* Contract End */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      Contract End
                    </label>
                    <input
                      type="date"
                      value={formData.contract_end}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          contract_end: e.target.value,
                        }))
                      }
                      style={{
                        ...styles.input,
                        colorScheme: "dark",
                      }}
                    />
                  </div>

                  {/* Notes */}
                  <div style={{ gridColumn: "2 / 4" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, notes: e.target.value }))
                      }
                      placeholder="Any initial notes about this account..."
                      rows={1}
                      style={{
                        ...styles.input,
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>

                {formError && (
                  <div
                    style={{
                      color: "#ef4444",
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      ...styles.button,
                      background: submitting ? "#1e293b" : "#10b981",
                      color: submitting ? "#64748b" : "#050b18",
                    }}
                  >
                    {submitting ? "Creating..." : "Create Account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormError(null);
                    }}
                    style={{
                      ...styles.button,
                      background: "transparent",
                      color: "#94a3b8",
                      border: "1px solid #1e293b",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Filter Bar ────────────────────────────────────────────────── */}
          <div
            style={{
              ...styles.card,
              marginBottom: 24,
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Row 1: Stage pills */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginRight: 4,
                }}
              >
                Stage
              </span>
              {ALL_STAGES.map((stage) => {
                const active = selectedStages.has(stage);
                const color = LIFECYCLE_COLORS[stage];
                return (
                  <button
                    key={stage}
                    onClick={() => toggleStage(stage)}
                    style={{
                      ...styles.pillBase,
                      background: active ? `${color}20` : "transparent",
                      color: active ? color : "#64748b",
                      borderColor: active ? `${color}50` : "#1e293b",
                    }}
                  >
                    {LIFECYCLE_LABELS[stage]}
                  </button>
                );
              })}
              {selectedStages.size > 0 && (
                <button
                  onClick={() => setSelectedStages(new Set())}
                  style={{
                    ...styles.pillBase,
                    color: "#94a3b8",
                    background: "transparent",
                    borderColor: "transparent",
                    fontSize: 11,
                    textDecoration: "underline",
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Row 2: Health pills + Industry + Search + Sort */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {/* Health filter pills */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginRight: 2,
                  }}
                >
                  Health
                </span>
                {HEALTH_FILTERS.map((hf, idx) => {
                  const active = healthFilter === idx;
                  const color =
                    idx === 0
                      ? "#94a3b8"
                      : idx === 1
                        ? "#10b981"
                        : idx === 2
                          ? "#f59e0b"
                          : "#ef4444";
                  return (
                    <button
                      key={hf.label}
                      onClick={() => setHealthFilter(idx)}
                      style={{
                        ...styles.pillBase,
                        background: active ? `${color}20` : "transparent",
                        color: active ? color : "#64748b",
                        borderColor: active ? `${color}50` : "#1e293b",
                      }}
                    >
                      {hf.label}
                    </button>
                  );
                })}
              </div>

              {/* Separator */}
              <div
                style={{
                  width: 1,
                  height: 24,
                  background: "#1e293b",
                }}
              />

              {/* Industry dropdown */}
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                style={{ ...styles.select, width: 160 }}
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company name..."
                style={{ ...styles.input, width: 220 }}
              />

              {/* Sort */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ ...styles.select, width: 160 }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      Sort: {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                  }
                  title={sortDir === "asc" ? "Ascending" : "Descending"}
                  style={{
                    ...styles.button,
                    background: "rgba(148,163,184,0.1)",
                    color: "#94a3b8",
                    border: "1px solid #1e293b",
                    padding: "6px 10px",
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  {sortDir === "asc" ? "\u2191" : "\u2193"}
                </button>
              </div>
            </div>
          </div>

          {/* ── Error ──────────────────────────────────────────────────────── */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
                color: "#ef4444",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{error}</span>
              <button
                onClick={() => {
                  setError(null);
                  fetchAccounts();
                }}
                style={{
                  ...styles.button,
                  background: "rgba(239,68,68,0.2)",
                  color: "#ef4444",
                  fontSize: 12,
                  padding: "4px 12px",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Loading ────────────────────────────────────────────────────── */}
          {loading && (
            <div
              style={{
                ...styles.card,
                padding: 48,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: "3px solid #1e293b",
                  borderTop: "3px solid #10b981",
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  animation: "spin 1s linear infinite",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              Loading accounts...
            </div>
          )}

          {/* ── Accounts Table ─────────────────────────────────────────────── */}
          {!loading && accounts.length > 0 && (
            <div
              style={{
                ...styles.card,
                padding: 0,
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "23%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={styles.th}>Health</th>
                    <th style={styles.th}>Company</th>
                    <th style={styles.th}>Industry</th>
                    <th style={styles.th}>Stage</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>MRR</th>
                    <th style={styles.th}>Contract End</th>
                    <th style={styles.th}>Last Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account, idx) => {
                    const renewDays = daysUntil(account.contract_end);
                    const isHovered = hoveredRow === account.id;
                    const zebraBackground =
                      idx % 2 === 0
                        ? "transparent"
                        : "rgba(30,41,59,0.2)";

                    return (
                      <tr
                        key={account.id}
                        onMouseEnter={() => setHoveredRow(account.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          background: isHovered
                            ? "rgba(16,185,129,0.05)"
                            : zebraBackground,
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                      >
                        <td style={styles.td}>
                          <Link
                            href={`/accounts/${account.id}`}
                            style={{
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                fontWeight: 700,
                                color: getHealthColor(account.health_score),
                                background: `${getHealthColor(account.health_score)}15`,
                                border: `2px solid ${getHealthColor(account.health_score)}40`,
                              }}
                            >
                              {account.health_score}
                            </div>
                          </Link>
                        </td>
                        <td style={styles.td}>
                          <Link
                            href={`/accounts/${account.id}`}
                            style={{
                              textDecoration: "none",
                              color: "#f1f5f9",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 14,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {account.company_name}
                            </div>
                            {account.domain && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                  marginTop: 1,
                                }}
                              >
                                {account.domain}
                              </div>
                            )}
                          </Link>
                        </td>
                        <td style={{ ...styles.td, color: "#94a3b8" }}>
                          <Link
                            href={`/accounts/${account.id}`}
                            style={{
                              textDecoration: "none",
                              color: "inherit",
                            }}
                          >
                            {account.industry
                              ? INDUSTRY_LABELS[account.industry] ||
                                account.industry
                              : "\u2014"}
                          </Link>
                        </td>
                        <td style={styles.td}>
                          <Link
                            href={`/accounts/${account.id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background: `${LIFECYCLE_COLORS[account.lifecycle_stage]}20`,
                                color:
                                  LIFECYCLE_COLORS[account.lifecycle_stage],
                              }}
                            >
                              {LIFECYCLE_LABELS[account.lifecycle_stage]}
                            </span>
                          </Link>
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            textAlign: "right",
                            fontWeight: 600,
                          }}
                        >
                          <Link
                            href={`/accounts/${account.id}`}
                            style={{
                              textDecoration: "none",
                              color: "#f1f5f9",
                            }}
                          >
                            {formatCurrency(account.mrr)}
                          </Link>
                        </td>
                        <td style={styles.td}>
                          <Link
                            href={`/accounts/${account.id}`}
                            style={{
                              textDecoration: "none",
                              color: "inherit",
                            }}
                          >
                            <span
                              style={{
                                color:
                                  renewDays !== null && renewDays <= 30
                                    ? "#f59e0b"
                                    : renewDays !== null && renewDays <= 0
                                      ? "#ef4444"
                                      : "#94a3b8",
                              }}
                            >
                              {formatDate(account.contract_end)}
                            </span>
                            {renewDays !== null && renewDays > 0 && renewDays <= 90 && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "#64748b",
                                  marginLeft: 6,
                                }}
                              >
                                ({renewDays}d)
                              </span>
                            )}
                          </Link>
                        </td>
                        <td style={{ ...styles.td, color: "#94a3b8" }}>
                          <Link
                            href={`/accounts/${account.id}`}
                            style={{
                              textDecoration: "none",
                              color: "inherit",
                            }}
                          >
                            {formatDate(account.last_contact_date)}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Empty State ────────────────────────────────────────────────── */}
          {!loading && accounts.length === 0 && !error && (
            <div
              style={{
                ...styles.card,
                padding: 60,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  marginBottom: 16,
                  opacity: 0.4,
                }}
              >
                { /* Building icon */ }
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="10" y2="6" />
                  <line x1="14" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="10" y2="10" />
                  <line x1="14" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="10" y2="14" />
                  <line x1="14" y1="14" x2="16" y2="14" />
                  <line x1="10" y1="18" x2="14" y2="18" />
                  <line x1="10" y1="22" x2="10" y2="18" />
                  <line x1="14" y1="22" x2="14" y2="18" />
                </svg>
              </div>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 20,
                  margin: "0 0 8px",
                  color: "#f1f5f9",
                }}
              >
                No accounts found
              </h3>
              <p
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  margin: "0 0 20px",
                }}
              >
                {selectedStages.size > 0 ||
                healthFilter !== 0 ||
                industryFilter ||
                search
                  ? "Try adjusting your filters or search terms."
                  : "Add your first customer account to start tracking your portfolio."}
              </p>
              {!(
                selectedStages.size > 0 ||
                healthFilter !== 0 ||
                industryFilter ||
                search
              ) && (
                <button
                  onClick={() => setShowAddForm(true)}
                  style={{
                    ...styles.button,
                    background: "#10b981",
                    color: "#050b18",
                    padding: "10px 24px",
                    fontSize: 14,
                  }}
                >
                  Add Your First Account
                </button>
              )}
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  );
}
