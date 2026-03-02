import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportPdfDocument } from "@/lib/pdf-export";
import { getUserOrg } from "@/lib/gate";
import { TIER_CONFIG } from "@/lib/tiers";

// ── GET: generate PDF for a report ──────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Tier gating: PDF requires Growth+ ──────────────────────────
  const org = await getUserOrg(userId);
  const tier = org?.plan_tier || "trial";
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.trial;

  if (!tierConfig.exportFormats.includes("pdf")) {
    return NextResponse.json(
      {
        error: "PDF export requires Growth tier or above",
        upgrade: true,
        currentTier: tier,
      },
      { status: 403 }
    );
  }

  // ── Fetch report ──────────────────────────────────────────────
  const supabase = getSupabaseAdmin();
  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", userId)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // ── Generate PDF ──────────────────────────────────────────────
  try {
    const element = React.createElement(ReportPdfDocument, {
      report: {
        company_name: report.company_name,
        report_type: report.report_type,
        generated_report: report.generated_report,
        industry: report.industry,
        mrr: report.mrr,
        created_at: report.created_at,
      },
      orgName: org?.name || undefined,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any);

    const safeName = report.company_name.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${safeName}_${report.report_type}_report.pdf`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
