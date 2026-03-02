export default function GeneratorLoading() {
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

      {/* Sidebar placeholder */}
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

      {/* Tool content skeleton */}
      <div style={{ flex: 1, padding: 32, maxWidth: 800 }}>
        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ ...skeletonBar("240px", 28), marginBottom: 8 }} />
          <div style={skeletonBar("400px", 14)} />
        </div>

        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  ...skeletonBar("28px", 28),
                }}
              />
              <div style={skeletonBar("80px", 14)} />
            </div>
          ))}
        </div>

        {/* Form fields */}
        <div
          style={{
            background: "#0a1628",
            border: "1px solid #1e293b",
            borderRadius: 12,
            padding: 28,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ ...skeletonBar("100px", 12), marginBottom: 8 }} />
              <div style={skeletonBar("100%", 40)} />
            </div>
          ))}

          <div style={{ ...skeletonBar("140px", 44), marginTop: 12 }} />
        </div>
      </div>
    </div>
  );
}
