import { NextResponse } from "next/server";
import { saveScore } from "@/lib/storage";
import { sanitizeHandle, LeaderboardEntry } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const handle = sanitizeHandle(body?.handle);
  const score = Math.max(0, Math.min(1_000_000, Math.round(Number(body?.score) || 0)));
  const rounds = Math.max(0, Math.min(10_000, Math.round(Number(body?.rounds) || 0)));

  if (score <= 0) {
    return NextResponse.json({ error: "no score to submit" }, { status: 400 });
  }

  const entry: LeaderboardEntry = { handle, score, rounds, ts: Date.now() };
  const result = await saveScore(entry);

  return NextResponse.json({
    entries: result.board.entries,
    rank: result.rank,
    persisted: result.persisted,
    txHash: result.txHash ?? null,
    handle,
  });
}
