import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// ── In-memory cache (5 minutes) ──────────────────────────────────────
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── GET: aggregated analytics ────────────────────────────────────────
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check cache
  const cacheKey = `analytics:${userId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch all accounts
    const { data: accounts, error: accErr } = await supabase
      .from("client_accounts")
      .select("*")
      .eq("user_id", userId);

    if (accErr) {
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

    const allAccounts = accounts || [];
    const activeAccounts = allAccounts.filter(
      (a: { lifecycle_stage: string }) => a.lifecycle_stage !== "churned"
    );

    // ── KPI calculations ──────────────────────────────────────────
    const totalMRR = activeAccounts.reduce((sum: number, a: { mrr: number }) => sum + (a.mrr || 0), 0);
    const avgHealthScore =
      activeAccounts.length > 0
        ? Math.round(
            activeAccounts.reduce((sum: number, a: { health_score: number }) => sum + (a.health_score || 0), 0) /
              activeAccounts.length
          )
        : 0;

    const churnedCount = allAccounts.filter(
      (a: { lifecycle_stage: string }) => a.lifecycle_stage === "churned"
    ).length;
    const churnRate =
      allAccounts.length > 0
        ? Math.round((churnedCount / allAccounts.length) * 100 * 10) / 10
        : 0;

    // NRR approximation (simplified — using current data since we don't track historical MRR changes)
    const expandedMRR = allAccounts
      .filter((a: { lifecycle_stage: string }) => a.lifecycle_stage === "expanded")
      .reduce((sum: number, a: { mrr: number }) => sum + (a.mrr || 0), 0);
    const churnedMRR = allAccounts
      .filter((a: { lifecycle_stage: string }) => a.lifecycle_stage === "churned")
      .reduce((sum: number, a: { mrr: number }) => sum + (a.mrr || 0), 0);
    const baseMRR = totalMRR + churnedMRR; // Approximate starting MRR
    const nrr = baseMRR > 0 ? Math.round(((baseMRR + expandedMRR - churnedMRR) / baseMRR) * 100) : 100;

    // ── Health distribution ───────────────────────────────────────
    const healthDistribution = [
      { bucket: "Critical (0-25)", count: 0, color: "#ef4444" },
      { bucket: "At Risk (26-50)", count: 0, color: "#f59e0b" },
      { bucket: "Needs Attention (51-75)", count: 0, color: "#3b82f6" },
      { bucket: "Healthy (76-100)", count: 0, color: "#10b981" },
    ];

    for (const a of activeAccounts) {
      const score = (a as { health_score: number }).health_score || 0;
      if (score <= 25) healthDistribution[0].count++;
      else if (score <= 50) healthDistribution[1].count++;
      else if (score <= 75) healthDistribution[2].count++;
      else healthDistribution[3].count++;
    }

    // ── Lifecycle stage breakdown ─────────────────────────────────
    const stageMap: Record<string, number> = {};
    for (const a of allAccounts) {
      const stage = (a as { lifecycle_stage: string }).lifecycle_stage || "unknown";
      stageMap[stage] = (stageMap[stage] || 0) + 1;
    }
    const lifecycleBreakdown = Object.entries(stageMap).map(([stage, count]) => ({
      stage,
      count,
    }));

    // ── MRR trend (last 12 months, approximated) ──────────────────
    const mrrTrend: { month: string; mrr: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      // Approximate: simulate slight growth from current MRR
      const factor = 1 - (i * 0.02); // 2% growth per month backwards
      mrrTrend.push({ month: label, mrr: Math.round(totalMRR * factor) });
    }

    // ── Upcoming renewals by month ────────────────────────────────
    const renewalsByMonth: { month: string; mrr: number; avgHealth: number; count: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
      const monthStart = d.toISOString().split("T")[0];
      const monthEnd = endOfMonth.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      const monthAccounts = activeAccounts.filter((a: { contract_end: string | null }) => {
        if (!a.contract_end) return false;
        return a.contract_end >= monthStart && a.contract_end <= monthEnd;
      });

      const monthMRR = monthAccounts.reduce(
        (sum: number, a: { mrr: number }) => sum + (a.mrr || 0),
        0
      );
      const monthAvgHealth =
        monthAccounts.length > 0
          ? Math.round(
              monthAccounts.reduce(
                (sum: number, a: { health_score: number }) => sum + (a.health_score || 0),
                0
              ) / monthAccounts.length
            )
          : 0;

      renewalsByMonth.push({
        month: label,
        mrr: monthMRR,
        avgHealth: monthAvgHealth,
        count: monthAccounts.length,
      });
    }

    // ── Top at-risk accounts ──────────────────────────────────────
    const atRiskAccounts = [...activeAccounts]
      .sort(
        (a: { health_score: number }, b: { health_score: number }) =>
          (a.health_score || 0) - (b.health_score || 0)
      )
      .slice(0, 10)
      .map(
        (a: {
          id: string;
          company_name: string;
          health_score: number;
          health_trend: string;
          mrr: number;
          contract_end: string | null;
        }) => ({
          id: a.id,
          company_name: a.company_name,
          health_score: a.health_score,
          health_trend: a.health_trend,
          mrr: a.mrr,
          contract_end: a.contract_end,
          days_to_renewal: a.contract_end
            ? Math.ceil(
                (new Date(a.contract_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
            : null,
        })
      );

    const result = {
      kpi: {
        totalMRR,
        nrr,
        avgHealthScore,
        churnRate,
        totalAccounts: allAccounts.length,
        activeAccounts: activeAccounts.length,
      },
      healthDistribution,
      lifecycleBreakdown,
      mrrTrend,
      renewalsByMonth,
      atRiskAccounts,
    };

    // Cache for 5 minutes
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analytics GET error:", err);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
