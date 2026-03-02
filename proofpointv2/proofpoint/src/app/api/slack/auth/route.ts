import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || "";
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || "";
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || "";

// ── GET: initiate Slack OAuth or handle callback ────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    if (!SLACK_CLIENT_ID) {
      return NextResponse.json({ error: "Slack integration not configured" }, { status: 500 });
    }

    const authUrl = new URL("https://slack.com/oauth/v2/authorize");
    authUrl.searchParams.set("client_id", SLACK_CLIENT_ID);
    authUrl.searchParams.set("scope", "chat:write,channels:read");
    authUrl.searchParams.set("redirect_uri", SLACK_REDIRECT_URI);

    return NextResponse.json({ authUrl: authUrl.toString() });
  }

  // Exchange code for token
  try {
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.ok) {
      console.error("Slack OAuth error:", tokens.error);
      return NextResponse.json({ error: "Slack OAuth failed" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    await supabase.from("user_integrations").upsert({
      user_id: userId,
      slack_bot_token: tokens.access_token,
      slack_team_id: tokens.team?.id || null,
      slack_channel_id: tokens.incoming_webhook?.channel_id || null,
    });

    return NextResponse.json({ success: true, team: tokens.team?.name });
  } catch (err) {
    console.error("Slack auth error:", err);
    return NextResponse.json({ error: "Failed to complete Slack auth" }, { status: 500 });
  }
}

// ── DELETE: disconnect Slack ────────────────────────────────────
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("user_integrations")
      .update({
        slack_bot_token: null,
        slack_team_id: null,
        slack_channel_id: null,
      })
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Slack disconnect error:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
