"use client";

import { useState } from "react";
import Link from "next/link";

// ── Demo accounts data ────────────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { id: "demo-1", company_name: "Meridian Health", industry: "healthcare", mrr: 45000, health_score: 87, lifecycle_stage: "active", contract_end: "2026-09-15", primary_contact: "Dr. Chen Wei", primary_email: "cwei@meridianhealth.com", adoption_rate: 78, support_tickets_90d: 4 },
  { id: "demo-2", company_name: "NovaPay Financial", industry: "fintech", mrr: 28000, health_score: 34, lifecycle_stage: "at-risk", contract_end: "2026-04-20", primary_contact: "James Rodriguez", primary_email: "jrodriguez@novapay.io", adoption_rate: 31, support_tickets_90d: 28 },
  { id: "demo-3", company_name: "TalentForge HR", industry: "hrtech", mrr: 62000, health_score: 73, lifecycle_stage: "renewal-due", contract_end: "2026-05-01", primary_contact: "Lisa Patel", primary_email: "lpatel@talentforge.com", adoption_rate: 65, support_tickets_90d: 12 },
  { id: "demo-4", company_name: "CloudStack", industry: "saas", mrr: 15000, health_score: 91, lifecycle_stage: "expanded", contract_end: "2027-01-10", primary_contact: "Mike Thompson", primary_email: "mthompson@cloudstack.dev", adoption_rate: 88, support_tickets_90d: 2 },
  { id: "demo-5", company_name: "PropVault Realty", industry: "realestate", mrr: 38000, health_score: 52, lifecycle_stage: "at-risk", contract_end: "2026-06-30", primary_contact: "Sarah Kim", primary_email: "skim@propvault.com", adoption_rate: 42, support_tickets_90d: 19 },
  { id: "demo-6", company_name: "DataPulse Analytics", industry: "saas", mrr: 22000, health_score: 68, lifecycle_stage: "active", contract_end: "2026-11-15", primary_contact: "Alex Novak", primary_email: "anovak@datapulse.ai", adoption_rate: 60, support_tickets_90d: 8 },
];

type DemoAccount = (typeof DEMO_ACCOUNTS)[number];

// ── Fallback demo reports ─────────────────────────────────────────────────────
const FALLBACK_REPORTS: Record<string, Record<string, string>> = {
  "Executive Summary": {
    "demo-1": `## Executive Summary \u2014 Meridian Health\n\n**Account Health: Strong (87/100)**\n\nMeridian Health continues to demonstrate exceptional platform engagement with a 78% adoption rate and minimal support friction (4 tickets in 90 days). Their $45,000/mo investment is delivering measurable ROI across clinical workflow automation.\n\n## Value Delivered\n\n- **Clinical Efficiency:** 32% reduction in patient intake processing time\n- **Compliance:** Automated audit trail generation saving ~15 hours/week\n- **Staff Satisfaction:** 4.6/5 internal platform rating from nursing staff\n\n## Recommendations\n\n1. Explore expansion into their new Pediatrics wing (opening Q3 2026)\n2. Schedule executive business review with Dr. Chen Wei before September renewal\n3. Introduce advanced analytics module to support their population health initiative\n\n## Risk Factors\n\nNone critical. Monitor contract renewal timeline (Sept 15, 2026) and begin renewal conversations by July.`,

    "demo-2": `## Executive Summary \u2014 NovaPay Financial\n\n**Account Health: Critical (34/100)**\n\nNovaPay Financial is showing significant signs of disengagement. Adoption has dropped to 31% and the team has filed 28 support tickets in the past 90 days, indicating both frustration and technical barriers. Immediate intervention is required before the April 20 contract end.\n\n## Value Delivered\n\n- **Transaction Processing:** Platform handles 12,000 daily transactions\n- **Compliance Reporting:** Automated SOX compliance reports (though underutilized)\n- **Cost Savings:** Estimated $8,200/mo vs. previous vendor\n\n## Recommendations\n\n1. Schedule an emergency executive call with James Rodriguez this week\n2. Deploy dedicated support engineer for 2-week onsite stabilization\n3. Offer 60-day contract extension at current rate to allow recovery time\n4. Conduct root-cause analysis on the 28 open support tickets\n\n## Risk Factors\n\n- **HIGH:** Contract expires April 20 \u2014 only weeks away\n- **HIGH:** Adoption at 31% indicates potential champion departure\n- **MEDIUM:** Competitor RFP rumored in their fintech peer group`,

    "demo-3": `## Executive Summary \u2014 TalentForge HR\n\n**Account Health: Moderate (73/100)**\n\nTalentForge HR is approaching renewal with solid but not outstanding engagement. Their 65% adoption rate has room for growth, and the 12 support tickets suggest some friction points. The May 1 renewal date requires proactive outreach now.\n\n## Value Delivered\n\n- **Recruiting Efficiency:** 28% faster candidate pipeline progression\n- **Onboarding:** Reduced new-hire onboarding from 14 days to 8 days\n- **Retention Analytics:** Predictive attrition model accuracy at 79%\n\n## Recommendations\n\n1. Present expansion proposal for their new EMEA hiring initiative\n2. Conduct adoption workshop targeting the 35% of unused features\n3. Prepare multi-year renewal offer with volume discount for their 200+ seat growth\n\n## Risk Factors\n\n- **MEDIUM:** Renewal due May 1 \u2014 conversations should begin immediately\n- **LOW:** Some feature gaps reported in performance review module`,

    "demo-4": `## Executive Summary \u2014 CloudStack\n\n**Account Health: Excellent (91/100)**\n\nCloudStack is a model account with 88% adoption, minimal support needs (2 tickets in 90 days), and strong executive sponsorship from Mike Thompson. This account is primed for expansion.\n\n## Value Delivered\n\n- **Infrastructure Monitoring:** 99.97% uptime achieved across 340 microservices\n- **Cost Optimization:** Identified $14,200/mo in unused cloud resources\n- **Developer Velocity:** CI/CD pipeline insights adopted by 6 engineering teams\n\n## Recommendations\n\n1. Propose Enterprise tier upgrade to unlock advanced security scanning\n2. Nominate CloudStack for customer advisory board participation\n3. Explore co-marketing case study opportunity with Mike Thompson\n\n## Risk Factors\n\nNo significant risks. Contract secured through January 2027.`,

    "demo-5": `## Executive Summary \u2014 PropVault Realty\n\n**Account Health: At Risk (52/100)**\n\nPropVault Realty is underperforming on adoption (42%) and generating elevated support volume (19 tickets in 90 days). Their $38,000/mo contract ending June 30 gives us a narrow window to demonstrate renewed value.\n\n## Value Delivered\n\n- **Property Listings:** Automated syndication to 45+ platforms\n- **Lead Scoring:** AI-driven lead qualification processing 2,800 leads/month\n- **Transaction Management:** Digital closing workflow adopted by 60% of agents\n\n## Recommendations\n\n1. Assign a dedicated CSM for weekly check-ins with Sarah Kim\n2. Conduct feature re-training for the 58% of unused platform capabilities\n3. Build an ROI report showing concrete dollar impact for their leadership\n4. Offer a renewal incentive tied to adoption milestones\n\n## Risk Factors\n\n- **HIGH:** Adoption trending downward (was 58% three months ago)\n- **MEDIUM:** Key champion Sarah Kim missed last two QBR meetings\n- **MEDIUM:** Contract end June 30 \u2014 begin renewal talks immediately`,

    "demo-6": `## Executive Summary \u2014 DataPulse Analytics\n\n**Account Health: Moderate (68/100)**\n\nDataPulse Analytics maintains steady but unspectacular engagement at 60% adoption. Their 8 support tickets indicate normal usage patterns. There is meaningful upside potential with targeted enablement.\n\n## Value Delivered\n\n- **Data Pipeline:** Processing 2.1TB daily with 99.8% reliability\n- **Dashboard Adoption:** 34 active dashboards used by 85 team members\n- **Alert Accuracy:** Anomaly detection precision improved to 91%\n\n## Recommendations\n\n1. Introduce the new ML model training module to their data science team\n2. Schedule an adoption deep-dive with Alex Novak to identify friction points\n3. Propose a joint webinar on their successful anomaly detection implementation\n\n## Risk Factors\n\n- **LOW:** Adoption has plateaued; needs engagement push\n- **LOW:** Contract secure through November 2026`,
  },

  "QBR Narrative": {
    "demo-1": `## Quarterly Business Review \u2014 Meridian Health\n**Period: Q1 2026 | Prepared for Dr. Chen Wei**\n\n### Performance Highlights\n\nThis quarter marked continued strong performance for the Meridian Health partnership. Platform adoption increased from 72% to 78%, driven primarily by the radiology department\u2019s full onboarding in February.\n\n### Key Metrics\n\n| Metric | Last Quarter | This Quarter | Change |\n|--------|-------------|--------------|--------|\n| Adoption Rate | 72% | 78% | +6% |\n| Support Tickets | 7 | 4 | -43% |\n| MRR | $45,000 | $45,000 | Stable |\n| Health Score | 83 | 87 | +4 |\n\n### Wins\n\n- Radiology department fully onboarded (28 new users)\n- Automated compliance reports saved an estimated 60 hours this quarter\n- Zero critical incidents reported\n\n### Areas for Improvement\n\n- Outpatient scheduling module remains at 45% adoption\n- Mobile app usage below benchmark for healthcare vertical\n\n### Next Quarter Goals\n\n1. Reach 85% overall adoption by onboarding outpatient scheduling\n2. Launch mobile app pilot with 50 users\n3. Begin renewal planning conversations (contract ends Sept 2026)`,

    "demo-2": `## Quarterly Business Review \u2014 NovaPay Financial\n**Period: Q1 2026 | Prepared for James Rodriguez**\n\n### Performance Summary\n\nQ1 has been a challenging quarter for the NovaPay engagement. Key metrics have declined and urgent attention is required before the April contract deadline.\n\n### Key Metrics\n\n| Metric | Last Quarter | This Quarter | Change |\n|--------|-------------|--------------|--------|\n| Adoption Rate | 48% | 31% | -17% |\n| Support Tickets | 15 | 28 | +87% |\n| MRR | $28,000 | $28,000 | Stable |\n| Health Score | 51 | 34 | -17 |\n\n### Critical Issues\n\n- API integration failures causing 3-4 hour daily delays in transaction reconciliation\n- Key power user (CFO office) has stopped logging in since February\n- 12 of 28 tickets are severity-high or critical\n\n### Recovery Plan\n\n1. Deploy engineering team for API stabilization sprint (Week 1-2)\n2. Executive alignment call with James Rodriguez and VP Engineering\n3. Present revised implementation roadmap addressing top 5 pain points\n4. Negotiate contract extension to allow stabilization time`,

    "demo-3": `## Quarterly Business Review \u2014 TalentForge HR\n**Period: Q1 2026 | Prepared for Lisa Patel**\n\n### Performance Summary\n\nTalentForge HR had a steady Q1 with incremental adoption gains. The upcoming May renewal presents an opportunity to deepen the partnership.\n\n### Key Metrics\n\n| Metric | Last Quarter | This Quarter | Change |\n|--------|-------------|--------------|--------|\n| Adoption Rate | 61% | 65% | +4% |\n| Support Tickets | 14 | 12 | -14% |\n| MRR | $62,000 | $62,000 | Stable |\n| Health Score | 70 | 73 | +3 |\n\n### Wins\n\n- Successfully launched predictive attrition model (79% accuracy)\n- Onboarding workflow redesign reduced time-to-productivity by 42%\n- 15 new users added from the APAC recruiting team\n\n### Next Quarter Priorities\n\n1. Complete renewal negotiation by April 15\n2. Expand into performance management module\n3. Target 75% adoption through enablement workshops`,

    "demo-4": `## Quarterly Business Review \u2014 CloudStack\n**Period: Q1 2026 | Prepared for Mike Thompson**\n\n### Performance Summary\n\nCloudStack continues to set the standard for platform engagement. Q1 saw further adoption gains and near-zero support friction.\n\n### Key Metrics\n\n| Metric | Last Quarter | This Quarter | Change |\n|--------|-------------|--------------|--------|\n| Adoption Rate | 84% | 88% | +4% |\n| Support Tickets | 3 | 2 | -33% |\n| MRR | $15,000 | $15,000 | Stable |\n| Health Score | 89 | 91 | +2 |\n\n### Wins\n\n- 6 engineering teams now using CI/CD pipeline insights (up from 4)\n- Identified $14,200/mo in cloud cost savings through optimization recommendations\n- Achieved 99.97% uptime monitoring accuracy\n\n### Expansion Opportunities\n\n1. Enterprise security scanning tier ($8,000/mo uplift potential)\n2. Additional team licenses for the new Platform Engineering group\n3. Custom dashboard builder for executive reporting`,

    "demo-5": `## Quarterly Business Review \u2014 PropVault Realty\n**Period: Q1 2026 | Prepared for Sarah Kim**\n\n### Performance Summary\n\nQ1 was a declining quarter for PropVault. Adoption dropped and support volume increased, signaling growing friction that must be addressed before the June renewal.\n\n### Key Metrics\n\n| Metric | Last Quarter | This Quarter | Change |\n|--------|-------------|--------------|--------|\n| Adoption Rate | 58% | 42% | -16% |\n| Support Tickets | 11 | 19 | +73% |\n| MRR | $38,000 | $38,000 | Stable |\n| Health Score | 64 | 52 | -12 |\n\n### Key Concerns\n\n- Agent onboarding completion rate dropped to 55%\n- Mobile app adoption stalled at 23%\n- Two regional offices have not logged in for 30+ days\n\n### Recovery Actions\n\n1. In-person training sessions at underperforming regional offices\n2. Dedicated support channel for top 10 power users\n3. Build custom ROI dashboard for Sarah Kim to share with leadership\n4. Prepare competitive retention offer for June renewal`,

    "demo-6": `## Quarterly Business Review \u2014 DataPulse Analytics\n**Period: Q1 2026 | Prepared for Alex Novak**\n\n### Performance Summary\n\nDataPulse had a stable Q1 with consistent usage patterns. The opportunity lies in unlocking the remaining 40% of unused platform capabilities.\n\n### Key Metrics\n\n| Metric | Last Quarter | This Quarter | Change |\n|--------|-------------|--------------|--------|\n| Adoption Rate | 57% | 60% | +3% |\n| Support Tickets | 10 | 8 | -20% |\n| MRR | $22,000 | $22,000 | Stable |\n| Health Score | 65 | 68 | +3 |\n\n### Wins\n\n- Anomaly detection precision improved to 91%\n- 12 new dashboards created by the analytics team\n- Data pipeline reliability at 99.8%\n\n### Next Quarter Focus\n\n1. Launch ML model training module pilot with data science team\n2. Adoption workshop targeting unused alerting and scheduling features\n3. Prepare case study proposal for their anomaly detection success`,
  },

  "Follow-up Email": {
    "demo-1": `## Follow-up Email Draft \u2014 Meridian Health\n\n**To:** Dr. Chen Wei (cwei@meridianhealth.com)\n**Subject:** Meridian Health + ProofPoint \u2014 Q1 Recap & Expansion Opportunities\n\n---\n\nHi Dr. Wei,\n\nThank you for taking the time to connect last week. I wanted to follow up with a brief summary of where things stand and some ideas for the road ahead.\n\n**Where You Stand:**\nYour team\u2019s adoption has climbed to 78% this quarter, and your health score of 87 puts Meridian Health in the top tier of our healthcare clients. The radiology department\u2019s onboarding has been a standout success.\n\n**Quick Wins We See:**\n- The outpatient scheduling module could save your admin staff an estimated 12 hours/week\n- Mobile app rollout would give your nursing staff real-time access during rounds\n\n**Next Steps:**\nI\u2019d love to schedule a 30-minute call to walk through the expansion options for the new Pediatrics wing and begin our renewal planning. Would any of these times work?\n\n- Tuesday 3/10 at 2pm ET\n- Wednesday 3/11 at 10am ET\n- Thursday 3/12 at 3pm ET\n\nLooking forward to continuing this great partnership.\n\nBest regards`,

    "demo-2": `## Follow-up Email Draft \u2014 NovaPay Financial\n\n**To:** James Rodriguez (jrodriguez@novapay.io)\n**Subject:** NovaPay \u2014 Immediate Support Plan & Path Forward\n\n---\n\nHi James,\n\nI appreciate your candor during our call about the challenges your team has been experiencing. I want you to know we are taking this seriously and have put together an immediate action plan.\n\n**What We\u2019re Doing Right Now:**\n1. A dedicated support engineer will be assigned to NovaPay starting Monday\n2. We\u2019re prioritizing the 12 high-severity tickets for resolution within 5 business days\n3. Our engineering team is investigating the API reconciliation delays\n\n**What We Need From You:**\n- 30-minute call with your engineering lead to map the API integration issues\n- Access to your staging environment for our team to reproduce and fix the failures\n\n**On the Contract:**\nI understand your current agreement ends April 20. Given the circumstances, I\u2019d like to offer a 60-day extension at your current rate so we can demonstrate the improvements before you make any decisions.\n\nCan we connect tomorrow to kick off the recovery plan?\n\nBest regards`,

    "demo-3": `## Follow-up Email Draft \u2014 TalentForge HR\n\n**To:** Lisa Patel (lpatel@talentforge.com)\n**Subject:** TalentForge Renewal \u2014 Proposal & Growth Opportunities\n\n---\n\nHi Lisa,\n\nGreat speaking with you about TalentForge\u2019s plans for the year. I\u2019m excited about the EMEA expansion and wanted to outline how we can support that growth.\n\n**Your Q1 Highlights:**\n- Adoption up to 65% (+4% QoQ)\n- Predictive attrition model at 79% accuracy\n- Onboarding time reduced from 14 to 8 days\n\n**Renewal Proposal:**\nFor your May 1 renewal, I\u2019ve prepared two options:\n1. **Standard Renewal:** 12-month at current $62,000/mo rate\n2. **Growth Package:** 24-month with EMEA seats included at $58,500/mo (6% savings)\n\n**Included in Growth Package:**\n- 200 additional EMEA user seats\n- Performance management module access\n- Dedicated enablement sessions for EMEA team onboarding\n\nI\u2019ll send the formal proposal by end of week. Can we schedule a review call for next Tuesday?\n\nBest regards`,

    "demo-4": `## Follow-up Email Draft \u2014 CloudStack\n\n**To:** Mike Thompson (mthompson@cloudstack.dev)\n**Subject:** CloudStack \u2014 Enterprise Upgrade & Advisory Board Invite\n\n---\n\nHi Mike,\n\nThanks for another great quarter together. CloudStack\u2019s 91 health score and 88% adoption rate continue to impress, and your team\u2019s feedback has been invaluable to our product roadmap.\n\n**Two Exciting Opportunities:**\n\n**1. Enterprise Tier Upgrade**\nBased on your team\u2019s usage patterns, the Enterprise tier would unlock advanced security scanning, custom SLA dashboards, and priority API access. I\u2019ve prepared a tailored proposal at $23,000/mo (vs. current $15,000/mo) with a 90-day trial period.\n\n**2. Customer Advisory Board**\nWe\u2019re forming a Customer Advisory Board of our top accounts, and I\u2019d love for CloudStack to be a founding member. Benefits include early access to features, direct product influence, and co-marketing opportunities.\n\nWould you be open to a quick call to discuss either or both?\n\nBest regards`,

    "demo-5": `## Follow-up Email Draft \u2014 PropVault Realty\n\n**To:** Sarah Kim (skim@propvault.com)\n**Subject:** PropVault \u2014 Your Dedicated Support Plan\n\n---\n\nHi Sarah,\n\nI wanted to reach out proactively because I\u2019ve noticed some trends in your account that I want to address head-on.\n\n**What We\u2019re Seeing:**\n- Adoption has dipped to 42% (down from 58% last quarter)\n- Support ticket volume has increased, and I want to make sure your team isn\u2019t struggling silently\n\n**Our Commitment:**\nStarting this week, you\u2019ll have:\n1. A dedicated CSM (me) for weekly 15-minute check-ins\n2. Priority support routing for all PropVault tickets\n3. Customized training sessions for your regional offices\n\n**I\u2019d Also Like to:**\n- Build a custom ROI dashboard showing PropVault\u2019s concrete platform impact\n- Schedule on-site visits to the two regional offices that have been less active\n\nI know your contract comes up June 30, and my goal is to make sure you\u2019re seeing full value well before then. Can we find 20 minutes this week to connect?\n\nBest regards`,

    "demo-6": `## Follow-up Email Draft \u2014 DataPulse Analytics\n\n**To:** Alex Novak (anovak@datapulse.ai)\n**Subject:** DataPulse \u2014 Unlocking Your Next Level of Analytics\n\n---\n\nHi Alex,\n\nHope you\u2019re having a great week. I wanted to share some thoughts on how DataPulse can get even more out of the platform based on your current usage.\n\n**Your Strengths:**\n- Data pipeline reliability at 99.8% (top 5% of our SaaS clients)\n- Anomaly detection at 91% precision \u2014 genuinely impressive\n- 34 active dashboards across 85 team members\n\n**Untapped Potential:**\nYou\u2019re currently using about 60% of available features. Here are three I think would make an immediate impact:\n\n1. **ML Model Training Module** \u2014 Your data science team could train custom models directly on your pipeline data\n2. **Automated Scheduling** \u2014 Set up recurring reports and alerts without manual triggers\n3. **Advanced Alerting** \u2014 Multi-condition alerts with Slack/PagerDuty integration\n\nI\u2019d love to set up a 45-minute enablement session to demo these. Would next Wednesday or Thursday work?\n\nBest regards`,
  },
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: "#050b18",
  surface: "#0a1628",
  border: "#1e293b",
  text: "#f1f5f9",
  subtle: "#94a3b8",
  muted: "#64748b",
  green: "#10b981",
  greenDim: "#065f46",
  red: "#ef4444",
  yellow: "#f59e0b",
  blue: "#3b82f6",
};

const headingFont = "'Playfair Display', serif";
const bodyFont = "'DM Sans', sans-serif";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMRR(val: number): string {
  return `$${val.toLocaleString()}/mo`;
}

function healthColor(score: number): string {
  if (score > 70) return T.green;
  if (score >= 50) return T.yellow;
  return T.red;
}

function lifecycleLabel(stage: string): string {
  const map: Record<string, string> = {
    active: "Active",
    "at-risk": "At Risk",
    "renewal-due": "Renewal Due",
    expanded: "Expanded",
  };
  return map[stage] || stage;
}

function lifecycleColor(stage: string): string {
  const map: Record<string, string> = {
    active: T.green,
    "at-risk": T.red,
    "renewal-due": T.yellow,
    expanded: T.blue,
  };
  return map[stage] || T.muted;
}

function industryLabel(industry: string): string {
  const map: Record<string, string> = {
    healthcare: "Healthcare",
    fintech: "Fintech",
    hrtech: "HR Tech",
    saas: "SaaS",
    realestate: "Real Estate",
  };
  return map[industry] || industry;
}

function daysFromNow(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── Simple markdown renderer ──────────────────────────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(2); // skip separator row
    elements.push(
      <div key={`table-${elements.length}`} style={{ overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: bodyFont }}>
          <thead>
            <tr>
              {headerRow.map((cell, i) => (
                <th key={i} style={{ padding: "8px 12px", borderBottom: `2px solid ${T.border}`, color: T.text, fontWeight: 600, textAlign: "left" }}>
                  {cell.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "6px 12px", borderBottom: `1px solid ${T.border}`, color: T.subtle }}>
                    {cell.trim()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (!inTable) inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} style={{ fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: T.text, marginTop: 24, marginBottom: 8 }}>
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} style={{ fontFamily: headingFont, fontSize: 16, fontWeight: 600, color: T.text, marginTop: 18, marginBottom: 6 }}>
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "16px 0" }} />);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.replace(/^[-*]\s/, "");
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4 }}>
          <span style={{ color: T.green, flexShrink: 0 }}>{"\u2022"}</span>
          <span style={{ color: T.subtle, fontSize: 14, lineHeight: "1.6" }}>
            {renderInline(content)}
          </span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4 }}>
            <span style={{ color: T.green, fontWeight: 600, flexShrink: 0, fontSize: 13 }}>{match[1]}.</span>
            <span style={{ color: T.subtle, fontSize: 14, lineHeight: "1.6" }}>
              {renderInline(match[2])}
            </span>
          </div>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(
        <p key={i} style={{ color: T.subtle, fontSize: 14, lineHeight: "1.6", marginBottom: 4 }}>
          {renderInline(line)}
        </p>
      );
    }
  }

  if (inTable) flushTable();

  return elements;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(<strong key={key++} style={{ color: T.text, fontWeight: 600 }}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return parts;
}

// ── Timeline entries per account ──────────────────────────────────────────────
const TIMELINE_ENTRIES: Record<string, { date: string; label: string; detail: string }[]> = {
  "demo-1": [
    { date: "Feb 28, 2026", label: "QBR Completed", detail: "Quarterly review with Dr. Chen Wei \u2014 discussed Pediatrics expansion" },
    { date: "Feb 14, 2026", label: "Adoption Milestone", detail: "Radiology department fully onboarded (28 users)" },
    { date: "Jan 20, 2026", label: "Support Ticket Resolved", detail: "HIPAA audit export formatting issue fixed" },
    { date: "Jan 5, 2026", label: "Contract Renewal Reminder", detail: "Auto-reminder: renewal due Sept 15, 2026" },
  ],
  "demo-2": [
    { date: "Feb 25, 2026", label: "Escalation Filed", detail: "API reconciliation delays escalated to engineering" },
    { date: "Feb 10, 2026", label: "Health Score Alert", detail: "Health score dropped below 40 \u2014 immediate action required" },
    { date: "Jan 28, 2026", label: "Support Spike", detail: "14 new tickets filed in one week" },
    { date: "Jan 12, 2026", label: "Champion Check-in", detail: "James Rodriguez expressed frustration with integration stability" },
  ],
  "demo-3": [
    { date: "Feb 20, 2026", label: "Renewal Prep", detail: "Renewal proposal drafted for May 1 deadline" },
    { date: "Feb 5, 2026", label: "Feature Launch", detail: "Predictive attrition model deployed (79% accuracy)" },
    { date: "Jan 22, 2026", label: "Training Session", detail: "APAC recruiting team onboarding completed (15 users)" },
    { date: "Jan 8, 2026", label: "NPS Response", detail: "Lisa Patel submitted NPS score: 8" },
  ],
  "demo-4": [
    { date: "Feb 18, 2026", label: "Expansion Opportunity", detail: "Platform Engineering team expressed interest in additional licenses" },
    { date: "Feb 3, 2026", label: "Case Study Approved", detail: "Mike Thompson approved co-marketing case study" },
    { date: "Jan 15, 2026", label: "Cost Savings Report", detail: "Automated report: $14,200/mo cloud cost savings identified" },
    { date: "Jan 2, 2026", label: "Feature Request", detail: "Requested custom SLA monitoring dashboard" },
  ],
  "demo-5": [
    { date: "Feb 22, 2026", label: "Missed Meeting", detail: "Sarah Kim did not attend scheduled QBR" },
    { date: "Feb 8, 2026", label: "Adoption Alert", detail: "Two regional offices inactive for 30+ days" },
    { date: "Jan 25, 2026", label: "Support Escalation", detail: "Bulk listing sync failure affecting 3 offices" },
    { date: "Jan 10, 2026", label: "Training Scheduled", detail: "On-site training booked for West Coast office" },
  ],
  "demo-6": [
    { date: "Feb 15, 2026", label: "Product Demo", detail: "ML model training module demoed to data science lead" },
    { date: "Feb 1, 2026", label: "Dashboard Milestone", detail: "34 active dashboards across 85 team members" },
    { date: "Jan 18, 2026", label: "Support Resolved", detail: "Custom connector timeout issue fixed" },
    { date: "Jan 5, 2026", label: "Check-in Call", detail: "Routine check-in with Alex Novak \u2014 positive sentiment" },
  ],
};

// ── Main Page Component ───────────────────────────────────────────────────────
export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<"portfolio" | "report">("portfolio");
  const [selectedAccount, setSelectedAccount] = useState<DemoAccount | null>(null);
  const [demoGenerations, setDemoGenerations] = useState(0);
  const [reportAccountId, setReportAccountId] = useState(DEMO_ACCOUNTS[0].id);
  const [reportType, setReportType] = useState("Executive Summary");
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // ── KPI calculations ─────────────────────────────────────────────────────
  const totalMRR = DEMO_ACCOUNTS.reduce((sum, a) => sum + a.mrr, 0);
  const avgHealth = Math.round(DEMO_ACCOUNTS.reduce((sum, a) => sum + a.health_score, 0) / DEMO_ACCOUNTS.length);
  const atRiskCount = DEMO_ACCOUNTS.filter((a) => a.lifecycle_stage === "at-risk").length;
  const upcomingRenewals = DEMO_ACCOUNTS.filter((a) => {
    const days = daysFromNow(a.contract_end);
    return days >= 0 && days <= 90;
  }).length;

  // ── Report generation ─────────────────────────────────────────────────────
  async function handleGenerate() {
    if (demoGenerations >= 3) return;
    setGenerating(true);
    setGeneratedReport(null);

    const account = DEMO_ACCOUNTS.find((a) => a.id === reportAccountId)!;
    const fallback = FALLBACK_REPORTS[reportType]?.[account.id] || FALLBACK_REPORTS["Executive Summary"][account.id];

    try {
      const systemPrompt = `You are a Customer Success AI assistant for a B2B SaaS company. Generate a professional ${reportType} for the given account data. Use markdown formatting with ## headings. Be specific, data-driven, and actionable.`;
      const userMessage = `Generate a ${reportType} for:
Company: ${account.company_name}
Industry: ${industryLabel(account.industry)}
MRR: ${formatMRR(account.mrr)}
Health Score: ${account.health_score}/100
Lifecycle Stage: ${lifecycleLabel(account.lifecycle_stage)}
Contract End: ${account.contract_end}
Primary Contact: ${account.primary_contact} (${account.primary_email})
Adoption Rate: ${account.adoption_rate}%
Support Tickets (90d): ${account.support_tickets_90d}`;

      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          max_tokens: 1500,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) throw new Error("API error");

      const data = await response.json();
      const text = data.content?.map((b: { text?: string }) => b.text || "").join("") || "";
      setGeneratedReport(text || fallback);
    } catch {
      setGeneratedReport(fallback);
    }

    setDemoGenerations((prev) => prev + 1);
    setGenerating(false);
  }

  const selectedReportAccount = DEMO_ACCOUNTS.find((a) => a.id === reportAccountId)!;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: bodyFont, color: T.text }}>
      {/* ── Fixed trial banner ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: `linear-gradient(135deg, ${T.green}, #059669)`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
            Exploring ProofPoint Demo
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            {"\u2014"} Sample data, no account required
          </span>
        </div>
        <Link
          href="/sign-up"
          style={{
            background: "#fff",
            color: T.green,
            padding: "7px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            fontFamily: bodyFont,
            transition: "opacity 0.15s",
          }}
        >
          Start Your Free Trial
        </Link>
      </div>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "70px 24px 60px" }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              fontFamily: headingFont,
              fontSize: 36,
              fontWeight: 700,
              color: T.text,
              marginBottom: 8,
            }}
          >
            ProofPoint Demo
          </h1>
          <p style={{ fontSize: 16, color: T.subtle, maxWidth: 500, margin: "0 auto" }}>
            Explore ProofPoint with sample data. No sign-up required.
          </p>
        </div>

        {/* ── Tab switcher ───────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 32,
            background: T.surface,
            borderRadius: 10,
            padding: 4,
            width: "fit-content",
            margin: "0 auto 32px",
          }}
        >
          {(["portfolio", "report"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: "none",
                background: activeTab === tab ? T.green : "transparent",
                color: activeTab === tab ? "#fff" : T.subtle,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: bodyFont,
                transition: "all 0.15s",
              }}
            >
              {tab === "portfolio" ? "Portfolio" : "Report Generator"}
            </button>
          ))}
        </div>

        {/* ── Portfolio View ──────────────────────────────────────────────── */}
        {activeTab === "portfolio" && (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              <KpiCard label="Total MRR" value={`$${(totalMRR / 1000).toFixed(0)}K`} sub="/mo across 6 accounts" color={T.green} />
              <KpiCard label="Avg Health Score" value={String(avgHealth)} sub="/100 portfolio average" color={avgHealth > 70 ? T.green : avgHealth >= 50 ? T.yellow : T.red} />
              <KpiCard label="At-Risk Accounts" value={String(atRiskCount)} sub="require immediate attention" color={T.red} />
              <KpiCard label="Upcoming Renewals" value={String(upcomingRenewals)} sub="within next 90 days" color={T.yellow} />
            </div>

            {/* Account cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {DEMO_ACCOUNTS.map((account) => (
                <div
                  key={account.id}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {/* Company name + industry badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ fontFamily: headingFont, fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>
                      {account.company_name}
                    </h3>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: T.subtle,
                        background: "rgba(148,163,184,0.1)",
                        padding: "3px 8px",
                        borderRadius: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {industryLabel(account.industry)}
                    </span>
                  </div>

                  {/* MRR */}
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>
                    {formatMRR(account.mrr)}
                  </div>

                  {/* Health score bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Health Score
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: healthColor(account.health_score) }}>
                        {account.health_score}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${account.health_score}%`,
                          background: healthColor(account.health_score),
                          borderRadius: 3,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* Lifecycle pill + contact */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: lifecycleColor(account.lifecycle_stage),
                        background: `${lifecycleColor(account.lifecycle_stage)}18`,
                        padding: "3px 10px",
                        borderRadius: 20,
                        border: `1px solid ${lifecycleColor(account.lifecycle_stage)}30`,
                      }}
                    >
                      {lifecycleLabel(account.lifecycle_stage)}
                    </span>
                    <span style={{ fontSize: 12, color: T.muted }}>{account.primary_contact}</span>
                  </div>

                  {/* View details link */}
                  <button
                    onClick={() => setSelectedAccount(account)}
                    style={{
                      marginTop: "auto",
                      background: "none",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: "8px 0",
                      color: T.green,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: bodyFont,
                      transition: "all 0.15s",
                    }}
                  >
                    View Details {"\u2192"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Report Generator View ──────────────────────────────────────── */}
        {activeTab === "report" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {/* Rate limit warning */}
            {demoGenerations >= 3 ? (
              <div
                style={{
                  background: `${T.yellow}12`,
                  border: `1px solid ${T.yellow}40`,
                  borderRadius: 14,
                  padding: 28,
                  textAlign: "center",
                  marginBottom: 24,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{"\uD83D\uDD12"}</div>
                <h3 style={{ fontFamily: headingFont, fontSize: 20, color: T.text, marginBottom: 8 }}>
                  Demo Limit Reached
                </h3>
                <p style={{ fontSize: 14, color: T.subtle, marginBottom: 16 }}>
                  You{"\u2019"}ve used all 3 demo generations. Sign up for unlimited reports!
                </p>
                <Link
                  href="/sign-up"
                  style={{
                    display: "inline-block",
                    background: T.green,
                    color: "#fff",
                    padding: "10px 28px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: "none",
                    fontFamily: bodyFont,
                  }}
                >
                  Start Your Free Trial
                </Link>
              </div>
            ) : (
              <>
                {/* Generation counter */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                    padding: "10px 16px",
                    background: T.surface,
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <span style={{ fontSize: 13, color: T.subtle }}>
                    Demo generations remaining
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: i < 3 - demoGenerations ? T.green : T.border,
                          transition: "background 0.2s",
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text, marginLeft: 4 }}>
                      {3 - demoGenerations}/3
                    </span>
                  </div>
                </div>

                {/* Form */}
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    padding: 24,
                    marginBottom: 24,
                  }}
                >
                  <h3 style={{ fontFamily: headingFont, fontSize: 18, color: T.text, marginBottom: 20 }}>
                    Generate Report
                  </h3>

                  {/* Account selector */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>
                      Account
                    </label>
                    <select
                      value={reportAccountId}
                      onChange={(e) => setReportAccountId(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#0d1d35",
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 14,
                        color: T.text,
                        fontFamily: bodyFont,
                        outline: "none",
                        cursor: "pointer",
                        appearance: "none",
                        WebkitAppearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                      }}
                    >
                      {DEMO_ACCOUNTS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.company_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Report type selector */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>
                      Report Type
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["Executive Summary", "QBR Narrative", "Follow-up Email"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setReportType(type)}
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: `1px solid ${reportType === type ? T.green : T.border}`,
                            background: reportType === type ? `${T.green}18` : "transparent",
                            color: reportType === type ? T.green : T.subtle,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: bodyFont,
                            transition: "all 0.15s",
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-filled fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>
                        Industry
                      </label>
                      <div
                        style={{
                          background: "#0d1d35",
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          padding: "10px 12px",
                          fontSize: 14,
                          color: T.subtle,
                        }}
                      >
                        {industryLabel(selectedReportAccount.industry)}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>
                        MRR
                      </label>
                      <div
                        style={{
                          background: "#0d1d35",
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          padding: "10px 12px",
                          fontSize: 14,
                          color: T.subtle,
                        }}
                      >
                        {formatMRR(selectedReportAccount.mrr)}
                      </div>
                    </div>
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{
                      width: "100%",
                      padding: "12px 0",
                      borderRadius: 10,
                      border: "none",
                      background: generating ? T.border : T.green,
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: generating ? "not-allowed" : "pointer",
                      fontFamily: bodyFont,
                      transition: "all 0.15s",
                    }}
                  >
                    {generating ? "Generating..." : "Generate Report"}
                  </button>
                </div>
              </>
            )}

            {/* Generated report display */}
            {generatedReport && (
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: 28,
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Generated Report
                  </span>
                  <span style={{ fontSize: 11, color: T.muted }}>
                    Demo {"\u00B7"} {reportType}
                  </span>
                </div>
                <div>{renderMarkdown(generatedReport)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Account 360 Sidebar/Modal ────────────────────────────────────── */}
      {selectedAccount && (
        <AccountDetailModal
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  );
}

// ── KPI Card component ────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: headingFont, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: T.muted }}>{sub}</div>
    </div>
  );
}

// ── Account Detail Modal ──────────────────────────────────────────────────────
function AccountDetailModal({ account, onClose }: { account: DemoAccount; onClose: () => void }) {
  const timeline = TIMELINE_ENTRIES[account.id] || [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 2000,
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 520,
          maxWidth: "90vw",
          background: T.bg,
          borderLeft: `1px solid ${T.border}`,
          zIndex: 2001,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontFamily: headingFont, fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>
              {account.company_name}
            </h2>
            <span style={{ fontSize: 12, color: T.muted }}>{industryLabel(account.industry)} {"\u00B7"} {lifecycleLabel(account.lifecycle_stage)}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: T.subtle,
              fontSize: 18,
              fontFamily: bodyFont,
            }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: 1 }}>
          {/* Account details grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <DetailField label="MRR" value={formatMRR(account.mrr)} />
            <DetailField label="Health Score" value={`${account.health_score}/100`} valueColor={healthColor(account.health_score)} />
            <DetailField label="Contract End" value={account.contract_end} />
            <DetailField label="Lifecycle" value={lifecycleLabel(account.lifecycle_stage)} valueColor={lifecycleColor(account.lifecycle_stage)} />
            <DetailField label="Primary Contact" value={account.primary_contact} />
            <DetailField label="Email" value={account.primary_email} />
          </div>

          {/* Health Score Breakdown */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <h4 style={{ fontFamily: headingFont, fontSize: 15, color: T.text, marginBottom: 16, fontWeight: 600 }}>
              Health Score Breakdown
            </h4>

            {/* Adoption rate */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.subtle }}>Adoption Rate</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: healthColor(account.adoption_rate) }}>
                  {account.adoption_rate}%
                </span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${account.adoption_rate}%`,
                    background: healthColor(account.adoption_rate),
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>

            {/* Support tickets */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.subtle }}>Support Tickets (90d)</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: account.support_tickets_90d > 15 ? T.red : account.support_tickets_90d > 8 ? T.yellow : T.green,
                  }}
                >
                  {account.support_tickets_90d}
                </span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min((account.support_tickets_90d / 30) * 100, 100)}%`,
                    background: account.support_tickets_90d > 15 ? T.red : account.support_tickets_90d > 8 ? T.yellow : T.green,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>

            {/* Overall */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.subtle }}>Overall Health</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: healthColor(account.health_score) }}>
                  {account.health_score}/100
                </span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${account.health_score}%`,
                    background: healthColor(account.health_score),
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Locked recalculate button */}
          <button
            disabled
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.muted,
              fontSize: 13,
              fontWeight: 600,
              cursor: "not-allowed",
              fontFamily: bodyFont,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 24,
              opacity: 0.7,
            }}
          >
            <span style={{ fontSize: 14 }}>{"\uD83D\uDD12"}</span>
            Sign up to recalculate health score
          </button>

          {/* Activity Timeline */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 20,
            }}
          >
            <h4 style={{ fontFamily: headingFont, fontSize: 15, color: T.text, marginBottom: 16, fontWeight: 600 }}>
              Recent Activity
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {timeline.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    paddingBottom: i < timeline.length - 1 ? 16 : 0,
                    position: "relative",
                  }}
                >
                  {/* Timeline dot + line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        background: i === 0 ? T.green : T.border,
                        border: `2px solid ${i === 0 ? T.green : T.muted}`,
                        marginTop: 3,
                      }}
                    />
                    {i < timeline.length - 1 && (
                      <div
                        style={{
                          width: 1,
                          flex: 1,
                          background: T.border,
                          marginTop: 4,
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>{entry.date}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{entry.label}</div>
                    <div style={{ fontSize: 12, color: T.subtle, lineHeight: "1.5" }}>{entry.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Detail Field helper ───────────────────────────────────────────────────────
function DetailField({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: valueColor || T.text, wordBreak: "break-all" }}>
        {value}
      </div>
    </div>
  );
}
