import { NextResponse } from "next/server";

// ── GET: health check endpoint ──────────────────────────────────
export async function GET() {
  let dbStatus: "connected" | "error" = "error";
  let anthropicStatus: "configured" | "missing" = "missing";

  // Check Supabase connectivity
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      dbStatus = res.ok ? "connected" : "error";
    }
  } catch {
    dbStatus = "error";
  }

  // Check Anthropic API key presence
  if (process.env.ANTHROPIC_API_KEY) {
    anthropicStatus = "configured";
  }

  const status = dbStatus === "connected" ? "ok" : "degraded";

  return NextResponse.json({
    status,
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    anthropic: anthropicStatus,
  });
}
