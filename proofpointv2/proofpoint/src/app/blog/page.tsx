"use client";

import { useState } from "react";
import Link from "next/link";

const T = {
  green: "#10b981", bg: "#050b18", surface: "#0a1628", surface2: "#0f172a",
  border: "#1e293b", text: "#f1f5f9", muted: "#64748b", subtle: "#94a3b8",
};

const BLOG_ARTICLES = [
  { id: "custify", title: "Proofpoint vs Custify: Why Internal Health Scores Aren't Enough", date: "Feb 28, 2026", readTime: "6 min", excerpt: "Custify excels at internal health scoring and lifecycle automation. But when your champion needs to justify renewal to their CFO, internal scores don't cut it. Proofpoint generates customer-facing ROI proof with industry benchmarks that executives can fact-check.", tags: ["Comparison", "Custify"] },
  { id: "churnzero", title: "Proofpoint vs ChurnZero: From Churn Prevention to Value Proof", date: "Feb 26, 2026", readTime: "7 min", excerpt: "ChurnZero is a powerful engagement and churn prevention platform. But it focuses on what you track internally — not what you present externally. Proofpoint fills the gap with benchmark-driven ROI narratives that make the business case for renewal undeniable.", tags: ["Comparison", "ChurnZero"] },
  { id: "vitally", title: "Proofpoint vs Vitally: Beautiful Dashboards vs. Defensible ROI", date: "Feb 24, 2026", readTime: "5 min", excerpt: "Vitally offers gorgeous dashboards and productivity hubs for CS teams. But dashboards are internal tools. Proofpoint creates the external-facing proof documents that your customers' procurement teams need to approve renewals.", tags: ["Comparison", "Vitally"] },
  { id: "totango", title: "Proofpoint vs Totango: Composable CS vs. Actionable Intelligence", date: "Feb 22, 2026", readTime: "6 min", excerpt: "Totango's composable approach lets you build custom CS workflows. Proofpoint takes a different angle: instead of customizing internal operations, it generates executive-ready output with AI that explains what actions will change outcomes.", tags: ["Comparison", "Totango"] },
  { id: "zapscale", title: "Proofpoint vs ZapScale: Beyond 40 KPIs to Benchmark-Driven Proof", date: "Feb 20, 2026", readTime: "5 min", excerpt: "ZapScale tracks 40 KPIs and offers AI-powered churn prediction. Proofpoint transforms those KPIs into industry-benchmarked ROI reports with transparent source citations that executives trust.", tags: ["Comparison", "ZapScale"] },
];

export default function BlogPage() {
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const article = BLOG_ARTICLES.find(a => a.id === selectedArticle);

  if (article) {
    return (
      <div style={{ background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif", minHeight: "100vh" }}>
        <nav style={{ padding: "16px 40px", borderBottom: `1px solid ${T.border}44`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ textDecoration: "none", fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.text }}>Proof<span style={{ color: T.green }}>point</span></Link>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/" style={{ fontSize: 13.5, color: T.muted, textDecoration: "none" }}>Home</Link>
            <Link href="/blog" style={{ fontSize: 13.5, color: T.green, textDecoration: "none" }}>Blog</Link>
          </div>
        </nav>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
          <button onClick={() => setSelectedArticle(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginBottom: 24 }}>← Back to Blog</button>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {article.tags.map(tag => <span key={tag} style={{ padding: "3px 10px", borderRadius: 6, background: "rgba(16,185,129,0.08)", fontSize: 11, fontWeight: 600, color: T.green }}>{tag}</span>)}
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, color: T.text, marginBottom: 12, lineHeight: 1.2 }}>{article.title}</h1>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 32 }}>{article.date} · {article.readTime} read</div>
          <div style={{ fontSize: 15, color: T.subtle, lineHeight: 1.9, marginBottom: 16 }}>{article.excerpt}</div>
          <div style={{ fontSize: 14.5, color: "#94a3b8", lineHeight: 1.9 }}>
            <p style={{ marginBottom: 16 }}>The Customer Success software market is crowded with platforms that solve internal team operations — health scoring, task management, lifecycle automation. These are valuable capabilities. But they all share a blind spot: none of them generate the external-facing proof that actually drives renewal decisions.</p>
            <p style={{ marginBottom: 16 }}>When a champion needs to justify a six-figure renewal to their CFO, they don&apos;t forward a health score dashboard. They need a document that speaks the language of business impact — with benchmarks their stakeholders can independently verify.</p>
            <p style={{ marginBottom: 16 }}>That&apos;s the gap Proofpoint fills. Instead of scoring customers for your team, it generates ROI narratives for their team — with industry benchmarks sourced from ChartMogul, TSIA, Recurly, and other authoritative research, complete with citations.</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: T.text, marginTop: 32, marginBottom: 12 }}>The Key Difference</h3>
            <p style={{ marginBottom: 16 }}>Most CS platforms ask: &ldquo;How healthy is this account?&rdquo; Proofpoint asks: &ldquo;Can this account&apos;s stakeholders see the value?&rdquo; — and then generates the proof to make sure they can.</p>
          </div>
          <div style={{ marginTop: 40, padding: "24px 28px", background: T.surface, border: `1px solid ${T.green}33`, borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 8 }}>Ready to see it in action?</div>
            <Link href="/demo">
              <button style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: T.green, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Try the Sandbox</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif", minHeight: "100vh" }}>
      <nav style={{ padding: "16px 40px", borderBottom: `1px solid ${T.border}44`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none", fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.text }}>Proof<span style={{ color: T.green }}>point</span></Link>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/" style={{ fontSize: 13.5, color: T.muted, textDecoration: "none" }}>Home</Link>
          <Link href="/blog" style={{ fontSize: 13.5, color: T.green, textDecoration: "none" }}>Blog</Link>
        </div>
      </nav>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "50px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: T.text, marginBottom: 10 }}>Proof<span style={{ color: T.green }}>point</span> Blog</h1>
          <p style={{ fontSize: 15, color: T.muted }}>How Proofpoint compares to the CS platforms you already know</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {BLOG_ARTICLES.map(a => (
            <button key={a.id} onClick={() => setSelectedArticle(a.id)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px 28px", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif", width: "100%" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {a.tags.map(tag => <span key={tag} style={{ padding: "2px 8px", borderRadius: 5, background: "rgba(16,185,129,0.06)", fontSize: 10, fontWeight: 600, color: T.green }}>{tag}</span>)}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 6, lineHeight: 1.3 }}>{a.title}</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 8 }}>{a.excerpt}</div>
              <div style={{ fontSize: 11, color: "#334155" }}>{a.date} · {a.readTime} read</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
