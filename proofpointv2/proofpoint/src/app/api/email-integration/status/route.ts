import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// ── GET: check email connection status ───────────────────────────────────

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("user_integrations")
    .select("email_provider, gmail_access_token, outlook_access_token")
    .eq("user_id", userId)
    .single();

  const connected = !!(
    data?.email_provider &&
    (data.gmail_access_token || data.outlook_access_token)
  );

  // Get last sync time
  let lastSync: string | null = null;
  if (connected) {
    const { data: syncData } = await supabase
      .from("email_sync_log")
      .select("synced_at")
      .eq("user_id", userId)
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();

    lastSync = syncData?.synced_at || null;
  }

  return NextResponse.json({
    connected,
    provider: data?.email_provider || null,
    lastSync,
  });
}
