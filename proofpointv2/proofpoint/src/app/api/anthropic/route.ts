import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// ── In-memory rate limiter (50 requests per hour per user) ──────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count, resetIn: entry.resetAt - now };
}

// Clean up stale entries every 10 minutes
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    Array.from(rateLimitMap.entries()).forEach(([key, val]) => {
      if (now >= val.resetAt) rateLimitMap.delete(key);
    });
  };
  setInterval(cleanup, 10 * 60 * 1000).unref?.();
}

export async function POST(req: NextRequest) {
  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  const { allowed, remaining, resetIn } = checkRateLimit(userId);
  if (!allowed) {
    const resetMinutes = Math.ceil(resetIn / 60000);
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: `You've reached the limit of ${RATE_LIMIT} AI requests per hour. Please try again in ${resetMinutes} minute${resetMinutes === 1 ? "" : "s"}.`,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetIn / 1000)),
        },
      }
    );
  }

  // Parse body
  let body: { system?: string; messages?: Array<{ role: string; content: string }>; max_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { system, messages, max_tokens = 1500 } = body;

  // Input validation
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required and must not be empty" },
      { status: 400 }
    );
  }

  if (system !== undefined && typeof system !== "string") {
    return NextResponse.json(
      { error: "system must be a string if provided" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens,
        ...(system ? { system } : {}),
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Anthropic API error:", response.status, err);

      // Map Anthropic status codes to appropriate responses
      if (response.status === 429) {
        return NextResponse.json(
          { error: "AI service is temporarily overloaded. Please try again in a moment." },
          { status: 429 }
        );
      }
      if (response.status === 400) {
        return NextResponse.json(
          { error: "Invalid request to AI service", details: err },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "AI service error", details: err },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        "X-RateLimit-Limit": String(RATE_LIMIT),
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    return NextResponse.json(
      { error: "Failed to connect to AI service. Please try again." },
      { status: 500 }
    );
  }
}
