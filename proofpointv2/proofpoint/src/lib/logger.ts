// ═══════════════════════════════════════════════════════════════════════════
// Logging Utility — structured console logging (captured by Vercel)
// ═══════════════════════════════════════════════════════════════════════════

interface RequestLogData {
  route: string;
  method: string;
  userId?: string;
  statusCode: number;
  durationMs: number;
  error?: string;
}

interface AiUsageLogData {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  tier: string;
  actionType: string;
  userId?: string;
  durationMs: number;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

export function logRequest(data: RequestLogData): void {
  const entry = {
    timestamp: formatTimestamp(),
    type: "request",
    ...data,
  };

  if (data.statusCode >= 500) {
    console.error("[API]", JSON.stringify(entry));
  } else if (data.statusCode >= 400) {
    console.warn("[API]", JSON.stringify(entry));
  } else {
    console.log("[API]", JSON.stringify(entry));
  }
}

export function logAiUsage(data: AiUsageLogData): void {
  const entry = {
    timestamp: formatTimestamp(),
    type: "ai_usage",
    ...data,
  };
  console.log("[AI]", JSON.stringify(entry));
}

export function logError(context: string, error: unknown): void {
  const entry = {
    timestamp: formatTimestamp(),
    type: "error",
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  console.error("[ERROR]", JSON.stringify(entry));
}

export function logInfo(context: string, data?: Record<string, unknown>): void {
  const entry = {
    timestamp: formatTimestamp(),
    type: "info",
    context,
    ...data,
  };
  console.log("[INFO]", JSON.stringify(entry));
}
