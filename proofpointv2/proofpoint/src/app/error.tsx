"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050b18",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        color: "#f1f5f9",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 24px",
          }}
        >
          !
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            marginBottom: 12,
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            color: "#94a3b8",
            fontSize: 16,
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          An unexpected error occurred. This has been logged and we&apos;ll look into it.
        </p>
        {error.digest && (
          <p
            style={{
              color: "#475569",
              fontSize: 12,
              fontFamily: "monospace",
              marginBottom: 24,
            }}
          >
            Error ID: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              background: "#10b981",
              color: "#fff",
              border: "none",
              padding: "12px 28px",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <a href="/dashboard">
            <button
              style={{
                background: "transparent",
                color: "#94a3b8",
                border: "1px solid #1e293b",
                padding: "12px 28px",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back to Dashboard
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
