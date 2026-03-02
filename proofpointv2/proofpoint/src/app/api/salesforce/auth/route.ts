import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Salesforce OAuth 2.0 configuration
const SF_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID || "";
const SF_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET || "";
const SF_REDIRECT_URI = process.env.SALESFORCE_REDIRECT_URI || "";

// ── GET: initiate OAuth flow or handle callback ─────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // If no code, redirect to Salesforce OAuth
  if (!code) {
    if (!SF_CLIENT_ID) {
      return NextResponse.json(
        { error: "Salesforce integration not configured" },
        { status: 500 }
      );
    }

    const authUrl = new URL("https://login.salesforce.com/services/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", SF_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", SF_REDIRECT_URI);
    authUrl.searchParams.set("scope", "api refresh_token");

    return NextResponse.json({ authUrl: authUrl.toString() });
  }

  // Handle OAuth callback — exchange code for tokens
  try {
    const tokenRes = await fetch("https://login.salesforce.com/services/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: SF_CLIENT_ID,
        client_secret: SF_CLIENT_SECRET,
        redirect_uri: SF_REDIRECT_URI,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      console.error("Salesforce OAuth error:", err);
      return NextResponse.json({ error: "OAuth token exchange failed" }, { status: 400 });
    }

    const tokens = await tokenRes.json();

    // Store tokens securely
    const supabase = getSupabaseAdmin();
    await supabase.from("user_integrations").upsert({
      user_id: userId,
      salesforce_access_token: tokens.access_token,
      salesforce_refresh_token: tokens.refresh_token,
      salesforce_instance_url: tokens.instance_url,
    });

    return NextResponse.json({ success: true, instance_url: tokens.instance_url });
  } catch (err) {
    console.error("Salesforce auth error:", err);
    return NextResponse.json({ error: "Failed to complete Salesforce auth" }, { status: 500 });
  }
}

// ── DELETE: disconnect Salesforce ───────────────────────────────
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("user_integrations")
      .update({
        salesforce_access_token: null,
        salesforce_refresh_token: null,
        salesforce_instance_url: null,
      })
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Salesforce disconnect error:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
