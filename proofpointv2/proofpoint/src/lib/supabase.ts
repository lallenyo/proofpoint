import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-safe client (respects row-level security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-only admin client (bypasses RLS — only use in API routes)
export function getSupabaseAdmin() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Report = {
  id: string;
  user_id: string;
  company_name: string;
  report_type: string;
  input_data: Record<string, unknown>;
  generated_report: string;
  industry: string | null;
  mrr: number | null;
  created_at: string;
  updated_at: string;
};

export type ReportSummary = Pick<
  Report,
  "id" | "company_name" | "report_type" | "industry" | "mrr" | "created_at"
>;
