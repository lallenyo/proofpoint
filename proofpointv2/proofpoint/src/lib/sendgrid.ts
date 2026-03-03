// ═══════════════════════════════════════════════════════════════════════════
// SendGrid Email Client — v3 REST API integration (no SDK dependency)
// ═══════════════════════════════════════════════════════════════════════════

import { logError, logInfo } from "@/lib/logger";

const SENDGRID_BASE_URL = "https://api.sendgrid.com/v3";

// ── Types ──────────────────────────────────────────────────────────────────

interface SendEmailParams {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface BulkEmailMessage {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

interface EmailActivityEvent {
  event: string;
  timestamp: number;
  email: string;
  sg_message_id?: string;
}

// ── Lazy-initialized API key ───────────────────────────────────────────────

let _apiKey: string | null = null;

function getApiKey(): string {
  if (!_apiKey) {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }
    _apiKey = key;
  }
  return _apiKey;
}

// ── Default sender ─────────────────────────────────────────────────────────

function getDefaultFrom(): string {
  return process.env.SENDGRID_FROM_EMAIL || "noreply@proofpoint.app";
}

// ── Internal fetch helper ──────────────────────────────────────────────────

async function sendgridFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getApiKey();

  return fetch(`${SENDGRID_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// ── Send a single email ────────────────────────────────────────────────────

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const {
    to,
    from = getDefaultFrom(),
    subject,
    html,
    text,
    replyTo,
    trackOpens = true,
    trackClicks = true,
  } = params;

  if (!html && !text) {
    return { success: false, error: "Either html or text content is required" };
  }

  const toAddresses = Array.isArray(to) ? to : [to];

  const personalizations = [
    {
      to: toAddresses.map((email) => ({ email })),
    },
  ];

  const content: Array<{ type: string; value: string }> = [];
  if (text) content.push({ type: "text/plain", value: text });
  if (html) content.push({ type: "text/html", value: html });

  const payload: Record<string, unknown> = {
    personalizations,
    from: { email: from },
    subject,
    content,
    tracking_settings: {
      open_tracking: { enable: trackOpens },
      click_tracking: { enable: trackClicks },
    },
  };

  if (replyTo) {
    payload.reply_to = { email: replyTo };
  }

  try {
    const response = await sendgridFetch("/mail/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.status === 202) {
      // SendGrid returns message ID in the X-Message-Id header
      const messageId = response.headers.get("X-Message-Id") || undefined;

      logInfo("sendgrid:send", {
        to: toAddresses,
        subject,
        messageId,
      });

      return { success: true, messageId };
    }

    // Handle error responses
    const errorBody = await response.text();
    let errorMessage: string;

    try {
      const parsed = JSON.parse(errorBody);
      errorMessage =
        parsed.errors?.map((e: { message: string }) => e.message).join("; ") ||
        `SendGrid API error: ${response.status}`;
    } catch {
      errorMessage = `SendGrid API error: ${response.status} — ${errorBody}`;
    }

    logError("sendgrid:send", new Error(errorMessage));
    return { success: false, error: errorMessage };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError("sendgrid:send", err);
    return { success: false, error: `Failed to send email: ${message}` };
  }
}

// ── Send bulk emails (batch) ───────────────────────────────────────────────

export async function sendBulkEmail(
  messages: BulkEmailMessage[]
): Promise<SendEmailResult[]> {
  if (messages.length === 0) {
    return [];
  }

  // SendGrid v3 doesn't have a native batch endpoint for fully distinct messages,
  // so we send each individually but concurrently (up to 10 at a time).
  const CONCURRENCY = 10;
  const results: SendEmailResult[] = [];

  for (let i = 0; i < messages.length; i += CONCURRENCY) {
    const batch = messages.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((msg) =>
        sendEmail({
          to: msg.to,
          from: msg.from,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          replyTo: msg.replyTo,
        })
      )
    );
    results.push(...batchResults);
  }

  const successCount = results.filter((r) => r.success).length;
  logInfo("sendgrid:bulk", {
    total: messages.length,
    succeeded: successCount,
    failed: messages.length - successCount,
  });

  return results;
}

// ── Get email activity / status by message ID ──────────────────────────────

export async function getEmailActivity(
  messageId: string
): Promise<{ success: boolean; events?: EmailActivityEvent[]; error?: string }> {
  try {
    // Query the Email Activity API using the message ID
    const query = encodeURIComponent(`msg_id="${messageId}"`);
    const response = await sendgridFetch(
      `/messages?query=${query}&limit=10`
    );

    if (!response.ok) {
      const errorBody = await response.text();
      logError("sendgrid:activity", new Error(`Status ${response.status}: ${errorBody}`));
      return {
        success: false,
        error: `Failed to fetch email activity: ${response.status}`,
      };
    }

    const data = await response.json();
    const events: EmailActivityEvent[] = (data.messages || []).map(
      (msg: Record<string, unknown>) => ({
        event: msg.status as string,
        timestamp: msg.last_event_time
          ? new Date(msg.last_event_time as string).getTime()
          : Date.now(),
        email: msg.to_email as string,
        sg_message_id: msg.msg_id as string,
      })
    );

    return { success: true, events };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError("sendgrid:activity", err);
    return { success: false, error: `Failed to fetch email activity: ${message}` };
  }
}
