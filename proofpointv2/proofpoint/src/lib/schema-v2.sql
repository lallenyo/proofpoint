-- ═══════════════════════════════════════════════════════════════════════════
-- Proofpoint v2 — Client Accounts Database Schema
-- Run in Supabase SQL Editor (Dashboard → SQL → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enable required extensions ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. client_accounts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_accounts (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          TEXT        NOT NULL,
  user_id         TEXT        NOT NULL,
  company_name    TEXT        NOT NULL,
  domain          TEXT,
  industry        TEXT        CHECK (industry IN ('healthcare', 'fintech', 'hrtech', 'saas', 'realestate')),
  lifecycle_stage TEXT        DEFAULT 'onboarding'
                              CHECK (lifecycle_stage IN (
                                'onboarding', 'active', 'renewal-due', 'renewed',
                                'expanded', 'at-risk', 'churned', 'paused'
                              )),
  mrr             NUMERIC     DEFAULT 0,
  arr             NUMERIC     GENERATED ALWAYS AS (mrr * 12) STORED,
  contract_start  DATE,
  contract_end    DATE,
  health_score    INTEGER     DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  health_trend    TEXT        DEFAULT 'stable' CHECK (health_trend IN ('improving', 'stable', 'declining')),
  nps_score       INTEGER,
  last_contact_date TIMESTAMPTZ,
  hubspot_company_id TEXT,
  custom_fields   JSONB       DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_stage
  ON client_accounts (user_id, lifecycle_stage);

CREATE INDEX IF NOT EXISTS idx_accounts_user_contract_end
  ON client_accounts (user_id, contract_end);

CREATE INDEX IF NOT EXISTS idx_accounts_hubspot_id
  ON client_accounts (hubspot_company_id)
  WHERE hubspot_company_id IS NOT NULL;

-- RLS
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON client_accounts FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own accounts"
  ON client_accounts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own accounts"
  ON client_accounts FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own accounts"
  ON client_accounts FOR DELETE
  USING (auth.uid()::text = user_id);

-- Service role bypass (for API routes using admin client)
CREATE POLICY "Service role full access on accounts"
  ON client_accounts FOR ALL
  USING (auth.role() = 'service_role');

-- ── 2. account_contacts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_contacts (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID        NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  email           TEXT,
  title           TEXT,
  role            TEXT        CHECK (role IN ('champion', 'decision-maker', 'user', 'executive', 'detractor')),
  is_primary      BOOLEAN     DEFAULT false,
  last_contacted  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_account
  ON account_contacts (account_id);

-- RLS (inherit from parent account)
ALTER TABLE account_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts for own accounts"
  ON account_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.id = account_contacts.account_id
        AND client_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert contacts for own accounts"
  ON account_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.id = account_contacts.account_id
        AND client_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update contacts for own accounts"
  ON account_contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.id = account_contacts.account_id
        AND client_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete contacts for own accounts"
  ON account_contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.id = account_contacts.account_id
        AND client_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Service role full access on contacts"
  ON account_contacts FOR ALL
  USING (auth.role() = 'service_role');

-- ── 3. account_activities ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_activities (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID        NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL,
  activity_type   TEXT        NOT NULL
                              CHECK (activity_type IN (
                                'note', 'email', 'call', 'meeting',
                                'health-change', 'stage-change', 'report-generated'
                              )),
  title           TEXT,
  description     TEXT,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_account_date
  ON account_activities (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_user
  ON account_activities (user_id);

-- RLS
ALTER TABLE account_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for own accounts"
  ON account_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.id = account_activities.account_id
        AND client_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert activities for own accounts"
  ON account_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.id = account_activities.account_id
        AND client_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own activities"
  ON account_activities FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own activities"
  ON account_activities FOR DELETE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role full access on activities"
  ON account_activities FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. health_score_history ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_score_history (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID        NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  score           INTEGER     NOT NULL CHECK (score >= 0 AND score <= 100),
  factors         JSONB,
  calculated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_history_account_date
  ON health_score_history (account_id, calculated_at DESC);

-- RLS
ALTER TABLE health_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view health history for own accounts"
  ON health_score_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_accounts
      WHERE client_accounts.id = health_score_history.account_id
        AND client_accounts.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Service role full access on health history"
  ON health_score_history FOR ALL
  USING (auth.role() = 'service_role');

-- ── 5. Waitlist table (for landing page) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT        NOT NULL UNIQUE,
  source          TEXT        DEFAULT 'landing-page',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist (email);

-- ── 6. updated_at trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_client_accounts
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE — Run this SQL in Supabase to create the v2 schema.
-- ═══════════════════════════════════════════════════════════════════════════
