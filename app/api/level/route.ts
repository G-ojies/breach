import { NextResponse } from "next/server";
import { ogConfigured, ogChatJSON } from "@/lib/og";
import {
  Level,
  VulnType,
  levelSystemPrompt,
  levelUserPrompt,
  fallbackLevelAt,
} from "@/lib/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeneratedLevel = Omit<Level, "id">;

const VULNS: VulnType[] = [
  "sqli",
  "xss",
  "auth_bypass",
  "cmd_injection",
  "path_traversal",
  "ssti",
  "nosql",
  "idor",
];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const index: number = Number.isFinite(body?.index) ? body.index : 0;
  const difficulty = Math.min(5, Math.max(1, Math.ceil((index + 1) / 2)));
  const preferVuln: VulnType | undefined = body?.preferVuln;

  // No 0G key configured → deterministic offline level.
  if (!ogConfigured()) {
    return NextResponse.json({ level: fallbackLevelAt(index), source: "local" });
  }

  try {
    const nonce = `${index}-${randomToken()}`;
    const gen = await ogChatJSON<GeneratedLevel>(
      [
        { role: "system", content: levelSystemPrompt() },
        {
          role: "user",
          content: levelUserPrompt({ difficulty, preferVuln, nonce }),
        },
      ],
      { temperature: 0.9, maxTokens: 700 },
    );

    const level: Level = sanitizeLevel(gen, index);
    return NextResponse.json({ level, source: "0g" });
  } catch (err) {
    console.error("[level] 0G generation failed, falling back:", err);
    return NextResponse.json({ level: fallbackLevelAt(index), source: "local" });
  }
}

function sanitizeLevel(gen: GeneratedLevel, index: number): Level {
  const vuln: VulnType = VULNS.includes(gen.vuln as VulnType)
    ? (gen.vuln as VulnType)
    : "sqli";
  const difficulty = clampDiff(gen.difficulty);
  return {
    id: `og-${index}-${randomToken()}`,
    codename: str(gen.codename, "Unknown Target"),
    briefing: str(gen.briefing, "A vulnerable system awaits."),
    surface: str(gen.surface, "Web input"),
    inputLabel: str(gen.inputLabel, "payload"),
    objective: str(gen.objective, "Exploit the flaw."),
    vuln,
    hint: str(gen.hint, "Look closely at how your input is handled."),
    difficulty,
    points:
      Number.isFinite(gen.points) && gen.points > 0
        ? Math.min(500, Math.round(gen.points))
        : 100 + difficulty * 60,
  };
}

function clampDiff(d: unknown): 1 | 2 | 3 | 4 | 5 {
  const n = Math.round(Number(d));
  return (Math.min(5, Math.max(1, Number.isFinite(n) ? n : 2)) as 1 | 2 | 3 | 4 | 5);
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function randomToken(): string {
  return Math.floor(Math.random() * 1e9).toString(36);
}
