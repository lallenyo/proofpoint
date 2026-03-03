"use client";

import { useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";

const T = {
  green: "#10b981", greenDim: "#064e3b", greenLight: "#34d399",
  bg: "#050b18", surface: "#0a1628", surface2: "#0f172a",
  border: "#1e293b", text: "#f1f5f9", muted: "#64748b", subtle: "#94a3b8",
  purple: "#8b5cf6", warning: "#f59e0b", info: "#06b6d4",
};

const TOOLS = [
  { icon: "📊", title: "Custom Dashboard", desc: "Configurable widgets with auto-refresh, team leaderboards, and revenue charts" },
  { icon: "🗂", title: "Account Portfolio", desc: "Full CRUD with CSV import, 8 lifecycle statuses, team assignment, and search" },
  { icon: "❤️", title: "Health Score Engine", desc: "AI-powered scoring with configurable signal weights and trend analysis" },
  { icon: "⚡", title: "Playbook Automation", desc: "6 pre-built templates with trigger-action workflows and execution simulation" },
  { icon: "🎙", title: "Meeting Intelligence", desc: "Transcript analysis, sentiment detection, action item extraction" },
  { icon: "📋", title: "NPS / CSAT Surveys", desc: "Multi-language surveys with score histograms and trend analysis" },
  { icon: "👥", title: "Stakeholder Mapping", desc: "Visual relationship graph with AI-powered sentiment and influence analysis" },
  { icon: "📈", title: "QBR Deck Generator", desc: "Automated quarterly business review decks with data aggregation" },
  { icon: "✉️", title: "Email Center", desc: "8 AI templates, 4 tones, SendGrid delivery with open/click tracking" },
  { icon: "✦", title: "ROI Report Generator", desc: "5 industries × 3 formats with benchmark citations and scorecard" },
  { icon: "🎯", title: "Next Action Intelligence", desc: "AI-driven recommendations that explain what actions change outcomes" },
  { icon: "💰", title: "CS ROI Calculator", desc: "VP/Director-level program justification with before/after projections" },
  { icon: "🔗", title: "CRM Integration Hub", desc: "Bi-directional sync with HubSpot, Salesforce, and Stripe" },
  { icon: "⚠️", title: "Churn Prediction AI", desc: "ML-powered risk scoring with early warning indicators and playbooks" },
  { icon: "✅", title: "Success Plans", desc: "Collaborative goal tracking with milestones, owners, and progress bars" },
  { icon: "🕐", title: "Activity Timeline", desc: "Unified timeline of emails, calls, meetings, notes, and health changes" },
  { icon: "📊", title: "Renewal Pipeline", desc: "Kanban and list views with forecasting and stage-based automation" },
  { icon: "🔄", title: "Lifecycle Tracker", desc: "Visualize customer journey from onboarding to expansion" },
  { icon: "👥", title: "Team Performance", desc: "CSM leaderboards, book-of-business metrics, and coaching insights" },
  { icon: "💵", title: "Revenue Dashboard", desc: "MRR/ARR tracking, cohort analysis, and expansion revenue insights" },
  { icon: "🔔", title: "Smart Alerts", desc: "AI-powered anomaly detection with configurable thresholds and routing" },
  { icon: "🌐", title: "Customer 360", desc: "Unified view of every data point for any account in one screen" },
  { icon: "⚙️", title: "Admin Panel", desc: "User management, org settings, API keys, and audit logs" },
];

export default function LandingPage() {
  const [hoveredTool, setHoveredTool] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { isSignedIn } = useUser();

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubmitting(true);
    try {
      await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source: "landing-page" }) });
      setSubmitted(true);
    } catch { setSubmitted(true); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif", minHeight: "100vh" }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(5,11,24,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(30,41,59,0.5)",
      }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22 }}>
          Proof<span style={{ color: T.green }}>point</span>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a href="#features" style={{ fontSize: 13.5, color: T.muted, textDecoration: "none", fontWeight: 500 }}>Features</a>
          <a href="#pricing" style={{ fontSize: 13.5, color: T.muted, textDecoration: "none", fontWeight: 500 }}>Pricing</a>
          <Link href="/blog" style={{ fontSize: 13.5, color: T.muted, textDecoration: "none", fontWeight: 500 }}>Blog</Link>
          {isSignedIn ? (
            <Link href="/dashboard">
              <button style={{ background: T.green, color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Go to Dashboard →
              </button>
            </Link>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <SignInButton mode="modal">
                <button style={{ background: "transparent", color: T.subtle, border: `1px solid ${T.border}`, padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Log In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button style={{ background: T.green, color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 0 20px rgba(16,185,129,0.25)" }}>Start Free Trial</button>
              </SignUpButton>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        position: "relative", minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "120px 24px 80px", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: 900, height: 500,
          background: "radial-gradient(ellipse at center, rgba(16,185,129,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            display: "inline-block", padding: "6px 16px", borderRadius: 20,
            border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)",
            fontSize: 12, fontWeight: 600, color: T.green, marginBottom: 28, letterSpacing: "0.04em",
          }}>
            ✦ AI-Powered Customer Success Intelligence
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(42px, 6vw, 56px)", lineHeight: 1.15, marginBottom: 22,
          }}>
            Turn Customer Metrics Into{" "}
            <em style={{ fontStyle: "italic", color: T.green }}>Undeniable</em> ROI Proof
          </h1>
          <p style={{ fontSize: 17, color: T.muted, lineHeight: 1.7, maxWidth: 560, margin: "0 auto 36px" }}>
            Proofpoint generates executive-ready ROI reports with industry benchmarks,
            AI-driven next actions, and customer-facing proof documents that make renewals effortless.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            {isSignedIn ? (
              <Link href="/dashboard">
                <button style={{ background: T.green, color: "#fff", border: "none", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 30px rgba(16,185,129,0.3)" }}>
                  Open Dashboard →
                </button>
              </Link>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button style={{ background: T.green, color: "#fff", border: "none", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 30px rgba(16,185,129,0.3)" }}>
                    Start 30-Day Free Trial
                  </button>
                </SignUpButton>
                <Link href="/demo">
                  <button style={{ background: "transparent", color: T.text, border: `1px solid ${T.border}`, padding: "16px 28px", borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
                    Try Sandbox →
                  </button>
                </Link>
              </>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#334155", marginTop: 14 }}>No credit card required · 30-day trial · Cancel anytime</p>
        </div>
      </section>

      {/* ── Social Proof ─────────────────────────────────────────── */}
      <section style={{ padding: "20px 40px", borderTop: `1px solid ${T.border}22`, borderBottom: `1px solid ${T.border}22`, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
          Trusted by Customer Success teams at innovative SaaS companies
        </div>
      </section>

      {/* ── 23 Tools Grid ────────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 34px)", fontWeight: 700, marginBottom: 14 }}>
            23 Tools, One <span style={{ color: T.green }}>Platform</span>
          </h2>
          <p style={{ fontSize: 15, color: T.muted, maxWidth: 500, margin: "0 auto" }}>
            Everything a Customer Success team needs to prove value, prevent churn, and drive expansion.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {TOOLS.map((f, i) => (
            <div key={i}
              onMouseEnter={() => setHoveredTool(i)}
              onMouseLeave={() => setHoveredTool(null)}
              style={{
                background: hoveredTool === i ? T.surface2 : T.surface,
                border: `1px solid ${hoveredTool === i ? T.green + "33" : T.border}`,
                borderRadius: 12, padding: "22px 20px", transition: "all 0.2s", cursor: "default",
              }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section style={{ padding: "80px 40px", background: T.surface, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 34px)", fontWeight: 700, marginBottom: 50 }}>
            How It <span style={{ color: T.green }}>Works</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40 }}>
            {[
              { step: "01", title: "Connect Your Data", desc: "Import accounts via CSV or connect your CRM. The onboarding wizard maps your fields automatically." },
              { step: "02", title: "Generate AI Reports", desc: "Choose an industry, input metrics, and get benchmark-driven ROI narratives your champions can forward to their CFO." },
              { step: "03", title: "Act on Intelligence", desc: "Next Action recommendations tell you exactly what to do — and why it will change the outcome." },
            ].map(s => (
              <div key={s.step}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                  fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: T.green,
                }}>{s.step}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}>
        <p style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: T.green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Early Feedback</p>
        <h2 style={{ textAlign: "center", fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 34px)", marginBottom: 48 }}>What CS teams are saying</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { quote: "I used to spend half my Friday writing the QBR narrative. Now I spend 30 seconds and the output is honestly better than what I was writing myself.", name: "Sarah R.", title: "Senior CSM, HR Tech SaaS", initials: "SR" },
            { quote: "Our CFO actually read the whole thing. That has never happened before. The way it connects our numbers to their business goals is exactly the language executives respond to.", name: "Marcus K.", title: "VP Customer Success, Fintech", initials: "MK" },
            { quote: "We have 200 customers. Writing personalized ROI reports for all of them was impossible. Proofpoint changed that math completely.", name: "Jamie L.", title: "Director of CS, Healthcare SaaS", initials: "JL" },
          ].map(({ quote, name, title, initials }) => (
            <div key={name} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28 }}>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "#cbd5e1", marginBottom: 20 }}>&ldquo;{quote}&rdquo;</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.green }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "80px 40px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 34px)", fontWeight: 700, marginBottom: 14 }}>
            Simple <span style={{ color: T.green }}>Pricing</span>
          </h2>
          <p style={{ fontSize: 15, color: T.muted, marginBottom: 20 }}>Start free. Upgrade when you&apos;re ready.</p>
          <div style={{ display: "inline-flex", background: T.surface2, borderRadius: 8, border: `1px solid ${T.border}`, padding: 2 }}>
            {[false, true].map(annual => (
              <button key={annual ? "a" : "m"} onClick={() => setIsAnnual(annual)} style={{
                background: isAnnual === annual ? T.green : "transparent", border: "none",
                borderRadius: 6, padding: "7px 18px", fontSize: 12.5,
                fontWeight: isAnnual === annual ? 600 : 400,
                color: isAnnual === annual ? "#fff" : T.muted,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>{annual ? "Annual (save 15%)" : "Monthly"}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          {[
            { plan: "Starter", price: isAnnual ? 33 : 39, desc: "For individual CSMs", seats: "1–5 seats", accounts: "100 accounts", ai: "500 actions/seat/mo", model: "Haiku (Fast)", features: ["Health scoring (basic)", "3 playbook templates", "3 email templates", "ROI calculator", "Report generator", "Activity timeline"], cta: "Start Free Trial", featured: false },
            { plan: "Growth", price: isAnnual ? 67 : 79, desc: "For growing CS teams", seats: "5–15 seats", accounts: "300 accounts", ai: "1,000 actions/seat/mo", model: "Sonnet (Balanced)", features: ["Everything in Starter", "Meeting intelligence", "NPS/CSAT surveys", "QBR deck generation", "Churn prediction AI", "CRM integrations", "Team performance", "Revenue dashboard"], cta: "Start Free Trial", featured: true },
            { plan: "Scale", price: isAnnual ? 99 : 119, desc: "For enterprise CS orgs", seats: "10–25+ seats", accounts: "Unlimited", ai: "2,000 actions/seat/mo", model: "Opus (Premium)", features: ["Everything in Growth", "AI agents", "Coaching analytics", "API access", "Dedicated CSM", "Custom integrations"], cta: "Start Free Trial", featured: false },
          ].map(p => (
            <div key={p.plan} style={{
              background: p.featured ? T.surface2 : T.surface,
              border: `1px solid ${p.featured ? T.green + "44" : T.border}`,
              borderRadius: 16, padding: "28px 24px", position: "relative",
            }}>
              {p.featured && <div style={{ position: "absolute", top: -10, right: 20, padding: "4px 12px", borderRadius: 6, background: T.green, color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Most Popular</div>}
              <div style={{ fontSize: 14, fontWeight: 600, color: T.green, marginBottom: 4 }}>{p.plan}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: T.text }}>${p.price}</span>
                <span style={{ fontSize: 13, color: T.muted }}>/seat/mo</span>
              </div>
              <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>{p.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14, padding: "10px 0", borderTop: `1px solid ${T.border}22`, borderBottom: `1px solid ${T.border}22` }}>
                {[{ l: "Seats", v: p.seats }, { l: "Accounts", v: p.accounts }, { l: "AI Actions", v: p.ai }, { l: "AI Model", v: p.model }].map(r => (
                  <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                    <span style={{ color: T.muted }}>{r.l}</span>
                    <span style={{ color: T.subtle, fontWeight: 500 }}>{r.v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
                {p.features.map(f => (
                  <div key={f} style={{ fontSize: 12.5, color: T.subtle, display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: T.green, fontSize: 13 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <SignUpButton mode="modal">
                <button style={{
                  width: "100%", padding: "12px 20px", borderRadius: 10,
                  border: p.featured ? "none" : `1px solid ${T.border}`,
                  background: p.featured ? T.green : "transparent",
                  color: p.featured ? "#fff" : T.text,
                  fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>{p.cta}</button>
              </SignUpButton>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 16 }}>
          All plans include a 30-day free trial with full Scale-tier access · No credit card required
        </p>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 40px", textAlign: "center", background: T.surface, borderTop: `1px solid ${T.border}` }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 48px)", marginBottom: 16 }}>
          Stop writing reports.<br />Start closing renewals.
        </h2>
        <p style={{ fontSize: 18, color: T.subtle, marginBottom: 32 }}>Join 200+ CS teams on the early access list.</p>
        {submitted ? (
          <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "20px 32px", display: "inline-block" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 600, color: T.green }}>You&apos;re on the list!</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>We&apos;ll be in touch soon.</div>
          </div>
        ) : (
          <form onSubmit={handleWaitlist} style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", maxWidth: 460, margin: "0 auto" }}>
            <input
              type="email" placeholder="your@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              style={{ flex: 1, minWidth: 220, padding: "14px 18px", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 15, color: "#e2e8f0", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
            />
            <button type="submit" disabled={submitting} style={{
              background: T.green, color: "#fff", border: "none", padding: "14px 24px",
              borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1,
            }}>{submitting ? "Joining..." : "Get Early Access"}</button>
          </form>
        )}
        <p style={{ fontSize: 13, color: "#334155", marginTop: 16 }}>Free to try. No credit card required.</p>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${T.border}22`, padding: "30px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: T.muted }}>
          Proof<span style={{ color: T.green }}>point</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/blog" style={{ color: "#475569", textDecoration: "none", fontSize: 12 }}>Blog</Link>
          <Link href="/terms" style={{ color: "#475569", textDecoration: "none", fontSize: 12 }}>Terms</Link>
          <Link href="/privacy" style={{ color: "#475569", textDecoration: "none", fontSize: 12 }}>Privacy</Link>
        </div>
        <div style={{ fontSize: 11, color: "#1e293b" }}>© 2026 Proofpoint. All rights reserved.</div>
      </footer>
    </div>
  );
}
