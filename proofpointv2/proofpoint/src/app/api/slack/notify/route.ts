import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

interface SlackNotification {
  type: "health_drop" | "renewal_due" | "task_overdue" | "churn_risk";
  title: string;
  accountName?: string;
  details?: string;
  severity?: "critical" | "warning" | "info";
}

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  warning: "🟡",
  info: "🔵",
};

function formatSlackMessage(notification: SlackNotification): string {
  const emoji = SEVERITY_EMOJI[notification.severity || "info"] || "ℹ️";
  const lines = [`${emoji} *${notification.title}*`];
  if (notification.accountName) lines.push(`📋 Account: ${notification.accountName}`);
  if (notification.details) lines.push(notification.details);
  lines.push(`\n_Sent by ProofPoint_`);
  return lines.join("\n");
}

// ── POST: send Slack notification ───────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { notification: SlackNotification; channelId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.notification?.title || !body.notification?.type) {
    return NextResponse.json({ error: "notification.title and notification.type required" }, { status: 400 });
  }

  // Get Slack credentials
  const supabase = getSupabaseAdmin();
  const { data: creds } = await supabase
    .from("user_integrations")
    .select("slack_bot_token, slack_channel_id")
    .eq("user_id", userId)
    .single();

  if (!creds?.slack_bot_token) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
  }

  const channelId = body.channelId || creds.slack_channel_id;
  if (!channelId) {
    return NextResponse.json({ error: "No Slack channel configured" }, { status: 400 });
  }

  try {
    const message = formatSlackMessage(body.notification);

    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.slack_bot_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        text: message,
        mrkdwn: true,
      }),
    });

    const result = await res.json();

    if (!result.ok) {
      console.error("Slack API error:", result.error);
      return NextResponse.json({ error: `Slack error: ${result.error}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, ts: result.ts });
  } catch (err) {
    console.error("Slack notify error:", err);
    return NextResponse.json({ error: "Failed to send Slack notification" }, { status: 500 });
  }
}
