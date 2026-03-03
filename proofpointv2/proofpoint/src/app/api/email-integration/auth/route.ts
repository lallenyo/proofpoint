import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || "";
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

const OUTLOOK_SCOPES = "Mail.Read Mail.Send offline_access";

// ── GET: initiate OAuth or handle callback ───────────────────────────────

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  const code = url.searchParams.get("code");

  if (!provider || !["gmail", "outlook"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider. Use ?provider=gmail or ?provider=outlook" }, { status: 400 });
  }

  // ── No code → return OAuth URL ──
  if (!code) {
    if (provider === "gmail") {
      if (!GOOGLE_CLIENT_ID) {
        return NextResponse.json({ error: "Gmail integration not configured" }, { status: 500 });
      }
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", `${APP_URL}/api/email-integration/auth?provider=gmail`);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", GMAIL_SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      return NextResponse.json({ authUrl: authUrl.toString() });
    }

    if (provider === "outlook") {
      if (!MICROSOFT_CLIENT_ID) {
        return NextResponse.json({ error: "Outlook integration not configured" }, { status: 500 });
      }
      const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
      authUrl.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", `${APP_URL}/api/email-integration/auth?provider=outlook`);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", OUTLOOK_SCOPES);
      return NextResponse.json({ authUrl: authUrl.toString() });
    }
  }

  // ── Code present → exchange for tokens ──
  try {
    if (provider === "gmail") {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: `${APP_URL}/api/email-integration/auth?provider=gmail`,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("Gmail token exchange failed:", err);
        return NextResponse.json({ error: "Gmail OAuth failed" }, { status: 400 });
      }

      const tokens = await tokenRes.json();
      const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      const supabase = getSupabaseAdmin();
      await supabase.from("user_integrations").upsert({
        user_id: userId,
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expiry: expiry,
        email_provider: "gmail",
      });

      // Redirect back to the integrations/settings page
      return NextResponse.redirect(`${APP_URL}/settings?email=connected`);
    }

    if (provider === "outlook") {
      const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          code,
          redirect_uri: `${APP_URL}/api/email-integration/auth?provider=outlook`,
          grant_type: "authorization_code",
          scope: OUTLOOK_SCOPES,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("Outlook token exchange failed:", err);
        return NextResponse.json({ error: "Outlook OAuth failed" }, { status: 400 });
      }

      const tokens = await tokenRes.json();
      const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      const supabase = getSupabaseAdmin();
      await supabase.from("user_integrations").upsert({
        user_id: userId,
        outlook_access_token: tokens.access_token,
        outlook_refresh_token: tokens.refresh_token,
        outlook_token_expiry: expiry,
        email_provider: "outlook",
      });

      return NextResponse.redirect(`${APP_URL}/settings?email=connected`);
    }

    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  } catch (err) {
    console.error("Email auth error:", err);
    return NextResponse.json({ error: "Failed to complete email auth" }, { status: 500 });
  }
}

// ── DELETE: disconnect email integration ─────────────────────────────────

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("user_integrations")
      .update({
        gmail_access_token: null,
        gmail_refresh_token: null,
        gmail_token_expiry: null,
        outlook_access_token: null,
        outlook_refresh_token: null,
        outlook_token_expiry: null,
        email_provider: null,
      })
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email disconnect error:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
