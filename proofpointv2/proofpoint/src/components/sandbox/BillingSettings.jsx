"use client";
import { useState } from "react";
import { useTier } from "./TierContext";
import { TIERS, FEATURE_DISPLAY } from "@/lib/sandbox-tiers";

const T = {
  green: "#10b981",
  greenDim: "#064e3b",
  bg: "#050b18",
  surface: "#0a1628",
  surface2: "#0f1d32",
  border: "#1e293b",
  text: "#e2e8f0",
  subtle: "#94a3b8",
  muted: "#64748b",
  info: "#38bdf8",
  warning: "#f59e0b",
  error: "#ef4444",
};

const PAID_TIERS = [TIERS.starter, TIERS.growth, TIERS.scale];

export default function BillingSettings({ onNavigate }) {
  const {
    tierId,
    tierConfig,
    seatCount,
    actionsUsed,
    actionLimit,
    usagePercent,
    trialDaysRemaining,
    billingCycle,
    setBillingCycle,
    setTierId,
  } = useTier();

  const [isAnnual, setIsAnnual] = useState(billingCycle === "annual");

  return (
    <div style={{ animation: "panelIn 0.3s ease", maxWidth: 960, margin: "0 auto" }}>
      {/* Current Plan Card */}
      <div
        style={{
          background: T.surface2,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: "24px 28px",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Current Plan
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 22,
                fontWeight: 700,
                color: T.text,
              }}
            >
              {tierConfig.name}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 6,
                background: tierId === "trial" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                border: `1px solid ${tierId === "trial" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,
                color: tierId === "trial" ? T.warning : T.green,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {tierId === "trial" ? "Trial" : "Active"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: T.muted }}>
            {seatCount} seat{seatCount !== 1 ? "s" : ""} ·{" "}
            {tierId === "trial"
              ? `${trialDaysRemaining} days remaining in trial`
              : `$${isAnnual ? tierConfig.pricing.annual : tierConfig.pricing.monthly}/seat/${isAnnual ? "mo (annual)" : "mo"}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 12.5,
              fontWeight: 500,
              color: T.muted,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              opacity: 0.5,
            }}
            title="Coming in Phase 2 with Stripe integration"
          >
            Manage Subscription
          </button>
        </div>
      </div>

      {/* Usage Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "AI Actions Used",
            value: actionsUsed.toLocaleString(),
            sub: `of ${actionLimit.toLocaleString()} this month`,
            color: usagePercent >= 80 ? T.warning : T.green,
          },
          {
            label: "AI Model",
            value: tierId === "starter" ? "Haiku" : tierId === "growth" ? "Sonnet" : "Sonnet + Opus",
            sub: tierConfig.models.moderate.split("-").slice(1, 3).join(" "),
            color: T.info,
          },
          {
            label: "Seats",
            value: seatCount,
            sub: tierConfig.maxSeats ? `max ${tierConfig.maxSeats}` : "Unlimited",
            color: T.text,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: T.surface2,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif", marginBottom: 2 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Plan Comparison */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: T.text }}>
            Compare Plans
          </h3>
          {/* Annual / Monthly toggle */}
          <div
            style={{
              display: "flex",
              background: T.surface2,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              padding: 2,
            }}
          >
            {[false, true].map((annual) => (
              <button
                key={annual ? "annual" : "monthly"}
                onClick={() => {
                  setIsAnnual(annual);
                  setBillingCycle(annual ? "annual" : "monthly");
                }}
                style={{
                  background: isAnnual === annual ? T.green : "transparent",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: 11.5,
                  fontWeight: isAnnual === annual ? 600 : 400,
                  color: isAnnual === annual ? "#fff" : T.muted,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {annual ? "Annual (save 15%)" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {PAID_TIERS.map((tier) => {
            const isCurrent = tierId === tier.id;
            const isPopular = tier.popular;
            const price = isAnnual ? tier.pricing.annual : tier.pricing.monthly;

            return (
              <div
                key={tier.id}
                style={{
                  background: T.surface2,
                  border: `1px solid ${isCurrent ? T.green + "66" : isPopular ? T.green + "33" : T.border}`,
                  borderRadius: 14,
                  padding: "24px 20px",
                  position: "relative",
                }}
              >
                {isPopular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 16,
                      padding: "3px 10px",
                      borderRadius: 6,
                      background: T.green,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      left: 16,
                      padding: "3px 10px",
                      borderRadius: 6,
                      background: T.info,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Current
                  </div>
                )}

                <div style={{ fontSize: 14, fontWeight: 600, color: T.green, marginBottom: 2 }}>
                  {tier.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: T.text }}>
                    ${price}
                  </span>
                  <span style={{ fontSize: 12, color: T.muted }}>/seat/mo</span>
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
                  {tier.tagline}
                </div>

                {/* Key stats */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {[
                    { label: "Seats", value: tier.maxSeats ? `${tier.minSeats}–${tier.maxSeats}` : `${tier.minSeats}+` },
                    { label: "Accounts", value: tier.maxClientAccounts || "Unlimited" },
                    { label: "AI Actions", value: `${tier.actionsPerSeat.toLocaleString()}/seat/mo` },
                    { label: "AI Model", value: tier.id === "starter" ? "Haiku (Fast)" : tier.id === "growth" ? "Sonnet (Balanced)" : "Opus (Premium)" },
                    { label: "Support", value: tier.support === "email" ? "Email" : tier.support === "priority_chat" ? "Priority Chat" : "Dedicated CSM" },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <span style={{ color: T.muted }}>{row.label}</span>
                      <span style={{ color: T.subtle, fontWeight: 500 }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (!isCurrent && tierId === "trial") {
                      setTierId(tier.id);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: isCurrent ? `1px solid ${T.border}` : "none",
                    background: isCurrent ? "transparent" : T.green,
                    color: isCurrent ? T.muted : "#fff",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: isCurrent ? "default" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {isCurrent ? "Current Plan" : tierId === "trial" ? "Select Plan" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div
        style={{
          background: T.surface2,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
          <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: T.text }}>
            Feature Comparison
          </h4>
        </div>
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 100px 100px 100px",
            padding: "10px 20px",
            borderBottom: `1px solid ${T.border}`,
            background: "rgba(16,185,129,0.02)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Feature
          </div>
          {PAID_TIERS.map((tier) => (
            <div
              key={tier.id}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: tierId === tier.id ? T.green : T.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                textAlign: "center",
              }}
            >
              {tier.name}
            </div>
          ))}
        </div>
        {/* Rows */}
        {FEATURE_DISPLAY.map((feat, i) => (
          <div
            key={feat.key}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 100px 100px",
              padding: "8px 20px",
              borderBottom: i < FEATURE_DISPLAY.length - 1 ? `1px solid ${T.border}22` : "none",
            }}
          >
            <div style={{ fontSize: 12, color: T.subtle }}>{feat.label}</div>
            {["starter", "growth", "scale"].map((tid) => {
              const val = feat[tid];
              if (val === false) {
                return (
                  <div key={tid} style={{ textAlign: "center", fontSize: 12, color: "#334155" }}>
                    —
                  </div>
                );
              }
              if (val === true) {
                return (
                  <div key={tid} style={{ textAlign: "center", fontSize: 13, color: T.green }}>
                    ✓
                  </div>
                );
              }
              return (
                <div key={tid} style={{ textAlign: "center", fontSize: 11, color: T.subtle }}>
                  {val}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Trial note */}
      <div
        style={{
          textAlign: "center",
          padding: "20px 0",
          fontSize: 12,
          color: T.muted,
        }}
      >
        All plans include a 30-day free trial with full Scale-tier access · No credit card required
      </div>
    </div>
  );
}
