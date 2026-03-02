// ═══════════════════════════════════════════════════════════════════════════
// Zod Validation Schemas — centralized input validation for all API routes
// ═══════════════════════════════════════════════════════════════════════════

import { z } from "zod";

// ── Accounts ──────────────────────────────────────────────────────────────

export const createAccountSchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(200, "Company name too long"),
  industry: z
    .enum(["healthcare", "fintech", "hrtech", "saas", "realestate"])
    .nullable()
    .optional(),
  mrr: z.number().min(0, "MRR must be non-negative").nullable().optional(),
  lifecycle_stage: z
    .enum(["onboarding", "active", "at-risk", "churned", "expanded", "renewal-due"])
    .nullable()
    .optional(),
  contract_start: z.string().nullable().optional(),
  contract_end: z.string().nullable().optional(),
  primary_contact: z.string().max(200).nullable().optional(),
  primary_email: z.string().email("Invalid email format").nullable().optional().or(z.literal("")),
  hubspot_company_id: z.string().max(100).nullable().optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

// ── Tasks ─────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(500, "Title too long"),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional().default("medium"),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional().default("pending"),
  due_date: z.string().nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
  source: z.enum(["manual", "playbook", "ai_suggestion", "alert"]).optional().default("manual"),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional(),
  due_date: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

// ── Reports ───────────────────────────────────────────────────────────────

export const createReportSchema = z.object({
  company_name: z.string().min(1).max(200),
  report_type: z.string().min(1).max(100),
  industry: z.string().max(100).nullable().optional(),
  mrr: z.number().min(0).nullable().optional(),
  generated_report: z.string().min(1),
});

// ── Email Generation ──────────────────────────────────────────────────────

export const generateEmailSchema = z.object({
  template_id: z.string().uuid(),
  account_id: z.string().uuid(),
  ai_enhance: z.boolean().optional().default(false),
});

// ── Alerts ────────────────────────────────────────────────────────────────

export const alertActionSchema = z.object({
  action: z.enum(["mark_read", "mark_unread", "dismiss"]),
  alert_ids: z.array(z.string().uuid()).min(1, "At least one alert ID required"),
});

// ── AI Anthropic ──────────────────────────────────────────────────────────

export const anthropicRequestSchema = z.object({
  system: z.string().max(10000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(50000),
      })
    )
    .min(1, "At least one message required"),
  max_tokens: z.number().int().min(1).max(8000).optional(),
});

// ── Playbooks ─────────────────────────────────────────────────────────────

export const createPlaybookSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  trigger_type: z.enum([
    "new_customer",
    "renewal_approaching",
    "health_drop",
    "expansion_signal",
    "manual",
  ]),
  steps: z.array(
    z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      day_offset: z.number().int(),
      task_priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
    })
  ),
});

export const runPlaybookSchema = z.object({
  account_id: z.string().uuid(),
});
