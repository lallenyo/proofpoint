"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Nav, PageWrapper } from "@/components/Nav";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

type AnalyticsData = {
  kpi: {
    totalMRR: number;
    nrr: number;
    avgHealthScore: number;
    churnRate: number;
    totalAccounts: number;
    activeAccounts: number;
  };
  healthDistribution: Array<{ bucket: string; count: number; color: string }>;
  lifecycleBreakdown: Array<{ stage: string; count: number }>;
  mrrTrend: Array<{ month: string; mrr: number }>;
  renewalsByMonth: Array<{ month: string; mrr: number; avgHealth: number; count: number }>;
  atRiskAccounts: Array<{
    id: string;
    company_name: string;
    health_score: number;
    health_trend: string;
    mrr: number;
    contract_end: string | null;
    days_to_renewal: number | null;
  }>;
};

// ── Constants ────────────────────────────────────────────────────────────────

const LIFECYCLE_COLORS: Record<string, string> = {
  onboarding: "#3b82f6",
  active: "#10b981",
  "renewal-due": "#f59e0b",
  renewed: "#06b6d4",
  expanded: "#8b5cf6",
  "at-risk": "#ef4444",
  churned: "#6b7280",
  paused: "#94a3b8",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${Math.round(val).toLocaleString()}`;
  return `$${val.toFixed(0)}`;
}

function healthColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function trendArrow(trend: string): { symbol: string; color: string } {
  if (trend === "improving") return { symbol: "\u2191", color: "#10b981" };
  if (trend === "declining") return { symbol: "\u2193", color: "#ef4444" };
  return { symbol: "\u2192", color: "#94a3b8" };
}

function renewalBarColor(avgHealth: number): string {
  if (avgHealth >= 70) return "#10b981";
  if (avgHealth >= 40) return "#f59e0b";
  return "#ef4444";
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: "#0f1d32",
      border: "1px solid #1e293b",
      borderRadius: 8,
      padding: "10px 14px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 12,
      color: "#f1f5f9",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {label && (
        <div style={{ color: "#94a3b8", marginBottom: 6, fontSize: 11 }}>{label}</div>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: entry.color || "#10b981",
            display: "inline-block",
          }} />
          <span style={{ color: "#94a3b8" }}>{entry.name}:</span>
          <span style={{ fontWeight: 600 }}>
            {entry.name.toLowerCase().includes("mrr") || entry.name.toLowerCase().includes("revenue")
              ? `$${entry.value.toLocaleString()}`
              : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Pie Label ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
  if (!percent || percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#94a3b8"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontFamily="'DM Sans', sans-serif"
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#0a1628",
      border: "1px solid #1e293b",
      borderRadius: 14,
      padding: 24,
      marginBottom: 28,
    }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 18,
        color: "#f1f5f9",
        marginBottom: 20,
        fontWeight: 600,
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
        return res.json();
      })
      .then((json: AnalyticsData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Something went wrong");
        setLoading(false);
      });
  }, []);

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Nav />
        <PageWrapper>
          <div style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "40px 24px",
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 400,
              gap: 16,
            }}>
              <div style={{
                width: 40,
                height: 40,
                border: "3px solid #1e293b",
                borderTopColor: "#10b981",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <span style={{
                color: "#64748b",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Loading analytics...
              </span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        </PageWrapper>
      </>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <>
        <Nav />
        <PageWrapper>
          <div style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "40px 24px",
          }}>
            <div style={{
              background: "#0a1628",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 14,
              padding: 48,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>!</div>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#f1f5f9",
                marginBottom: 8,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Failed to load analytics
              </div>
              <div style={{
                fontSize: 14,
                color: "#64748b",
                marginBottom: 20,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {error || "An unexpected error occurred."}
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetch("/api/analytics")
                    .then((res) => {
                      if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
                      return res.json();
                    })
                    .then((json: AnalyticsData) => {
                      setData(json);
                      setLoading(false);
                    })
                    .catch((err) => {
                      setError(err.message || "Something went wrong");
                      setLoading(false);
                    });
                }}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </PageWrapper>
      </>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const { kpi, healthDistribution, lifecycleBreakdown, mrrTrend, renewalsByMonth, atRiskAccounts } = data;
  const bottomTen = [...atRiskAccounts]
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 10);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />
      <PageWrapper>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 24px",
          fontFamily: "'DM Sans', sans-serif",
          color: "#f1f5f9",
        }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 32,
              marginBottom: 8,
              color: "#f1f5f9",
            }}>
              Analytics
            </h1>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              Portfolio health, revenue trends, and customer lifecycle insights.
            </p>
          </div>

          {/* ── 1. KPI Cards ────────────────────────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 28,
          }}>
            {/* Total MRR */}
            <div style={{
              background: "#0a1628",
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: "20px 24px",
            }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Total MRR
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9" }}>
                {formatCurrency(kpi.totalMRR)}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                {kpi.activeAccounts} of {kpi.totalAccounts} accounts active
              </div>
            </div>

            {/* NRR */}
            <div style={{
              background: "#0a1628",
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: "20px 24px",
            }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Net Revenue Retention
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: kpi.nrr >= 100 ? "#10b981" : "#ef4444",
              }}>
                {kpi.nrr.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                {kpi.nrr >= 100 ? "Healthy retention" : "Below target"}
              </div>
            </div>

            {/* Avg Health Score */}
            <div style={{
              background: "#0a1628",
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: "20px 24px",
            }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Avg Health Score
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: healthColor(kpi.avgHealthScore),
              }}>
                {kpi.avgHealthScore.toFixed(0)}
              </div>
              <div style={{
                fontSize: 12,
                color: "#94a3b8",
                marginTop: 6,
              }}>
                {kpi.avgHealthScore >= 70 ? "Portfolio healthy" : kpi.avgHealthScore >= 40 ? "Needs attention" : "Critical"}
              </div>
            </div>

            {/* Churn Rate */}
            <div style={{
              background: "#0a1628",
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: "20px 24px",
            }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Churn Rate
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: kpi.churnRate > 5 ? "#ef4444" : "#10b981",
              }}>
                {kpi.churnRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                {kpi.churnRate > 5 ? "Above threshold" : "Within target"}
              </div>
            </div>
          </div>

          {/* ── 2. Health Distribution ──────────────────────────────────── */}
          <SectionCard title="Health Score Distribution">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={healthDistribution} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#1e293b" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="count" name="Accounts" radius={[6, 6, 0, 0]}>
                    {healthDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* ── 3. MRR Trend ───────────────────────────────────────────── */}
          <SectionCard title="MRR Trend">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mrrTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#1e293b" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => formatCurrency(val)}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    name="MRR"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#10b981", stroke: "#0a1628", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* ── 4. Lifecycle Stage Breakdown ────────────────────────────── */}
          <SectionCard title="Lifecycle Stage Breakdown">
            <div style={{ width: "100%", height: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lifecycleBreakdown}
                    dataKey="count"
                    nameKey="stage"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {lifecycleBreakdown.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={LIFECYCLE_COLORS[entry.stage] || "#64748b"}
                        stroke="#0a1628"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "center",
              marginTop: 8,
            }}>
              {lifecycleBreakdown.map((entry) => (
                <div key={entry.stage} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: LIFECYCLE_COLORS[entry.stage] || "#64748b",
                    display: "inline-block",
                  }} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    {entry.stage} ({entry.count})
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── 5. Upcoming Renewals ────────────────────────────────────── */}
          <SectionCard title="Upcoming Renewals (Next 6 Months)">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={renewalsByMonth} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#1e293b" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => formatCurrency(val)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const item = renewalsByMonth.find((r) => r.month === label);
                      return (
                        <div style={{
                          background: "#0f1d32",
                          border: "1px solid #1e293b",
                          borderRadius: 8,
                          padding: "10px 14px",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12,
                          color: "#f1f5f9",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                        }}>
                          <div style={{ color: "#94a3b8", marginBottom: 6, fontSize: 11 }}>{label}</div>
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ color: "#94a3b8" }}>MRR at Risk: </span>
                            <span style={{ fontWeight: 600 }}>${item?.mrr.toLocaleString()}</span>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ color: "#94a3b8" }}>Avg Health: </span>
                            <span style={{ fontWeight: 600, color: healthColor(item?.avgHealth ?? 0) }}>
                              {item?.avgHealth.toFixed(0)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "#94a3b8" }}>Accounts: </span>
                            <span style={{ fontWeight: 600 }}>{item?.count}</span>
                          </div>
                        </div>
                      );
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="mrr" name="Renewal MRR" radius={[6, 6, 0, 0]}>
                    {renewalsByMonth.map((entry, i) => (
                      <Cell key={i} fill={renewalBarColor(entry.avgHealth)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Health color legend */}
            <div style={{
              display: "flex",
              gap: 20,
              justifyContent: "center",
              marginTop: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "#10b981", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Healthy (70+)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "#f59e0b", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>At Risk (40-69)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "#ef4444", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Critical (&lt;40)</span>
              </div>
            </div>
          </SectionCard>

          {/* ── 6. Top At-Risk Accounts ─────────────────────────────────── */}
          <SectionCard title="Top At-Risk Accounts">
            {bottomTen.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "32px 0",
                color: "#64748b",
                fontSize: 14,
              }}>
                No at-risk accounts found.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                }}>
                  <thead>
                    <tr>
                      {["Company", "Health Score", "MRR", "Days to Renewal", "Trend"].map((col) => (
                        <th
                          key={col}
                          style={{
                            textAlign: "left",
                            padding: "10px 14px",
                            borderBottom: "1px solid #1e293b",
                            color: "#64748b",
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bottomTen.map((account) => {
                      const trend = trendArrow(account.health_trend);
                      return (
                        <tr
                          key={account.id}
                          style={{ cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b" }}>
                            <Link
                              href={`/accounts/${account.id}`}
                              style={{
                                color: "#f1f5f9",
                                textDecoration: "none",
                                fontWeight: 500,
                              }}
                            >
                              {account.company_name}
                            </Link>
                          </td>
                          <td style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}>
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: healthColor(account.health_score),
                                display: "inline-block",
                              }} />
                              <span style={{
                                color: healthColor(account.health_score),
                                fontWeight: 600,
                              }}>
                                {account.health_score}
                              </span>
                            </span>
                          </td>
                          <td style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #1e293b",
                            color: "#f1f5f9",
                          }}>
                            ${account.mrr.toLocaleString()}
                          </td>
                          <td style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #1e293b",
                            color: account.days_to_renewal !== null && account.days_to_renewal <= 30
                              ? "#ef4444"
                              : "#94a3b8",
                            fontWeight: account.days_to_renewal !== null && account.days_to_renewal <= 30
                              ? 600
                              : 400,
                          }}>
                            {account.days_to_renewal !== null ? `${account.days_to_renewal}d` : "\u2014"}
                          </td>
                          <td style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid #1e293b",
                          }}>
                            <span style={{
                              color: trend.color,
                              fontWeight: 600,
                              fontSize: 16,
                            }}>
                              {trend.symbol}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

        </div>
      </PageWrapper>
    </>
  );
}
