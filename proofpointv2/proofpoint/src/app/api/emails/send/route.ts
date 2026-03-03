import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/sendgrid";
import { emailsLimiter } from "@/lib/rate-limit";
import { logError, logRequest } from "@/lib/logger";
import { z } from "zod";

// ── Zod validation schema ──────────────────────────────────────────────────

const sendEmailSchema = z.object({
  to: z.string().email("Invalid recipient email address"),
  subject: z.string().min(1, "Subject is required").max(998, "Subject too long"),
  body: z.string().min(1, "Email body is required").max(100_000, "Body too long"),
  account_id: z.string().uuid("Invalid account_id").optional(),
  template_id: z.string().uuid("Invalid template_id").optional(),
  track: z.boolean().optional().default(true),
});

// ── POST: send an email via SendGrid ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const start = Date.now();
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  const rl = emailsLimiter.check(userId);
  if (!rl.allowed) {
    logRequest({
      route: "/api/emails/send",
      method: "POST",
      userId,
      statusCode: 429,
      durationMs: Date.now() - start,
    });
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: emailsLimiter.headers(rl) }
    );
  }

  try {
    const rawBody = await req.json();

    // Validate input with Zod
    const parsed = sendEmailSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { to, subject, body, account_id, template_id, track } = parsed.data;

    // Send the email via SendGrid
    const result = await sendEmail({
      to,
      subject,
      html: body,
      trackOpens: track,
      trackClicks: track,
    });

    if (!result.success) {
      logRequest({
        route: "/api/emails/send",
        method: "POST",
        userId,
        statusCode: 502,
        durationMs: Date.now() - start,
        error: result.error,
      });
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 502 }
      );
    }

    // Log the sent email as an activity on the account (if account_id provided)
    if (account_id) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from("account_activities").insert({
          account_id,
          user_id: userId,
          activity_type: "email",
          title: `Email sent: ${subject}`,
          description: `Sent to ${to}`,
          metadata: {
            messageId: result.messageId || null,
            to,
            subject,
            template_id: template_id || null,
            tracked: track,
          },
        });
      } catch (dbErr) {
        // Log but don't fail the request — the email was already sent
        logError("emails/send:activity-log", dbErr);
      }
    }

    logRequest({
      route: "/api/emails/send",
      method: "POST",
      userId,
      statusCode: 200,
      durationMs: Date.now() - start,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err) {
    logError("emails/send", err);
    logRequest({
      route: "/api/emails/send",
      method: "POST",
      userId,
      statusCode: 500,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
