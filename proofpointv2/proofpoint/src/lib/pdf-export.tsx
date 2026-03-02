import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1e293b",
    lineHeight: 1.6,
  },
  coverPage: {
    padding: 48,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 40,
    fontFamily: "Helvetica-Bold",
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "Helvetica-Bold",
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 8,
  },
  coverDate: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 12,
    marginTop: 24,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
  },
  paragraph: {
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 1.6,
    color: "#334155",
  },
  boldText: {
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  },
  metaRow: {
    display: "flex",
    flexDirection: "row",
    marginBottom: 4,
    gap: 4,
  },
  metaLabel: {
    fontSize: 10,
    color: "#64748b",
    width: 100,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: {
    fontSize: 10,
    color: "#334155",
  },
});

// ── Markdown-to-PDF converter (simplified) ────────────────────────────────

function parseMarkdownContent(content: string): React.ReactElement[] {
  const lines = content.split("\n");
  const elements: React.ReactElement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<View key={`space-${i}`} style={{ height: 6 }} />);
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <Text key={i} style={{ ...styles.sectionTitle, fontSize: 13, marginTop: 16 }}>
          {trimmed.replace(/^### /, "").replace(/\*\*/g, "")}
        </Text>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <Text key={i} style={styles.sectionTitle}>
          {trimmed.replace(/^## /, "").replace(/\*\*/g, "")}
        </Text>
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <Text key={i} style={{ ...styles.sectionTitle, fontSize: 18, marginTop: 20 }}>
          {trimmed.replace(/^# /, "").replace(/\*\*/g, "")}
        </Text>
      );
    }
    // Bullet points
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <View key={i} style={{ display: "flex", flexDirection: "row", marginBottom: 4, paddingLeft: 12 }}>
          <Text style={{ fontSize: 11, color: "#10b981", marginRight: 6 }}>•</Text>
          <Text style={styles.paragraph}>
            {trimmed.replace(/^[-*] /, "").replace(/\*\*/g, "")}
          </Text>
        </View>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1] || "";
      elements.push(
        <View key={i} style={{ display: "flex", flexDirection: "row", marginBottom: 4, paddingLeft: 12 }}>
          <Text style={{ fontSize: 11, color: "#64748b", marginRight: 6 }}>{num}.</Text>
          <Text style={styles.paragraph}>
            {trimmed.replace(/^\d+\.\s/, "").replace(/\*\*/g, "")}
          </Text>
        </View>
      );
    }
    // Regular paragraph
    else {
      elements.push(
        <Text key={i} style={styles.paragraph}>
          {trimmed.replace(/\*\*/g, "")}
        </Text>
      );
    }
  }

  return elements;
}

// ── PDF Document Component ────────────────────────────────────────────────

interface ReportData {
  company_name: string;
  report_type: string;
  generated_report: string;
  industry: string | null;
  mrr: number | null;
  created_at: string;
}

interface PdfProps {
  report: ReportData;
  orgName?: string;
}

export function ReportPdfDocument({ report, orgName }: PdfProps) {
  const date = new Date(report.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.logo}>ProofPoint</Text>
        <Text style={styles.coverTitle}>
          {report.report_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Text>
        <Text style={styles.coverSubtitle}>{report.company_name}</Text>
        {report.industry && (
          <Text style={styles.coverSubtitle}>
            Industry: {report.industry.charAt(0).toUpperCase() + report.industry.slice(1)}
          </Text>
        )}
        {report.mrr && (
          <Text style={styles.coverSubtitle}>
            MRR: ${report.mrr.toLocaleString()}/mo
          </Text>
        )}
        <Text style={styles.coverDate}>Generated on {date}</Text>
        {orgName && (
          <Text style={{ ...styles.coverDate, marginTop: 8 }}>Prepared by {orgName}</Text>
        )}
      </Page>

      {/* Report Content */}
      <Page size="A4" style={styles.page}>
        <View style={{ marginBottom: 20 }}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Company:</Text>
            <Text style={styles.metaValue}>{report.company_name}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Report Type:</Text>
            <Text style={styles.metaValue}>{report.report_type}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date:</Text>
            <Text style={styles.metaValue}>{date}</Text>
          </View>
        </View>

        {parseMarkdownContent(report.generated_report)}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by ProofPoint</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
