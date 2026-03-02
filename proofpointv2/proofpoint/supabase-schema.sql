-- ============================================================
-- PROOFPOINT — SUPABASE DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Reports table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       TEXT          NOT NULL,
  company_name  TEXT          NOT NULL,
  report_type   TEXT          NOT NULL,
  input_data    JSONB         NOT NULL DEFAULT '{}',
  generated_report TEXT       NOT NULL DEFAULT '',
  industry      TEXT,
  mrr           NUMERIC,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Row Level Security: users can only see their own reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reports" ON reports;
CREATE POLICY "Users manage own reports"
  ON reports FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS reports_user_created_idx
  ON reports(user_id, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── User integrations (HubSpot token storage) ─────────────────
CREATE TABLE IF NOT EXISTS user_integrations (
  user_id         TEXT    PRIMARY KEY,
  hubspot_token   TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own integrations" ON user_integrations;
CREATE POLICY "Users manage own integrations"
  ON user_integrations FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP TRIGGER IF EXISTS integrations_updated_at ON user_integrations;
CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Waitlist table (for landing page) ─────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT          NOT NULL UNIQUE,
  source      TEXT,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Waitlist is write-only for anonymous users
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist;
CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (true);

-- Only service role can read waitlist (used by admin panel)
