"use client";

import { useEffect, useState, useCallback } from "react";

interface SyncedEmail {
  id: string;
  message_id: string;
  from_email: string;
  to_emails: string[];
  subject: string;
  snippet: string;
  direction: "inbound" | "outbound";
  sent_at: string;
  thread_id: string | null;
}

interface EmailStatus {
  connected: boolean;
  provider: string | null;
  lastSync: string | null;
}

const S = {
  card: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: 24,
  } as React.CSSProperties,
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
    color: "#f1f5f9",
  } as React.CSSProperties,
  muted: { fontSize: 13, color: "#64748b" } as React.CSSProperties,
  btn: {
    background: "#10b981",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  } as React.CSSProperties,
  btnOutline: {
    background: "transparent",
    color: "#94a3b8",
    border: "1px solid #1e293b",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  } as React.CSSProperties,
  emailRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #1e293b",
  } as React.CSSProperties,
  dirBadge: (dir: string) =>
    ({
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      color: dir === "inbound" ? "#3b82f6" : "#10b981",
      background: dir === "inbound" ? "#3b82f618" : "#10b98118",
      border: `1px solid ${dir === "inbound" ? "#3b82f640" : "#10b98140"}`,
      flexShrink: 0,
    }) as React.CSSProperties,
  statusDot: (connected: boolean) =>
    ({
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: connected ? "#10b981" : "#ef4444",
      marginRight: 8,
    }) as React.CSSProperties,
};

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function EmailSync({ accountId }: { accountId: string }) {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [emails, setEmails] = useState<SyncedEmail[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/email-integration/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/activities`);
      if (!res.ok) return;
      const activities = await res.json();
      // Filter for synced emails from email_sync_log via a dedicated endpoint
      // For now, we show email activities from the activity feed
      const emailActivities = activities
        .filter(
          (a: { activity_type: string; metadata?: { synced?: boolean } }) =>
            a.activity_type === "email" && a.metadata?.synced
        )
        .map(
          (a: {
            id: string;
            title: string;
            description: string;
            created_at: string;
            metadata: {
              message_id?: string;
              direction?: string;
              from_email?: string;
            };
          }) => ({
            id: a.id,
            message_id: a.metadata?.message_id || a.id,
            from_email: a.metadata?.from_email || "",
            to_emails: [],
            subject: (a.title || "").replace(/^(Received|Sent): /, ""),
            snippet: a.description || "",
            direction: a.metadata?.direction || "outbound",
            sent_at: a.created_at,
            thread_id: null,
          })
        );
      setEmails(emailActivities);
    } catch {
      // Non-blocking
    }
  }, [accountId]);

  useEffect(() => {
    Promise.all([fetchStatus(), fetchEmails()]).finally(() => setLoading(false));
  }, [fetchStatus, fetchEmails]);

  async function handleConnect(provider: "gmail" | "outlook") {
    try {
      const res = await fetch(`/api/email-integration/auth?provider=${provider}`);
      if (!res.ok) {
        setError("Failed to start OAuth flow");
        return;
      }
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      setError("Failed to connect");
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/email-integration/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sync failed");
      } else {
        await fetchEmails();
        await fetchStatus();
      }
    } catch {
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    try {
      const res = await fetch("/api/email-integration/auth", { method: "DELETE" });
      if (res.ok) {
        setStatus({ connected: false, provider: null, lastSync: null });
        setEmails([]);
      }
    } catch {
      setError("Failed to disconnect");
    }
  }

  if (loading) {
    return (
      <div style={S.card}>
        <div style={S.title}>Email Sync</div>
        <div style={{ ...S.muted, padding: 20, textAlign: "center" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={S.title}>Email Sync</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {status?.connected && (
            <>
              <span style={S.statusDot(true)} />
              <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "capitalize" }}>
                {status.provider} connected
              </span>
            </>
          )}
          {!status?.connected && (
            <>
              <span style={S.statusDot(false)} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Not connected</span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#ef444418",
            border: "1px solid #ef444440",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            color: "#ef4444",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Not connected — show connect buttons */}
      {!status?.connected && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <button style={S.btn} onClick={() => handleConnect("gmail")}>
            Connect Gmail
          </button>
          <button style={S.btnOutline} onClick={() => handleConnect("outlook")}>
            Connect Outlook
          </button>
        </div>
      )}

      {/* Connected — show sync button and controls */}
      {status?.connected && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <button style={S.btn} onClick={handleSync} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync Emails"}
          </button>
          <button
            style={{ ...S.btnOutline, color: "#ef4444", borderColor: "#ef444440" }}
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
          {status.lastSync && (
            <span style={S.muted}>Last sync: {relativeTime(status.lastSync)}</span>
          )}
        </div>
      )}

      {/* Email timeline */}
      {emails.length > 0 ? (
        <div>
          {emails.map((email) => (
            <div key={email.id} style={S.emailRow}>
              <span style={S.dirBadge(email.direction)}>
                {email.direction === "inbound" ? "IN" : "OUT"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#f1f5f9",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {email.subject || "(No subject)"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {email.snippet}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  {email.from_email} &middot; {relativeTime(email.sent_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : status?.connected ? (
        <div style={{ ...S.muted, textAlign: "center", padding: 20 }}>
          No synced emails yet. Click "Sync Emails" to pull in recent conversations.
        </div>
      ) : (
        <div style={{ ...S.muted, textAlign: "center", padding: 20 }}>
          Connect your email to sync and track customer conversations.
        </div>
      )}
    </div>
  );
}
