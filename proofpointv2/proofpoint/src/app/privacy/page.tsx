"use client";

import Link from "next/link";

const T = {
  green: "#10b981", bg: "#050b18", surface: "#0a1628",
  border: "#1e293b", text: "#f1f5f9", muted: "#64748b",
};

const SECTIONS = [
  { title: "Information We Collect", content: "We collect account information (name, email, company), customer data you input for report generation (company metrics, contact details), usage analytics, and payment information processed via Stripe." },
  { title: "How We Use Your Data", content: "Your data is used to generate AI-powered reports and recommendations, deliver emails via SendGrid, improve our service quality, and communicate about your account. We do not sell your data to third parties." },
  { title: "AI Processing", content: "Customer data submitted for report generation is processed through Anthropic's Claude API. Data is sent securely and is not retained by the AI provider beyond the generation request. We do not use your data to train AI models." },
  { title: "Data Storage & Security", content: "Data is stored in Supabase with encryption at rest and in transit. We implement industry-standard security practices including role-based access controls, secure authentication via Clerk, and regular security audits." },
  { title: "Email Tracking", content: "If you use our email sending features, we track delivery status, open rates, and click rates via SendGrid. Recipients are not individually identified beyond what you provide as sender." },
  { title: "Data Retention & Deletion", content: "Your data is retained while your account is active. You may request deletion of your account and all associated data at any time. Deletion requests are processed within 30 days." },
  { title: "Third-Party Services", content: "We use: Clerk (authentication), Supabase (database), Anthropic Claude (AI generation), SendGrid (email delivery), Stripe (payments), and Vercel (hosting). Each provider has their own privacy policy." },
  { title: "Your Rights", content: "You have the right to access, correct, export, or delete your personal data. Contact privacy@getproofpoint.com for any privacy-related requests." },
];

export default function PrivacyPage() {
  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif", minHeight: "100vh" }}>
      <nav style={{ padding: "16px 40px", borderBottom: `1px solid ${T.border}44`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none", fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.text }}>Proof<span style={{ color: T.green }}>point</span></Link>
        <Link href="/" style={{ fontSize: 13.5, color: T.muted, textDecoration: "none" }}>← Back to Home</Link>
      </nav>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "50px 20px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: T.text, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: T.muted, marginBottom: 32 }}>Last updated: March 1, 2026</p>
        {SECTIONS.map(s => (
          <div key={s.title} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>{s.title}</h3>
            <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.8 }}>{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
