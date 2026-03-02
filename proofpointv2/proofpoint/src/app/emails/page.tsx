"use client";

import { useState, useEffect, useCallback } from "react";
import { Nav, PageWrapper } from "@/components/Nav";

// ── Types ─────────────────────────────────────────────────────────────────────

type EmailTemplate = {
  id: string;
  name: string;
  category: string | null;
  subject_template: string | null;
  body_template: string | null;
  is_system: boolean;
  created_at: string;
};

type Account = {
  id: string;
  company_name: string;
  industry: string | null;
  health_score: number;
  mrr: number;
};

type GeneratedEmail = {
  subject: string;
  body: string;
  template_name: string;
  ai_enhanced: boolean;
};

type CSS = React.CSSProperties;

// ── Constants ─────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "check-in":   { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  "qbr-invite": { bg: "rgba(139,92,246,0.12)",  text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  "renewal":    { bg: "rgba(245,158,11,0.12)",   text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  "at-risk":    { bg: "rgba(239,68,68,0.12)",    text: "#f87171", border: "rgba(239,68,68,0.25)" },
  "expansion":  { bg: "rgba(16,185,129,0.12)",   text: "#34d399", border: "rgba(16,185,129,0.25)" },
  "onboarding": { bg: "rgba(6,182,212,0.12)",    text: "#22d3ee", border: "rgba(6,182,212,0.25)" },
  "thank-you":  { bg: "rgba(16,185,129,0.15)",   text: "#6ee7b7", border: "rgba(16,185,129,0.3)" },
  "escalation": { bg: "rgba(249,115,22,0.12)",   text: "#fb923c", border: "rgba(249,115,22,0.25)" },
};

const CAT_LABELS: Record<string, string> = {
  "check-in": "Check-in", "qbr-invite": "QBR Invite", "renewal": "Renewal",
  "at-risk": "At Risk", "expansion": "Expansion", "onboarding": "Onboarding",
  "thank-you": "Thank You", "escalation": "Escalation",
};

const font = "'DM Sans', sans-serif";
const headFont = "'Playfair Display', serif";

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, CSS> = {
  container:    { maxWidth: 1200, margin: "0 auto", padding: "40px 24px" },
  heading:      { fontSize: 28, fontWeight: 700, color: "#f1f5f9", fontFamily: headFont, marginBottom: 4 },
  sub:          { fontSize: 14, color: "#64748b", fontFamily: font, marginBottom: 32 },
  secTitle:     { fontSize: 18, fontWeight: 600, color: "#f1f5f9", fontFamily: headFont, marginBottom: 16 },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 16 },
  card:         { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10, padding: "20px",
                  display: "flex", flexDirection: "column", gap: 12,
                  transition: "border-color 0.2s, box-shadow 0.2s", cursor: "pointer" },
  cardHover:    { borderColor: "#10b981",
                  boxShadow: "0 0 0 1px rgba(16,185,129,0.15), 0 4px 20px rgba(0,0,0,0.3)" },
  badge:        { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20,
                  fontSize: 11, fontWeight: 600, fontFamily: font, letterSpacing: "0.02em" },
  sysBadge:     { display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 20,
                  fontSize: 10, fontWeight: 600, fontFamily: font, letterSpacing: "0.04em",
                  textTransform: "uppercase", background: "rgba(100,116,139,0.15)",
                  color: "#94a3b8", border: "1px solid rgba(100,116,139,0.2)" },
  tplName:      { fontSize: 15, fontWeight: 600, color: "#f1f5f9", fontFamily: font },
  tplDesc:      { fontSize: 13, color: "#64748b", fontFamily: font, lineHeight: 1.5, flex: 1 },
  btn:          { background: "#10b981", color: "#fff", border: "none", borderRadius: 6,
                  padding: "8px 16px", fontSize: 13, fontWeight: 600, fontFamily: font,
                  cursor: "pointer", transition: "background 0.15s" },
  btnOut:       { background: "transparent", color: "#94a3b8", border: "1px solid #1e293b",
                  borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  fontFamily: font, cursor: "pointer", transition: "all 0.15s" },
  btnSec:       { background: "rgba(16,185,129,0.1)", color: "#10b981",
                  border: "1px solid rgba(16,185,129,0.25)", borderRadius: 6,
                  padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  fontFamily: font, cursor: "pointer", transition: "all 0.15s" },
  input:        { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6,
                  padding: "10px 14px", color: "#f1f5f9", fontSize: 13, fontFamily: font,
                  outline: "none", width: "100%", boxSizing: "border-box",
                  transition: "border-color 0.15s" },
  select:       { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6,
                  padding: "10px 14px", color: "#f1f5f9", fontSize: 13, fontFamily: font,
                  outline: "none", width: "100%", boxSizing: "border-box",
                  cursor: "pointer", appearance: "none" },
  textarea:     { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6,
                  padding: "12px 14px", color: "#f1f5f9", fontSize: 13, fontFamily: font,
                  outline: "none", width: "100%", boxSizing: "border-box",
                  resize: "vertical", minHeight: 180, lineHeight: 1.6,
                  transition: "border-color 0.15s" },
  label:        { fontSize: 12, color: "#94a3b8", fontWeight: 600, fontFamily: font,
                  marginBottom: 6, display: "block", textTransform: "uppercase",
                  letterSpacing: "0.04em" },
  panel:        { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10, padding: "28px" },
  previewPanel: { background: "#0f1d32", border: "1px solid #1e293b", borderRadius: 10,
                  padding: "28px", marginTop: 20 },
  prevSubj:     { fontSize: 16, fontWeight: 600, color: "#f1f5f9", fontFamily: font,
                  marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #1e293b" },
  prevBody:     { fontSize: 14, color: "#cbd5e1", fontFamily: font, lineHeight: 1.7,
                  whiteSpace: "pre-wrap" },
  loadWrap:     { display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "80px 0", flexDirection: "column", gap: 16 },
  spinner:      { width: 32, height: 32, border: "3px solid #1e293b",
                  borderTop: "3px solid #10b981", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite" },
  errBox:       { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8, padding: "16px 20px", color: "#f87171", fontSize: 13,
                  fontFamily: font, display: "flex", alignItems: "center", gap: 10 },
  toast:        { position: "fixed", bottom: 24, right: 24, background: "#10b981",
                  color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 13,
                  fontWeight: 600, fontFamily: font,
                  boxShadow: "0 4px 20px rgba(16,185,129,0.3)", zIndex: 1000 },
  aiTag:        { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
                  borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: font,
                  background: "rgba(139,92,246,0.12)", color: "#a78bfa",
                  border: "1px solid rgba(139,92,246,0.25)" },
  fieldGrp:     { display: "flex", flexDirection: "column", gap: 6 },
  twoCol:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  empty:        { textAlign: "center", padding: "60px 20px", color: "#64748b",
                  fontSize: 14, fontFamily: font },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCatStyle(cat: string | null): CSS {
  const c = CAT_COLORS[cat ?? ""];
  if (!c) return { background: "rgba(100,116,139,0.12)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.2)" };
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` };
}

function getCatLabel(cat: string | null): string {
  return CAT_LABELS[cat ?? ""] ?? (cat ?? "General");
}

function trunc(text: string | null, max: number): string {
  if (!text) return "No description available";
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "...";
}

const focusBorder = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = "#10b981"; };
const blurBorder  = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = "#1e293b"; };
const hoverOut    = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#f1f5f9"; };
const leaveOut    = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; };

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [loadingAcct, setLoadingAcct] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  const [selTpl, setSelTpl] = useState<EmailTemplate | null>(null);
  const [acctId, setAcctId] = useState("");
  const [csmName, setCsmName] = useState("");
  const [contactName, setContactName] = useState("");
  const [aiEnhance, setAiEnhance] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [genEmail, setGenEmail] = useState<GeneratedEmail | null>(null);
  const [editSubj, setEditSubj] = useState("");
  const [editBody, setEditBody] = useState("");

  const [hovered, setHovered] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    setLoadingTpl(true);
    setFetchErr(null);
    fetch("/api/emails/templates")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load templates (${r.status})`);
        return r.json();
      })
      .then((d) => { setTemplates(Array.isArray(d) ? d : []); setLoadingTpl(false); })
      .catch((e) => { setFetchErr(e.message || "Failed to load email templates"); setLoadingTpl(false); });
  }, []);

  // Fetch accounts when template selected
  useEffect(() => {
    if (!selTpl) return;
    setLoadingAcct(true);
    fetch("/api/accounts")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load accounts (${r.status})`);
        return r.json();
      })
      .then((d) => { setAccounts(Array.isArray(d) ? d : []); setLoadingAcct(false); })
      .catch(() => { setAccounts([]); setLoadingAcct(false); });
  }, [selTpl]);

  const resetForm = useCallback(() => {
    setAcctId(""); setCsmName(""); setContactName(""); setAiEnhance(false);
    setGenEmail(null); setGenErr(null); setEditSubj(""); setEditBody("");
  }, []);

  const selectTemplate = useCallback((t: EmailTemplate) => { setSelTpl(t); resetForm(); }, [resetForm]);
  const backToTemplates = useCallback(() => { setSelTpl(null); resetForm(); }, [resetForm]);

  const handleGenerate = useCallback(async () => {
    if (!selTpl || !acctId) return;
    setGenerating(true); setGenErr(null); setGenEmail(null);
    try {
      const payload: Record<string, unknown> = { template_id: selTpl.id, account_id: acctId };
      if (csmName.trim()) payload.csm_name = csmName.trim();
      if (contactName.trim()) payload.contact_name = contactName.trim();
      if (aiEnhance) payload.ai_enhance = true;

      const res = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const ed = await res.json().catch(() => null);
        throw new Error(ed?.error || `Generation failed (${res.status})`);
      }
      const data: GeneratedEmail = await res.json();
      setGenEmail(data); setEditSubj(data.subject); setEditBody(data.body);
    } catch (err: unknown) {
      setGenErr(err instanceof Error ? err.message : "Failed to generate email");
    } finally { setGenerating(false); }
  }, [selTpl, acctId, csmName, contactName, aiEnhance]);

  const copyText = useCallback(async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setToast(`${label} copied to clipboard`); }
    catch { setToast("Copy failed - please copy manually"); }
    setTimeout(() => setToast(null), 2500);
  }, []);

  const copySubj = useCallback(() => copyText(editSubj, "Subject"), [editSubj, copyText]);
  const copyBody = useCallback(() => copyText(editBody, "Body"), [editBody, copyText]);
  const copyAll  = useCallback(() => copyText(`Subject: ${editSubj}\n\n${editBody}`, "Full email"), [editSubj, editBody, copyText]);

  const spinCSS = <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>;

  // ── Loading state ──
  if (loadingTpl) {
    return (
      <>
        <Nav />
        <PageWrapper>
          <div style={S.container}>
            <div style={S.loadWrap}>
              <div style={S.spinner} />
              <span style={{ color: "#64748b", fontSize: 14, fontFamily: font }}>
                Loading email templates...
              </span>
            </div>
          </div>
          {spinCSS}
        </PageWrapper>
      </>
    );
  }

  // ── Error state ──
  if (fetchErr) {
    return (
      <>
        <Nav />
        <PageWrapper>
          <div style={S.container}>
            <h1 style={S.heading}>Email Templates</h1>
            <p style={S.sub}>Generate personalized emails from your template library</p>
            <div style={S.errBox}>
              <span style={{ fontSize: 18 }}>!</span>
              <span>{fetchErr}</span>
            </div>
            <button style={{ ...S.btnOut, marginTop: 16 }} onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </PageWrapper>
      </>
    );
  }

  // ── Composer view (template selected) ──
  if (selTpl) {
    const selAcct = accounts.find((a) => a.id === acctId);
    const canGen = !!acctId;

    return (
      <>
        <Nav />
        <PageWrapper>
          <div style={S.container}>
            {/* Header bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <button style={S.btnOut} onClick={backToTemplates}
                onMouseEnter={hoverOut} onMouseLeave={leaveOut}>
                Back to Templates
              </button>
              <div style={{ flex: 1 }} />
              <div style={{ ...S.badge, ...getCatStyle(selTpl.category) }}>
                {getCatLabel(selTpl.category)}
              </div>
              {selTpl.is_system && <span style={S.sysBadge}>System</span>}
            </div>

            <h1 style={{ ...S.heading, marginBottom: 4 }}>{selTpl.name}</h1>
            <p style={{ ...S.sub, marginBottom: 28 }}>
              Configure and generate a personalized email from this template
            </p>

            {/* Composer Form */}
            <div style={S.panel}>
              <h3 style={{ ...S.secTitle, marginBottom: 20, fontSize: 16 }}>Compose Email</h3>

              {/* Account selector */}
              <div style={{ ...S.fieldGrp, marginBottom: 16 }}>
                <label style={S.label}>Account *</label>
                {loadingAcct ? (
                  <div style={{ color: "#64748b", fontSize: 13, fontFamily: font, padding: "10px 0" }}>
                    Loading accounts...
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <select style={S.select} value={acctId}
                      onChange={(e) => setAcctId(e.target.value)}
                      onFocus={focusBorder} onBlur={blurBorder}>
                      <option value="">Select an account...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.company_name}{a.industry ? ` (${a.industry})` : ""} - Health: {a.health_score}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      pointerEvents: "none", color: "#64748b", fontSize: 10 }}>&#9662;</span>
                  </div>
                )}
                {selAcct && (
                  <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 12, color: "#64748b", fontFamily: font }}>
                    <span>Health:{" "}
                      <span style={{ color: selAcct.health_score >= 70 ? "#34d399" : selAcct.health_score >= 40 ? "#fbbf24" : "#f87171" }}>
                        {selAcct.health_score}
                      </span>
                    </span>
                    <span>MRR: <span style={{ color: "#f1f5f9" }}>${selAcct.mrr.toLocaleString()}</span></span>
                    {selAcct.industry && (
                      <span>Industry: <span style={{ color: "#f1f5f9" }}>{selAcct.industry}</span></span>
                    )}
                  </div>
                )}
              </div>

              {/* CSM Name + Contact Name */}
              <div style={{ ...S.twoCol, marginBottom: 16 }}>
                <div style={S.fieldGrp}>
                  <label style={S.label}>CSM Name</label>
                  <input style={S.input} type="text" placeholder="Your name (optional)"
                    value={csmName} onChange={(e) => setCsmName(e.target.value)}
                    onFocus={focusBorder} onBlur={blurBorder} />
                </div>
                <div style={S.fieldGrp}>
                  <label style={S.label}>Contact Name</label>
                  <input style={S.input} type="text" placeholder="Recipient name override (optional)"
                    value={contactName} onChange={(e) => setContactName(e.target.value)}
                    onFocus={focusBorder} onBlur={blurBorder} />
                </div>
              </div>

              {/* AI Enhance toggle */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                  onClick={() => setAiEnhance(!aiEnhance)}>
                  <input type="checkbox" checked={aiEnhance}
                    style={{ width: 16, height: 16, accentColor: "#10b981", cursor: "pointer" }}
                    onChange={(e) => setAiEnhance(e.target.checked)} />
                  <span style={{ fontSize: 13, fontFamily: font, fontWeight: 500,
                    color: aiEnhance ? "#a78bfa" : "#94a3b8", transition: "color 0.15s" }}>
                    AI Enhance
                  </span>
                  {aiEnhance && <span style={S.aiTag}>AI</span>}
                </label>
                <p style={{ fontSize: 12, color: "#64748b", fontFamily: font, marginTop: 4, marginLeft: 26 }}>
                  Use AI to refine tone and personalize content based on account context
                </p>
              </div>

              {/* Generate button */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  style={{ ...S.btn, opacity: canGen && !generating ? 1 : 0.5,
                    cursor: canGen && !generating ? "pointer" : "not-allowed",
                    padding: "10px 24px", fontSize: 14 }}
                  disabled={!canGen || generating} onClick={handleGenerate}
                  onMouseEnter={(e) => { if (canGen && !generating) e.currentTarget.style.background = "#059669"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#10b981"; }}>
                  {generating ? "Generating..." : "Generate Email"}
                </button>
                {!acctId && (
                  <span style={{ fontSize: 12, color: "#64748b", fontFamily: font }}>
                    Select an account to generate
                  </span>
                )}
              </div>

              {genErr && (
                <div style={{ ...S.errBox, marginTop: 16 }}>
                  <span style={{ fontSize: 18 }}>!</span><span>{genErr}</span>
                </div>
              )}
            </div>

            {/* Generating spinner */}
            {generating && (
              <div style={{ ...S.loadWrap, padding: "40px 0" }}>
                <div style={S.spinner} />
                <span style={{ color: "#64748b", fontSize: 13, fontFamily: font }}>
                  {aiEnhance ? "AI is crafting your personalized email..." : "Generating email from template..."}
                </span>
              </div>
            )}

            {/* Generated email: editable + preview */}
            {genEmail && !generating && (
              <>
                {/* Editable fields panel */}
                <div style={{ ...S.panel, marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ ...S.secTitle, marginBottom: 0, fontSize: 16 }}>Generated Email</h3>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {genEmail.ai_enhanced && <span style={S.aiTag}>AI Enhanced</span>}
                      <span style={{ fontSize: 12, color: "#64748b", fontFamily: font }}>
                        Template: {genEmail.template_name}
                      </span>
                    </div>
                  </div>

                  {/* Editable subject */}
                  <div style={{ ...S.fieldGrp, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={S.label}>Subject Line</label>
                      <button style={{ ...S.btnSec, padding: "4px 10px", fontSize: 11 }} onClick={copySubj}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}>
                        Copy Subject
                      </button>
                    </div>
                    <input style={S.input} type="text" value={editSubj}
                      onChange={(e) => setEditSubj(e.target.value)}
                      onFocus={focusBorder} onBlur={blurBorder} />
                  </div>

                  {/* Editable body */}
                  <div style={{ ...S.fieldGrp, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={S.label}>Email Body</label>
                      <button style={{ ...S.btnSec, padding: "4px 10px", fontSize: 11 }} onClick={copyBody}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}>
                        Copy Body
                      </button>
                    </div>
                    <textarea style={S.textarea} value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      onFocus={focusBorder} onBlur={blurBorder} />
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={{ ...S.btn, padding: "10px 20px" }} onClick={copyAll}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#10b981"; }}>
                      Copy Full Email
                    </button>
                    <button style={S.btnOut} onClick={handleGenerate}
                      onMouseEnter={hoverOut} onMouseLeave={leaveOut}>
                      Regenerate
                    </button>
                  </div>
                </div>

                {/* Preview Panel */}
                <div style={S.previewPanel}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h3 style={{ ...S.secTitle, marginBottom: 0, fontSize: 16 }}>Preview</h3>
                    <span style={{ fontSize: 11, color: "#64748b", fontFamily: font,
                      textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                      Live preview
                    </span>
                  </div>
                  <div style={{ background: "#0a1628", borderRadius: 8, border: "1px solid #1e293b", overflow: "hidden" }}>
                    {/* Sender header */}
                    <div style={{ background: "#0f1d32", padding: "12px 20px", borderBottom: "1px solid #1e293b",
                      display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(16,185,129,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, color: "#10b981", fontWeight: 700, fontFamily: font }}>
                        {(csmName || "CS").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600, fontFamily: font }}>
                          {csmName || "CSM"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", fontFamily: font }}>
                          To: {contactName || (selAcct ? selAcct.company_name : "Contact")}
                        </div>
                      </div>
                    </div>
                    {/* Subject row */}
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b" }}>
                      <div style={S.prevSubj}>{editSubj || "(No subject)"}</div>
                    </div>
                    {/* Body */}
                    <div style={{ padding: "20px" }}>
                      <div style={S.prevBody}>{editBody || "(No body content)"}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {toast && <div style={S.toast}>{toast}</div>}
          {spinCSS}
        </PageWrapper>
      </>
    );
  }

  // ── Template library (default view) ──
  return (
    <>
      <Nav />
      <PageWrapper>
        <div style={S.container}>
          <h1 style={S.heading}>Email Templates</h1>
          <p style={S.sub}>
            Select a template to generate personalized customer emails.{" "}
            {templates.length} template{templates.length !== 1 ? "s" : ""} available.
          </p>

          {templates.length === 0 && (
            <div style={S.empty}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>&#9993;</div>
              <p style={{ fontSize: 15, color: "#94a3b8", marginBottom: 4 }}>No email templates found</p>
              <p style={{ fontSize: 13 }}>
                Email templates will appear here once they are configured in the system.
              </p>
            </div>
          )}

          {templates.length > 0 && (
            <div style={S.grid}>
              {templates.map((tpl) => {
                const isHov = hovered === tpl.id;
                const cs = getCatStyle(tpl.category);
                return (
                  <div key={tpl.id} style={{ ...S.card, ...(isHov ? S.cardHover : {}) }}
                    onMouseEnter={() => setHovered(tpl.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => selectTemplate(tpl)}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectTemplate(tpl); }
                    }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ ...S.badge, ...cs }}>{getCatLabel(tpl.category)}</span>
                      {tpl.is_system && <span style={S.sysBadge}>System</span>}
                    </div>
                    <div style={S.tplName}>{tpl.name}</div>
                    <div style={S.tplDesc}>{trunc(tpl.body_template, 100)}</div>
                    <button style={{ ...S.btnSec, width: "100%", textAlign: "center" as const,
                      ...(isHov ? { background: "rgba(16,185,129,0.2)", borderColor: "rgba(16,185,129,0.4)" } : {}) }}
                      onClick={(e) => { e.stopPropagation(); selectTemplate(tpl); }}>
                      Use Template
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {toast && <div style={S.toast}>{toast}</div>}
        {spinCSS}
      </PageWrapper>
    </>
  );
}
