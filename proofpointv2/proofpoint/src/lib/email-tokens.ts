// ═══════════════════════════════════════════════════════════════════════════
// Email Token Management — refresh helpers for Gmail & Outlook OAuth tokens
// ═══════════════════════════════════════════════════════════════════════════

import { getSupabaseAdmin } from "./supabase";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || "";
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || "";

export interface EmailTokenResult {
  accessToken: string;
  provider: "gmail" | "outlook";
}

// ── Refresh Gmail token ──────────────────────────────────────────────────

export async function refreshGmailToken(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("user_integrations")
    .select("gmail_refresh_token")
    .eq("user_id", userId)
    .single();

  if (!data?.gmail_refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: data.gmail_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Gmail token refresh failed:", await res.text());
    return null;
  }

  const tokens = await res.json();
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("user_integrations")
    .update({
      gmail_access_token: tokens.access_token,
      gmail_token_expiry: expiry,
    })
    .eq("user_id", userId);

  return tokens.access_token;
}

// ── Refresh Outlook token ────────────────────────────────────────────────

export async function refreshOutlookToken(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("user_integrations")
    .select("outlook_refresh_token")
    .eq("user_id", userId)
    .single();

  if (!data?.outlook_refresh_token) return null;

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      refresh_token: data.outlook_refresh_token,
      grant_type: "refresh_token",
      scope: "Mail.Read Mail.Send offline_access",
    }),
  });

  if (!res.ok) {
    console.error("Outlook token refresh failed:", await res.text());
    return null;
  }

  const tokens = await res.json();
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("user_integrations")
    .update({
      outlook_access_token: tokens.access_token,
      outlook_refresh_token: tokens.refresh_token || data.outlook_refresh_token,
      outlook_token_expiry: expiry,
    })
    .eq("user_id", userId);

  return tokens.access_token;
}

// ── Get valid token (auto-refresh if expired) ────────────────────────────

export async function getValidEmailToken(userId: string): Promise<EmailTokenResult | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("user_integrations")
    .select("email_provider, gmail_access_token, gmail_token_expiry, outlook_access_token, outlook_token_expiry")
    .eq("user_id", userId)
    .single();

  if (!data?.email_provider) return null;

  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5-minute buffer before expiry

  if (data.email_provider === "gmail") {
    const expiry = data.gmail_token_expiry ? new Date(data.gmail_token_expiry) : null;
    if (data.gmail_access_token && expiry && expiry.getTime() - bufferMs > now.getTime()) {
      return { accessToken: data.gmail_access_token, provider: "gmail" };
    }
    const refreshed = await refreshGmailToken(userId);
    if (refreshed) return { accessToken: refreshed, provider: "gmail" };
    return null;
  }

  if (data.email_provider === "outlook") {
    const expiry = data.outlook_token_expiry ? new Date(data.outlook_token_expiry) : null;
    if (data.outlook_access_token && expiry && expiry.getTime() - bufferMs > now.getTime()) {
      return { accessToken: data.outlook_access_token, provider: "outlook" };
    }
    const refreshed = await refreshOutlookToken(userId);
    if (refreshed) return { accessToken: refreshed, provider: "outlook" };
    return null;
  }

  return null;
}
