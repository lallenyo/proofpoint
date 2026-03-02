import { auth } from "@clerk/nextjs/server";
import { recalculateAllHealthScores } from "@/lib/health-score-batch";
import { NextResponse } from "next/server";

// ── POST: batch recalculate health scores for all user's accounts ──
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await recalculateAllHealthScores(userId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Health batch error:", err);
    return NextResponse.json({ error: "Failed to batch recalculate" }, { status: 500 });
  }
}
