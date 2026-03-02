"use client";

import { useState, useEffect, useCallback } from "react";
import { Nav, PageWrapper } from "@/components/Nav";

// -- Types --------------------------------------------------------------------

type PlaybookStep = {
  day_offset: number;
  action: string;
  config: { title?: string; description?: string; priority?: string };
};

type PlaybookTemplate = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  trigger_type:
    | "manual"
    | "lifecycle_change"
    | "health_drop"
    | "renewal_approaching"
    | "new_account"
    | null;
  trigger_config: Record<string, unknown>;
  steps: PlaybookStep[];
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  run_counts: { active: number; completed: number };
};

type Account = { id: string; company_name: string };

type ActiveRun = {
  id: string;
  account_name: string;
  started_at: string;
  status: string;
  current_step: number;
  total_steps: number;
};

// -- Constants ----------------------------------------------------------------

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  new_account: "New Account",
  renewal_approaching: "Renewal Approaching",
  health_drop: "Health Drop",
  lifecycle_change: "Lifecycle Change",
};

const TRIGGER_COLORS: Record<string, { bg: string; text: string }> = {
  manual: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
  new_account: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  renewal_approaching: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  health_drop: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  lifecycle_change: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
};

// -- Styles -------------------------------------------------------------------

const styles = {
  card: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "24px",
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
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
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
    width: "100%",
  } as React.CSSProperties,
  sectionLabel: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
  } as React.CSSProperties,
};

// -- Helpers ------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural || singular + "s"}`;
}

// -- Component ----------------------------------------------------------------

export default function PlaybooksPage() {
  // Data state
  const [playbooks, setPlaybooks] = useState<PlaybookTemplate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start playbook flow
  const [startingPlaybookId, setStartingPlaybookId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Expanded runs per playbook
  const [expandedRunsId, setExpandedRunsId] = useState<string | null>(null);
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  // Expanded steps preview per playbook
  const [expandedStepsId, setExpandedStepsId] = useState<string | null>(null);

  // -- Data Fetching ----------------------------------------------------------

  const fetchPlaybooks = useCallback(async () => {
    try {
      const res = await fetch("/api/playbooks");
      if (!res.ok) throw new Error("Failed to fetch playbooks");
      const data = await res.json();
      setPlaybooks(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playbooks");
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(
        Array.isArray(data)
          ? data.map((a: Record<string, unknown>) => ({
              id: a.id as string,
              company_name: a.company_name as string,
            }))
          : []
      );
    } catch {
      // Accounts are not critical for initial load
    }
  }, []);

  const fetchActiveRuns = useCallback(async (playbookId: string) => {
    setLoadingRuns(true);
    try {
      const res = await fetch(`/api/playbooks/${playbookId}/runs`);
      if (!res.ok) throw new Error("Failed to fetch runs");
      const data = await res.json();
      setActiveRuns(Array.isArray(data) ? data : []);
    } catch {
      setActiveRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPlaybooks(), fetchAccounts()]).finally(() =>
      setLoading(false)
    );
  }, [fetchPlaybooks, fetchAccounts]);

  // -- Actions ----------------------------------------------------------------

  const handleStartPlaybook = useCallback(
    async (playbookId: string) => {
      if (!selectedAccountId) return;
      setSubmitting(true);
      setSuccessMessage(null);
      try {
        const res = await fetch(`/api/playbooks/${playbookId}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_id: selectedAccountId }),
        });
        if (!res.ok) throw new Error("Failed to start playbook");
        const result = await res.json();
        const tasksCreated = result.tasks_created ?? result.tasksCreated ?? 0;
        setSuccessMessage(
          `Playbook started successfully! ${pluralize(tasksCreated, "task")} created.`
        );
        setStartingPlaybookId(null);
        setSelectedAccountId("");
        // Refresh playbooks to update run counts
        fetchPlaybooks();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start playbook"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [selectedAccountId, fetchPlaybooks]
  );

  const toggleExpandRuns = useCallback(
    (playbookId: string) => {
      if (expandedRunsId === playbookId) {
        setExpandedRunsId(null);
        setActiveRuns([]);
      } else {
        setExpandedRunsId(playbookId);
        fetchActiveRuns(playbookId);
      }
    },
    [expandedRunsId, fetchActiveRuns]
  );

  const toggleExpandSteps = useCallback(
    (playbookId: string) => {
      setExpandedStepsId((prev) => (prev === playbookId ? null : playbookId));
    },
    []
  );

  const openStartForm = useCallback((playbookId: string) => {
    setStartingPlaybookId(playbookId);
    setSelectedAccountId("");
    setSuccessMessage(null);
  }, []);

  const cancelStartForm = useCallback(() => {
    setStartingPlaybookId(null);
    setSelectedAccountId("");
  }, []);

  // -- Trigger Badge Renderer -------------------------------------------------

  function renderTriggerBadge(triggerType: PlaybookTemplate["trigger_type"]) {
    const key = triggerType || "manual";
    const colors = TRIGGER_COLORS[key] || TRIGGER_COLORS.manual;
    const label = TRIGGER_LABELS[key] || "Manual";
    return (
      <span
        style={{
          ...styles.badge,
          background: colors.bg,
          color: colors.text,
        }}
      >
        {label}
      </span>
    );
  }

  // -- Playbook Card Renderer -------------------------------------------------

  function renderPlaybookCard(playbook: PlaybookTemplate) {
    const isStartFormOpen = startingPlaybookId === playbook.id;
    const isRunsExpanded = expandedRunsId === playbook.id;
    const isStepsExpanded = expandedStepsId === playbook.id;
    const stepCount = playbook.steps?.length || 0;
    const sortedSteps = [...(playbook.steps || [])].sort(
      (a, b) => a.day_offset - b.day_offset
    );

    return (
      <div
        key={playbook.id}
        style={{
          ...styles.card,
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Card Header */}
        <div style={{ padding: "20px 24px 16px" }}>
          {/* Top row: name + badges */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                color: "#f1f5f9",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {playbook.name}
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              {playbook.is_system && (
                <span
                  style={{
                    ...styles.badge,
                    background: "rgba(16,185,129,0.12)",
                    color: "#10b981",
                    border: "1px solid rgba(16,185,129,0.25)",
                  }}
                >
                  System
                </span>
              )}
              {renderTriggerBadge(playbook.trigger_type)}
            </div>
          </div>

          {/* Description */}
          {playbook.description && (
            <p
              style={{
                color: "#94a3b8",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                margin: "0 0 12px 0",
                lineHeight: 1.5,
              }}
            >
              {playbook.description}
            </p>
          )}

          {/* Meta row: step count + run counts */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "#64748b",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              {pluralize(stepCount, "step")}
            </span>

            <span
              style={{
                width: 1,
                height: 12,
                background: "#1e293b",
              }}
            />

            <span
              style={{
                ...styles.badge,
                background:
                  playbook.run_counts.active > 0
                    ? "rgba(59,130,246,0.12)"
                    : "rgba(100,116,139,0.1)",
                color:
                  playbook.run_counts.active > 0 ? "#3b82f6" : "#64748b",
                cursor:
                  playbook.run_counts.active > 0 ? "pointer" : "default",
              }}
              onClick={() => {
                if (playbook.run_counts.active > 0) {
                  toggleExpandRuns(playbook.id);
                }
              }}
            >
              {playbook.run_counts.active} active
            </span>

            <span
              style={{
                ...styles.badge,
                background: "rgba(16,185,129,0.1)",
                color:
                  playbook.run_counts.completed > 0 ? "#10b981" : "#64748b",
              }}
            >
              {playbook.run_counts.completed} completed
            </span>
          </div>
        </div>

        {/* Steps Preview Toggle */}
        <div
          style={{
            borderTop: "1px solid #1e293b",
            padding: "10px 24px",
          }}
        >
          <button
            onClick={() => toggleExpandSteps(playbook.id)}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 500,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#64748b";
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: isStepsExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s",
              }}
            >
              <path
                d="M4.5 2.5L8 6L4.5 9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isStepsExpanded ? "Hide steps" : "Show steps"}
          </button>

          {isStepsExpanded && sortedSteps.length > 0 && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {sortedSteps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 0",
                  }}
                >
                  {/* Step number circle */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#10b981",
                      fontFamily: "'DM Sans', sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Step title */}
                  <span
                    style={{
                      fontSize: 13,
                      color: "#f1f5f9",
                      fontFamily: "'DM Sans', sans-serif",
                      flex: 1,
                    }}
                  >
                    {step.config?.title || step.action}
                  </span>

                  {/* Day offset */}
                  <span
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    Day {step.day_offset}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isStepsExpanded && sortedSteps.length === 0 && (
            <p
              style={{
                marginTop: 8,
                color: "#475569",
                fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              No steps configured.
            </p>
          )}
        </div>

        {/* Active Runs Expanded Section */}
        {isRunsExpanded && (
          <div
            style={{
              borderTop: "1px solid #1e293b",
              background: "rgba(59,130,246,0.03)",
            }}
          >
            <div
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid rgba(30,41,59,0.5)",
              }}
            >
              <span style={styles.sectionLabel}>Active Runs</span>
            </div>

            {loadingRuns ? (
              <div
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid #1e293b",
                    borderTopColor: "#3b82f6",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Loading runs...
                </span>
              </div>
            ) : activeRuns.length === 0 ? (
              <div
                style={{
                  padding: "20px 24px",
                  color: "#475569",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                No active runs found.
              </div>
            ) : (
              activeRuns.map((run) => (
                <div
                  key={run.id}
                  style={{
                    padding: "12px 24px",
                    borderBottom: "1px solid rgba(30,41,59,0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Account name */}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#f1f5f9",
                      fontFamily: "'DM Sans', sans-serif",
                      flex: 1,
                      minWidth: 140,
                    }}
                  >
                    {run.account_name}
                  </span>

                  {/* Started date */}
                  <span
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Started {formatDate(run.started_at)}
                  </span>

                  {/* Status badge */}
                  <span
                    style={{
                      ...styles.badge,
                      background:
                        run.status === "active"
                          ? "rgba(59,130,246,0.12)"
                          : run.status === "paused"
                          ? "rgba(245,158,11,0.12)"
                          : "rgba(100,116,139,0.1)",
                      color:
                        run.status === "active"
                          ? "#3b82f6"
                          : run.status === "paused"
                          ? "#f59e0b"
                          : "#94a3b8",
                    }}
                  >
                    {run.status}
                  </span>

                  {/* Step progress */}
                  <span
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Step {run.current_step}/{run.total_steps}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Start Playbook Inline Form */}
        {isStartFormOpen && (
          <div
            style={{
              borderTop: "1px solid #1e293b",
              padding: "16px 24px",
              background: "rgba(16,185,129,0.03)",
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <span style={styles.sectionLabel}>Start Playbook Run</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Select an account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleStartPlaybook(playbook.id)}
                disabled={submitting || !selectedAccountId}
                style={{
                  ...styles.button,
                  background:
                    selectedAccountId ? "#10b981" : "#1e293b",
                  color: selectedAccountId ? "#fff" : "#475569",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Starting..." : "Start Run"}
              </button>
              <button
                onClick={cancelStartForm}
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
          </div>
        )}

        {/* Card Footer: Action Button */}
        {!isStartFormOpen && (
          <div
            style={{
              borderTop: "1px solid #1e293b",
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            {playbook.run_counts.active > 0 && (
              <button
                onClick={() => toggleExpandRuns(playbook.id)}
                style={{
                  ...styles.button,
                  background: "transparent",
                  color: "#3b82f6",
                  border: "1px solid rgba(59,130,246,0.3)",
                  padding: "6px 14px",
                  fontSize: 12,
                }}
              >
                {isRunsExpanded ? "Hide Runs" : "View Runs"}
              </button>
            )}
            <button
              onClick={() => openStartForm(playbook.id)}
              style={{
                ...styles.button,
                background: "rgba(16,185,129,0.1)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.3)",
                padding: "6px 14px",
                fontSize: 12,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#10b981";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(16,185,129,0.1)";
                e.currentTarget.style.color = "#10b981";
              }}
            >
              Start Playbook
            </button>
          </div>
        )}
      </div>
    );
  }

  // -- Loading State ----------------------------------------------------------

  if (loading) {
    return (
      <>
        <Nav />
        <PageWrapper>
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "40px 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignItems: "center",
                paddingTop: 80,
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
              <p
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Loading playbooks...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          </div>
        </PageWrapper>
      </>
    );
  }

  // -- Render -----------------------------------------------------------------

  return (
    <>
      <Nav />
      <PageWrapper>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "40px 24px",
            minHeight: "100vh",
            background: "#050b18",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 32,
                color: "#f1f5f9",
                marginBottom: 8,
              }}
            >
              Playbooks
            </h1>
            <p
              style={{
                color: "#64748b",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                margin: 0,
              }}
            >
              {pluralize(playbooks.length, "playbook")} total
            </p>
          </div>

          {/* Success message */}
          {successMessage && (
            <div
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  color: "#10b981",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                {successMessage}
              </span>
              <button
                onClick={() => setSuccessMessage(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#10b981",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "0 4px",
                }}
              >
                x
              </button>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  color: "#ef4444",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {error}
              </span>
              <button
                onClick={() => setError(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "0 4px",
                }}
              >
                x
              </button>
            </div>
          )}

          {/* Playbook cards grid */}
          {playbooks.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                gap: 20,
              }}
            >
              {playbooks.map(renderPlaybookCard)}
            </div>
          ) : (
            /* Empty state */
            <div
              style={{
                ...styles.card,
                textAlign: "center",
                padding: "60px 20px",
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  style={{ margin: "0 auto", display: "block" }}
                >
                  <rect
                    x="6"
                    y="6"
                    width="36"
                    height="36"
                    rx="6"
                    stroke="#64748b"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M16 18h16M16 24h12M16 30h8"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="36"
                    cy="36"
                    r="8"
                    fill="#0a1628"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                  <path
                    d="M36 32v8M32 36h8"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18,
                  color: "#f1f5f9",
                  marginBottom: 8,
                }}
              >
                No playbooks yet
              </h3>
              <p
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  maxWidth: 400,
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                Playbooks automate your customer success workflows. They will
                appear here once created by your team or generated by the system
                based on your account activity.
              </p>
            </div>
          )}

          {/* Spin animation keyframes */}
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </PageWrapper>
    </>
  );
}
