"use client";

import dynamic from "next/dynamic";

// Dynamically import the sandbox ProofPoint app (no SSR — it's fully client-side)
const ProofPointApp = dynamic(
  () => import("@/components/sandbox/ProofPoint"),
  { ssr: false, loading: () => (
    <div style={{
      minHeight: "100vh",
      background: "#050b18",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28,
          color: "#f1f5f9",
          marginBottom: 16,
        }}>
          Proof<span style={{ color: "#10b981" }}>point</span>
        </div>
        <div style={{
          width: 40,
          height: 40,
          border: "3px solid #1e293b",
          borderTopColor: "#10b981",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px",
        }} />
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading Sandbox...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )}
);

export default function DemoPage() {
  return <ProofPointApp />;
}
