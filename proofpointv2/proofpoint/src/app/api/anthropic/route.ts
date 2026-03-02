import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Require authentication — unauthenticated requests are rejected
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { system?: string; messages: Array<{ role: string; content: string }>; max_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { system, messages, max_tokens = 1500 } = body;

  if (!messages?.length) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
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
      console.error("Anthropic API error:", err);
      return NextResponse.json(
        { error: "Anthropic API error", details: err },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
