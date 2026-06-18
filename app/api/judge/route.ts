import { NextResponse } from "next/server";
import { ogConfigured, ogChatJSON } from "@/lib/og";
import {
  Level,
  Judgement,
  judgeSystemPrompt,
  judgeUserPrompt,
  heuristicJudge,
} from "@/lib/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const level: Level | undefined = body?.level;
  const payload: string = typeof body?.payload === "string" ? body.payload : "";

  if (!level || typeof level.vuln !== "string") {
    return NextResponse.json({ error: "missing level" }, { status: 400 });
  }

  // No 0G key → heuristic adjudication.
  if (!ogConfigured()) {
    return NextResponse.json({
      ...heuristicJudge(level, payload),
      source: "local",
    });
  }

  try {
    const judged = await ogChatJSON<Judgement>(
      [
        { role: "system", content: judgeSystemPrompt() },
        { role: "user", content: judgeUserPrompt(level, payload) },
      ],
      { temperature: 0.4, maxTokens: 600 },
    );

    const result: Judgement = {
      breached: Boolean(judged.breached),
      systemResponse:
        typeof judged.systemResponse === "string"
          ? judged.systemResponse
          : "(no response)",
      analysis: typeof judged.analysis === "string" ? judged.analysis : "",
      technique:
        typeof judged.technique === "string" ? judged.technique : null,
      points: judged.breached
        ? clampPoints(judged.points, level.points)
        : 0,
    };
    return NextResponse.json({ ...result, source: "0g" });
  } catch (err) {
    console.error("[judge] 0G adjudication failed, falling back:", err);
    return NextResponse.json({
      ...heuristicJudge(level, payload),
      source: "local",
    });
  }
}

function clampPoints(p: unknown, base: number): number {
  const n = Math.round(Number(p));
  if (!Number.isFinite(n) || n <= 0) return base;
  return Math.min(base * 2, n); // cap any AI generosity at 2x base
}
