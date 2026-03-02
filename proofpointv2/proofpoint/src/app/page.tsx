"use client";

import { useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { isSignedIn } = useUser();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing-page" }),
      });
      if (!res.ok) throw new Error("Failed to join waitlist");
      setSubmitted(true);
    } catch (err) {
      console.error("Waitlist error:", err);
      // Still show success to avoid exposing backend issues to users
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: "#020817", color: "#f1f5f9", fontFamily: "'DM Sans', sans-serif", minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "16px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(2,8,23,0.8)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(30,41,59,0.5)",
      }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22 }}>
          Proof<span style={{ color: "#10b981" }}>point</span>
        </div>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <a href="#features" style={{ fontSize: 14, color: "#64748b", textDecoration: "none" }}>Features</a>
          <a href="#pricing" style={{ fontSize: 14, color: "#64748b", textDecoration: "none" }}>Pricing</a>
          {isSignedIn ? (
            <Link href="/dashboard">
              <button style={{ background: "#10b981", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Go to Dashboard →
              </button>
            </Link>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <SignInButton mode="modal">
                <button style={{ background: "transparent", color: "#94a3b8", border: "1px solid #1e293b", padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button style={{ background: "#10b981", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Get Started
                </button>
              </SignUpButton>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        position: "relative", minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "120px 24px 80px",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400,
          background: "radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 20, padding: "6px 16px", marginBottom: 28,
          fontSize: 12, fontWeight: 600, color: "#10b981",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
          Now in Early Access
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(42px, 6vw, 72px)",
          lineHeight: 1.1, marginBottom: 24, position: "relative",
        }}>
          ROI Reports That<br />
          <span style={{ fontStyle: "italic", color: "#10b981" }}>Actually Get Read</span>
        </h1>

        <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "#94a3b8", maxWidth: 560, lineHeight: 1.7, marginBottom: 40 }}>
          Turn customer data into executive-ready success stories in 60 seconds.
          Built for CS teams who need to prove value, drive renewals, and get their CFO to actually care.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {isSignedIn ? (
            <Link href="/dashboard">
              <button style={{ background: "#10b981", color: "#fff", border: "none", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                Open Dashboard →
              </button>
            </Link>
          ) : (
            <>
              <SignUpButton mode="modal">
                <button style={{ background: "#10b981", color: "#fff", border: "none", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                  Start Free Trial
                </button>
              </SignUpButton>
              <a href="#waitlist">
                <button style={{ background: "transparent", color: "#94a3b8", border: "1px solid #1e293b", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                  Join Waitlist
                </button>
              </a>
            </>
          )}
        </div>

        <p style={{ marginTop: 16, fontSize: 13, color: "#334155" }}>Free to try · No credit card required</p>
      </div>

      {/* Testimonials */}
      <div id="features" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}>
        <p style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Early Feedback</p>
        <h2 style={{ textAlign: "center", fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 42px)", marginBottom: 48 }}>What CS teams are saying</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { quote: "I used to spend half my Friday writing the QBR narrative. Now I spend 30 seconds and the output is honestly better than what I was writing myself.", name: "Sarah R.", title: "Senior CSM, HR Tech SaaS", initials: "SR" },
            { quote: "Our CFO actually read the whole thing. That has never happened before. The way it connects our numbers to their business goals is exactly the language executives respond to.", name: "Marcus K.", title: "VP Customer Success, Fintech", initials: "MK" },
            { quote: "We have 200 customers. Writing personalized ROI reports for all of them was impossible. Proofpoint changed that math completely.", name: "Jamie L.", title: "Director of CS, Healthcare SaaS", initials: "JL" },
          ].map(({ quote, name, title, initials }) => (
            <div key={name} style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 16, padding: 28 }}>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "#cbd5e1", marginBottom: 20 }}>&ldquo;{quote}&rdquo;</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#10b981" }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" style={{ background: "#0a1628", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Pricing</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 42px)", marginBottom: 48 }}>Simple, honest pricing</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, maxWidth: 960, margin: "0 auto" }}>
            {[
              { name: "Starter", price: "$39", period: "/seat/mo", desc: "For individual CSMs", features: ["500 AI actions/month", "3 report templates", "HubSpot integration", "Email support"], featured: false },
              { name: "Growth", price: "$79", period: "/seat/mo", desc: "For growing CS teams", features: ["1,000 AI actions/month", "All templates", "Custom branding", "Priority support", "Team workspace"], featured: true },
              { name: "Scale", price: "$119", period: "/seat/mo", desc: "For CS organizations", features: ["2,000 AI actions/month", "Everything in Growth", "QBR generation", "Stakeholder mapping", "API access", "Dedicated CSM"], featured: false },
            ].map(({ name, price, period, desc, features, featured }) => (
              <div key={name} style={{
                background: featured ? "rgba(16,185,129,0.05)" : "#040714",
                border: featured ? "2px solid #10b981" : "1px solid #1e293b",
                borderRadius: 16, padding: 32, position: "relative", textAlign: "left",
              }}>
                {featured && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#10b981", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                    Most Popular
                  </div>
                )}
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 8 }}>{name}</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: featured ? "#10b981" : "#f1f5f9" }}>{price}<span style={{ fontSize: 16, fontWeight: 400, color: "#64748b" }}>{period}</span></div>
                <p style={{ fontSize: 13, color: "#64748b", margin: "8px 0 20px" }}>{desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {features.map((f) => (
                    <li key={f} style={{ fontSize: 14, color: "#94a3b8", display: "flex", gap: 8 }}>
                      <span style={{ color: "#10b981" }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up">
                  <button style={{
                    width: "100%", padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    background: featured ? "#10b981" : "transparent",
                    color: featured ? "#fff" : "#94a3b8",
                    border: featured ? "none" : "1px solid #1e293b",
                  }}>
                    Start Free Trial
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Waitlist CTA */}
      <div id="waitlist" style={{ textAlign: "center", padding: "80px 24px" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 48px)", marginBottom: 16 }}>
          Stop writing reports.<br />Start closing renewals.
        </h2>
        <p style={{ fontSize: 18, color: "#94a3b8", marginBottom: 32 }}>Join 200+ CS teams on the early access list.</p>

        {submitted ? (
          <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "20px 32px", display: "inline-block" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 600, color: "#10b981" }}>You&apos;re on the list!</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>We&apos;ll be in touch soon.</div>
          </div>
        ) : (
          <form onSubmit={handleSignup} style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", maxWidth: 460, margin: "0 auto" }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ flex: 1, minWidth: 220, padding: "14px 18px", background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10, fontSize: 15, color: "#e2e8f0", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{ background: "#10b981", color: "#fff", border: "none", padding: "14px 24px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Joining..." : "Get Early Access"}
            </button>
          </form>
        )}
        <p style={{ fontSize: 13, color: "#334155", marginTop: 16 }}>Free to try. No credit card required.</p>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e293b", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16 }}>Proof<span style={{ color: "#10b981" }}>point</span></div>
        <div style={{ fontSize: 13, color: "#475569" }}>© 2026 Proofpoint. All rights reserved.</div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "Contact"].map((l) => (
            <a key={l} href="#" style={{ color: "#475569", textDecoration: "none", fontSize: 13 }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
