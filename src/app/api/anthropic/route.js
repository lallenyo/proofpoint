import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getModelForTask } from "@/lib/tiers";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { model, max_tokens, system, messages, action_type, tier } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    // Server-side model routing: if tier is provided, override client model
    const resolvedModel = tier
      ? getModelForTask(tier, action_type || "general")
      : (model || "claude-sonnet-4-20250514");

    const response = await client.messages.create({
      model: resolvedModel,
      max_tokens: max_tokens || 1500,
      system: system || undefined,
      messages,
    });

    const res = NextResponse.json(response);
    res.headers.set("x-model-used", resolvedModel);
    res.headers.set("x-action-type", action_type || "none");
    return res;
  } catch (error) {
    console.error("Anthropic API error:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
