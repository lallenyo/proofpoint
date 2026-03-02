import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── System email templates ───────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  {
    name: "Monthly Check-in",
    category: "check-in",
    subject_template: "Checking in — {{company_name}} Q{{quarter}} progress",
    body_template: `Hi {{contact_name}},

I hope this message finds you well! I wanted to check in and see how things are going at **{{company_name}}**.

Since our last conversation, I've been keeping an eye on your account and noticed some interesting trends. Your current health score sits at **{{health_score}}/100**, and I'd love to discuss how we can continue to drive value for your team.

A few things I'd like to cover:
- Progress on your current goals and any roadblocks
- New features that could benefit your {{industry}} workflow
- Upcoming initiatives and how we can support them

Would you have 20 minutes this week or next for a quick sync? I'm happy to work around your schedule.

Best regards,
{{csm_name}}`,
    is_system: true,
  },
  {
    name: "QBR Meeting Invite",
    category: "qbr-invite",
    subject_template: "{{company_name}} Quarterly Business Review — Let's schedule",
    body_template: `Hi {{contact_name}},

It's that time again! I'd like to schedule our Quarterly Business Review for **{{company_name}}**.

In preparation, I'll be putting together a comprehensive review that covers:
- **Value delivered** this quarter (ROI analysis at your \${{mrr}}/mo investment level)
- **Usage and adoption** trends across your team
- **Health score analysis** — currently at {{health_score}}/100
- **Strategic roadmap** alignment for next quarter

I typically recommend setting aside 45–60 minutes for the QBR so we have plenty of time for discussion.

Could you share a few time slots that work for you and any key stakeholders who should attend? I'll send a formal calendar invite once we confirm.

Looking forward to it,
{{csm_name}}`,
    is_system: true,
  },
  {
    name: "Renewal Reminder (60 Days)",
    category: "renewal",
    subject_template: "{{company_name}} renewal coming up in {{days_to_renewal}} days",
    body_template: `Hi {{contact_name}},

I wanted to reach out regarding your upcoming renewal. Your current agreement with us is set to renew in **{{days_to_renewal}} days**.

Before we get to that point, I'd love to:
1. **Review the value we've delivered** — I can generate a comprehensive ROI report for {{company_name}}
2. **Discuss any evolving needs** — your team may have grown or your priorities may have shifted
3. **Explore the best renewal option** — whether that's maintaining your current plan at \${{mrr}}/mo or upgrading to unlock additional capabilities

Your health score is currently at **{{health_score}}/100**, and I want to make sure we're fully aligned on maximizing the value of our partnership.

Can we find 30 minutes this week to discuss? I want to ensure a smooth renewal process.

Best,
{{csm_name}}`,
    is_system: true,
  },
  {
    name: "At-Risk Outreach",
    category: "at-risk",
    subject_template: "{{contact_name}}, I'd love to chat about {{company_name}}'s experience",
    body_template: `Hi {{contact_name}},

I hope you're doing well. I wanted to reach out directly because I want to make sure {{company_name}} is getting the most out of our partnership.

I've noticed some changes in your engagement patterns recently, and I want to understand if there's anything we could be doing better or differently to support your team.

A few things I'd like to discuss:
- **Your current experience** — any pain points or challenges?
- **Support needs** — are there areas where you need more help?
- **Product feedback** — features you'd like to see or improvements we could make?

Your success is my top priority, and I'd love to schedule a call at your earliest convenience to hear your thoughts directly.

Would you have 15-20 minutes this week? I'm flexible on timing.

Warmly,
{{csm_name}}`,
    is_system: true,
  },
  {
    name: "Expansion/Upsell Conversation",
    category: "expansion",
    subject_template: "Growing with {{company_name}} — new opportunities",
    body_template: `Hi {{contact_name}},

I've been reviewing {{company_name}}'s usage data and I'm really impressed with how your team has adopted the platform. With a health score of **{{health_score}}/100**, you're clearly getting strong value from our partnership.

Based on your growth trajectory and the patterns I'm seeing in the {{industry}} space, I think there's an opportunity to amplify your results even further:

- **Additional seats** — your team engagement suggests potential for broader rollout
- **Premium features** — capabilities that could accelerate your current workflows
- **Advanced analytics** — deeper insights to support your strategic decisions

I've put together some ideas on how we could expand our engagement in a way that delivers meaningful ROI. Would you be open to a 20-minute conversation to explore these options?

No pressure at all — I just want to make sure you're aware of what's available.

Best regards,
{{csm_name}}`,
    is_system: true,
  },
  {
    name: "Onboarding Welcome",
    category: "onboarding",
    subject_template: "Welcome to the team, {{company_name}}! Let's get started",
    body_template: `Hi {{contact_name}},

Welcome aboard! I'm thrilled to be your dedicated Customer Success Manager at Proofpoint. I'll be your primary point of contact and I'm here to ensure {{company_name}} gets maximum value from day one.

Here's what you can expect from our onboarding process:

**Week 1:** Platform setup and initial configuration
**Week 2:** Team training and best practices for {{industry}}
**Week 3-4:** First check-in and adoption review

A few things to get us started:
1. **Kickoff call** — let's schedule a 30-minute session to align on your goals and success criteria
2. **Setup guide** — I'll send over our getting-started resources tailored for {{industry}} teams
3. **Support channels** — you can always reach me directly or through our support team

I'd love to schedule our kickoff call this week. What times work best for you?

Excited to partner with you,
{{csm_name}}`,
    is_system: true,
  },
  {
    name: "Thank You After Renewal",
    category: "thank-you",
    subject_template: "Thank you, {{company_name}}! Here's to another great year",
    body_template: `Hi {{contact_name}},

I wanted to personally thank you for renewing your partnership with us. Your continued trust in our team means a great deal, and I'm committed to making this next period even more impactful for {{company_name}}.

Looking back at what we've accomplished together:
- Your health score has been maintained at **{{health_score}}/100**
- We've delivered consistent value at your \${{mrr}}/mo investment level
- Your {{industry}} workflows have been strengthened through our partnership

Looking ahead, here's what I'm focused on for the coming months:
1. **Continued optimization** — finding new ways to drive value
2. **Strategic alignment** — ensuring we're supporting your evolving goals
3. **Proactive insights** — leveraging data to anticipate your needs

I'll follow up next week to discuss our roadmap for the new term. In the meantime, please don't hesitate to reach out if you need anything.

With gratitude,
{{csm_name}}`,
    is_system: true,
  },
  {
    name: "Executive Escalation",
    category: "escalation",
    subject_template: "Priority: {{company_name}} account requires attention",
    body_template: `Hi {{contact_name}},

I'm reaching out because I want to ensure {{company_name}} receives the highest level of attention and support from our leadership team.

I've been working closely with your team, and I believe it would be valuable to bring in our executive leadership to discuss:

- **Strategic alignment** — ensuring our partnership supports {{company_name}}'s broader objectives
- **Resource commitment** — dedicating additional resources to accelerate your success
- **Roadmap priorities** — aligning our product direction with your critical needs

Your account health is currently at **{{health_score}}/100**, and I want to be proactive in addressing any concerns and reinforcing our commitment to your success.

I'd like to arrange a call between our VP of Customer Success and your leadership team. Would {{contact_title}} be available for a 30-minute executive alignment session?

I'll handle all the coordination — just let me know a few available time slots.

Best regards,
{{csm_name}}`,
    is_system: true,
  },
];

// ── GET: list templates ──────────────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();

    // Auto-seed system templates
    const { data: existing } = await supabase
      .from("email_templates")
      .select("name")
      .eq("is_system", true);

    const existingNames = new Set((existing || []).map((t: { name: string }) => t.name));
    const toInsert = SYSTEM_TEMPLATES.filter((t) => !existingNames.has(t.name)).map((t) => ({
      ...t,
      org_id: userId,
    }));

    if (toInsert.length > 0) {
      await supabase.from("email_templates").insert(toInsert);
    }

    // Fetch all templates
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("is_system", { ascending: false })
      .order("category", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Email templates GET error:", err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// ── POST: create custom template ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        org_id: userId,
        name: body.name,
        category: body.category || null,
        subject_template: body.subject_template || "",
        body_template: body.body_template || "",
        is_system: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Email template POST error:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
