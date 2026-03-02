"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Nav, PageWrapper } from "@/components/Nav";
import { getHealthColor } from "@/lib/health-score";
import { LIFECYCLE_COLORS, LIFECYCLE_LABELS } from "@/lib/supabase";
import type { LifecycleStage } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

type Account = {
  id: string;
  company_name: string;
  industry: string | null;
  lifecycle_stage: string;
  mrr: number;
  arr: number;
  contract_end: string | null;
  health_score: number;
  health_trend: string;
  nps_score: number | null;
};

type MonthGroup = {
  key: string;
  label: string;
  accounts: Account[];
};

type PipelineSummary = {
  thisMonth: { count: number; mrr: number };
  next30: { count: number; mrr: number };
  next60: { count: number; mrr: number };
  next90: { count: number; mrr: number };
  overdue: { count: number; mrr: number };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function getUrgencyColor(days: number | null): string {
  if (days === null) return "#64748b";
  if (days < 0) return "#ef4444";
  if (days < 30) return "#ef4444";
  if (days < 60) return "#f59e0b";
  return "#10b981";
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function computePipelineSummary(accounts: Account[]): PipelineSummary {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const summary: PipelineSummary = {
    thisMonth: { count: 0, mrr: 0 },
    next30: { count: 0, mrr: 0 },
    next60: { count: 0, mrr: 0 },
    next90: { count: 0, mrr: 0 },
    overdue: { count: 0, mrr: 0 },
  };

  for (const acct of accounts) {
    if (!acct.contract_end) continue;
    const days = daysUntil(acct.contract_end);
    if (days === null) continue;

    const endDate = new Date(acct.contract_end);

    if (days < 0) {
      summary.overdue.count++;
      summary.overdue.mrr += acct.mrr;
    }

    if (endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear) {
      summary.thisMonth.count++;
      summary.thisMonth.mrr += acct.mrr;
    }

    if (days >= 0 && days <= 30) {
      summary.next30.count++;
      summary.next30.mrr += acct.mrr;
    }
    if (days >= 0 && days <= 60) {
      summary.next60.count++;
      summary.next60.mrr += acct.mrr;
    }
    if (days >= 0 && days <= 90) {
      summary.next90.count++;
      summary.next90.mrr += acct.mrr;
    }
  }

  return summary;
}

function groupByMonth(accounts: Account[]): MonthGroup[] {
  const groups: Record<string, Account[]> = {};

  for (const acct of accounts) {
    if (!acct.contract_end) continue;
    const key = getMonthKey(acct.contract_end);
    if (!groups[key]) groups[key] = [];
    groups[key].push(acct);
  }

  return Object.keys(groups)
    .sort()
    .map((key) => ({
      key,
      label: getMonthLabel(groups[key][0].contract_end!),
      accounts: groups[key].sort(
        (a, b) =>
          new Date(a.contract_end!).getTime() - new Date(b.contract_end!).getTime()
      ),
    }));
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function RenewalsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts?sortBy=contract_end&sortDir=asc");
      if (!res.ok) throw new Error(`Failed to fetch accounts (${res.status})`);
      const data: Account[] = await res.json();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load renewal data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Filter relevant accounts: exclude churned/renewed unless overdue
  const renewalAccounts = accounts.filter((acct) => {
    if (!acct.contract_end) return false;
    const days = daysUntil(acct.contract_end);
    if (acct.lifecycle_stage === "churned") return false;
    if (acct.lifecycle_stage === "renewed" && days !== null && days >= 0) return false;
    return true;
  });

  const summary = computePipelineSummary(renewalAccounts);
  const monthGroups = groupByMonth(renewalAccounts);

  const expansionCandidates = accounts.filter(
    (acct) => acct.health_score > 80 && acct.lifecycle_stage === "active"
  );

  // ── Quick Actions ────────────────────────────────────────────────────────

  const handleScheduleMeeting = async (acct: Account) => {
    const key = `meeting-${acct.id}`;
    setActionLoading((prev) => ({ ...prev, [key]: "loading" }));
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Schedule renewal meeting with ${acct.company_name}`,
          description: `Renewal due ${formatDate(acct.contract_end)}. Current MRR: ${formatCurrency(acct.mrr)}. Health score: ${acct.health_score}.`,
          priority: "high",
          source: "manual",
          account_id: acct.id,
          due_date: dueDate.toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setActionLoading((prev) => ({ ...prev, [key]: "done" }));
      setTimeout(() => {
        setActionLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 2000);
    } catch {
      setActionLoading((prev) => ({ ...prev, [key]: "error" }));
      setTimeout(() => {
        setActionLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 3000);
    }
  };

  const handleLifecycleChange = async (acct: Account, newStage: "renewed" | "churned") => {
    const key = `stage-${acct.id}`;
    setActionLoading((prev) => ({ ...prev, [key]: "loading" }));
    try {
      const res = await fetch(`/api/accounts/${acct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle_stage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to update account");
      setActionLoading((prev) => ({ ...prev, [key]: "done" }));
      // Refresh list after a brief success indicator
      setTimeout(() => {
        fetchAccounts();
        setActionLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 1200);
    } catch {
      setActionLoading((prev) => ({ ...prev, [key]: "error" }));
      setTimeout(() => {
        setActionLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 3000);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />
      <PageWrapper>
        <div
          style={{
            minHeight: "100vh",
            background: "#050b18",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
            {/* Page Header */}
            <div style={{ marginBottom: 32 }}>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#f1f5f9",
                  margin: 0,
                }}
              >
                Renewal Pipeline
              </h1>
              <p
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  margin: "8px 0 0 0",
                }}
              >
                Track upcoming renewals, identify expansion opportunities, and manage your
                pipeline.
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "80px 0",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: "3px solid #1e293b",
                    borderTopColor: "#10b981",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <span style={{ color: "#94a3b8", fontSize: 14, marginLeft: 12 }}>
                  Loading renewal pipeline...
                </span>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 10,
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#ef4444", fontSize: 14, margin: 0 }}>{error}</p>
                <button
                  onClick={fetchAccounts}
                  style={{
                    marginTop: 12,
                    padding: "8px 16px",
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 6,
                    color: "#ef4444",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Main Content */}
            {!loading && !error && (
              <>
                {/* ── Pipeline Summary Cards ──────────────────────────── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 16,
                    marginBottom: 40,
                  }}
                >
                  <SummaryCard
                    title="This Month"
                    count={summary.thisMonth.count}
                    mrr={summary.thisMonth.mrr}
                    accentColor="#10b981"
                  />
                  <SummaryCard
                    title="Next 30 Days"
                    count={summary.next30.count}
                    mrr={summary.next30.mrr}
                    accentColor="#10b981"
                  />
                  <SummaryCard
                    title="Next 60 Days"
                    count={summary.next60.count}
                    mrr={summary.next60.mrr}
                    accentColor="#f59e0b"
                  />
                  <SummaryCard
                    title="Next 90 Days"
                    count={summary.next90.count}
                    mrr={summary.next90.mrr}
                    accentColor="#94a3b8"
                  />
                  <SummaryCard
                    title="Overdue"
                    count={summary.overdue.count}
                    mrr={summary.overdue.mrr}
                    accentColor={summary.overdue.count > 0 ? "#ef4444" : "#64748b"}
                    isOverdue
                  />
                </div>

                {/* ── Timeline View ───────────────────────────────────── */}
                <div style={{ marginBottom: 48 }}>
                  <h2
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#f1f5f9",
                      margin: "0 0 20px 0",
                    }}
                  >
                    Renewal Timeline
                  </h2>

                  {monthGroups.length === 0 && (
                    <div
                      style={{
                        background: "#0a1628",
                        border: "1px solid #1e293b",
                        borderRadius: 10,
                        padding: "48px 24px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
                        No upcoming renewals found. Add accounts with contract end dates
                        to see them here.
                      </p>
                      <Link
                        href="/accounts"
                        style={{
                          display: "inline-block",
                          marginTop: 12,
                          padding: "8px 16px",
                          background: "rgba(16,185,129,0.1)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          borderRadius: 6,
                          color: "#10b981",
                          fontSize: 13,
                          textDecoration: "none",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        View Accounts
                      </Link>
                    </div>
                  )}

                  {monthGroups.map((group) => (
                    <div key={group.key} style={{ marginBottom: 28 }}>
                      {/* Month Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 12,
                          paddingBottom: 8,
                          borderBottom: "1px solid #1e293b",
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 16,
                            fontWeight: 600,
                            color: "#f1f5f9",
                            margin: 0,
                          }}
                        >
                          {group.label}
                        </h3>
                        <span
                          style={{
                            background: "rgba(16,185,129,0.1)",
                            color: "#10b981",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 10,
                          }}
                        >
                          {group.accounts.length}{" "}
                          {group.accounts.length === 1 ? "renewal" : "renewals"}
                        </span>
                      </div>

                      {/* Renewal Cards */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {group.accounts.map((acct) => {
                          const days = daysUntil(acct.contract_end);
                          const urgencyColor = getUrgencyColor(days);
                          const healthColor = getHealthColor(acct.health_score);
                          const stageKey = acct.lifecycle_stage as LifecycleStage;
                          const stageColor =
                            LIFECYCLE_COLORS[stageKey] || "#64748b";
                          const stageLabel =
                            LIFECYCLE_LABELS[stageKey] || acct.lifecycle_stage;
                          const meetingKey = `meeting-${acct.id}`;
                          const stageActionKey = `stage-${acct.id}`;

                          return (
                            <div
                              key={acct.id}
                              style={{
                                background: "#0a1628",
                                border: "1px solid #1e293b",
                                borderLeft: `3px solid ${urgencyColor}`,
                                borderRadius: 10,
                                padding: "16px 20px",
                                transition: "border-color 0.15s, background 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = urgencyColor;
                                e.currentTarget.style.background = "#0d1b30";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "#1e293b";
                                e.currentTarget.style.borderLeftColor = urgencyColor;
                                e.currentTarget.style.background = "#0a1628";
                              }}
                            >
                              {/* Card Top Row */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  marginBottom: 10,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                  }}
                                >
                                  <Link
                                    href={`/accounts/${acct.id}`}
                                    style={{
                                      fontSize: 15,
                                      fontWeight: 600,
                                      color: "#f1f5f9",
                                      textDecoration: "none",
                                      fontFamily: "'DM Sans', sans-serif",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = "#10b981";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = "#f1f5f9";
                                    }}
                                  >
                                    {acct.company_name}
                                  </Link>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: stageColor,
                                      background: `${stageColor}18`,
                                      padding: "2px 8px",
                                      borderRadius: 8,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.03em",
                                    }}
                                  >
                                    {stageLabel}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 16,
                                  }}
                                >
                                  <span style={{ fontSize: 13, color: "#94a3b8" }}>
                                    MRR:{" "}
                                    <span
                                      style={{ color: "#f1f5f9", fontWeight: 600 }}
                                    >
                                      {formatCurrency(acct.mrr)}
                                    </span>
                                  </span>
                                  <span style={{ fontSize: 13, color: "#94a3b8" }}>
                                    Health:{" "}
                                    <span
                                      style={{ color: healthColor, fontWeight: 600 }}
                                    >
                                      {acct.health_score}
                                    </span>
                                  </span>
                                  <span style={{ fontSize: 13, color: "#94a3b8" }}>
                                    Ends:{" "}
                                    <span style={{ color: "#f1f5f9" }}>
                                      {formatDate(acct.contract_end)}
                                    </span>
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: urgencyColor,
                                      background: `${urgencyColor}15`,
                                      padding: "2px 8px",
                                      borderRadius: 8,
                                    }}
                                  >
                                    {days !== null
                                      ? days < 0
                                        ? `${Math.abs(days)}d overdue`
                                        : `${days}d remaining`
                                      : "\u2014"}
                                  </span>
                                </div>
                              </div>

                              {/* Quick Actions Row */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginTop: 6,
                                }}
                              >
                                <Link
                                  href={`/tools/roi-calculator?company=${encodeURIComponent(acct.company_name)}`}
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: 12,
                                    color: "#94a3b8",
                                    background: "rgba(148,163,184,0.08)",
                                    border: "1px solid #1e293b",
                                    borderRadius: 5,
                                    textDecoration: "none",
                                    fontFamily: "'DM Sans', sans-serif",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#f1f5f9";
                                    e.currentTarget.style.borderColor = "#334155";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "#94a3b8";
                                    e.currentTarget.style.borderColor = "#1e293b";
                                  }}
                                >
                                  Generate ROI Report
                                </Link>
                                <Link
                                  href="/playbooks"
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: 12,
                                    color: "#94a3b8",
                                    background: "rgba(148,163,184,0.08)",
                                    border: "1px solid #1e293b",
                                    borderRadius: 5,
                                    textDecoration: "none",
                                    fontFamily: "'DM Sans', sans-serif",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#f1f5f9";
                                    e.currentTarget.style.borderColor = "#334155";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "#94a3b8";
                                    e.currentTarget.style.borderColor = "#1e293b";
                                  }}
                                >
                                  Start Renewal Playbook
                                </Link>
                                <button
                                  onClick={() => handleScheduleMeeting(acct)}
                                  disabled={!!actionLoading[meetingKey]}
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: 12,
                                    color:
                                      actionLoading[meetingKey] === "done"
                                        ? "#10b981"
                                        : actionLoading[meetingKey] === "error"
                                          ? "#ef4444"
                                          : "#94a3b8",
                                    background:
                                      actionLoading[meetingKey] === "done"
                                        ? "rgba(16,185,129,0.1)"
                                        : actionLoading[meetingKey] === "error"
                                          ? "rgba(239,68,68,0.1)"
                                          : "rgba(148,163,184,0.08)",
                                    border: `1px solid ${
                                      actionLoading[meetingKey] === "done"
                                        ? "rgba(16,185,129,0.3)"
                                        : actionLoading[meetingKey] === "error"
                                          ? "rgba(239,68,68,0.3)"
                                          : "#1e293b"
                                    }`,
                                    borderRadius: 5,
                                    cursor: actionLoading[meetingKey] ? "default" : "pointer",
                                    fontFamily: "'DM Sans', sans-serif",
                                    transition: "all 0.15s",
                                    opacity: actionLoading[meetingKey] === "loading" ? 0.6 : 1,
                                  }}
                                >
                                  {actionLoading[meetingKey] === "loading"
                                    ? "Scheduling..."
                                    : actionLoading[meetingKey] === "done"
                                      ? "Meeting Scheduled"
                                      : actionLoading[meetingKey] === "error"
                                        ? "Failed"
                                        : "Schedule Meeting"}
                                </button>

                                {/* Divider */}
                                <span
                                  style={{
                                    width: 1,
                                    height: 16,
                                    background: "#1e293b",
                                    margin: "0 2px",
                                  }}
                                />

                                <button
                                  onClick={() => handleLifecycleChange(acct, "renewed")}
                                  disabled={!!actionLoading[stageActionKey]}
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: 12,
                                    color:
                                      actionLoading[stageActionKey] === "done"
                                        ? "#10b981"
                                        : "#10b981",
                                    background: "rgba(16,185,129,0.08)",
                                    border: "1px solid rgba(16,185,129,0.2)",
                                    borderRadius: 5,
                                    cursor: actionLoading[stageActionKey]
                                      ? "default"
                                      : "pointer",
                                    fontFamily: "'DM Sans', sans-serif",
                                    transition: "all 0.15s",
                                    opacity:
                                      actionLoading[stageActionKey] === "loading"
                                        ? 0.6
                                        : 1,
                                  }}
                                >
                                  {actionLoading[stageActionKey] === "loading"
                                    ? "Updating..."
                                    : actionLoading[stageActionKey] === "done"
                                      ? "Updated!"
                                      : "Mark Renewed"}
                                </button>
                                <button
                                  onClick={() => handleLifecycleChange(acct, "churned")}
                                  disabled={!!actionLoading[stageActionKey]}
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: 12,
                                    color: "#ef4444",
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.2)",
                                    borderRadius: 5,
                                    cursor: actionLoading[stageActionKey]
                                      ? "default"
                                      : "pointer",
                                    fontFamily: "'DM Sans', sans-serif",
                                    transition: "all 0.15s",
                                    opacity:
                                      actionLoading[stageActionKey] === "loading"
                                        ? 0.6
                                        : 1,
                                  }}
                                >
                                  {actionLoading[stageActionKey] === "loading"
                                    ? "Updating..."
                                    : "Mark Churned"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Expansion Opportunities ────────────────────────── */}
                <div style={{ marginBottom: 48 }}>
                  <h2
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#f1f5f9",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Expansion Opportunities
                  </h2>
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      margin: "0 0 16px 0",
                    }}
                  >
                    Active accounts with a health score above 80 are strong candidates for
                    expansion.
                  </p>

                  {expansionCandidates.length === 0 ? (
                    <div
                      style={{
                        background: "#0a1628",
                        border: "1px solid #1e293b",
                        borderRadius: 10,
                        padding: "40px 24px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
                        No expansion candidates found. Accounts with a health score above
                        80 and an active lifecycle stage will appear here.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                        gap: 14,
                      }}
                    >
                      {expansionCandidates.map((acct) => {
                        const healthColor = getHealthColor(acct.health_score);
                        return (
                          <div
                            key={acct.id}
                            style={{
                              background: "#0a1628",
                              border: "1px solid #1e293b",
                              borderRadius: 10,
                              padding: "18px 20px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 12,
                              transition: "border-color 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#10b981";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#1e293b";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Link
                                href={`/accounts/${acct.id}`}
                                style={{
                                  fontSize: 15,
                                  fontWeight: 600,
                                  color: "#f1f5f9",
                                  textDecoration: "none",
                                  fontFamily: "'DM Sans', sans-serif",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#10b981";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#f1f5f9";
                                }}
                              >
                                {acct.company_name}
                              </Link>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: healthColor,
                                }}
                              >
                                {acct.health_score}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ fontSize: 13, color: "#94a3b8" }}>
                                MRR:{" "}
                                <span style={{ color: "#f1f5f9", fontWeight: 600 }}>
                                  {formatCurrency(acct.mrr)}
                                </span>
                              </span>
                              {acct.industry && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "#64748b",
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {acct.industry}
                                </span>
                              )}
                            </div>

                            {/* Health bar */}
                            <div
                              style={{
                                height: 4,
                                background: "#1e293b",
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${acct.health_score}%`,
                                  background: healthColor,
                                  borderRadius: 2,
                                  transition: "width 0.3s",
                                }}
                              />
                            </div>

                            <Link
                              href="/playbooks"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "8px 14px",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#10b981",
                                background: "rgba(16,185,129,0.1)",
                                border: "1px solid rgba(16,185,129,0.25)",
                                borderRadius: 6,
                                textDecoration: "none",
                                fontFamily: "'DM Sans', sans-serif",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                  "rgba(16,185,129,0.18)";
                                e.currentTarget.style.borderColor =
                                  "rgba(16,185,129,0.4)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "rgba(16,185,129,0.1)";
                                e.currentTarget.style.borderColor =
                                  "rgba(16,185,129,0.25)";
                              }}
                            >
                              Start Expansion Playbook
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  );
}

// ── Summary Card Component ───────────────────────────────────────────────────

function SummaryCard({
  title,
  count,
  mrr,
  accentColor,
  isOverdue = false,
}: {
  title: string;
  count: number;
  mrr: number;
  accentColor: string;
  isOverdue?: boolean;
}) {
  return (
    <div
      style={{
        background: "#0a1628",
        border: `1px solid ${isOverdue && count > 0 ? "rgba(239,68,68,0.3)" : "#1e293b"}`,
        borderRadius: 10,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor =
          isOverdue && count > 0 ? "rgba(239,68,68,0.3)" : "#1e293b";
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {title}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: accentColor,
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1,
          }}
        >
          {count}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#94a3b8",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {count === 1 ? "renewal" : "renewals"}
        </span>
      </div>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#f1f5f9",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {formatCurrency(mrr)}{" "}
        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>MRR</span>
      </span>
    </div>
  );
}
