"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TrialBannerProps {
  trialEndsAt: string | null;
  planTier: string;
}

export default function TrialBanner({ trialEndsAt, planTier }: TrialBannerProps) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (planTier !== "trial" || !trialEndsAt) return;
    const diff = Math.ceil(
      (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    setDaysLeft(Math.max(0, diff));
  }, [trialEndsAt, planTier]);

  if (planTier !== "trial" || daysLeft === null) return null;

  const isUrgent = daysLeft <= 3;
  const isExpired = daysLeft === 0;

  return (
    <div
      style={{
        background: isUrgent
          ? "rgba(239,68,68,0.1)"
          : "rgba(16,185,129,0.08)",
        border: `1px solid ${isUrgent ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.2)"}`,
        borderRadius: 10,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{isUrgent ? "⚠️" : "✨"}</span>
        <span style={{ fontSize: 14, color: isUrgent ? "#fca5a5" : "#94a3b8" }}>
          {isExpired
            ? "Your free trial has expired."
            : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`}
        </span>
      </div>
      <Link href="/pricing">
        <button
          style={{
            background: isUrgent ? "#ef4444" : "#10b981",
            color: "#fff",
            border: "none",
            padding: "6px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Upgrade Now
        </button>
      </Link>
    </div>
  );
}
