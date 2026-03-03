"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";

type AlertItem = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  is_read: boolean;
  created_at: string;
  client_accounts?: { id: string; company_name: string } | null;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/accounts", label: "Portfolio", icon: "🗂" },
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/playbooks", label: "Playbooks", icon: "⚡" },
  { href: "/emails", label: "Email Center", icon: "✉️" },
  { href: "/renewals", label: "Pipeline", icon: "📋" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/tools/generator", label: "Report Generator", icon: "✦" },
  { href: "/tools/next-action", label: "Next Action", icon: "🎯" },
  { href: "/tools/roi-calculator", label: "ROI Calculator", icon: "💰" },
  { href: "/tools/cs-roi", label: "CS Program ROI", icon: "💵" },
  { href: "/support", label: "Support Tickets", icon: "🎫" },
  { href: "/demo", label: "Sandbox", icon: "🧪" },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

const ALERT_ICONS: Record<string, string> = {
  health_drop: "\u{1F4C9}",
  churn_risk: "\u{26A0}\u{FE0F}",
  renewal_overdue: "\u{23F0}",
  no_contact: "\u{1F4ED}",
  score_critical: "\u{1F6A8}",
};

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Nav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?unread=true&limit=10");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setAlerts(data);
        setUnreadCount(data.filter((a: AlertItem) => !a.is_read).length);
      }
    } catch {
      // Silent fail — alerts not critical for nav
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchAlerts();
    // Poll every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [isSignedIn, fetchAlerts]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
    }
    if (showAlerts) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAlerts]);

  async function markRead(alertIds: string[]) {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_ids: alertIds, action: "mark_read" }),
      });
      setAlerts((prev) =>
        prev.map((a) => (alertIds.includes(a.id) ? { ...a, is_read: true } : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - alertIds.length));
    } catch { /* ignore */ }
  }

  async function dismissAlert(alertId: string) {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_ids: [alertId], action: "dismiss" }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }

  if (!isSignedIn) return null;

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(4,7,20,0.9)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1e293b",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 56,
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#10b981", fontWeight: 700 }}>
          Proofpoint
        </span>
      </Link>

      {/* Nav items */}
      <div style={{ display: "flex", gap: 4 }}>
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              color: active ? "#10b981" : "#94a3b8",
              background: active ? "rgba(16,185,129,0.1)" : "transparent",
              transition: "all 0.15s",
            }}>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right side: Alerts bell + User */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Alert Bell */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setShowAlerts(!showAlerts);
              if (!showAlerts && alerts.length > 0) {
                const unreadIds = alerts.filter((a) => !a.is_read).map((a) => a.id);
                if (unreadIds.length > 0) markRead(unreadIds);
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              position: "relative",
              padding: 6,
              fontSize: 18,
              lineHeight: 1,
              color: unreadCount > 0 ? "#f1f5f9" : "#64748b",
            }}
            title={`${unreadCount} unread alert${unreadCount !== 1 ? "s" : ""}`}
          >
            {"\u{1F514}"}
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: 0,
                right: 0,
                background: "#ef4444",
                color: "#fff",
                borderRadius: "50%",
                width: 16,
                height: 16,
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Alerts Dropdown */}
          {showAlerts && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 8,
              width: 380,
              maxHeight: 480,
              overflowY: "auto",
              background: "#0a1628",
              border: "1px solid #1e293b",
              borderRadius: 12,
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              zIndex: 200,
            }}>
              <div style={{
                padding: "12px 16px",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", fontFamily: "'DM Sans', sans-serif" }}>
                  Alerts
                </span>
                {alerts.length > 0 && (
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    {alerts.length} recent
                  </span>
                )}
              </div>

              {alerts.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                  No alerts — you&#39;re all caught up!
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #1e293b",
                      display: "flex",
                      gap: 10,
                      background: alert.is_read ? "transparent" : "rgba(16,185,129,0.03)",
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>
                      {ALERT_ICONS[alert.alert_type] || "\u{1F514}"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: SEVERITY_COLORS[alert.severity] || "#94a3b8",
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#f1f5f9",
                          fontFamily: "'DM Sans', sans-serif",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {alert.title}
                        </span>
                      </div>
                      {alert.description && (
                        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, marginBottom: 6 }}>
                          {alert.description.length > 120 ? alert.description.slice(0, 120) + "..." : alert.description}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#475569" }}>
                          {relativeTime(alert.created_at)}
                        </span>
                        {alert.client_accounts && (
                          <Link
                            href={`/accounts/${alert.client_accounts.id}`}
                            onClick={() => setShowAlerts(false)}
                            style={{
                              fontSize: 11,
                              color: "#10b981",
                              textDecoration: "none",
                            }}
                          >
                            View Account →
                          </Link>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissAlert(alert.id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#475569",
                            fontSize: 11,
                            cursor: "pointer",
                            marginLeft: "auto",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <UserButton afterSignOutUrl="/" />
      </div>
    </nav>
  );
}

// Wrapper to add top padding for fixed nav
export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: 56 }}>
      {children}
    </div>
  );
}
