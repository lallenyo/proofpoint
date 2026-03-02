"use client";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: "#0a1628",
        border: "1px solid #1e293b",
        borderRadius: 14,
        padding: 24,
      }}
    >
      <Skeleton width={160} height={20} style={{ marginBottom: 12 }} />
      <Skeleton width="80%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={14} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div
      style={{
        background: "#0a1628",
        border: "1px solid #1e293b",
        borderRadius: 10,
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <Skeleton width={200} height={16} style={{ marginBottom: 8 }} />
        <Skeleton width={300} height={12} />
      </div>
      <Skeleton width={80} height={12} />
    </div>
  );
}

// Add the shimmer keyframe animation via a style tag
export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  );
}
