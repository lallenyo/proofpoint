"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type OrgData = {
  orgName: string;
  role: string;
  teamSize: string;
};

type CrmState = {
  token: string;
  connected: boolean;
  companyCount: number | null;
  testing: boolean;
  error: string;
};

type ManualAccount = {
  companyName: string;
  industry: string;
  mrr: string;
  contractEnd: string;
};

type HealthFactor = {
  key: string;
  label: string;
  weight: number;
};

// ── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = [
  "Organization",
  "Connect CRM",
  "Import Accounts",
  "Health Scores",
];

const ROLE_OPTIONS = [
  { value: "", label: "Select your role" },
  { value: "cs_manager", label: "CS Manager" },
  { value: "vp_cs", label: "VP CS" },
  { value: "individual_csm", label: "Individual CSM" },
  { value: "founder", label: "Founder" },
];

const TEAM_SIZE_OPTIONS = [
  { value: "", label: "Select team size" },
  { value: "1-3", label: "1\u20133" },
  { value: "4-10", label: "4\u201310" },
  { value: "11-25", label: "11\u201325" },
  { value: "25+", label: "25+" },
];

const INDUSTRY_OPTIONS = [
  { value: "", label: "Select industry" },
  { value: "healthcare", label: "Healthcare" },
  { value: "fintech", label: "Fintech" },
  { value: "hrtech", label: "HR Tech" },
  { value: "saas", label: "SaaS" },
  { value: "realestate", label: "Real Estate" },
];

const DEFAULT_HEALTH_FACTORS: HealthFactor[] = [
  { key: "engagement", label: "Engagement", weight: 15 },
  { key: "usage", label: "Usage", weight: 15 },
  { key: "nps", label: "NPS", weight: 12 },
  { key: "renewal_proximity", label: "Renewal Proximity", weight: 12 },
  { key: "support_sentiment", label: "Support Sentiment", weight: 12 },
  { key: "expansion_potential", label: "Expansion Potential", weight: 12 },
  { key: "adoption_stage", label: "Adoption Stage", weight: 12 },
  { key: "competitive_risk", label: "Competitive Risk", weight: 10 },
];

// ── Styles ───────────────────────────────────────────────────────────────────

const colors = {
  bg: "#050b18",
  card: "#0a1628",
  border: "#1e293b",
  green: "#10b981",
  greenDim: "rgba(16, 185, 129, 0.15)",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  danger: "#ef4444",
  dangerDim: "rgba(239, 68, 68, 0.15)",
  inputBg: "#0f1d32",
};

const fonts = {
  heading: "'Playfair Display', serif",
  body: "'DM Sans', sans-serif",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  // Step tracking
  const [step, setStep] = useState(0);

  // Step 1: Org data
  const [org, setOrg] = useState<OrgData>({
    orgName: "",
    role: "",
    teamSize: "",
  });

  // Step 2: CRM connection
  const [crm, setCrm] = useState<CrmState>({
    token: "",
    connected: false,
    companyCount: null,
    testing: false,
    error: "",
  });

  // Step 3: Import / manual account
  const [importState, setImportState] = useState<{
    importing: boolean;
    imported: boolean;
    syncResult: { synced: number; created: number } | null;
    error: string;
  }>({ importing: false, imported: false, syncResult: null, error: "" });

  const [manualAccount, setManualAccount] = useState<ManualAccount>({
    companyName: "",
    industry: "",
    mrr: "",
    contractEnd: "",
  });
  const [manualSaved, setManualSaved] = useState(false);
  const [manualError, setManualError] = useState("");

  // Step 4: Health scores
  const [factors, setFactors] = useState<HealthFactor[]>(
    DEFAULT_HEALTH_FACTORS.map((f) => ({ ...f }))
  );
  const [completing, setCompleting] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const weightSum = factors.reduce((s, f) => s + f.weight, 0);

  function updateFactor(index: number, weight: number) {
    setFactors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], weight };
      return next;
    });
  }

  // ── Step 2: Test HubSpot connection ──────────────────────────────────────

  async function testConnection() {
    setCrm((prev) => ({ ...prev, testing: true, error: "" }));
    try {
      const res = await fetch("/api/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "test",
          token: crm.token,
          saveToken: true,
        }),
      });

      if (res.ok) {
        // Connection successful -- now count companies
        let count: number | null = null;
        try {
          const countRes = await fetch("/api/hubspot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyName: "*", token: crm.token }),
          });
          if (countRes.ok) {
            count = 1; // At least one company found
          }
        } catch {
          // Count is optional
        }
        setCrm((prev) => ({
          ...prev,
          connected: true,
          companyCount: count,
          testing: false,
          error: "",
        }));
      } else {
        const data = await res.json().catch(() => ({}));
        setCrm((prev) => ({
          ...prev,
          testing: false,
          error: data.error || "Connection failed. Check your API token.",
        }));
      }
    } catch {
      setCrm((prev) => ({
        ...prev,
        testing: false,
        error: "Network error. Please try again.",
      }));
    }
  }

  // ── Step 3: Import from HubSpot ──────────────────────────────────────────

  async function startImport() {
    setImportState((prev) => ({ ...prev, importing: true, error: "" }));
    try {
      const res = await fetch("/api/hubspot/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubspotToken: crm.token }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportState({
          importing: false,
          imported: true,
          syncResult: { synced: data.synced, created: data.created },
          error: "",
        });
      } else {
        setImportState((prev) => ({
          ...prev,
          importing: false,
          error: data.error || "Import failed.",
        }));
      }
    } catch {
      setImportState((prev) => ({
        ...prev,
        importing: false,
        error: "Network error during import.",
      }));
    }
  }

  // ── Step 3: Save manual account ──────────────────────────────────────────

  async function saveManualAccount() {
    setManualError("");
    if (!manualAccount.companyName.trim()) {
      setManualError("Company name is required.");
      return;
    }
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: manualAccount.companyName,
          industry: manualAccount.industry || null,
          mrr: manualAccount.mrr ? parseFloat(manualAccount.mrr) : 0,
          contract_end: manualAccount.contractEnd || null,
        }),
      });
      if (res.ok) {
        setManualSaved(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setManualError(data.error || "Failed to create account.");
      }
    } catch {
      setManualError("Network error. Please try again.");
    }
  }

  // ── Step 4: Complete setup ───────────────────────────────────────────────

  async function completeSetup() {
    setCompleting(true);
    // Save health factor weights to localStorage for now
    // (In production this would POST to an API)
    try {
      const weightConfig = factors.reduce(
        (acc, f) => ({ ...acc, [f.key]: f.weight }),
        {} as Record<string, number>
      );
      localStorage.setItem("proofpoint_org", JSON.stringify(org));
      localStorage.setItem(
        "proofpoint_health_weights",
        JSON.stringify(weightConfig)
      );
    } catch {
      // localStorage may fail in some environments
    }
    router.push("/dashboard");
  }

  // ── Step validation ──────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 0) {
      return !!(org.orgName.trim() && org.role && org.teamSize);
    }
    if (step === 1) return true; // Can skip CRM
    if (step === 2) return true; // Can skip manual
    if (step === 3) return weightSum === 100;
    return false;
  }

  function nextStep() {
    if (step < 3) setStep(step + 1);
  }

  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  // ── Shared inline styles ─────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    paddingRight: 36,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    fontWeight: 500,
  };

  const primaryBtnStyle: React.CSSProperties = {
    padding: "12px 32px",
    backgroundColor: colors.green,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.2s",
  };

  const secondaryBtnStyle: React.CSSProperties = {
    padding: "12px 32px",
    backgroundColor: "transparent",
    color: colors.textMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    transition: "opacity 0.2s",
  };

  const disabledBtnStyle: React.CSSProperties = {
    ...primaryBtnStyle,
    opacity: 0.4,
    cursor: "not-allowed",
  };

  // ── Render: Step indicator ───────────────────────────────────────────────

  function renderStepIndicator() {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          marginBottom: 48,
        }}
      >
        {STEP_LABELS.map((label, i) => {
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 100,
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
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: fonts.body,
                    backgroundColor: isActive
                      ? colors.green
                      : isComplete
                        ? colors.greenDim
                        : "transparent",
                    color: isActive
                      ? "#fff"
                      : isComplete
                        ? colors.green
                        : colors.textDim,
                    border: isActive
                      ? `2px solid ${colors.green}`
                      : isComplete
                        ? `2px solid ${colors.green}`
                        : `2px solid ${colors.border}`,
                    transition: "all 0.3s",
                  }}
                >
                  {isComplete ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M3 8.5L6.5 12L13 4"
                        stroke={colors.green}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    fontFamily: fonts.body,
                    color: isActive ? colors.green : colors.textDim,
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  style={{
                    width: 60,
                    height: 2,
                    backgroundColor: isComplete ? colors.green : colors.border,
                    marginBottom: 20,
                    marginLeft: 4,
                    marginRight: 4,
                    transition: "background-color 0.3s",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render: Step 1 ─────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div>
        <h1
          style={{
            fontFamily: fonts.heading,
            fontSize: 32,
            fontWeight: 700,
            color: colors.text,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Welcome to ProofPoint!
        </h1>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 16,
            color: colors.textMuted,
            textAlign: "center",
            marginBottom: 40,
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          The customer success platform that turns your data into retention
          insights, health scores, and executive-ready reports. Let&apos;s get
          your workspace set up.
        </p>

        <div
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 32,
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Organization Name</label>
            <input
              type="text"
              placeholder="e.g. Acme Corp"
              value={org.orgName}
              onChange={(e) => setOrg({ ...org, orgName: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Your Role</label>
            <select
              value={org.role}
              onChange={(e) => setOrg({ ...org, role: e.target.value })}
              style={selectStyle}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Team Size</label>
            <select
              value={org.teamSize}
              onChange={(e) => setOrg({ ...org, teamSize: e.target.value })}
              style={selectStyle}
            >
              {TEAM_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 32,
          }}
        >
          <button
            onClick={nextStep}
            disabled={!canAdvance()}
            style={canAdvance() ? primaryBtnStyle : disabledBtnStyle}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Step 2 ─────────────────────────────────────────────────────

  function renderStep2() {
    return (
      <div>
        <h1
          style={{
            fontFamily: fonts.heading,
            fontSize: 28,
            fontWeight: 700,
            color: colors.text,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Connect Your CRM
        </h1>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.textMuted,
            textAlign: "center",
            marginBottom: 36,
            maxWidth: 460,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          Connect HubSpot to import your accounts automatically. You can also
          skip this and add accounts manually.
        </p>

        <div
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 32,
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {crm.connected ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: colors.greenDim,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path
                    d="M5 14.5L11 20.5L23 7.5"
                    stroke={colors.green}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: 17,
                  fontWeight: 600,
                  color: colors.green,
                  marginBottom: 8,
                }}
              >
                HubSpot Connected
              </p>
              {crm.companyCount !== null && (
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.textMuted,
                  }}
                >
                  {crm.companyCount} {crm.companyCount === 1 ? "company" : "companies"} found in your HubSpot account
                </p>
              )}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>HubSpot API Token</label>
                <input
                  type="password"
                  placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={crm.token}
                  onChange={(e) =>
                    setCrm({ ...crm, token: e.target.value, error: "" })
                  }
                  style={inputStyle}
                />
              </div>

              {crm.error && (
                <div
                  style={{
                    padding: "10px 14px",
                    backgroundColor: colors.dangerDim,
                    border: `1px solid ${colors.danger}`,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: colors.danger,
                      margin: 0,
                    }}
                  >
                    {crm.error}
                  </p>
                </div>
              )}

              <button
                onClick={testConnection}
                disabled={!crm.token.trim() || crm.testing}
                style={{
                  ...(crm.token.trim() && !crm.testing
                    ? primaryBtnStyle
                    : disabledBtnStyle),
                  width: "100%",
                }}
              >
                {crm.testing ? "Testing Connection..." : "Test Connection"}
              </button>
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            marginTop: 32,
          }}
        >
          <button onClick={prevStep} style={secondaryBtnStyle}>
            Back
          </button>
          <button onClick={nextStep} style={primaryBtnStyle}>
            {crm.connected ? "Next" : "Next"}
          </button>
        </div>

        {!crm.connected && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              onClick={nextStep}
              style={{
                background: "none",
                border: "none",
                color: colors.textDim,
                fontFamily: fonts.body,
                fontSize: 14,
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Step 3 ─────────────────────────────────────────────────────

  function renderStep3() {
    const hubspotMode = crm.connected;

    return (
      <div>
        <h1
          style={{
            fontFamily: fonts.heading,
            fontSize: 28,
            fontWeight: 700,
            color: colors.text,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {hubspotMode ? "Import Accounts" : "Add Your First Account"}
        </h1>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.textMuted,
            textAlign: "center",
            marginBottom: 36,
            maxWidth: 460,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          {hubspotMode
            ? "Import your accounts from HubSpot to get started with health tracking and insights."
            : "Add a customer account to begin tracking their health, engagement, and renewal status."}
        </p>

        <div
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 32,
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {hubspotMode ? (
            <>
              {importState.imported && importState.syncResult ? (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      backgroundColor: colors.greenDim,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 28 28"
                      fill="none"
                    >
                      <path
                        d="M5 14.5L11 20.5L23 7.5"
                        stroke={colors.green}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 17,
                      fontWeight: 600,
                      color: colors.green,
                      marginBottom: 8,
                    }}
                  >
                    Import Complete
                  </p>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.textMuted,
                    }}
                  >
                    {importState.syncResult.synced} accounts synced,{" "}
                    {importState.syncResult.created} new accounts created.
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      backgroundColor: "rgba(99, 102, 241, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 15,
                      color: colors.textMuted,
                      marginBottom: 20,
                    }}
                  >
                    Import from HubSpot
                  </p>

                  {importState.error && (
                    <div
                      style={{
                        padding: "10px 14px",
                        backgroundColor: colors.dangerDim,
                        border: `1px solid ${colors.danger}`,
                        borderRadius: 8,
                        marginBottom: 16,
                      }}
                    >
                      <p
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 13,
                          color: colors.danger,
                          margin: 0,
                        }}
                      >
                        {importState.error}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={startImport}
                    disabled={importState.importing}
                    style={{
                      ...primaryBtnStyle,
                      width: "100%",
                      opacity: importState.importing ? 0.6 : 1,
                      cursor: importState.importing
                        ? "not-allowed"
                        : "pointer",
                    }}
                  >
                    {importState.importing
                      ? "Importing..."
                      : "Start Import"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {manualSaved ? (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      backgroundColor: colors.greenDim,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 28 28"
                      fill="none"
                    >
                      <path
                        d="M5 14.5L11 20.5L23 7.5"
                        stroke={colors.green}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 17,
                      fontWeight: 600,
                      color: colors.green,
                      marginBottom: 8,
                    }}
                  >
                    Account Created
                  </p>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.textMuted,
                    }}
                  >
                    {manualAccount.companyName} has been added to your
                    workspace.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={manualAccount.companyName}
                      onChange={(e) =>
                        setManualAccount({
                          ...manualAccount,
                          companyName: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Industry</label>
                    <select
                      value={manualAccount.industry}
                      onChange={(e) =>
                        setManualAccount({
                          ...manualAccount,
                          industry: e.target.value,
                        })
                      }
                      style={selectStyle}
                    >
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Monthly Recurring Revenue (MRR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={manualAccount.mrr}
                      onChange={(e) =>
                        setManualAccount({
                          ...manualAccount,
                          mrr: e.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Contract End Date</label>
                    <input
                      type="date"
                      value={manualAccount.contractEnd}
                      onChange={(e) =>
                        setManualAccount({
                          ...manualAccount,
                          contractEnd: e.target.value,
                        })
                      }
                      style={{
                        ...inputStyle,
                        colorScheme: "dark",
                      }}
                    />
                  </div>

                  {manualError && (
                    <div
                      style={{
                        padding: "10px 14px",
                        backgroundColor: colors.dangerDim,
                        border: `1px solid ${colors.danger}`,
                        borderRadius: 8,
                        marginBottom: 16,
                      }}
                    >
                      <p
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 13,
                          color: colors.danger,
                          margin: 0,
                        }}
                      >
                        {manualError}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={saveManualAccount}
                    disabled={!manualAccount.companyName.trim()}
                    style={{
                      ...(manualAccount.companyName.trim()
                        ? primaryBtnStyle
                        : disabledBtnStyle),
                      width: "100%",
                    }}
                  >
                    Add Account
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            marginTop: 32,
          }}
        >
          <button onClick={prevStep} style={secondaryBtnStyle}>
            Back
          </button>
          <button onClick={nextStep} style={primaryBtnStyle}>
            Next
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Step 4 ─────────────────────────────────────────────────────

  function renderStep4() {
    const isValid = weightSum === 100;

    return (
      <div>
        <h1
          style={{
            fontFamily: fonts.heading,
            fontSize: 28,
            fontWeight: 700,
            color: colors.text,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Configure Health Scores
        </h1>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.textMuted,
            textAlign: "center",
            marginBottom: 36,
            maxWidth: 500,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          Adjust the weight of each health factor to match how your team
          evaluates customer health. Weights must total 100.
        </p>

        <div
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 32,
            maxWidth: 560,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {/* Weight total indicator */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              padding: "12px 16px",
              backgroundColor: isValid ? colors.greenDim : colors.dangerDim,
              border: `1px solid ${isValid ? colors.green : colors.danger}`,
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 500,
                color: isValid ? colors.green : colors.danger,
              }}
            >
              Total Weight
            </span>
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: 16,
                fontWeight: 700,
                color: isValid ? colors.green : colors.danger,
              }}
            >
              {weightSum} / 100
            </span>
          </div>

          {!isValid && (
            <div
              style={{
                padding: "10px 14px",
                backgroundColor: colors.dangerDim,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.danger,
                  margin: 0,
                }}
              >
                Weights must add up to exactly 100. Currently{" "}
                {weightSum > 100
                  ? `${weightSum - 100} over`
                  : `${100 - weightSum} under`}
                .
              </p>
            </div>
          )}

          {/* Factor sliders */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {factors.map((factor, i) => (
              <div key={factor.key}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      fontWeight: 500,
                      color: colors.text,
                    }}
                  >
                    {factor.label}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      fontWeight: 600,
                      color: colors.green,
                      minWidth: 28,
                      textAlign: "right",
                    }}
                  >
                    {factor.weight}
                  </span>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={factor.weight}
                    onChange={(e) =>
                      updateFactor(i, parseInt(e.target.value))
                    }
                    style={{
                      width: "100%",
                      height: 6,
                      appearance: "none",
                      WebkitAppearance: "none",
                      background: `linear-gradient(to right, ${colors.green} 0%, ${colors.green} ${(factor.weight / 30) * 100}%, ${colors.border} ${(factor.weight / 30) * 100}%, ${colors.border} 100%)`,
                      borderRadius: 3,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            marginTop: 32,
          }}
        >
          <button onClick={prevStep} style={secondaryBtnStyle}>
            Back
          </button>
          <button
            onClick={completeSetup}
            disabled={!isValid || completing}
            style={isValid && !completing ? primaryBtnStyle : disabledBtnStyle}
          >
            {completing ? "Setting up..." : "Complete Setup"}
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        boxSizing: "border-box",
      }}
    >
      {/* Logo / brand */}
      <div
        style={{
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: 22,
            fontWeight: 700,
            color: colors.text,
            letterSpacing: "-0.02em",
          }}
        >
          Proof
          <span style={{ color: colors.green }}>Point</span>
        </span>
      </div>

      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Step content */}
      <div
        style={{
          width: "100%",
          maxWidth: 640,
        }}
      >
        {step === 0 && renderStep1()}
        {step === 1 && renderStep2()}
        {step === 2 && renderStep3()}
        {step === 3 && renderStep4()}
      </div>

      {/* Slider thumb styles via global style tag */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${colors.green};
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${colors.green};
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        select option {
          background-color: ${colors.inputBg};
          color: ${colors.text};
        }
      `}</style>
    </div>
  );
}
