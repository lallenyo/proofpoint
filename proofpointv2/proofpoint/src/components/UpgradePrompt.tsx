"use client";

import Link from "next/link";

interface UpgradePromptProps {
  feature: string;
  reason?: string;
  currentTier?: string;
}

export default function UpgradePrompt({ feature, reason, currentTier }: UpgradePromptProps) {
  return (
    <div
      style={{
        background: "rgba(16,185,129,0.05)",
        border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: 12,
        padding: 32,
        textAlign: "center",
        maxWidth: 480,
        margin: "40px auto",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(16,185,129,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          margin: "0 auto 16px",
        }}
      >
        🔒
      </div>
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22,
          color: "#f1f5f9",
          marginBottom: 8,
        }}
      >
        Upgrade to unlock {feature}
      </h3>
      <p
        style={{
          color: "#94a3b8",
          fontSize: 14,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        {reason || `This feature requires an upgrade from your current ${currentTier || "free"} plan.`}
      </p>
      <Link href="/pricing">
        <button
          style={{
            background: "#10b981",
            color: "#fff",
            border: "none",
            padding: "12px 32px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          View Plans & Upgrade
        </button>
      </Link>
    </div>
  );
}
