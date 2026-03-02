"use client";
import { useTier } from "./TierContext";
import { getRequiredTier } from "@/lib/tiers";

export default function FeatureGate({ feature, panelName, onNavigate, children }) {
  const { checkFeature } = useTier();

  if (!feature || checkFeature(feature)) {
    return children;
  }

  const requiredTier = getRequiredTier(feature);

  return (
    <div style={{ position: "relative", minHeight: 400 }}>
      <div
        style={{
          filter: "blur(6px)",
          opacity: 0.35,
          pointerEvents: "none",
          userSelect: "none",
          overflow: "hidden",
          maxHeight: 600,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(5,11,24,0.8)",
          borderRadius: 14,
          zIndex: 5,
          backdropFilter: "blur(4px)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            marginBottom: 16,
          }}
        >
          🔒
        </div>
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {panelName || "This Feature"} requires{" "}
          <span style={{ color: "#10b981" }}>{requiredTier.name}</span>
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "#64748b",
            marginBottom: 20,
            textAlign: "center",
            maxWidth: 340,
            lineHeight: 1.5,
          }}
        >
          Upgrade to the {requiredTier.name} plan to unlock this feature and
          take your customer success to the next level.
        </p>
        <button
          onClick={() => onNavigate && onNavigate("billing")}
          style={{
            background: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 0 24px rgba(16,185,129,0.25)",
            transition: "all 0.15s",
          }}
        >
          Upgrade to {requiredTier.name} — ${requiredTier.pricing.monthly}/seat/mo
        </button>
        <div
          style={{
            fontSize: 11,
            color: "#475569",
            marginTop: 10,
          }}
        >
          or ${requiredTier.pricing.annual}/seat/mo billed annually (save 15%)
        </div>
      </div>
    </div>
  );
}
