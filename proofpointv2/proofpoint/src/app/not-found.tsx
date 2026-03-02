import Link from "next/link";

export default function NotFound() {
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
            fontSize: 72,
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            color: "#10b981",
            marginBottom: 8,
          }}
        >
          404
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            marginBottom: 12,
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            color: "#94a3b8",
            fontSize: 16,
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/dashboard">
          <button
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
            Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
