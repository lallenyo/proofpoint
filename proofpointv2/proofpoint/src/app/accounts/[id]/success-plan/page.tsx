"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Nav, PageWrapper } from "@/components/Nav";
import Link from "next/link";
import UpgradePrompt from "@/components/UpgradePrompt";

// ── Types ────────────────────────────────────────────────────────────────

interface Milestone {
  id: string;
  title: string;
  description: string;
  target_date: string;
  owner: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  progress: number;
}

interface SuccessPlan {
  summary: string;
  goals: string[];
  milestones: Milestone[];
  generated_at: string;
}

interface AccountData {
  id: string;
  company_name: string;
  industry: string | null;
  health_score: number;
  mrr: number | null;
  lifecycle_stage: string;
  contract_end: string | null;
  [key: string]: unknown;
}

// ── Constants ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Milestone["status"],
  { label: string; bg: string; color: string }
> = {
  not_started: { label: "Not Started", bg: "#334155", color: "#94a3b8" },
  in_progress: { label: "In Progress", bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  completed: { label: "Completed", bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  blocked: { label: "Blocked", bg: "rgba(239,68,68,0.15)", color: "#f87171" },
};

const FALLBACK_PLAN: SuccessPlan = {
  summary:
    "This success plan outlines a strategic roadmap to drive adoption, ensure value realization, and position the account for a successful renewal. Based on current health metrics and lifecycle stage, we recommend focusing on deepening product engagement, establishing executive alignment, and building a clear ROI narrative ahead of the upcoming contract cycle.",
  goals: [
    "Achieve 80%+ active user adoption across all licensed seats within 90 days",
    "Establish bi-weekly executive sponsor check-ins to maintain strategic alignment",
    "Document and quantify at least 3 measurable ROI outcomes before renewal",
    "Expand usage to at least one additional department or use case",
    "Reduce average support ticket volume by 30% through proactive enablement",
  ],
  milestones: [
    {
      id: "m1",
      title: "Kickoff & Alignment Meeting",
      description:
        "Schedule a joint kickoff with the executive sponsor and key stakeholders to align on success criteria, timeline, and communication cadence.",
      target_date: getRelativeDate(7),
      owner: "Customer Success Manager",
      status: "not_started",
      progress: 0,
    },
    {
      id: "m2",
      title: "User Onboarding Blitz",
      description:
        "Conduct targeted onboarding sessions for all new and underactive users. Provide role-based training materials and set up office hours.",
      target_date: getRelativeDate(21),
      owner: "Onboarding Specialist",
      status: "not_started",
      progress: 0,
    },
    {
      id: "m3",
      title: "Health Score Stabilization",
      description:
        "Identify and address the top 3 factors driving health score decline. Implement corrective actions and monitor weekly trends.",
      target_date: getRelativeDate(30),
      owner: "Customer Success Manager",
      status: "not_started",
      progress: 0,
    },
    {
      id: "m4",
      title: "First QBR / Business Review",
      description:
        "Deliver a comprehensive quarterly business review highlighting usage trends, value delivered, and recommendations for the next quarter.",
      target_date: getRelativeDate(60),
      owner: "Account Executive",
      status: "not_started",
      progress: 0,
    },
    {
      id: "m5",
      title: "ROI Documentation",
      description:
        "Collaborate with the champion to compile quantified outcomes including time saved, revenue impact, and efficiency gains.",
      target_date: getRelativeDate(75),
      owner: "Customer Success Manager",
      status: "not_started",
      progress: 0,
    },
    {
      id: "m6",
      title: "Expansion Discovery",
      description:
        "Identify cross-sell and upsell opportunities. Present a tailored expansion proposal based on usage patterns and stakeholder feedback.",
      target_date: getRelativeDate(80),
      owner: "Account Executive",
      status: "not_started",
      progress: 0,
    },
    {
      id: "m7",
      title: "Renewal Preparation",
      description:
        "Prepare renewal package with ROI summary, proposed terms, and multi-year incentives. Engage procurement and legal stakeholders early.",
      target_date: getRelativeDate(90),
      owner: "Account Executive",
      status: "not_started",
      progress: 0,
    },
  ],
  generated_at: new Date().toISOString(),
};

function getRelativeDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

// ── Overall Progress Ring ────────────────────────────────────────────────

function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 10,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#f1f5f9",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1,
          }}
        >
          {Math.round(percentage)}%
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#64748b",
            fontFamily: "'DM Sans', sans-serif",
            marginTop: 2,
          }}
        >
          Complete
        </span>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────

export default function SuccessPlanPage() {
  const { id } = useParams<{ id: string }>();

  const [account, setAccount] = useState<AccountData | null>(null);
  const [plan, setPlan] = useState<SuccessPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [tierGated, setTierGated] = useState(false);

  // Fetch account data on mount
  useEffect(() => {
    if (!id) return;
    fetch(`/api/accounts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Account not found");
        return r.json();
      })
      .then((data) => setAccount(data))
      .catch(() => setError("Could not load account data."))
      .finally(() => setLoading(false));
  }, [id]);

  // Check tier access on mount
  useEffect(() => {
    fetch("/api/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1,
      }),
    }).then((r) => {
      if (r.status === 429) {
        r.json().then((data) => {
          if (data.error === "AI action limit reached") {
            setTierGated(true);
          }
        });
      }
    }).catch(() => {
      // silently ignore - we'll handle gating inline
    });
  }, []);

  // Generate the AI success plan
  const generatePlan = useCallback(async () => {
    if (!account) return;
    setGenerating(true);
    setError("");

    const systemPrompt = `You are a Customer Success strategist at a B2B SaaS company. Generate a detailed, actionable success plan for the following account.

Return ONLY valid JSON (no markdown fences, no explanatory text) with this exact structure:
{
  "summary": "A 2-3 sentence executive summary of the success plan strategy",
  "goals": ["goal1", "goal2", ...],
  "milestones": [
    {
      "id": "m1",
      "title": "Milestone title",
      "description": "Detailed description of what needs to happen",
      "target_date": "YYYY-MM-DD",
      "owner": "Role name (e.g., Customer Success Manager)",
      "status": "not_started",
      "progress": 0
    }
  ],
  "generated_at": "${new Date().toISOString()}"
}

Requirements:
- Provide 3-5 strategic goals
- Provide 5-8 milestones with realistic target dates relative to today (${new Date().toISOString().split("T")[0]})
- All milestones should start with status "not_started" and progress 0
- Owners should be role names like "Customer Success Manager", "Account Executive", "Onboarding Specialist", "Solutions Engineer", "Support Lead"
- Tailor the plan to the account's specific situation including their industry, health score, MRR, lifecycle stage, and contract timeline`;

    const userMessage = `Generate a success plan for this account:
- Company: ${account.company_name}
- Industry: ${account.industry || "Unknown"}
- Health Score: ${account.health_score}/100
- MRR: ${account.mrr ? "$" + account.mrr.toLocaleString() : "Unknown"}
- Lifecycle Stage: ${account.lifecycle_stage}
- Contract End: ${account.contract_end || "Not set"}`;

    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          max_tokens: 3000,
        }),
      });

      if (res.status === 403 || (res.status === 429)) {
        const data = await res.json();
        if (data.upgradeUrl || data.error === "AI action limit reached") {
          setTierGated(true);
          setGenerating(false);
          return;
        }
      }

      if (!res.ok) throw new Error("API call failed");

      const data = await res.json();
      const text =
        data.content?.[0]?.text || data.content?.[0]?.value || "";

      // Try to parse the JSON from the response
      let parsed: SuccessPlan;
      try {
        // Handle case where AI wraps JSON in markdown fences
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        // If parsing fails, try to extract JSON from the text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse AI response");
        }
      }

      // Validate structure
      if (!parsed.summary || !Array.isArray(parsed.goals) || !Array.isArray(parsed.milestones)) {
        throw new Error("Invalid plan structure");
      }

      setPlan(parsed);
    } catch (err) {
      console.error("Success plan generation error:", err);
      // Fall back to the hardcoded plan
      setPlan({ ...FALLBACK_PLAN, generated_at: new Date().toISOString() });
      setError("AI generation failed. Showing example plan instead.");
    } finally {
      setGenerating(false);
    }
  }, [account]);

  // Update a milestone's status or progress
  const updateMilestone = useCallback(
    (milestoneId: string, updates: Partial<Milestone>) => {
      if (!plan) return;
      setPlan({
        ...plan,
        milestones: plan.milestones.map((m) =>
          m.id === milestoneId ? { ...m, ...updates } : m
        ),
      });
    },
    [plan]
  );

  // Compute overall progress
  const overallProgress =
    plan && plan.milestones.length > 0
      ? Math.round(
          plan.milestones.reduce((sum, m) => sum + m.progress, 0) /
            plan.milestones.length
        )
      : 0;

  const completedCount = plan
    ? plan.milestones.filter((m) => m.status === "completed").length
    : 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />
      <PageWrapper>
        <div
          style={{
            minHeight: "100vh",
            background: "#050b18",
            padding: "40px 24px 80px",
          }}
        >
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            {/* Back link + Header */}
            <div style={{ marginBottom: 32 }}>
              <Link
                href={`/accounts/${id}`}
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  textDecoration: "none",
                  fontFamily: "'DM Sans', sans-serif",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 16,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#94a3b8")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "#64748b")
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 12L6 8l4-4" />
                </svg>
                Back to Account
              </Link>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <h1
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 30,
                      color: "#f1f5f9",
                      fontWeight: 700,
                      margin: "0 0 6px",
                    }}
                  >
                    AI Success Plan
                  </h1>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: "#64748b",
                      margin: 0,
                    }}
                  >
                    {loading
                      ? "Loading account..."
                      : account
                        ? account.company_name
                        : "Account"}
                  </p>
                </div>

                {!tierGated && (
                  <button
                    onClick={generatePlan}
                    disabled={generating || !account}
                    style={{
                      background: generating
                        ? "rgba(16,185,129,0.15)"
                        : "linear-gradient(135deg, #10b981, #059669)",
                      color: generating ? "#10b981" : "#fff",
                      border: generating
                        ? "1px solid rgba(16,185,129,0.3)"
                        : "none",
                      padding: "12px 28px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: generating || !account ? "not-allowed" : "pointer",
                      opacity: !account ? 0.5 : 1,
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {generating && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(16,185,129,0.3)",
                          borderTopColor: "#10b981",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    )}
                    {generating
                      ? "Generating Plan..."
                      : plan
                        ? "Regenerate Plan"
                        : "Generate AI Success Plan"}
                  </button>
                )}
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div
                style={{
                  textAlign: "center",
                  color: "#475569",
                  padding: "80px 0",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Loading account data...
              </div>
            )}

            {/* Error state (account not found) */}
            {!loading && error && !plan && (
              <div
                style={{
                  textAlign: "center",
                  color: "#f87171",
                  padding: "80px 0",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {error}
              </div>
            )}

            {/* Tier gating */}
            {tierGated && (
              <UpgradePrompt
                feature="AI Success Plans"
                reason="AI Success Plans require available AI actions in your plan. Upgrade to Scale for 2,000 AI actions per seat and advanced success planning features."
                currentTier="current"
              />
            )}

            {/* Generating animation */}
            {generating && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    border: "3px solid #1e293b",
                    borderTopColor: "#10b981",
                    margin: "0 auto 20px",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <p style={{ color: "#94a3b8", fontSize: 15, margin: "0 0 6px" }}>
                  Analyzing account data and generating plan...
                </p>
                <p style={{ color: "#475569", fontSize: 13 }}>
                  This may take a few seconds
                </p>
              </div>
            )}

            {/* Error banner when plan exists but generation failed */}
            {error && plan && (
              <div
                style={{
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span style={{ fontSize: 16 }}>!</span>
                <span style={{ fontSize: 13, color: "#fbbf24" }}>{error}</span>
              </div>
            )}

            {/* Plan content */}
            {plan && !generating && (
              <>
                {/* Overall Progress + Summary Row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: 24,
                    marginBottom: 28,
                  }}
                >
                  {/* Progress Ring Card */}
                  <div
                    style={{
                      background: "#0a1628",
                      border: "1px solid #1e293b",
                      borderRadius: 14,
                      padding: "28px 32px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      minWidth: 180,
                    }}
                  >
                    <ProgressRing percentage={overallProgress} />
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: "#94a3b8",
                        textAlign: "center",
                      }}
                    >
                      {completedCount} of {plan.milestones.length} milestones
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div
                    style={{
                      background: "#0a1628",
                      border: "1px solid #1e293b",
                      borderRadius: 14,
                      padding: "28px 32px",
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 18,
                        color: "#f1f5f9",
                        fontWeight: 700,
                        margin: "0 0 12px",
                      }}
                    >
                      Plan Summary
                    </h2>
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        color: "#94a3b8",
                        lineHeight: 1.7,
                        margin: 0,
                      }}
                    >
                      {plan.summary}
                    </p>
                    <div
                      style={{
                        marginTop: 14,
                        fontSize: 12,
                        color: "#475569",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Generated{" "}
                      {new Date(plan.generated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {/* Strategic Goals */}
                <div
                  style={{
                    background: "#0a1628",
                    border: "1px solid #1e293b",
                    borderRadius: 14,
                    padding: "28px 32px",
                    marginBottom: 28,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 18,
                      color: "#f1f5f9",
                      fontWeight: 700,
                      margin: "0 0 18px",
                    }}
                  >
                    Strategic Goals
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {plan.goals.map((goal, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 14,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "rgba(16,185,129,0.12)",
                            color: "#10b981",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {i + 1}
                        </div>
                        <p
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14,
                            color: "#cbd5e1",
                            lineHeight: 1.6,
                            margin: 0,
                            paddingTop: 3,
                          }}
                        >
                          {goal}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestones Timeline */}
                <div style={{ marginBottom: 28 }}>
                  <h2
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 18,
                      color: "#f1f5f9",
                      fontWeight: 700,
                      margin: "0 0 18px",
                    }}
                  >
                    Milestones
                  </h2>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0,
                      position: "relative",
                    }}
                  >
                    {/* Vertical timeline line */}
                    <div
                      style={{
                        position: "absolute",
                        left: 19,
                        top: 24,
                        bottom: 24,
                        width: 2,
                        background: "#1e293b",
                        zIndex: 0,
                      }}
                    />

                    {plan.milestones.map((milestone, idx) => {
                      const statusCfg = STATUS_CONFIG[milestone.status];
                      const isExpanded = expandedMilestone === milestone.id;
                      const isLast = idx === plan.milestones.length - 1;

                      return (
                        <div
                          key={milestone.id}
                          style={{
                            display: "flex",
                            gap: 20,
                            position: "relative",
                            paddingBottom: isLast ? 0 : 24,
                          }}
                        >
                          {/* Timeline dot */}
                          <div
                            style={{
                              width: 40,
                              display: "flex",
                              justifyContent: "center",
                              paddingTop: 20,
                              flexShrink: 0,
                              zIndex: 1,
                            }}
                          >
                            <div
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background:
                                  milestone.status === "completed"
                                    ? "#10b981"
                                    : milestone.status === "in_progress"
                                      ? "#3b82f6"
                                      : milestone.status === "blocked"
                                        ? "#ef4444"
                                        : "#334155",
                                border: "3px solid #0a1628",
                                boxShadow:
                                  milestone.status === "completed"
                                    ? "0 0 8px rgba(16,185,129,0.4)"
                                    : milestone.status === "in_progress"
                                      ? "0 0 8px rgba(59,130,246,0.4)"
                                      : "none",
                              }}
                            />
                          </div>

                          {/* Milestone card */}
                          <div
                            onClick={() =>
                              setExpandedMilestone(
                                isExpanded ? null : milestone.id
                              )
                            }
                            style={{
                              flex: 1,
                              background: "#0a1628",
                              border: `1px solid ${isExpanded ? "rgba(16,185,129,0.3)" : "#1e293b"}`,
                              borderRadius: 14,
                              padding: "20px 24px",
                              cursor: "pointer",
                              transition: "border-color 0.2s, box-shadow 0.2s",
                              boxShadow: isExpanded
                                ? "0 0 20px rgba(16,185,129,0.05)"
                                : "none",
                            }}
                          >
                            {/* Card header */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 8,
                              }}
                            >
                              <h3
                                style={{
                                  fontFamily: "'DM Sans', sans-serif",
                                  fontSize: 15,
                                  fontWeight: 600,
                                  color: "#f1f5f9",
                                  margin: 0,
                                }}
                              >
                                {milestone.title}
                              </h3>
                              <span
                                style={{
                                  background: statusCfg.bg,
                                  color: statusCfg.color,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "4px 10px",
                                  borderRadius: 20,
                                  whiteSpace: "nowrap",
                                  fontFamily: "'DM Sans', sans-serif",
                                }}
                              >
                                {statusCfg.label}
                              </span>
                            </div>

                            {/* Description */}
                            <p
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                color: "#94a3b8",
                                lineHeight: 1.6,
                                margin: "0 0 12px",
                              }}
                            >
                              {milestone.description}
                            </p>

                            {/* Meta row */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                fontSize: 12,
                                color: "#64748b",
                                fontFamily: "'DM Sans', sans-serif",
                                marginBottom: 10,
                              }}
                            >
                              <span>
                                Target:{" "}
                                {new Date(
                                  milestone.target_date
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <span>Owner: {milestone.owner}</span>
                            </div>

                            {/* Progress bar */}
                            <div
                              style={{
                                width: "100%",
                                height: 6,
                                background: "#1e293b",
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${milestone.progress}%`,
                                  background:
                                    milestone.status === "completed"
                                      ? "#10b981"
                                      : milestone.status === "blocked"
                                        ? "#ef4444"
                                        : "#3b82f6",
                                  borderRadius: 3,
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#475569",
                                fontFamily: "'DM Sans', sans-serif",
                                marginTop: 4,
                                textAlign: "right",
                              }}
                            >
                              {milestone.progress}%
                            </div>

                            {/* Expanded edit controls */}
                            {isExpanded && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  marginTop: 16,
                                  paddingTop: 16,
                                  borderTop: "1px solid #1e293b",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 16,
                                }}
                              >
                                {/* Status changer */}
                                <div>
                                  <label
                                    style={{
                                      fontSize: 12,
                                      color: "#64748b",
                                      fontFamily: "'DM Sans', sans-serif",
                                      display: "block",
                                      marginBottom: 8,
                                    }}
                                  >
                                    Update Status
                                  </label>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {(
                                      Object.keys(STATUS_CONFIG) as Array<
                                        Milestone["status"]
                                      >
                                    ).map((status) => {
                                      const cfg = STATUS_CONFIG[status];
                                      const isActive =
                                        milestone.status === status;
                                      return (
                                        <button
                                          key={status}
                                          onClick={() => {
                                            const updates: Partial<Milestone> = {
                                              status,
                                            };
                                            if (status === "completed") {
                                              updates.progress = 100;
                                            }
                                            updateMilestone(
                                              milestone.id,
                                              updates
                                            );
                                          }}
                                          style={{
                                            background: isActive
                                              ? cfg.bg
                                              : "transparent",
                                            color: isActive
                                              ? cfg.color
                                              : "#475569",
                                            border: `1px solid ${isActive ? cfg.color : "#1e293b"}`,
                                            padding: "6px 14px",
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            fontFamily: "'DM Sans', sans-serif",
                                            transition: "all 0.15s",
                                          }}
                                        >
                                          {cfg.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Progress slider */}
                                <div>
                                  <label
                                    style={{
                                      fontSize: 12,
                                      color: "#64748b",
                                      fontFamily: "'DM Sans', sans-serif",
                                      display: "block",
                                      marginBottom: 8,
                                    }}
                                  >
                                    Progress: {milestone.progress}%
                                  </label>
                                  <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={milestone.progress}
                                    onChange={(e) => {
                                      const progress = Number(e.target.value);
                                      const updates: Partial<Milestone> = {
                                        progress,
                                      };
                                      if (progress === 100) {
                                        updates.status = "completed";
                                      } else if (
                                        progress > 0 &&
                                        milestone.status === "not_started"
                                      ) {
                                        updates.status = "in_progress";
                                      }
                                      updateMilestone(milestone.id, updates);
                                    }}
                                    style={{
                                      width: "100%",
                                      accentColor: "#10b981",
                                      cursor: "pointer",
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Empty state when no plan and not loading */}
            {!plan && !generating && !loading && !tierGated && !error && (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 24px",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "rgba(16,185,129,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 22,
                    color: "#f1f5f9",
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  No Success Plan Yet
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                    maxWidth: 400,
                    margin: "0 auto 24px",
                    lineHeight: 1.6,
                  }}
                >
                  Generate an AI-powered success plan tailored to this
                  account&apos;s health, lifecycle stage, and contract timeline.
                </p>
                <button
                  onClick={generatePlan}
                  disabled={!account}
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff",
                    border: "none",
                    padding: "14px 32px",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: account ? "pointer" : "not-allowed",
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: account ? 1 : 0.5,
                  }}
                >
                  Generate AI Success Plan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Keyframe animation for spinner */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </PageWrapper>
    </>
  );
}
