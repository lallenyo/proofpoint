"use client";

import Link from "next/link";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: EmptyStateProps) {
  const button = ctaLabel ? (
    <button
      onClick={onCtaClick}
      style={{
        background: "#10b981",
        color: "#fff",
        border: "none",
        padding: "10px 20px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        marginTop: 8,
      }}
    >
      {ctaLabel}
    </button>
  ) : null;

  return (
    <div
      style={{
        background: "#0a1628",
        border: "1px dashed #1e293b",
        borderRadius: 14,
        padding: 48,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 8,
          color: "#f1f5f9",
          fontFamily: "'Playfair Display', serif",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#64748b",
          marginBottom: 20,
          maxWidth: 400,
          margin: "0 auto 20px",
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
      {ctaHref ? <Link href={ctaHref}>{button}</Link> : button}
    </div>
  );
}
