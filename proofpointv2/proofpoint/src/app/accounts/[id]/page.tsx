"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type {
  ClientAccount,
  AccountContact,
  AccountActivity,
  LifecycleStage,
  HealthFactors,
  ActivityType,
  ContactRole,
} from "@/lib/supabase";
import { LIFECYCLE_COLORS, LIFECYCLE_LABELS } from "@/lib/supabase";
import { Nav, PageWrapper } from "@/components/Nav";

// ── Helpers ────────────────────────────────────────────────────────────────────

function healthColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function trendArrow(trend: string): string {
  if (trend === "improving") return "\u2191";
  if (trend === "declining") return "\u2193";
  return "\u2192";
}

function formatCurrency(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  note: "\ud83d\udcdd",
  email: "\u2709\ufe0f",
  call: "\ud83d\udcde",
  meeting: "\ud83d\udce5",
  "health-change": "\ud83d\udcca",
  "stage-change": "\ud83d\udd04",
  "report-generated": "\ud83d\udcc4",
};

const ACTIVITY_FILTER_LABELS: Record<string, string> = {
  all: "All",
  note: "Notes",
  email: "Emails",
  call: "Calls",
  meeting: "Meetings",
  system: "System",
};

const SYSTEM_TYPES: ActivityType[] = ["health-change", "stage-change", "report-generated"];

const ROLE_COLORS: Record<ContactRole, string> = {
  champion: "#10b981",
  "decision-maker": "#6366f1",
  user: "#3b82f6",
  executive: "#f59e0b",
  detractor: "#ef4444",
};

const HEALTH_FACTOR_LABELS: Record<keyof HealthFactors, string> = {
  engagement: "Engagement",
  usage: "Usage",
  nps: "NPS",
  renewal_proximity: "Renewal Proximity",
  support_sentiment: "Support Sentiment",
  expansion_potential: "Expansion Potential",
  adoption_stage: "Adoption Stage",
  competitive_risk: "Competitive Risk",
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = {
  page: {
    background: "#050b18",
    minHeight: "100vh",
    color: "#f1f5f9",
    fontFamily: "'DM Sans', sans-serif",
  } as React.CSSProperties,
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px 64px",
  } as React.CSSProperties,
  card: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: 24,
  } as React.CSSProperties,
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
    color: "#f1f5f9",
  } as React.CSSProperties,
  muted: {
    fontSize: 13,
    color: "#64748b",
  } as React.CSSProperties,
  secondary: {
    fontSize: 13,
    color: "#94a3b8",
  } as React.CSSProperties,
  btn: {
    background: "#10b981",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  } as React.CSSProperties,
  btnOutline: {
    background: "transparent",
    color: "#94a3b8",
    border: "1px solid #1e293b",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  } as React.CSSProperties,
  input: {
    background: "#0f1d32",
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: "#f1f5f9",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    width: "100%",
  } as React.CSSProperties,
  select: {
    background: "#0f1d32",
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: "#f1f5f9",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    width: "100%",
  } as React.CSSProperties,
  badge: (color: string) =>
    ({
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      color: color,
      background: color + "18",
      border: `1px solid ${color}40`,
    }) as React.CSSProperties,
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function AccountDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // ── State ──────────────────────────────────────────────────────────
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [contacts, setContacts] = useState<AccountContact[]>([]);
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClientAccount>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Activity filter
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Add contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    title: "",
    role: "" as ContactRole | "",
    is_primary: false,
  });
  const [contactSaving, setContactSaving] = useState(false);

  // Add note form
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", description: "" });
  const [noteSaving, setNoteSaving] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────
  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts/${id}`);
      if (!res.ok) throw new Error("Failed to load account");
      const data: ClientAccount = await res.json();
      setAccount(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account");
    }
  }, [id]);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts/${id}/contacts`);
      if (!res.ok) throw new Error("Failed to load contacts");
      const data: AccountContact[] = await res.json();
      setContacts(data);
    } catch {
      // Contacts failing shouldn't block the page
    }
  }, [id]);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts/${id}/activities`);
      if (!res.ok) throw new Error("Failed to load activities");
      const data: AccountActivity[] = await res.json();
      setActivities(data);
    } catch {
      // Activities failing shouldn't block the page
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchAccount(), fetchContacts(), fetchActivities()]).finally(() =>
      setLoading(false)
    );
  }, [id, fetchAccount, fetchContacts, fetchActivities]);

  // ── Edit account ───────────────────────────────────────────────────
  function startEditing() {
    if (!account) return;
    setEditForm({
      company_name: account.company_name,
      domain: account.domain,
      industry: account.industry,
      lifecycle_stage: account.lifecycle_stage,
      mrr: account.mrr,
      nps_score: account.nps_score,
      contract_end: account.contract_end,
      notes: account.notes,
    });
    setEditing(true);
  }

  async function saveEdit() {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update account");
      }
      const updated: ClientAccount = await res.json();
      setAccount(updated);
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Add contact ────────────────────────────────────────────────────
  async function submitContact() {
    if (!contactForm.name.trim()) return;
    setContactSaving(true);
    try {
      const res = await fetch(`/api/accounts/${id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email || null,
          title: contactForm.title || null,
          role: contactForm.role || null,
          is_primary: contactForm.is_primary,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add contact");
      }
      const newContact: AccountContact = await res.json();
      setContacts((prev) => [newContact, ...prev]);
      setContactForm({ name: "", email: "", title: "", role: "", is_primary: false });
      setShowContactForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setContactSaving(false);
    }
  }

  // ── Add note ───────────────────────────────────────────────────────
  async function submitNote() {
    if (!noteForm.title.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/accounts/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: "note",
          title: noteForm.title,
          description: noteForm.description || null,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add note");
      }
      const newActivity: AccountActivity = await res.json();
      setActivities((prev) => [newActivity, ...prev]);
      setNoteForm({ title: "", description: "" });
      setShowNoteForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setNoteSaving(false);
    }
  }

  // ── Filtered activities ────────────────────────────────────────────
  const filteredActivities = activities.filter((a) => {
    if (activityFilter === "all") return true;
    if (activityFilter === "system") return SYSTEM_TYPES.includes(a.activity_type);
    return a.activity_type === activityFilter;
  });

  // ── Health factors (from custom_fields or mock) ────────────────────
  const healthFactors: HealthFactors | null = account
    ? (account.custom_fields?.health_factors as HealthFactors) || null
    : null;

  // ── Days to renewal ────────────────────────────────────────────────
  const daysToRenewal = account ? daysUntil(account.contract_end) : null;

  // ── Loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.page}>
        <Nav />
        <PageWrapper>
          <div style={{ ...S.container, textAlign: "center", paddingTop: 120 }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid #1e293b",
                borderTopColor: "#10b981",
                borderRadius: "50%",
                margin: "0 auto 16px",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <div style={{ color: "#64748b", fontSize: 14 }}>Loading account...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </PageWrapper>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────
  if (error || !account) {
    return (
      <div style={S.page}>
        <Nav />
        <PageWrapper>
          <div style={{ ...S.container, textAlign: "center", paddingTop: 120 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Account not found
            </div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
              {error || "The account you're looking for doesn't exist or you don't have access."}
            </div>
            <Link href="/dashboard">
              <button style={S.btn}>Back to Dashboard</button>
            </Link>
          </div>
        </PageWrapper>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <Nav />
      <PageWrapper>
        <div style={S.container}>
          {/* ─── Back link ────────────────────────────────────────── */}
          <Link
            href="/dashboard"
            style={{
              color: "#64748b",
              fontSize: 13,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 24,
            }}
          >
            &larr; Back to Dashboard
          </Link>

          {/* ─── Header Bar ───────────────────────────────────────── */}
          <div
            style={{
              ...S.card,
              display: "flex",
              alignItems: "center",
              gap: 24,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            {/* Health score circle */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: `3px solid ${healthColor(account.health_score)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: healthColor(account.health_score),
                }}
              >
                {account.health_score}
              </span>
            </div>

            {/* Company info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {editing ? (
                <input
                  style={{ ...S.input, fontSize: 22, fontWeight: 700, marginBottom: 4 }}
                  value={editForm.company_name || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, company_name: e.target.value }))
                  }
                />
              ) : (
                <h1
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 26,
                    fontWeight: 700,
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  {account.company_name}
                </h1>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {account.domain && (
                  <a
                    href={`https://${account.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#10b981", fontSize: 13, textDecoration: "none" }}
                  >
                    {account.domain}
                  </a>
                )}
                {account.industry && (
                  <span style={S.badge("#3b82f6")}>
                    {account.industry.charAt(0).toUpperCase() + account.industry.slice(1)}
                  </span>
                )}
                <span
                  style={S.badge(
                    LIFECYCLE_COLORS[account.lifecycle_stage as LifecycleStage] || "#94a3b8"
                  )}
                >
                  {LIFECYCLE_LABELS[account.lifecycle_stage as LifecycleStage] ||
                    account.lifecycle_stage}
                </span>
              </div>
            </div>

            {/* MRR / ARR */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 2 }}>MRR / ARR</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>
                {formatCurrency(account.mrr)}{" "}
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}>
                  / {formatCurrency(account.arr)}
                </span>
              </div>
            </div>

            {/* Contract end */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 2 }}>Contract End</div>
              {account.contract_end ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
                    {formatDate(account.contract_end)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color:
                        daysToRenewal !== null && daysToRenewal <= 30
                          ? "#ef4444"
                          : daysToRenewal !== null && daysToRenewal <= 90
                            ? "#f59e0b"
                            : "#10b981",
                      fontWeight: 600,
                    }}
                  >
                    {daysToRenewal !== null
                      ? daysToRenewal > 0
                        ? `${daysToRenewal} days left`
                        : `${Math.abs(daysToRenewal)} days overdue`
                      : ""}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: "#64748b" }}>&mdash;</div>
              )}
            </div>

            {/* Edit button */}
            <div style={{ flexShrink: 0 }}>
              {editing ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={S.btn}
                    onClick={saveEdit}
                    disabled={editSaving}
                  >
                    {editSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    style={S.btnOutline}
                    onClick={() => setEditing(false)}
                    disabled={editSaving}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button style={S.btnOutline} onClick={startEditing}>
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* ─── Edit form (inline below header) ──────────────────── */}
          {editing && (
            <div
              style={{
                ...S.card,
                marginBottom: 24,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>Domain</label>
                <input
                  style={S.input}
                  value={editForm.domain || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, domain: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>Industry</label>
                <select
                  style={S.select}
                  value={editForm.industry || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value as ClientAccount["industry"] }))}
                >
                  <option value="">Select...</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="fintech">Fintech</option>
                  <option value="hrtech">HRTech</option>
                  <option value="saas">SaaS</option>
                  <option value="realestate">Real Estate</option>
                </select>
              </div>
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>
                  Lifecycle Stage
                </label>
                <select
                  style={S.select}
                  value={editForm.lifecycle_stage || ""}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      lifecycle_stage: e.target.value as LifecycleStage,
                    }))
                  }
                >
                  {Object.entries(LIFECYCLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>MRR</label>
                <input
                  style={S.input}
                  type="number"
                  value={editForm.mrr ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, mrr: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>NPS Score</label>
                <input
                  style={S.input}
                  type="number"
                  value={editForm.nps_score ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      nps_score: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>
                  Contract End
                </label>
                <input
                  style={S.input}
                  type="date"
                  value={editForm.contract_end ? editForm.contract_end.split("T")[0] : ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, contract_end: e.target.value }))
                  }
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>Notes</label>
                <textarea
                  style={{
                    ...S.input,
                    minHeight: 80,
                    resize: "vertical",
                  }}
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* ─── Quick Stats Row ──────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {/* Health Score */}
            <div style={S.card}>
              <div style={{ ...S.muted, marginBottom: 8 }}>Health Score</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: healthColor(account.health_score),
                  }}
                >
                  {account.health_score}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    color: healthColor(account.health_score),
                  }}
                >
                  {trendArrow(account.health_trend)}
                </span>
                <span style={{ fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>
                  {account.health_trend}
                </span>
              </div>
            </div>

            {/* MRR */}
            <div style={S.card}>
              <div style={{ ...S.muted, marginBottom: 8 }}>MRR</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9" }}>
                {formatCurrency(account.mrr)}
              </div>
            </div>

            {/* NPS */}
            <div style={S.card}>
              <div style={{ ...S.muted, marginBottom: 8 }}>NPS Score</div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color:
                    account.nps_score !== null
                      ? account.nps_score >= 50
                        ? "#10b981"
                        : account.nps_score >= 0
                          ? "#f59e0b"
                          : "#ef4444"
                      : "#64748b",
                }}
              >
                {account.nps_score !== null ? account.nps_score : "\u2014"}
              </div>
            </div>

            {/* Days to Renewal */}
            <div style={S.card}>
              <div style={{ ...S.muted, marginBottom: 8 }}>Days to Renewal</div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color:
                    daysToRenewal === null
                      ? "#64748b"
                      : daysToRenewal <= 30
                        ? "#ef4444"
                        : daysToRenewal <= 90
                          ? "#f59e0b"
                          : "#10b981",
                }}
              >
                {daysToRenewal !== null ? (daysToRenewal > 0 ? daysToRenewal : "Overdue") : "\u2014"}
              </div>
            </div>
          </div>

          {/* ─── Two-column layout ────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
            {/* ── Contacts Section ──────────────────────────────────── */}
            <div style={S.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h2 style={S.sectionTitle}>Contacts</h2>
                <button
                  style={S.btn}
                  onClick={() => setShowContactForm(!showContactForm)}
                >
                  {showContactForm ? "Cancel" : "+ Add Contact"}
                </button>
              </div>

              {/* Add contact form */}
              {showContactForm && (
                <div
                  style={{
                    background: "#0f1d32",
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 16,
                    border: "1px solid #1e293b",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>
                        Name *
                      </label>
                      <input
                        style={S.input}
                        placeholder="Full name"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>Email</label>
                      <input
                        style={S.input}
                        type="email"
                        placeholder="email@example.com"
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>Title</label>
                      <input
                        style={S.input}
                        placeholder="Job title"
                        value={contactForm.title}
                        onChange={(e) =>
                          setContactForm((f) => ({ ...f, title: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>Role</label>
                      <select
                        style={S.select}
                        value={contactForm.role}
                        onChange={(e) =>
                          setContactForm((f) => ({
                            ...f,
                            role: e.target.value as ContactRole | "",
                          }))
                        }
                      >
                        <option value="">Select role...</option>
                        <option value="champion">Champion</option>
                        <option value="decision-maker">Decision Maker</option>
                        <option value="user">User</option>
                        <option value="executive">Executive</option>
                        <option value="detractor">Detractor</option>
                      </select>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1" }}
                    >
                      <input
                        type="checkbox"
                        id="is_primary"
                        checked={contactForm.is_primary}
                        onChange={(e) =>
                          setContactForm((f) => ({ ...f, is_primary: e.target.checked }))
                        }
                        style={{ accentColor: "#10b981" }}
                      />
                      <label htmlFor="is_primary" style={{ ...S.secondary, cursor: "pointer" }}>
                        Primary contact
                      </label>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      style={{
                        ...S.btn,
                        opacity: contactSaving || !contactForm.name.trim() ? 0.5 : 1,
                      }}
                      onClick={submitContact}
                      disabled={contactSaving || !contactForm.name.trim()}
                    >
                      {contactSaving ? "Saving..." : "Add Contact"}
                    </button>
                  </div>
                </div>
              )}

              {/* Contact list */}
              {contacts.length === 0 ? (
                <div
                  style={{
                    padding: "32px 0",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  No contacts yet. Add your first contact above.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: c.is_primary ? "#10b98108" : "transparent",
                        border: c.is_primary ? "1px solid #10b98130" : "1px solid transparent",
                      }}
                    >
                      {/* Avatar placeholder */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#1e293b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#94a3b8",
                          flexShrink: 0,
                        }}
                      >
                        {c.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {c.is_primary && (
                            <span style={{ color: "#f59e0b", fontSize: 14 }}>{"\u2605"}</span>
                          )}
                          {c.name}
                        </div>
                        {c.title && (
                          <div style={{ fontSize: 12, color: "#64748b" }}>{c.title}</div>
                        )}
                      </div>

                      {c.role && (
                        <span style={S.badge(ROLE_COLORS[c.role] || "#94a3b8")}>
                          {c.role.charAt(0).toUpperCase() + c.role.slice(1).replace("-", " ")}
                        </span>
                      )}

                      <div style={{ fontSize: 11, color: "#475569", flexShrink: 0 }}>
                        {c.last_contacted ? relativeTime(c.last_contacted) : "Never contacted"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Activity Timeline ─────────────────────────────────── */}
            <div style={S.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <h2 style={S.sectionTitle}>Activity Timeline</h2>
                <button
                  style={S.btn}
                  onClick={() => setShowNoteForm(!showNoteForm)}
                >
                  {showNoteForm ? "Cancel" : "+ Add Note"}
                </button>
              </div>

              {/* Filter pills */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                {Object.entries(ACTIVITY_FILTER_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActivityFilter(key)}
                    style={{
                      background: activityFilter === key ? "#10b981" : "transparent",
                      color: activityFilter === key ? "#fff" : "#94a3b8",
                      border: `1px solid ${activityFilter === key ? "#10b981" : "#1e293b"}`,
                      padding: "4px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Add note form */}
              {showNoteForm && (
                <div
                  style={{
                    background: "#0f1d32",
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 16,
                    border: "1px solid #1e293b",
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>Title *</label>
                    <input
                      style={S.input}
                      placeholder="Note title"
                      value={noteForm.title}
                      onChange={(e) =>
                        setNoteForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ ...S.muted, display: "block", marginBottom: 4 }}>
                      Description
                    </label>
                    <textarea
                      style={{
                        ...S.input,
                        minHeight: 60,
                        resize: "vertical",
                      }}
                      placeholder="Add details..."
                      value={noteForm.description}
                      onChange={(e) =>
                        setNoteForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      style={{
                        ...S.btn,
                        opacity: noteSaving || !noteForm.title.trim() ? 0.5 : 1,
                      }}
                      onClick={submitNote}
                      disabled={noteSaving || !noteForm.title.trim()}
                    >
                      {noteSaving ? "Saving..." : "Add Note"}
                    </button>
                  </div>
                </div>
              )}

              {/* Activity list */}
              {filteredActivities.length === 0 ? (
                <div
                  style={{
                    padding: "32px 0",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  No activities
                  {activityFilter !== "all" ? " matching this filter" : " yet"}.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    maxHeight: 480,
                    overflowY: "auto",
                  }}
                >
                  {filteredActivities.map((a, idx) => (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom:
                          idx < filteredActivities.length - 1 ? "1px solid #1e293b10" : "none",
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#1e293b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {ACTIVITY_ICONS[a.activity_type] || "\u2022"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#f1f5f9",
                            marginBottom: 2,
                          }}
                        >
                          {a.title || a.activity_type.replace("-", " ")}
                        </div>
                        {a.description && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              lineHeight: 1.4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {a.description}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#475569",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {relativeTime(a.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Reports Section ──────────────────────────────────── */}
          <div style={{ ...S.card, marginBottom: 24 }}>
            <h2 style={S.sectionTitle}>Reports</h2>
            <div
              style={{
                padding: "32px 0",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>
                Reports for this account will appear here
              </div>
              <Link
                href={`/tools/generator?company=${encodeURIComponent(account.company_name)}`}
              >
                <button style={S.btn}>Generate Report for {account.company_name}</button>
              </Link>
            </div>
          </div>

          {/* ─── Health Score Breakdown ────────────────────────────── */}
          <div style={S.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2 style={S.sectionTitle}>Health Score Breakdown</h2>
              <button
                style={S.btnOutline}
                onClick={() => alert("Recalculate triggered (placeholder)")}
              >
                Recalculate
              </button>
            </div>

            {healthFactors ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(Object.keys(HEALTH_FACTOR_LABELS) as (keyof HealthFactors)[]).map((key) => {
                  const score = healthFactors[key];
                  return (
                    <div key={key}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          {HEALTH_FACTOR_LABELS[key]}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: healthColor(score),
                          }}
                        >
                          {score}
                        </span>
                      </div>
                      {/* Bar */}
                      <div
                        style={{
                          width: "100%",
                          height: 8,
                          background: "#1e293b",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(Math.max(score, 0), 100)}%`,
                            height: "100%",
                            background: healthColor(score),
                            borderRadius: 4,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "32px 0",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                No health factor breakdown available yet. Click Recalculate to generate
                factor scores.
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
