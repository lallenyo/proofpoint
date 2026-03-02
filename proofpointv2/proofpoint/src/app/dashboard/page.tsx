"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Nav, PageWrapper } from "@/components/Nav";
import Link from "next/link";

type ReportSummary = {
  id: string;
  company_name: string;
  report_type: string;
  industry: string | null;
  mrr: number | null;
  created_at: string;
};

const TOOLS = [
  {
    href: "/tools/generator",
    icon: "📄",
    label: "Report Generator",
    desc: "AI-generated executive success reports from your customer data",
    color: "#10b981",
  },
  {
    href: "/tools/next-action",
    icon: "⚡",
    label: "Next Action",
    desc: "AI-recommended CS plays based on health signals and renewal date",
    color: "#6366f1",
  },
  {
    href: "/tools/roi-calculator",
    icon: "💰",
    label: "CS ROI Report",
    desc: "Turn raw metrics into an ROI narrative your CFO will love",
    color: "#f59e0b",
  },
  {
    href: "/tools/cs-roi",
    icon: "📊",
    label: "CS Program ROI",
    desc: "Prove your CS program's business impact for budget conversations",
    color: "#ec4899",
  },
];

type TaskSummary = {
  overdue: number;
  dueToday: number;
  thisWeek: number;
};

type DashboardAlert = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  is_read: boolean;
  created_at: string;
  client_accounts?: { id: string; company_name: string } | null;
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

export default function DashboardPage() {
  const { user } = useUser();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskSummary, setTaskSummary] = useState<TaskSummary>({ overdue: 0, dueToday: 0, thisWeek: 0 });
  const [dashAlerts, setDashAlerts] = useState<DashboardAlert[]>([]);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => {
        setReports(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch task counts for My Tasks card
    fetch("/api/tasks?status=pending,in_progress")
      .then((r) => r.json())
      .then((tasks) => {
        if (!Array.isArray(tasks)) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekEndStr = weekEnd.toISOString().split("T")[0];

        let overdue = 0;
        let dueToday = 0;
        let thisWeek = 0;

        for (const t of tasks) {
          if (!t.due_date) continue;
          if (t.due_date < todayStr) overdue++;
          else if (t.due_date === todayStr) dueToday++;
          else if (t.due_date <= weekEndStr) thisWeek++;
        }
        setTaskSummary({ overdue, dueToday, thisWeek });
      })
      .catch(() => {});

    // Fetch alerts for dashboard
    fetch("/api/alerts?unread=true&limit=5")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDashAlerts(data);
      })
      .catch(() => {});
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const firstName = user?.firstName || "there";

  return (
    <>
      <Nav />
      <PageWrapper>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, marginBottom: 8 }}>
              Welcome back, {firstName}
            </h1>
            <p style={{ color: "#64748b", fontSize: 15 }}>
              {reports.length} report{reports.length !== 1 ? "s" : ""} saved · Pick a tool to get started
            </p>
          </div>

          {/* Tools grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 48 }}>
            {TOOLS.map(({ href, icon, label, desc, color }) => (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "#0a1628", border: "1px solid #1e293b", borderRadius: 14,
                  padding: 24, cursor: "pointer", transition: "border-color 0.2s",
                  height: "100%",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e293b")}
                >
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#f1f5f9" }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* My Tasks card */}
          <Link href="/tasks" style={{ textDecoration: "none" }}>
            <div
              style={{
                background: "#0a1628",
                border: "1px solid #1e293b",
                borderRadius: 14,
                padding: 24,
                marginBottom: 48,
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#10b981")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e293b")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#f1f5f9" }}>
                  My Tasks
                </h2>
                <span style={{ fontSize: 13, color: "#10b981", fontWeight: 500 }}>View All →</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <div style={{
                  background: taskSummary.overdue > 0 ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.02)",
                  borderRadius: 10,
                  padding: "16px 20px",
                  border: `1px solid ${taskSummary.overdue > 0 ? "rgba(239,68,68,0.2)" : "#1e293b"}`,
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: taskSummary.overdue > 0 ? "#ef4444" : "#64748b" }}>
                    {taskSummary.overdue}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Overdue</div>
                </div>
                <div style={{
                  background: taskSummary.dueToday > 0 ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                  borderRadius: 10,
                  padding: "16px 20px",
                  border: `1px solid ${taskSummary.dueToday > 0 ? "rgba(245,158,11,0.2)" : "#1e293b"}`,
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: taskSummary.dueToday > 0 ? "#f59e0b" : "#64748b" }}>
                    {taskSummary.dueToday}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Due Today</div>
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 10,
                  padding: "16px 20px",
                  border: "1px solid #1e293b",
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>
                    {taskSummary.thisWeek}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>This Week</div>
                </div>
              </div>
            </div>
          </Link>

          {/* Alerts section */}
          {dashAlerts.length > 0 && (
            <div style={{
              background: "#0a1628",
              border: "1px solid #1e293b",
              borderRadius: 14,
              padding: 24,
              marginBottom: 48,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#f1f5f9" }}>
                  Alerts
                </h2>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  {dashAlerts.length} unread
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dashAlerts.map((alert) => (
                  <div key={alert.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${alert.severity === "critical" ? "rgba(239,68,68,0.2)" : "#1e293b"}`,
                  }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: SEVERITY_COLORS[alert.severity] || "#94a3b8",
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, fontSize: 13, color: "#f1f5f9" }}>
                      {alert.title}
                    </span>
                    {alert.client_accounts && (
                      <Link
                        href={`/accounts/${alert.client_accounts.id}`}
                        style={{ fontSize: 12, color: "#10b981", textDecoration: "none", flexShrink: 0 }}
                      >
                        View →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent reports */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22 }}>Recent Reports</h2>
            </div>

            {loading ? (
              <div style={{ color: "#475569", fontSize: 14, padding: "40px 0", textAlign: "center" }}>Loading…</div>
            ) : reports.length === 0 ? (
              <div style={{
                background: "#0a1628", border: "1px dashed #1e293b",
                borderRadius: 14, padding: 48, textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No reports yet</div>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>Generate your first report to see it saved here.</div>
                <Link href="/tools/generator">
                  <button style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    Create First Report →
                  </button>
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reports.map((r) => (
                  <Link key={r.id} href={`/reports/${r.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10,
                      padding: "16px 20px", display: "flex", justifyContent: "space-between",
                      alignItems: "center", cursor: "pointer", transition: "border-color 0.15s",
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e293b")}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{r.company_name}</div>
                        <div style={{ fontSize: 12, color: "#475569" }}>
                          {r.report_type} · {r.industry || "Unknown industry"}
                          {r.mrr ? ` · $${r.mrr.toLocaleString()}/mo` : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", textAlign: "right" }}>
                        {formatDate(r.created_at)}
                        <div style={{ color: "#10b981", marginTop: 4 }}>View →</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </PageWrapper>
    </>
  );
}
