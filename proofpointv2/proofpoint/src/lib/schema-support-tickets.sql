-- ═══════════════════════════════════════════════════════════════════════════
-- ProofPoint — Support Tickets & Email Sends Schema
-- Run in Supabase SQL Editor (Dashboard > SQL > New Query)
-- Requires schema-v2.sql to be applied first
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. support_tickets ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT        NOT NULL,
  account_id      UUID        REFERENCES client_accounts(id) ON DELETE SET NULL,
  external_id     TEXT,
  source          TEXT        NOT NULL DEFAULT 'manual'
                              CHECK (source IN ('zendesk', 'intercom', 'manual', 'email', 'chat')),
  subject         TEXT        NOT NULL,
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'pending', 'in_progress', 'resolved', 'closed')),
  priority        TEXT        NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  customer_name   TEXT,
  customer_email  TEXT,
  assignee        TEXT,
  tags            TEXT[]      DEFAULT '{}',
  internal_notes  TEXT,
  resolved_at     TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status
  ON support_tickets (user_id, status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_priority
  ON support_tickets (user_id, priority);

CREATE INDEX IF NOT EXISTS idx_support_tickets_account
  ON support_tickets (account_id)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_external
  ON support_tickets (external_id, source)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_created
  ON support_tickets (user_id, created_at DESC);

-- RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Service role bypass (for API routes using getSupabaseAdmin)
CREATE POLICY "Service role full access to support_tickets"
  ON support_tickets FOR ALL
  USING (current_setting('role') = 'service_role');


-- ── 2. support_ticket_messages ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id       UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type     TEXT        NOT NULL DEFAULT 'internal'
                              CHECK (sender_type IN ('customer', 'agent', 'internal', 'system')),
  sender_name     TEXT        NOT NULL DEFAULT 'Agent',
  body            TEXT        NOT NULL,
  is_internal     BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket
  ON support_ticket_messages (ticket_id, created_at ASC);

-- RLS (inherit from parent ticket)
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for own tickets"
  ON support_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
        AND support_tickets.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert messages for own tickets"
  ON support_ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
        AND support_tickets.user_id = auth.uid()::text
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to support_ticket_messages"
  ON support_ticket_messages FOR ALL
  USING (current_setting('role') = 'service_role');


-- ── 3. email_sends ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_sends (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT        NOT NULL,
  account_id      UUID        REFERENCES client_accounts(id) ON DELETE SET NULL,
  to_email        TEXT        NOT NULL,
  subject         TEXT        NOT NULL,
  body_preview    TEXT,
  message_id      TEXT,
  template_id     UUID,
  status          TEXT        NOT NULL DEFAULT 'sent'
                              CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_sends_user
  ON email_sends (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_sends_account
  ON email_sends (account_id)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_sends_message_id
  ON email_sends (message_id)
  WHERE message_id IS NOT NULL;

-- RLS
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email sends"
  ON email_sends FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own email sends"
  ON email_sends FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Service role bypass
CREATE POLICY "Service role full access to email_sends"
  ON email_sends FOR ALL
  USING (current_setting('role') = 'service_role');


-- ── 4. Updated_at trigger function ─────────────────────────────────────────
-- Reuse if already exists from schema-v2.sql

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
