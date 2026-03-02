"use client";
import { useState } from "react";
import { useTier } from "./TierContext";

const T = {
  green: "#10b981",
  text: "#e2e8f0",
  muted: "#64748b",
  bg: "#050b18",
  border: "#1e293b",
};

export default function TrialBanner({ onNavigate }) {
  const { tierId, trialDaysRemaining, trialExpired } = useTier();
  const [dismissed, setDismissed] = useState(false);

  if (tierId !== "trial") return null;
  if (dismissed && !trialExpired) return null;

  // Expired: full-screen overlay
  if (trialExpired) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(5,11,24,0.96)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 460,
            padding: 40,
            animation: "panelIn 0.3s ease",
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 20 }}>⏰</div>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 28,
              fontWeight: 700,
              color: T.text,
              marginBottom: 12,
            }}
          >
            Your Trial Has Ended
          </h2>
          <p
            style={{
              fontSize: 15,
              color: T.muted,
              marginBottom: 28,
              lineHeight: 1.6,
            }}
          >
            Choose a plan to continue using ProofPoint. All your data and
            settings have been preserved.
          </p>
          <button
            onClick={() => onNavigate && onNavigate("billing")}
            style={{
              background: T.green,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "14px 36px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 0 30px rgba(16,185,129,0.3)",
            }}
          >
            Choose a Plan
          </button>
        </div>
      </div>
    );
  }

  const isUrgent = trialDaysRemaining < 7;

  return (
    <div
      style={{
        padding: "10px 18px",
        background: isUrgent
          ? "rgba(239,68,68,0.06)"
          : "rgba(16,185,129,0.04)",
        border: `1px solid ${isUrgent ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.12)"}`,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15 }}>{isUrgent ? "⚠️" : "✨"}</span>
        <span>
          <span
            style={{
              fontWeight: 600,
              fontSize: 12.5,
              color: isUrgent ? "#ef4444" : T.green,
            }}
          >
            {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""}{" "}
            remaining
          </span>
          <span style={{ color: T.muted, fontSize: 12, marginLeft: 6 }}>
            in your free trial with full Scale-tier access
          </span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => onNavigate && onNavigate("billing")}
          style={{
            background: isUrgent ? "#ef4444" : T.green,
            color: "#fff",
            border: "none",
            borderRadius: 7,
            padding: "6px 14px",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Choose a Plan
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "none",
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#475569",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
