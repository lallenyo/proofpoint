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

-- ── 6. organizations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  TEXT,
  owner_user_id         TEXT        NOT NULL UNIQUE,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  plan_tier             TEXT        DEFAULT 'trial' CHECK (plan_tier IN ('trial', 'starter', 'growth', 'scale')),
  seats_purchased       INTEGER     DEFAULT 1,
  billing_interval      TEXT        CHECK (billing_interval IN ('monthly', 'annual')),
  subscription_status   TEXT        DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at         TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  current_period_end    TIMESTAMPTZ,
  ai_actions_used       INTEGER     DEFAULT 0,
  ai_actions_limit      INTEGER     DEFAULT 500,
  onboarding_completed  BOOLEAN     DEFAULT false,
  custom_fields         JSONB       DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orgs_owner ON organizations (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer ON organizations (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org"
  ON organizations FOR SELECT
  USING (owner_user_id = auth.uid()::text);

CREATE POLICY "Service role full access on organizations"
  ON organizations FOR ALL
  USING (auth.role() = 'service_role');

-- ── 7. org_members ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_members (
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     TEXT        NOT NULL,
  role        TEXT        DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships"
  ON org_members FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role full access on org_members"
  ON org_members FOR ALL
  USING (auth.role() = 'service_role');

-- ── 8. tasks ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT        NOT NULL,
  account_id      UUID        REFERENCES client_accounts(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT,
  priority        TEXT        DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status          TEXT        DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  due_date        DATE,
  source          TEXT        DEFAULT 'manual' CHECK (source IN ('manual', 'playbook', 'ai-suggestion', 'health-alert')),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due
  ON tasks (user_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_account
  ON tasks (account_id)
  WHERE account_id IS NOT NULL;

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role full access on tasks"
  ON tasks FOR ALL
  USING (auth.role() = 'service_role');

-- ── 9. playbook_templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playbook_templates (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  description     TEXT,
  trigger_type    TEXT        CHECK (trigger_type IN ('manual', 'lifecycle_change', 'health_drop', 'renewal_approaching', 'new_account')),
  trigger_config  JSONB       DEFAULT '{}',
  steps           JSONB       DEFAULT '[]',
  is_system       BOOLEAN     DEFAULT false,
  is_active       BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbooks_org ON playbook_templates (org_id);

ALTER TABLE playbook_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org playbooks"
  ON playbook_templates FOR SELECT
  USING (true);

CREATE POLICY "Service role full access on playbooks"
  ON playbook_templates FOR ALL
  USING (auth.role() = 'service_role');

-- ── 10. playbook_runs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playbook_runs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id     UUID        REFERENCES playbook_templates(id) ON DELETE CASCADE,
  account_id      UUID        REFERENCES client_accounts(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL,
  status          TEXT        DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'canceled')),
  current_step    INTEGER     DEFAULT 0,
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_playbook_runs_user ON playbook_runs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_account ON playbook_runs (account_id);

ALTER TABLE playbook_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playbook runs"
  ON playbook_runs FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own playbook runs"
  ON playbook_runs FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own playbook runs"
  ON playbook_runs FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role full access on playbook_runs"
  ON playbook_runs FOR ALL
  USING (auth.role() = 'service_role');

-- ── 11. email_templates ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          TEXT,
  name            TEXT        NOT NULL,
  category        TEXT        CHECK (category IN (
    'check-in', 'qbr-invite', 'renewal', 'at-risk',
    'expansion', 'onboarding', 'thank-you', 'escalation'
  )),
  subject_template TEXT,
  body_template   TEXT,
  is_system       BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates (org_id);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view email templates"
  ON email_templates FOR SELECT
  USING (true);

CREATE POLICY "Service role full access on email_templates"
  ON email_templates FOR ALL
  USING (auth.role() = 'service_role');

-- ── 12. updated_at trigger ────────────────────────────────────────────────
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

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE — Run this SQL in Supabase to create the v2 schema.
-- ═══════════════════════════════════════════════════════════════════════════
