"use client";

import { useState, useEffect, useCallback } from "react";
import { Nav, PageWrapper } from "@/components/Nav";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type TicketStatus = "open" | "pending" | "in_progress" | "resolved" | "closed";
type TicketPriority = "urgent" | "high" | "medium" | "low";
type TicketSource = "zendesk" | "intercom" | "manual" | "email" | "chat";

type SupportTicket = {
  id: string;
  external_id: string | null;
  source: TicketSource;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  customer_name: string | null;
  customer_email: string | null;
  assignee: string | null;
  account_id: string | null;
  resolved_at: string | null;
  external_url: string | null;
  external_created_at: string | null;
  external_updated_at: string | null;
  created_at: string;
  updated_at: string;
  client_accounts?: { id: string; company_name: string } | null;
  thread?: ThreadMessage[];
};

type ThreadMessage = {
  id: string;
  sender_type: string;
  sender_name: string;
  body: string;
  is_internal: boolean;
  created_at: string;
};

type Account = {
  id: string;
  company_name: string;
};

type CSS = React.CSSProperties;

// ── Constants ─────────────────────────────────────────────────────────────────

const font = "'DM Sans', sans-serif";
const headFont = "'Playfair Display', serif";

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; border: string }> = {
  open:        { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  pending:     { bg: "rgba(245,158,11,0.12)",  text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  in_progress: { bg: "rgba(139,92,246,0.12)",  text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  resolved:    { bg: "rgba(16,185,129,0.12)",  text: "#34d399", border: "rgba(16,185,129,0.25)" },
  closed:      { bg: "rgba(100,116,139,0.12)", text: "#94a3b8", border: "rgba(100,116,139,0.2)" },
};

const PRIORITY_COLORS: Record<TicketPriority, { bg: string; text: string; border: string }> = {
  urgent: { bg: "rgba(239,68,68,0.12)",  text: "#f87171", border: "rgba(239,68,68,0.25)" },
  high:   { bg: "rgba(249,115,22,0.12)", text: "#fb923c", border: "rgba(249,115,22,0.25)" },
  medium: { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  low:    { bg: "rgba(100,116,139,0.12)", text: "#94a3b8", border: "rgba(100,116,139,0.2)" },
};

const SOURCE_ICONS: Record<string, string> = {
  zendesk: "🟢", intercom: "🔵", manual: "📝", email: "✉️", chat: "💬",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open", pending: "Pending", in_progress: "In Progress", resolved: "Resolved", closed: "Closed",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: "Urgent", high: "High", medium: "Medium", low: "Low",
};

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, CSS> = {
  container:   { maxWidth: 1260, margin: "0 auto", padding: "40px 24px" },
  heading:     { fontSize: 28, fontWeight: 700, color: "#f1f5f9", fontFamily: headFont, marginBottom: 4 },
  sub:         { fontSize: 14, color: "#64748b", fontFamily: font, marginBottom: 32 },
  secTitle:    { fontSize: 18, fontWeight: 600, color: "#f1f5f9", fontFamily: headFont, marginBottom: 16 },
  panel:       { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10, padding: "24px" },
  card:        { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10, padding: "18px 20px",
                 flex: 1, minWidth: 0 },
  label:       { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em",
                 fontWeight: 600, marginBottom: 6, fontFamily: font },
  bigNumber:   { fontSize: 26, fontWeight: 700, color: "#f1f5f9", fontFamily: headFont },
  badge:       { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20,
                 fontSize: 11, fontWeight: 600, fontFamily: font, letterSpacing: "0.02em" },
  btn:         { background: "#10b981", color: "#fff", border: "none", borderRadius: 6,
                 padding: "8px 16px", fontSize: 13, fontWeight: 600, fontFamily: font,
                 cursor: "pointer", transition: "background 0.15s" },
  btnOut:      { background: "transparent", color: "#94a3b8", border: "1px solid #1e293b",
                 borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                 fontFamily: font, cursor: "pointer", transition: "all 0.15s" },
  btnSm:       { background: "#10b981", color: "#fff", border: "none", borderRadius: 6,
                 padding: "6px 12px", fontSize: 12, fontWeight: 600, fontFamily: font,
                 cursor: "pointer", transition: "background 0.15s" },
  btnDanger:   { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)",
                 borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600,
                 fontFamily: font, cursor: "pointer", transition: "all 0.15s" },
  input:       { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6,
                 padding: "10px 14px", color: "#f1f5f9", fontSize: 13, fontFamily: font,
                 outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.15s" },
  select:      { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6,
                 padding: "10px 14px", color: "#f1f5f9", fontSize: 13, fontFamily: font,
                 outline: "none", width: "100%", boxSizing: "border-box", cursor: "pointer",
                 appearance: "none" },
  textarea:    { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 6,
                 padding: "12px 14px", color: "#f1f5f9", fontSize: 13, fontFamily: font,
                 outline: "none", width: "100%", boxSizing: "border-box",
                 resize: "vertical", minHeight: 100, lineHeight: 1.6, transition: "border-color 0.15s" },
  th:          { padding: "10px 14px", textAlign: "left", fontSize: 11, color: "#64748b",
                 textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
                 fontFamily: font, borderBottom: "1px solid #1e293b", whiteSpace: "nowrap" },
  td:          { padding: "12px 14px", fontSize: 13, color: "#f1f5f9", fontFamily: font,
                 borderBottom: "1px solid rgba(30,41,59,0.5)", whiteSpace: "nowrap" },
  loadWrap:    { display: "flex", alignItems: "center", justifyContent: "center",
                 padding: "80px 0", flexDirection: "column", gap: 16 },
  spinner:     { width: 32, height: 32, border: "3px solid #1e293b",
                 borderTop: "3px solid #10b981", borderRadius: "50%",
                 animation: "spin 0.8s linear infinite" },
  errBox:      { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                 borderRadius: 8, padding: "16px 20px", color: "#f87171", fontSize: 13,
                 fontFamily: font, display: "flex", alignItems: "center", gap: 10 },
  empty:       { textAlign: "center", padding: "60px 20px", color: "#64748b",
                 fontSize: 14, fontFamily: font },
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
                 display: "flex", alignItems: "flex-start", justifyContent: "flex-end" },
  sidePanel:   { width: 520, maxWidth: "90vw", height: "100vh", background: "#0a1628",
                 borderLeft: "1px solid #1e293b", overflowY: "auto", padding: "28px",
                 display: "flex", flexDirection: "column", gap: 20 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeTime(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function trunc(text: string | null, max: number): string {
  if (!text) return "—";
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "...";
}

const focusBorder = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = "#10b981"; };
const blurBorder  = (e: React.FocusEvent<HTMLElement>) => { e.currentTarget.style.borderColor = "#1e293b"; };

// ── MOCK DATA ─────────────────────────────────────────────────────────────────

const MOCK_TICKETS: SupportTicket[] = [
  {
    id: "t-001", external_id: "zendesk_48291", source: "zendesk",
    subject: "Unable to export CSV reports from analytics dashboard",
    description: "Customer reports that when clicking 'Export CSV' on the analytics page, nothing happens. They are using Chrome v120 on macOS Sonoma. The issue started after the latest update. They have tried clearing cache and different browsers with the same result.",
    status: "open", priority: "high",
    customer_name: "Sarah Chen", customer_email: "sarah@acmecorp.com",
    assignee: "Alex Rivera", account_id: null,
    resolved_at: null, external_url: "https://support.zendesk.com/tickets/48291",
    external_created_at: "2026-02-28T14:30:00Z", external_updated_at: "2026-03-01T09:15:00Z",
    created_at: "2026-02-28T14:30:00Z", updated_at: "2026-03-01T09:15:00Z",
    client_accounts: { id: "acc-1", company_name: "Acme Corp" },
    thread: [
      { id: "m1", sender_type: "customer", sender_name: "Sarah Chen", body: "Hi, I can't export CSV reports from the analytics dashboard. Nothing happens when I click the button.", is_internal: false, created_at: "2026-02-28T14:30:00Z" },
      { id: "m2", sender_type: "agent", sender_name: "Alex Rivera", body: "Hi Sarah, thank you for reporting this. Can you tell me which browser version you're using?", is_internal: false, created_at: "2026-02-28T15:10:00Z" },
      { id: "m3", sender_type: "customer", sender_name: "Sarah Chen", body: "Chrome v120 on macOS Sonoma. Also tried Firefox with the same issue.", is_internal: false, created_at: "2026-02-28T16:45:00Z" },
      { id: "m4", sender_type: "internal", sender_name: "Alex Rivera", body: "Escalated to engineering — likely related to the export module changes in v2.14.", is_internal: true, created_at: "2026-03-01T09:15:00Z" },
    ],
  },
  {
    id: "t-002", external_id: "intercom_93102", source: "intercom",
    subject: "SSO login loop — redirects back to login page",
    description: "After entering credentials through Okta SSO, the user is redirected back to the login page instead of the dashboard. Multiple team members affected.",
    status: "in_progress", priority: "urgent",
    customer_name: "James Walker", customer_email: "jwalker@techflow.io",
    assignee: "Morgan Kim", account_id: null,
    resolved_at: null, external_url: null,
    external_created_at: "2026-03-01T08:20:00Z", external_updated_at: "2026-03-02T11:00:00Z",
    created_at: "2026-03-01T08:20:00Z", updated_at: "2026-03-02T11:00:00Z",
    client_accounts: { id: "acc-2", company_name: "TechFlow" },
    thread: [
      { id: "m5", sender_type: "customer", sender_name: "James Walker", body: "Our entire team is stuck in a login loop with Okta SSO. This is urgent — we can't access anything.", is_internal: false, created_at: "2026-03-01T08:20:00Z" },
      { id: "m6", sender_type: "agent", sender_name: "Morgan Kim", body: "James, this is being treated as P0. I've notified our authentication team. Can you share your Okta domain?", is_internal: false, created_at: "2026-03-01T08:35:00Z" },
    ],
  },
  {
    id: "t-003", external_id: null, source: "manual",
    subject: "Request for custom billing integration with NetSuite",
    description: "CloudBase wants a custom integration between our billing module and their NetSuite instance. They need invoice sync, payment reconciliation, and credit memo handling.",
    status: "pending", priority: "medium",
    customer_name: "Priya Patel", customer_email: "priya@cloudbase.dev",
    assignee: null, account_id: null,
    resolved_at: null, external_url: null,
    external_created_at: null, external_updated_at: null,
    created_at: "2026-02-25T10:00:00Z", updated_at: "2026-02-27T16:30:00Z",
    client_accounts: { id: "acc-3", company_name: "CloudBase" },
    thread: [],
  },
  {
    id: "t-004", external_id: "zendesk_48310", source: "zendesk",
    subject: "Health score calculation seems incorrect after data import",
    description: "After importing historical usage data, the health scores dropped across all accounts. Doesn't seem to factor in the new data points correctly.",
    status: "open", priority: "high",
    customer_name: "David Kim", customer_email: "dkim@datastream.co",
    assignee: "Alex Rivera", account_id: null,
    resolved_at: null, external_url: "https://support.zendesk.com/tickets/48310",
    external_created_at: "2026-03-01T16:00:00Z", external_updated_at: "2026-03-02T08:00:00Z",
    created_at: "2026-03-01T16:00:00Z", updated_at: "2026-03-02T08:00:00Z",
    client_accounts: { id: "acc-4", company_name: "DataStream" },
    thread: [],
  },
  {
    id: "t-005", external_id: "intercom_93150", source: "intercom",
    subject: "Feature request: Slack notifications for at-risk accounts",
    description: "Would love to get Slack alerts when an account's health score drops below a threshold. Currently checking the dashboard manually which isn't ideal.",
    status: "open", priority: "low",
    customer_name: "Emily Zhang", customer_email: "emily@nexusops.com",
    assignee: null, account_id: null,
    resolved_at: null, external_url: null,
    external_created_at: "2026-02-26T12:00:00Z", external_updated_at: "2026-02-26T12:00:00Z",
    created_at: "2026-02-26T12:00:00Z", updated_at: "2026-02-26T12:00:00Z",
    client_accounts: { id: "acc-5", company_name: "NexusOps" },
    thread: [],
  },
  {
    id: "t-006", external_id: "zendesk_48220", source: "zendesk",
    subject: "API rate limiting hitting too early for batch operations",
    description: "Our automated sync jobs are getting 429 errors after only ~50 requests. Documentation says 200/min but we're being limited much lower.",
    status: "resolved", priority: "medium",
    customer_name: "Tom Harris", customer_email: "tom@automateq.com",
    assignee: "Morgan Kim", account_id: null,
    resolved_at: "2026-02-28T17:00:00Z", external_url: "https://support.zendesk.com/tickets/48220",
    external_created_at: "2026-02-22T09:00:00Z", external_updated_at: "2026-02-28T17:00:00Z",
    created_at: "2026-02-22T09:00:00Z", updated_at: "2026-02-28T17:00:00Z",
    client_accounts: { id: "acc-6", company_name: "AutomateQ" },
    thread: [
      { id: "m7", sender_type: "agent", sender_name: "Morgan Kim", body: "Hi Tom, we identified the issue — a misconfigured rate limiter on the batch endpoint. Deployed a fix. Your limit should now correctly be 200 req/min.", is_internal: false, created_at: "2026-02-28T17:00:00Z" },
    ],
  },
  {
    id: "t-007", external_id: null, source: "email",
    subject: "Onboarding guide PDF links are broken",
    description: "Several links in the onboarding PDF guide lead to 404 pages. Specifically the integration setup and API reference sections.",
    status: "open", priority: "medium",
    customer_name: "Rachel Moore", customer_email: "rachel@scaleup.io",
    assignee: null, account_id: null,
    resolved_at: null, external_url: null,
    external_created_at: null, external_updated_at: null,
    created_at: "2026-03-02T07:30:00Z", updated_at: "2026-03-02T07:30:00Z",
    client_accounts: null,
    thread: [],
  },
  {
    id: "t-008", external_id: "zendesk_48295", source: "zendesk",
    subject: "Dashboard widgets not loading for team members",
    description: "Admin dashboard works fine, but team members with viewer role see blank widgets. Started after the role permissions update last week.",
    status: "in_progress", priority: "high",
    customer_name: "Chris Johnson", customer_email: "cjohnson@brightpath.com",
    assignee: "Alex Rivera", account_id: null,
    resolved_at: null, external_url: "https://support.zendesk.com/tickets/48295",
    external_created_at: "2026-02-27T11:00:00Z", external_updated_at: "2026-03-01T14:00:00Z",
    created_at: "2026-02-27T11:00:00Z", updated_at: "2026-03-01T14:00:00Z",
    client_accounts: { id: "acc-7", company_name: "BrightPath" },
    thread: [],
  },
  {
    id: "t-009", external_id: "intercom_93088", source: "intercom",
    subject: "Requesting sandbox environment for testing",
    description: "Before rolling out to our production team, we'd like a sandbox environment to test configurations and integrations without affecting live data.",
    status: "pending", priority: "low",
    customer_name: "Lisa Wang", customer_email: "lisa@vertexai.co",
    assignee: "Morgan Kim", account_id: null,
    resolved_at: null, external_url: null,
    external_created_at: "2026-02-24T14:00:00Z", external_updated_at: "2026-02-25T10:00:00Z",
    created_at: "2026-02-24T14:00:00Z", updated_at: "2026-02-25T10:00:00Z",
    client_accounts: { id: "acc-8", company_name: "VertexAI" },
    thread: [],
  },
  {
    id: "t-010", external_id: "zendesk_48180", source: "zendesk",
    subject: "Webhook delivery failures for custom events",
    description: "Custom event webhooks are failing intermittently with timeout errors. Payload sizes are within limits. Seems to happen during peak hours.",
    status: "resolved", priority: "high",
    customer_name: "Mark Stevens", customer_email: "mark@pipeline.io",
    assignee: "Alex Rivera", account_id: null,
    resolved_at: "2026-02-26T15:30:00Z", external_url: "https://support.zendesk.com/tickets/48180",
    external_created_at: "2026-02-20T10:00:00Z", external_updated_at: "2026-02-26T15:30:00Z",
    created_at: "2026-02-20T10:00:00Z", updated_at: "2026-02-26T15:30:00Z",
    client_accounts: { id: "acc-9", company_name: "Pipeline.io" },
    thread: [],
  },
  {
    id: "t-011", external_id: null, source: "chat",
    subject: "How to set up automated playbook triggers",
    description: "Need guidance on setting up automated triggers for playbooks based on health score changes and lifecycle events.",
    status: "closed", priority: "low",
    customer_name: "Anna Lee", customer_email: "anna@growthco.com",
    assignee: "Morgan Kim", account_id: null,
    resolved_at: "2026-02-23T16:00:00Z", external_url: null,
    external_created_at: null, external_updated_at: null,
    created_at: "2026-02-23T14:00:00Z", updated_at: "2026-02-23T16:00:00Z",
    client_accounts: { id: "acc-10", company_name: "GrowthCo" },
    thread: [],
  },
  {
    id: "t-012", external_id: "intercom_93200", source: "intercom",
    subject: "Billing discrepancy — charged twice for February",
    description: "We were charged twice on Feb 1st for our subscription. Need immediate refund for the duplicate charge.",
    status: "open", priority: "urgent",
    customer_name: "Kevin Brown", customer_email: "kevin@finserve.com",
    assignee: null, account_id: null,
    resolved_at: null, external_url: null,
    external_created_at: "2026-03-02T06:00:00Z", external_updated_at: "2026-03-02T06:00:00Z",
    created_at: "2026-03-02T06:00:00Z", updated_at: "2026-03-02T06:00:00Z",
    client_accounts: { id: "acc-11", company_name: "FinServe" },
    thread: [],
  },
  {
    id: "t-013", external_id: "zendesk_48330", source: "zendesk",
    subject: "Email template rendering issue on mobile devices",
    description: "Generated emails look broken on mobile. Tables are overflowing and images aren't responsive.",
    status: "open", priority: "medium",
    customer_name: "Jessica Taylor", customer_email: "jess@mobilefirst.io",
    assignee: null, account_id: null,
    resolved_at: null, external_url: "https://support.zendesk.com/tickets/48330",
    external_created_at: "2026-03-01T20:00:00Z", external_updated_at: "2026-03-01T20:00:00Z",
    created_at: "2026-03-01T20:00:00Z", updated_at: "2026-03-01T20:00:00Z",
    client_accounts: null,
    thread: [],
  },
  {
    id: "t-014", external_id: null, source: "manual",
    subject: "Enterprise SSO setup consultation with GlobalTech",
    description: "GlobalTech needs assistance setting up SAML SSO with their Azure AD. Scheduled consultation for next Tuesday.",
    status: "pending", priority: "medium",
    customer_name: "Robert Chen", customer_email: "rchen@globaltech.com",
    assignee: "Alex Rivera", account_id: null,
    resolved_at: null, external_url: null,
    external_created_at: null, external_updated_at: null,
    created_at: "2026-02-28T09:00:00Z", updated_at: "2026-03-01T11:00:00Z",
    client_accounts: { id: "acc-12", company_name: "GlobalTech" },
    thread: [],
  },
  {
    id: "t-015", external_id: "zendesk_48100", source: "zendesk",
    subject: "Data retention policy questions for compliance audit",
    description: "Our compliance team needs documentation on data retention policies, backup procedures, and GDPR data handling for their annual audit.",
    status: "closed", priority: "medium",
    customer_name: "Maria Garcia", customer_email: "mgarcia@compliance360.com",
    assignee: "Morgan Kim", account_id: null,
    resolved_at: "2026-02-20T14:00:00Z", external_url: "https://support.zendesk.com/tickets/48100",
    external_created_at: "2026-02-15T10:00:00Z", external_updated_at: "2026-02-20T14:00:00Z",
    created_at: "2026-02-15T10:00:00Z", updated_at: "2026-02-20T14:00:00Z",
    client_accounts: { id: "acc-13", company_name: "Compliance360" },
    thread: [],
  },
  {
    id: "t-016", external_id: "intercom_93180", source: "intercom",
    subject: "Custom field mapping not saving in integration settings",
    description: "When I set up field mappings in the Salesforce integration settings and click Save, the page refreshes but mappings revert to defaults.",
    status: "open", priority: "high",
    customer_name: "Nathan Brooks", customer_email: "nbrooks@salesforce-user.com",
    assignee: null, account_id: null,
    resolved_at: null, external_url: null,
    external_created_at: "2026-03-01T13:00:00Z", external_updated_at: "2026-03-02T10:00:00Z",
    created_at: "2026-03-01T13:00:00Z", updated_at: "2026-03-02T10:00:00Z",
    client_accounts: null,
    thread: [],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SupportTicketsPage() {
  // ── State ─────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Detail panel
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [noteText, setNoteText] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Create ticket modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    subject: "", description: "", customer_name: "", customer_email: "",
    priority: "medium" as TicketPriority, source: "manual" as TicketSource,
  });
  const [creating, setCreating] = useState(false);

  // Sync panel
  const [showSync, setShowSync] = useState(false);
  const [syncSource, setSyncSource] = useState<"zendesk" | "intercom">("zendesk");
  const [syncApiKey, setSyncApiKey] = useState("");
  const [syncSubdomain, setSyncSubdomain] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Accounts for linking
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // ── Fetch tickets ─────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/support?${params.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const fetched = data.tickets || [];
      // Merge with mock data if API returns empty (table may not exist yet)
      if (fetched.length === 0) {
        setTickets(MOCK_TICKETS);
      } else {
        setTickets(fetched);
      }
    } catch {
      // Fallback to mock data
      setTickets(MOCK_TICKETS);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, sourceFilter, search]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Fetch accounts for linking
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setAccounts(Array.isArray(d) ? d : []))
      .catch(() => setAccounts([]));
  }, []);

  // ── Computed metrics ──────────────────────────────────────────────────
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const pendingTickets = tickets.filter((t) => t.status === "pending").length;
  const resolvedRecently = tickets.filter((t) => {
    if (t.status !== "resolved" && t.status !== "closed") return false;
    if (!t.resolved_at) return false;
    const d = Date.now() - new Date(t.resolved_at).getTime();
    return d < 7 * 24 * 60 * 60 * 1000; // last 7 days
  }).length;
  const urgentOpen = tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed").length;

  // Avg resolution time (hours) for resolved tickets
  const resolvedTickets = tickets.filter((t) => t.resolved_at && t.created_at);
  const avgResHours = resolvedTickets.length > 0
    ? resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const resolved = new Date(t.resolved_at!).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60);
      }, 0) / resolvedTickets.length
    : 0;

  // ── Filtered tickets ──────────────────────────────────────────────────
  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (sourceFilter !== "all" && t.source !== sourceFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = t.subject.toLowerCase().includes(q)
        || (t.customer_name || "").toLowerCase().includes(q)
        || (t.customer_email || "").toLowerCase().includes(q)
        || (t.client_accounts?.company_name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // ── Actions ───────────────────────────────────────────────────────────
  const handleCreateTicket = useCallback(async () => {
    if (!createForm.subject.trim()) { toast.error("Subject is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Failed to create ticket");
      }
      toast.success("Ticket created successfully");
      setShowCreate(false);
      setCreateForm({ subject: "", description: "", customer_name: "", customer_email: "", priority: "medium", source: "manual" });
      fetchTickets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  }, [createForm, fetchTickets]);

  const handleSync = useCallback(async () => {
    if (!syncApiKey.trim()) { toast.error("API key is required"); return; }
    if (syncSource === "zendesk" && !syncSubdomain.trim()) { toast.error("Subdomain is required for Zendesk"); return; }
    setSyncing(true);
    try {
      const res = await fetch("/api/support/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: syncSource, api_key: syncApiKey, subdomain: syncSubdomain || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Sync failed");
      }
      const data = await res.json();
      toast.success(`Synced ${data.total} tickets (${data.new_count} new, ${data.updated_count} updated)`);
      setShowSync(false);
      setSyncApiKey("");
      setSyncSubdomain("");
      fetchTickets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [syncSource, syncApiKey, syncSubdomain, fetchTickets]);

  const handleStatusChange = useCallback(async (ticket: SupportTicket, newStatus: TicketStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/support/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Update failed");
      }
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
      // Update locally
      setTickets((prev) => prev.map((t) =>
        t.id === ticket.id ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
      ));
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket({ ...selectedTicket, status: newStatus, updated_at: new Date().toISOString() });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }, [selectedTicket]);

  const handleAddNote = useCallback(async () => {
    if (!selectedTicket || !noteText.trim()) return;
    try {
      await fetch(`/api/support/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_note: noteText.trim() }),
      });
      toast.success("Note added");
      const newMsg: ThreadMessage = {
        id: `note-${Date.now()}`,
        sender_type: "internal",
        sender_name: "You",
        body: noteText.trim(),
        is_internal: true,
        created_at: new Date().toISOString(),
      };
      setSelectedTicket({
        ...selectedTicket,
        thread: [...(selectedTicket.thread || []), newMsg],
      });
      setNoteText("");
    } catch {
      toast.error("Failed to add note");
    }
  }, [selectedTicket, noteText]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <Nav />
      <PageWrapper>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={S.container}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
            <div>
              <h1 style={S.heading}>Support Tickets</h1>
              <p style={S.sub}>Track and manage customer support tickets from Zendesk, Intercom, and manual entries</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={S.btnOut} onClick={() => setShowSync(true)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#f1f5f9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}>
                🔄 Sync Tickets
              </button>
              <button style={S.btn} onClick={() => setShowCreate(true)}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#10b981"; }}>
                + New Ticket
              </button>
            </div>
          </div>

          {/* Metrics Bar */}
          <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
            {[
              { label: "Total Tickets", value: totalTickets, color: "#f1f5f9" },
              { label: "Open / Active", value: openTickets, color: "#60a5fa" },
              { label: "Pending", value: pendingTickets, color: "#fbbf24" },
              { label: "Resolved (7d)", value: resolvedRecently, color: "#34d399" },
              { label: "Urgent Open", value: urgentOpen, color: "#f87171" },
              { label: "Avg Resolve", value: avgResHours > 0 ? `${avgResHours.toFixed(0)}h` : "—", color: "#a78bfa" },
            ].map(({ label, value, color }) => (
              <div key={label} style={S.card}>
                <div style={S.label}>{label}</div>
                <div style={{ ...S.bigNumber, color, fontSize: 24 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
              <input
                style={S.input}
                placeholder="Search tickets, customers, accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}>
                  ✕
                </button>
              )}
            </div>
            <select style={{ ...S.select, width: "auto", minWidth: 130 }}
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select style={{ ...S.select, width: "auto", minWidth: 130 }}
              value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select style={{ ...S.select, width: "auto", minWidth: 130 }}
              value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="all">All Sources</option>
              <option value="zendesk">Zendesk</option>
              <option value="intercom">Intercom</option>
              <option value="manual">Manual</option>
              <option value="email">Email</option>
              <option value="chat">Chat</option>
            </select>
            <span style={{ fontSize: 13, color: "#64748b", fontFamily: font }}>
              {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div style={S.errBox}>
              <span>⚠️</span> {error}
              <button style={{ ...S.btnSm, marginLeft: "auto" }} onClick={fetchTickets}>Retry</button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={S.loadWrap as CSS}>
              <div style={S.spinner} />
              <span style={{ color: "#64748b", fontSize: 13, fontFamily: font }}>Loading tickets...</span>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div style={S.empty as CSS}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
              <p style={{ fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>No tickets found</p>
              <p>Try adjusting your filters or sync tickets from Zendesk/Intercom</p>
            </div>
          )}

          {/* Tickets Table */}
          {!loading && filtered.length > 0 && (
            <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Priority</th>
                      <th style={S.th}>Subject</th>
                      <th style={S.th}>Customer</th>
                      <th style={S.th}>Account</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Source</th>
                      <th style={S.th}>Assignee</th>
                      <th style={S.th}>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ticket) => {
                      const pColor = PRIORITY_COLORS[ticket.priority];
                      const sColor = STATUS_COLORS[ticket.status];
                      const isHovered = hoveredRow === ticket.id;
                      return (
                        <tr key={ticket.id}
                          style={{
                            cursor: "pointer",
                            background: isHovered ? "rgba(16,185,129,0.04)" : "transparent",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={() => setHoveredRow(ticket.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          onClick={() => { setSelectedTicket(ticket); setNoteText(""); }}
                        >
                          <td style={S.td}>
                            <span style={{ ...S.badge, background: pColor.bg, color: pColor.text, border: `1px solid ${pColor.border}` }}>
                              {PRIORITY_LABELS[ticket.priority]}
                            </span>
                          </td>
                          <td style={{ ...S.td, whiteSpace: "normal", maxWidth: 300, lineHeight: 1.4 }}>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>{trunc(ticket.subject, 60)}</div>
                            {ticket.description && (
                              <div style={{ fontSize: 12, color: "#64748b" }}>{trunc(ticket.description, 80)}</div>
                            )}
                          </td>
                          <td style={S.td}>
                            <div style={{ fontWeight: 500 }}>{ticket.customer_name || "—"}</div>
                            {ticket.customer_email && (
                              <div style={{ fontSize: 11, color: "#64748b" }}>{ticket.customer_email}</div>
                            )}
                          </td>
                          <td style={S.td}>
                            {ticket.client_accounts ? (
                              <span style={{ ...S.badge, background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                                {ticket.client_accounts.company_name}
                              </span>
                            ) : (
                              <span style={{ color: "#475569" }}>—</span>
                            )}
                          </td>
                          <td style={S.td}>
                            <span style={{ ...S.badge, background: sColor.bg, color: sColor.text, border: `1px solid ${sColor.border}` }}>
                              {STATUS_LABELS[ticket.status]}
                            </span>
                          </td>
                          <td style={S.td}>
                            <span style={{ fontSize: 12 }}>
                              {SOURCE_ICONS[ticket.source] || "📝"} {ticket.source}
                            </span>
                          </td>
                          <td style={S.td}>
                            <span style={{ color: ticket.assignee ? "#f1f5f9" : "#475569" }}>
                              {ticket.assignee || "Unassigned"}
                            </span>
                          </td>
                          <td style={{ ...S.td, color: "#64748b", fontSize: 12 }}>
                            {relativeTime(ticket.updated_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Detail Side Panel ────────────────────────────────────────── */}
        {selectedTicket && (
          <div style={S.overlay as CSS} onClick={(e) => { if (e.target === e.currentTarget) setSelectedTicket(null); }}>
            <div style={S.sidePanel as CSS}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ ...S.badge, ...(() => { const c = PRIORITY_COLORS[selectedTicket.priority]; return { background: c.bg, color: c.text, border: `1px solid ${c.border}` }; })() }}>
                      {PRIORITY_LABELS[selectedTicket.priority]}
                    </span>
                    <span style={{ ...S.badge, ...(() => { const c = STATUS_COLORS[selectedTicket.status]; return { background: c.bg, color: c.text, border: `1px solid ${c.border}` }; })() }}>
                      {STATUS_LABELS[selectedTicket.status]}
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b", fontFamily: font, display: "flex", alignItems: "center", gap: 4 }}>
                      {SOURCE_ICONS[selectedTicket.source]} {selectedTicket.source}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: headFont, lineHeight: 1.4 }}>
                    {selectedTicket.subject}
                  </h2>
                </div>
                <button onClick={() => setSelectedTicket(null)}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, padding: 4 }}>
                  ✕
                </button>
              </div>

              {/* Meta info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={S.label}>Customer</div>
                  <div style={{ fontSize: 13, color: "#f1f5f9", fontFamily: font }}>
                    {selectedTicket.customer_name || "—"}
                    {selectedTicket.customer_email && (
                      <div style={{ fontSize: 12, color: "#64748b" }}>{selectedTicket.customer_email}</div>
                    )}
                  </div>
                </div>
                <div>
                  <div style={S.label}>Account</div>
                  <div style={{ fontSize: 13, color: "#f1f5f9", fontFamily: font }}>
                    {selectedTicket.client_accounts?.company_name || "No account linked"}
                  </div>
                </div>
                <div>
                  <div style={S.label}>Assignee</div>
                  <div style={{ fontSize: 13, color: "#f1f5f9", fontFamily: font }}>
                    {selectedTicket.assignee || "Unassigned"}
                  </div>
                </div>
                <div>
                  <div style={S.label}>Created</div>
                  <div style={{ fontSize: 13, color: "#f1f5f9", fontFamily: font }}>
                    {formatDate(selectedTicket.created_at)}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedTicket.description && (
                <div>
                  <div style={S.label}>Description</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", fontFamily: font, lineHeight: 1.7,
                    background: "#050b18", borderRadius: 8, padding: "14px 16px", border: "1px solid #1e293b" }}>
                    {selectedTicket.description}
                  </div>
                </div>
              )}

              {/* Status Change */}
              <div>
                <div style={S.label}>Change Status</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["open", "pending", "in_progress", "resolved", "closed"] as TicketStatus[]).map((s) => {
                    const isActive = selectedTicket.status === s;
                    const c = STATUS_COLORS[s];
                    return (
                      <button key={s}
                        disabled={isActive || updatingStatus}
                        onClick={() => handleStatusChange(selectedTicket, s)}
                        style={{
                          ...S.badge,
                          background: isActive ? c.bg : "transparent",
                          color: isActive ? c.text : "#64748b",
                          border: `1px solid ${isActive ? c.border : "#1e293b"}`,
                          cursor: isActive ? "default" : "pointer",
                          opacity: updatingStatus ? 0.5 : 1,
                          transition: "all 0.15s",
                          padding: "5px 12px",
                        }}>
                        {STATUS_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conversation Thread */}
              <div>
                <div style={S.label}>Conversation Thread ({(selectedTicket.thread || []).length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" }}>
                  {(selectedTicket.thread || []).length === 0 && (
                    <div style={{ fontSize: 13, color: "#475569", fontFamily: font, padding: "12px 0" }}>
                      No messages yet
                    </div>
                  )}
                  {(selectedTicket.thread || []).map((msg) => (
                    <div key={msg.id} style={{
                      background: msg.is_internal ? "rgba(139,92,246,0.06)" : "#050b18",
                      border: `1px solid ${msg.is_internal ? "rgba(139,92,246,0.15)" : "#1e293b"}`,
                      borderRadius: 8, padding: "12px 14px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", fontFamily: font }}>
                            {msg.sender_name}
                          </span>
                          {msg.is_internal && (
                            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4,
                              background: "rgba(139,92,246,0.15)", color: "#a78bfa", fontWeight: 600, fontFamily: font }}>
                              INTERNAL
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "#64748b", fontFamily: font,
                            textTransform: "capitalize" }}>
                            {msg.sender_type}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "#64748b", fontFamily: font }}>
                          {relativeTime(msg.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#cbd5e1", fontFamily: font, lineHeight: 1.6 }}>
                        {msg.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Internal Note */}
              <div>
                <div style={S.label}>Add Internal Note</div>
                <textarea
                  style={S.textarea as CSS}
                  placeholder="Add an internal note visible only to your team..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button style={{ ...S.btnSm, opacity: noteText.trim() ? 1 : 0.5 }}
                    disabled={!noteText.trim()}
                    onClick={handleAddNote}>
                    Add Note
                  </button>
                </div>
              </div>

              {/* External link */}
              {selectedTicket.external_url && (
                <div>
                  <a href={selectedTicket.external_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, color: "#10b981", fontFamily: font, textDecoration: "none" }}>
                    View in {selectedTicket.source} →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Create Ticket Modal ──────────────────────────────────────── */}
        {showCreate && (
          <div style={S.overlay as CSS} onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
            <div style={{ ...S.sidePanel as CSS, width: 480 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", fontFamily: headFont }}>
                  Create Support Ticket
                </h2>
                <button onClick={() => setShowCreate(false)}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20 }}>
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={S.label as CSS}>Subject *</label>
                  <input style={S.input} value={createForm.subject}
                    onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                    onFocus={focusBorder} onBlur={blurBorder}
                    placeholder="Brief description of the issue" />
                </div>
                <div>
                  <label style={S.label as CSS}>Description</label>
                  <textarea style={S.textarea as CSS} value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    onFocus={focusBorder} onBlur={blurBorder}
                    placeholder="Detailed description of the issue..." />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={S.label as CSS}>Customer Name</label>
                    <input style={S.input} value={createForm.customer_name}
                      onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                      onFocus={focusBorder} onBlur={blurBorder}
                      placeholder="Customer name" />
                  </div>
                  <div>
                    <label style={S.label as CSS}>Customer Email</label>
                    <input style={S.input} value={createForm.customer_email}
                      onChange={(e) => setCreateForm({ ...createForm, customer_email: e.target.value })}
                      onFocus={focusBorder} onBlur={blurBorder}
                      placeholder="customer@example.com" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={S.label as CSS}>Priority</label>
                    <select style={S.select} value={createForm.priority}
                      onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as TicketPriority })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.label as CSS}>Source</label>
                    <select style={S.select} value={createForm.source}
                      onChange={(e) => setCreateForm({ ...createForm, source: e.target.value as TicketSource })}>
                      <option value="manual">Manual</option>
                      <option value="email">Email</option>
                      <option value="chat">Chat</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button style={S.btnOut} onClick={() => setShowCreate(false)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#f1f5f9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}>
                    Cancel
                  </button>
                  <button style={{ ...S.btn, opacity: creating ? 0.6 : 1 }}
                    disabled={creating}
                    onClick={handleCreateTicket}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#10b981"; }}>
                    {creating ? "Creating..." : "Create Ticket"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sync Panel Modal ─────────────────────────────────────────── */}
        {showSync && (
          <div style={S.overlay as CSS} onClick={(e) => { if (e.target === e.currentTarget) setShowSync(false); }}>
            <div style={{ ...S.sidePanel as CSS, width: 480 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", fontFamily: headFont }}>
                  Sync External Tickets
                </h2>
                <button onClick={() => setShowSync(false)}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20 }}>
                  ✕
                </button>
              </div>

              <p style={{ fontSize: 13, color: "#64748b", fontFamily: font, marginBottom: 20, lineHeight: 1.6 }}>
                Connect your Zendesk or Intercom account to import support tickets automatically.
                Tickets are deduplicated by external ID so syncing is safe to run multiple times.
              </p>

              {/* Source selector */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {(["zendesk", "intercom"] as const).map((src) => (
                  <button key={src}
                    onClick={() => setSyncSource(src)}
                    style={{
                      flex: 1, padding: "14px", borderRadius: 8,
                      background: syncSource === src ? "rgba(16,185,129,0.08)" : "#050b18",
                      border: `1px solid ${syncSource === src ? "rgba(16,185,129,0.3)" : "#1e293b"}`,
                      color: syncSource === src ? "#10b981" : "#94a3b8",
                      cursor: "pointer", fontFamily: font, fontWeight: 600, fontSize: 14,
                      transition: "all 0.15s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    }}>
                    <span style={{ fontSize: 24 }}>{src === "zendesk" ? "🟢" : "🔵"}</span>
                    {src === "zendesk" ? "Zendesk" : "Intercom"}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={S.label as CSS}>API Key *</label>
                  <input style={S.input} type="password" value={syncApiKey}
                    onChange={(e) => setSyncApiKey(e.target.value)}
                    onFocus={focusBorder} onBlur={blurBorder}
                    placeholder={syncSource === "zendesk" ? "Zendesk API token" : "Intercom access token"} />
                </div>

                {syncSource === "zendesk" && (
                  <div>
                    <label style={S.label as CSS}>Subdomain *</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      <input style={{ ...S.input, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        value={syncSubdomain}
                        onChange={(e) => setSyncSubdomain(e.target.value)}
                        onFocus={focusBorder} onBlur={blurBorder}
                        placeholder="yourcompany" />
                      <span style={{
                        background: "#050b18", border: "1px solid #1e293b", borderLeft: "none",
                        borderTopRightRadius: 6, borderBottomRightRadius: 6,
                        padding: "10px 14px", fontSize: 13, color: "#64748b", fontFamily: font,
                        whiteSpace: "nowrap",
                      }}>
                        .zendesk.com
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
                  borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, color: "#60a5fa", fontFamily: font, fontWeight: 600, marginBottom: 4 }}>
                    💡 How it works
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: font, lineHeight: 1.6 }}>
                    {syncSource === "zendesk"
                      ? "Fetches up to 100 most recently updated tickets from your Zendesk instance. Existing tickets are updated, new ones are created."
                      : "Fetches up to 50 most recently updated conversations from your Intercom workspace. Conversations are mapped to support tickets."}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button style={S.btnOut} onClick={() => setShowSync(false)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#f1f5f9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#94a3b8"; }}>
                    Cancel
                  </button>
                  <button style={{ ...S.btn, opacity: syncing ? 0.6 : 1 }}
                    disabled={syncing}
                    onClick={handleSync}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#10b981"; }}>
                    {syncing ? "Syncing..." : `Sync from ${syncSource === "zendesk" ? "Zendesk" : "Intercom"}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  );
}
