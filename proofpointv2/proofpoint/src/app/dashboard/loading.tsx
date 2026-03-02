export default function DashboardLoading() {
  const shimmer = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;

  const skeletonBar = (width: string, height = 16): React.CSSProperties => ({
    width,
    height,
    borderRadius: 6,
    background: "linear-gradient(90deg, #0f1d32 25%, #162240 50%, #0f1d32 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s ease-in-out infinite",
  });

  const card: React.CSSProperties = {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 24,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050b18",
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
      }}
    >
      <style>{shimmer}</style>

      {/* Sidebar skeleton */}
      <div
        style={{
          width: 240,
          borderRight: "1px solid #1e293b",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ ...skeletonBar("120px", 24), marginBottom: 24 }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={skeletonBar("100%", 36)} />
        ))}
      </div>

      {/* Main content skeleton */}
      <div style={{ flex: 1, padding: 32 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ ...skeletonBar("200px", 28), marginBottom: 8 }} />
          <div style={skeletonBar("320px", 14)} />
        </div>

        {/* Metric cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={card}>
              <div style={{ ...skeletonBar("80px", 12), marginBottom: 12 }} />
              <div style={{ ...skeletonBar("100px", 28), marginBottom: 8 }} />
              <div style={skeletonBar("60px", 12)} />
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ ...card, height: 300, marginBottom: 24 }}>
          <div style={{ ...skeletonBar("160px", 18), marginBottom: 16 }} />
          <div style={skeletonBar("100%", 200)} />
        </div>

        {/* Table area */}
        <div style={card}>
          <div style={{ ...skeletonBar("180px", 18), marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16,
                padding: "12px 0",
                borderTop: i > 0 ? "1px solid #1e293b" : "none",
              }}
            >
              <div style={skeletonBar("25%")} />
              <div style={skeletonBar("20%")} />
              <div style={skeletonBar("15%")} />
              <div style={skeletonBar("20%")} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
