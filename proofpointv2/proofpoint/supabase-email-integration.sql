-- ============================================================
-- EMAIL INTEGRATION — Database Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Add email columns to user_integrations ──────────────────
ALTER TABLE user_integrations
  ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
  ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outlook_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS outlook_access_token TEXT,
  ADD COLUMN IF NOT EXISTS outlook_token_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_provider TEXT;

-- ── Email sync log table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sync_log (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT          NOT NULL,
  account_id  UUID          REFERENCES client_accounts(id) ON DELETE CASCADE,
  message_id  TEXT          NOT NULL UNIQUE,
  thread_id   TEXT,
  from_email  TEXT,
  to_emails   TEXT[],
  subject     TEXT,
  snippet     TEXT,
  direction   TEXT          CHECK (direction IN ('inbound', 'outbound')),
  sent_at     TIMESTAMPTZ,
  synced_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE email_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own email sync logs" ON email_sync_log;
CREATE POLICY "Users manage own email sync logs"
  ON email_sync_log FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS email_sync_log_user_idx
  ON email_sync_log(user_id);
CREATE INDEX IF NOT EXISTS email_sync_log_account_idx
  ON email_sync_log(account_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS email_sync_log_message_idx
  ON email_sync_log(message_id);
