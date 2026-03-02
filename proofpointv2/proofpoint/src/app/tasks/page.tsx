"use client";

import { useState, useEffect, useCallback } from "react";
import { Nav, PageWrapper } from "@/components/Nav";
import type { Task, TaskPriority, TaskStatus } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

type TaskWithAccount = Task & {
  client_accounts?: { id: string; company_name: string } | null;
};

type Account = { id: string; company_name: string };

type FilterState = {
  priority: TaskPriority | "";
  status: TaskStatus | "";
  accountId: string;
  dateFrom: string;
  dateTo: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#94a3b8",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  playbook: "Playbook",
  "ai-suggestion": "AI Suggestion",
  "health-alert": "Health Alert",
};

const SOURCE_COLORS: Record<string, string> = {
  manual: "#64748b",
  playbook: "#8b5cf6",
  "ai-suggestion": "#06b6d4",
  "health-alert": "#ef4444",
};

const ALL_PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];
const ALL_STATUSES: TaskStatus[] = ["pending", "in_progress", "completed", "skipped"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate < todayStr();
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate === todayStr();
}

function sortByPriority(a: TaskWithAccount, b: TaskWithAccount): number {
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  card: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "18px 20px",
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
  sectionLabel: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
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
};

// ── Component ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  // Data state
  const [tasks, setTasks] = useState<TaskWithAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick-add form state
  const [newTitle, setNewTitle] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [adding, setAdding] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    priority: "",
    status: "",
    accountId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Expanded task for detail view
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Active section tab for By Account view
  const [activeSection, setActiveSection] = useState<"today" | "upcoming" | "byAccount">("today");

  // ── Data Fetching ────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(
        Array.isArray(data)
          ? data.map((a: Record<string, unknown>) => ({ id: a.id as string, company_name: a.company_name as string }))
          : []
      );
    } catch {
      // Accounts are not critical; silently fail
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchTasks(), fetchAccounts()]).finally(() => setLoading(false));
  }, [fetchTasks, fetchAccounts]);

  // ── Task Actions ─────────────────────────────────────────────────────────

  const addTask = useCallback(async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          account_id: newAccountId || null,
          due_date: newDueDate || null,
          priority: newPriority,
          source: "manual",
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
      setNewTitle("");
      setNewAccountId("");
      setNewDueDate("");
      setNewPriority("medium");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setAdding(false);
    }
  }, [newTitle, newAccountId, newDueDate, newPriority]);

  const toggleComplete = useCallback(async (task: TaskWithAccount) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: newStatus as TaskStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }
          : t
      )
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
  }, []);

  const saveTaskEdit = useCallback(
    async (taskId: string) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: editDesc || null,
            priority: editPriority,
            due_date: editDueDate || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to save changes");
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        setExpandedId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save changes");
      } finally {
        setSaving(false);
      }
    },
    [editDesc, editPriority, editDueDate]
  );

  const expandTask = useCallback((task: TaskWithAccount) => {
    setExpandedId((prev) => {
      if (prev === task.id) return null;
      setEditDesc(task.description || "");
      setEditPriority(task.priority);
      setEditDueDate(task.due_date || "");
      return task.id;
    });
  }, []);

  // ── Filtering ────────────────────────────────────────────────────────────

  const filteredTasks = tasks.filter((t) => {
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.accountId && t.account_id !== filters.accountId) return false;
    if (filters.dateFrom && t.due_date && t.due_date < filters.dateFrom) return false;
    if (filters.dateTo && t.due_date && t.due_date > filters.dateTo) return false;
    return true;
  });

  const activeFilterCount = [
    filters.priority,
    filters.status,
    filters.accountId,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  // ── Section Splits ───────────────────────────────────────────────────────

  const today = todayStr();
  const weekEnd = addDays(today, 7);

  const todayTasks = filteredTasks
    .filter((t) => {
      if (t.status === "completed" || t.status === "skipped") return false;
      if (!t.due_date) return false;
      return t.due_date <= today;
    })
    .sort(sortByPriority);

  const upcomingTasks = filteredTasks
    .filter((t) => {
      if (t.status === "completed" || t.status === "skipped") return false;
      if (!t.due_date) return false;
      return t.due_date > today && t.due_date <= weekEnd;
    })
    .sort((a, b) => {
      const dateCmp = (a.due_date || "").localeCompare(b.due_date || "");
      return dateCmp !== 0 ? dateCmp : sortByPriority(a, b);
    });

  const byAccountGroups: Record<string, TaskWithAccount[]> = {};
  filteredTasks
    .filter((t) => t.account_id && t.status !== "completed" && t.status !== "skipped")
    .forEach((t) => {
      const name = t.client_accounts?.company_name || "Unknown Account";
      if (!byAccountGroups[name]) byAccountGroups[name] = [];
      byAccountGroups[name].push(t);
    });

  const sortedAccountNames = Object.keys(byAccountGroups).sort();
  sortedAccountNames.forEach((name) => {
    byAccountGroups[name].sort(sortByPriority);
  });

  // No-due-date tasks for "today" section
  const noDueDateTasks = filteredTasks
    .filter((t) => !t.due_date && t.status !== "completed" && t.status !== "skipped")
    .sort(sortByPriority);

  // ── Task Row Renderer ────────────────────────────────────────────────────

  function renderTaskRow(task: TaskWithAccount) {
    const completed = task.status === "completed";
    const overdue = !completed && isOverdue(task.due_date);
    const dueToday = !completed && isDueToday(task.due_date);
    const isExpanded = expandedId === task.id;

    return (
      <div key={task.id} style={{ borderBottom: "1px solid rgba(30,41,59,0.5)" }}>
        <div
          onClick={() => expandTask(task)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            cursor: "pointer",
            transition: "background 0.1s",
            background: isExpanded ? "rgba(16,185,129,0.04)" : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!isExpanded) e.currentTarget.style.background = "rgba(255,255,255,0.02)";
          }}
          onMouseLeave={(e) => {
            if (!isExpanded) e.currentTarget.style.background = "transparent";
          }}
        >
          {/* Checkbox */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleComplete(task);
            }}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: completed ? "none" : "2px solid #334155",
              background: completed ? "#10b981" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            {completed && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          {/* Priority dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: PRIORITY_COLORS[task.priority],
              flexShrink: 0,
            }}
            title={PRIORITY_LABELS[task.priority]}
          />

          {/* Title */}
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              color: completed ? "#64748b" : "#f1f5f9",
              textDecoration: completed ? "line-through" : "none",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {task.title}
          </span>

          {/* Account badge */}
          {task.client_accounts?.company_name && (
            <span
              style={{
                ...styles.badge,
                background: "rgba(16,185,129,0.1)",
                color: "#10b981",
                flexShrink: 0,
              }}
            >
              {task.client_accounts.company_name}
            </span>
          )}

          {/* Due date */}
          {task.due_date && (
            <span
              style={{
                fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
                color: overdue ? "#ef4444" : dueToday ? "#f59e0b" : "#64748b",
                fontWeight: overdue ? 600 : 400,
                flexShrink: 0,
              }}
            >
              {overdue ? "Overdue \u00b7 " : dueToday ? "Today \u00b7 " : ""}
              {formatDate(task.due_date)}
            </span>
          )}

          {/* Source badge */}
          <span
            style={{
              ...styles.badge,
              background: `${SOURCE_COLORS[task.source] || "#64748b"}20`,
              color: SOURCE_COLORS[task.source] || "#64748b",
              flexShrink: 0,
            }}
          >
            {SOURCE_LABELS[task.source] || task.source}
          </span>
        </div>

        {/* Expanded detail panel */}
        {isExpanded && (
          <div
            style={{
              padding: "0 16px 16px 54px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ ...styles.sectionLabel, display: "block", marginBottom: 4 }}>
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  style={{
                    ...styles.input,
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                <div>
                  <label style={{ ...styles.sectionLabel, display: "block", marginBottom: 4 }}>
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    style={{ ...styles.select, width: "100%" }}
                  >
                    {ALL_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ ...styles.sectionLabel, display: "block", marginBottom: 4 }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    style={{ ...styles.input, colorScheme: "dark" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setExpandedId(null)}
                style={{
                  ...styles.button,
                  background: "transparent",
                  color: "#94a3b8",
                  border: "1px solid #1e293b",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => saveTaskEdit(task.id)}
                disabled={saving}
                style={{
                  ...styles.button,
                  background: "#10b981",
                  color: "#fff",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Section Renderer ─────────────────────────────────────────────────────

  function renderSection(
    title: string,
    count: number,
    taskList: TaskWithAccount[],
    emptyMessage: string
  ) {
    return (
      <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              color: "#f1f5f9",
              margin: 0,
            }}
          >
            {title}
          </h3>
          <span
            style={{
              ...styles.badge,
              background: count > 0 ? "rgba(16,185,129,0.1)" : "rgba(100,116,139,0.1)",
              color: count > 0 ? "#10b981" : "#64748b",
            }}
          >
            {count}
          </span>
        </div>
        {taskList.length === 0 ? (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: "#475569",
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          taskList.map(renderTaskRow)
        )}
      </div>
    );
  }

  function renderByAccountSection() {
    return (
      <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              color: "#f1f5f9",
              margin: 0,
            }}
          >
            By Account
          </h3>
          <span
            style={{
              ...styles.badge,
              background: sortedAccountNames.length > 0 ? "rgba(16,185,129,0.1)" : "rgba(100,116,139,0.1)",
              color: sortedAccountNames.length > 0 ? "#10b981" : "#64748b",
            }}
          >
            {sortedAccountNames.length} account{sortedAccountNames.length !== 1 ? "s" : ""}
          </span>
        </div>
        {sortedAccountNames.length === 0 ? (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: "#475569",
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            No tasks linked to accounts
          </div>
        ) : (
          sortedAccountNames.map((name) => (
            <div key={name}>
              <div
                style={{
                  padding: "10px 20px",
                  background: "rgba(16,185,129,0.04)",
                  borderBottom: "1px solid rgba(30,41,59,0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#10b981",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {byAccountGroups[name].length} task{byAccountGroups[name].length !== 1 ? "s" : ""}
                </span>
              </div>
              {byAccountGroups[name].map(renderTaskRow)}
            </div>
          ))
        )}
      </div>
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Nav />
        <PageWrapper>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", paddingTop: 80 }}>
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
                Loading tasks...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          </div>
        </PageWrapper>
      </>
    );
  }

  // ── Summary Stats ────────────────────────────────────────────────────────

  const totalOpen = tasks.filter((t) => t.status !== "completed" && t.status !== "skipped").length;
  const overdueCount = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "skipped" && isOverdue(t.due_date)
  ).length;
  const completedToday = tasks.filter(
    (t) => t.status === "completed" && t.completed_at && t.completed_at.slice(0, 10) === todayStr()
  ).length;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />
      <PageWrapper>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
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
              Tasks
            </h1>
            <p
              style={{
                color: "#64748b",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                margin: 0,
              }}
            >
              {totalOpen} open{" "}
              {overdueCount > 0 && (
                <span style={{ color: "#ef4444" }}>
                  ({overdueCount} overdue)
                </span>
              )}
              {completedToday > 0 && (
                <span style={{ color: "#10b981" }}>
                  {" "}{completedToday} completed today
                </span>
              )}
            </p>
          </div>

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

          {/* Quick-add bar */}
          <div
            style={{
              ...styles.card,
              marginBottom: 24,
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTask();
              }}
              style={{ ...styles.input, flex: 2, minWidth: 200 }}
            />
            <select
              value={newAccountId}
              onChange={(e) => setNewAccountId(e.target.value)}
              style={{ ...styles.select, flex: 0, minWidth: 160 }}
            >
              <option value="">No Account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.company_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              style={{ ...styles.input, width: 140, flex: 0, colorScheme: "dark" }}
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              style={{ ...styles.select, flex: 0, minWidth: 110 }}
            >
              {ALL_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            <button
              onClick={addTask}
              disabled={adding || !newTitle.trim()}
              style={{
                ...styles.button,
                background: newTitle.trim() ? "#10b981" : "#1e293b",
                color: newTitle.trim() ? "#fff" : "#475569",
                opacity: adding ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {adding ? "Adding..." : "Add Task"}
            </button>
          </div>

          {/* Filter bar */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: showFilters ? 12 : 0,
              }}
            >
              {/* Section tabs */}
              <div style={{ display: "flex", gap: 4, flex: 1 }}>
                {(
                  [
                    { key: "today", label: "Today", count: todayTasks.length + noDueDateTasks.length },
                    { key: "upcoming", label: "Upcoming", count: upcomingTasks.length },
                    { key: "byAccount", label: "By Account", count: sortedAccountNames.length },
                  ] as const
                ).map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    style={{
                      ...styles.button,
                      background: activeSection === key ? "rgba(16,185,129,0.1)" : "transparent",
                      color: activeSection === key ? "#10b981" : "#94a3b8",
                      border: activeSection === key ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
                      padding: "6px 14px",
                      fontSize: 13,
                    }}
                  >
                    {label}
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        opacity: 0.7,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters((p) => !p)}
                style={{
                  ...styles.button,
                  background: showFilters ? "rgba(16,185,129,0.1)" : "transparent",
                  color: showFilters ? "#10b981" : "#94a3b8",
                  border: "1px solid #1e293b",
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1.75 3.5h10.5M3.5 7h7M5.25 10.5h3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span
                    style={{
                      background: "#10b981",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: "50%",
                      width: 16,
                      height: 16,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Expanded filter controls */}
            {showFilters && (
              <div
                style={{
                  ...styles.card,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 120 }}>
                  <label style={{ ...styles.sectionLabel, display: "block", marginBottom: 4 }}>
                    Priority
                  </label>
                  <select
                    value={filters.priority}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, priority: e.target.value as TaskPriority | "" }))
                    }
                    style={{ ...styles.select, width: "100%" }}
                  >
                    <option value="">All</option>
                    {ALL_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ minWidth: 130 }}>
                  <label style={{ ...styles.sectionLabel, display: "block", marginBottom: 4 }}>
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, status: e.target.value as TaskStatus | "" }))
                    }
                    style={{ ...styles.select, width: "100%" }}
                  >
                    <option value="">All</option>
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ minWidth: 160 }}>
                  <label style={{ ...styles.sectionLabel, display: "block", marginBottom: 4 }}>
                    Account
                  </label>
                  <select
                    value={filters.accountId}
                    onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value }))}
                    style={{ ...styles.select, width: "100%" }}
                  >
                    <option value="">All Accounts</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ minWidth: 130 }}>
                  <label style={{ ...styles.sectionLabel, display: "block", marginBottom: 4 }}>
                    Due After
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    style={{ ...styles.input, colorScheme: "dark" }}
                  />
                </div>

                <div style={{ minWidth: 130 }}>
                  <label style={{ ...styles.sectionLabel, display: "block", marginBottom: 4 }}>
                    Due Before
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    style={{ ...styles.input, colorScheme: "dark" }}
                  />
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={() =>
                      setFilters({
                        priority: "",
                        status: "",
                        accountId: "",
                        dateFrom: "",
                        dateTo: "",
                      })
                    }
                    style={{
                      ...styles.button,
                      background: "transparent",
                      color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.3)",
                      padding: "8px 12px",
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Task sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {activeSection === "today" && (
              <>
                {renderSection(
                  "Today's Tasks",
                  todayTasks.length,
                  todayTasks,
                  "No tasks due today. You're all caught up!"
                )}
                {noDueDateTasks.length > 0 &&
                  renderSection(
                    "No Due Date",
                    noDueDateTasks.length,
                    noDueDateTasks,
                    "All tasks have due dates"
                  )}
              </>
            )}

            {activeSection === "upcoming" &&
              renderSection(
                "Upcoming (Next 7 Days)",
                upcomingTasks.length,
                upcomingTasks,
                "No tasks due in the next 7 days"
              )}

            {activeSection === "byAccount" && renderByAccountSection()}
          </div>

          {/* Empty state when no tasks at all */}
          {tasks.length === 0 && (
            <div
              style={{
                ...styles.card,
                textAlign: "center",
                padding: "60px 20px",
                marginTop: 24,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  marginBottom: 16,
                  opacity: 0.4,
                }}
              >
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: "0 auto" }}>
                  <rect x="8" y="8" width="32" height="36" rx="4" stroke="#64748b" strokeWidth="2" fill="none" />
                  <path d="M16 20h16M16 28h10" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="36" cy="36" r="10" fill="#0a1628" stroke="#10b981" strokeWidth="2" />
                  <path d="M36 32v8M32 36h8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
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
                No tasks yet
              </h3>
              <p
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  maxWidth: 360,
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                Create your first task above, or tasks will appear here automatically
                from playbooks, health alerts, and AI suggestions.
              </p>
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  );
}
