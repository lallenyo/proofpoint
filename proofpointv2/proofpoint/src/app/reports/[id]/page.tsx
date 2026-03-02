"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Nav, PageWrapper } from "@/components/Nav";
import UpgradePrompt from "@/components/UpgradePrompt";

type Report = {
  id: string;
  company_name: string;
  report_type: string;
  industry: string | null;
  mrr: number | null;
  generated_report: string;
  created_at: string;
};

function parseMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return (
        <h3 key={i} style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#10b981", fontWeight: 700, margin: "28px 0 10px", borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>
          {line.replace("## ", "")}
        </h3>
      );
    }
    if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
    return <p key={i} style={{ fontSize: 15, color: "#cbd5e1", lineHeight: 1.8, margin: "0 0 4px" }}>{line}</p>;
  });
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setReport)
      .catch(() => setError("Report not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  };

  const handleCopy = () => {
    if (report) navigator.clipboard.writeText(report.generated_report);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    setShowUpgrade(false);
    try {
      const res = await fetch(`/api/reports/${id}/pdf`);
      if (res.status === 403) {
        setShowUpgrade(true);
        return;
      }
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report?.company_name || "report"}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Nav />
      <PageWrapper>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

          {loading && <div style={{ textAlign: "center", color: "#475569", padding: "80px 0" }}>Loading report…</div>}
          {error && <div style={{ textAlign: "center", color: "#f87171", padding: "80px 0" }}>{error}</div>}

          {report && (
            <>
              {/* Header */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 8 }}>
                      {report.company_name}
                    </h1>
                    <div style={{ fontSize: 13, color: "#475569" }}>
                      {report.report_type} · {report.industry || "Unknown"} · {report.mrr ? `$${report.mrr.toLocaleString()}/mo` : "No MRR"} · {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={handleExportPdf}
                      disabled={exporting}
                      style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: exporting ? 0.6 : 1 }}
                    >
                      {exporting ? "Exporting…" : "Export PDF"}
                    </button>
                    <button
                      onClick={handleCopy}
                      style={{ background: "transparent", color: "#94a3b8", border: "1px solid #1e293b", padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                    >
                      Copy
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{ background: "transparent", color: "#f87171", border: "1px solid #7f1d1d", padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", opacity: deleting ? 0.6 : 1 }}
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upgrade prompt for PDF export */}
              {showUpgrade && (
                <UpgradePrompt
                  feature="PDF Export"
                  reason="PDF export is available on Growth tier and above. Upgrade to download beautifully formatted PDF reports."
                />
              )}

              {/* Report content */}
              <div style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 16, padding: "36px 40px" }}>
                {parseMarkdown(report.generated_report)}
              </div>
            </>
          )}

        </div>
      </PageWrapper>
    </>
  );
}
