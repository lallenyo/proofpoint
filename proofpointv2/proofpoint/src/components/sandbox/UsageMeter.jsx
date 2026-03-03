"use client";
import { useTier } from "./TierContext";

const T = {
  green: "#10b981",
  bg: "#050b18",
  surface: "#0a1628",
  surface2: "#0f1d32",
  border: "#1e293b",
  text: "#e2e8f0",
  muted: "#64748b",
};

export default function UsageMeter({ onNavigate }) {
  const {
    tierId,
    tierConfig,
    actionsUsed,
    actionLimit,
    usagePercent,
    trialDaysRemaining,
  } = useTier();

  const barColor =
    usagePercent >= 100 ? "#ef4444" : usagePercent >= 80 ? "#f59e0b" : T.green;

  return (
    <div
      style={{
        padding: "12px 14px",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        marginBottom: 12,
      }}
    >
      {/* Tier badge + trial days */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.green,
            background: `rgba(16,185,129,0.1)`,
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 6,
            padding: "3px 8px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {tierConfig.name}
        </span>
        {tierId === "trial" && trialDaysRemaining !== null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: trialDaysRemaining < 7 ? "#ef4444" : "#f59e0b",
              background:
                trialDaysRemaining < 7
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(245,158,11,0.1)",
              border: `1px solid ${trialDaysRemaining < 7 ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
              borderRadius: 6,
              padding: "3px 7px",
            }}
          >
            {trialDaysRemaining}d left
          </span>
        )}
      </div>

      {/* Action count */}
      <div
        style={{
          fontSize: 11,
          color: T.muted,
          marginBottom: 5,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{actionsUsed.toLocaleString()} actions</span>
        <span>/ {actionLimit.toLocaleString()}</span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: T.surface2,
          overflow: "hidden",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${usagePercent}%`,
            background: barColor,
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Warning messages */}
      {usagePercent >= 100 && (
        <div
          style={{
            fontSize: 10,
            color: "#ef4444",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Action limit reached — upgrade for more
        </div>
      )}
      {usagePercent >= 80 && usagePercent < 100 && (
        <div
          style={{
            fontSize: 10,
            color: "#f59e0b",
            marginBottom: 6,
          }}
        >
          {100 - usagePercent}% of actions remaining
        </div>
      )}

      {/* Upgrade button */}
      {tierId !== "scale" && tierId !== "trial" && (
        <button
          onClick={() => onNavigate && onNavigate("billing")}
          style={{
            width: "100%",
            padding: "7px 12px",
            borderRadius: 7,
            border: `1px solid rgba(16,185,129,0.25)`,
            background: "rgba(16,185,129,0.06)",
            color: T.green,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            marginTop: 4,
            transition: "all 0.15s",
          }}
        >
          Upgrade Plan
        </button>
      )}
    </div>
  );
}
