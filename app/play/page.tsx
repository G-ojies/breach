"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Typewriter from "@/components/Typewriter";
import Leaderboard from "@/components/Leaderboard";
import type { Level, Judgement, VulnType } from "@/lib/game";

type Phase = "boot" | "loading" | "ready" | "judging" | "result";
type Source = "0g" | "local";

const VULN_LABELS: Record<VulnType, string> = {
  sqli: "SQL Injection",
  xss: "Cross-Site Scripting",
  auth_bypass: "Authentication Bypass",
  cmd_injection: "Command Injection",
  path_traversal: "Path Traversal",
  ssti: "Server-Side Template Injection",
  nosql: "NoSQL Injection",
  idor: "Insecure Direct Object Reference",
};

export default function Play() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [level, setLevel] = useState<Level | null>(null);
  const [index, setIndex] = useState(0);
  const [payload, setPayload] = useState("");
  const [judgement, setJudgement] = useState<(Judgement & { source?: Source }) | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [misses, setMisses] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [ogOnline, setOgOnline] = useState<boolean | null>(null);
  const [model, setModel] = useState("0G Compute");
  const [boardOpen, setBoardOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- load status + first target ---
  useEffect(() => {
    setBest(Number(localStorage.getItem("breach_best") || 0));
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        setOgOnline(Boolean(d.og));
        if (d.model) setModel(d.model);
      })
      .catch(() => setOgOnline(false));
    void loadLevel(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLevel = useCallback(async (i: number) => {
    setPhase("loading");
    setJudgement(null);
    setPayload("");
    setMisses(0);
    setShowHint(false);
    try {
      const res = await fetch("/api/level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: i }),
      });
      const data = await res.json();
      setLevel(data.level);
      if (data.source) setOgOnline(data.source === "0g");
      setPhase("ready");
      setTimeout(() => inputRef.current?.focus(), 120);
    } catch {
      setPhase("ready");
    }
  }, []);

  const submit = useCallback(async () => {
    if (!level || !payload.trim() || phase === "judging") return;
    setPhase("judging");
    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, payload }),
      });
      const data: Judgement & { source?: Source } = await res.json();
      setJudgement(data);
      if (data.source) setOgOnline(data.source === "0g");
      if (data.breached) {
        const streakBonus = streak * 25;
        const gained = data.points + streakBonus;
        const newScore = score + gained;
        setScore(newScore);
        setStreak((s) => s + 1);
        if (newScore > best) {
          setBest(newScore);
          localStorage.setItem("breach_best", String(newScore));
        }
      } else {
        setStreak(0);
        setMisses((m) => m + 1);
      }
      setPhase("result");
    } catch {
      setPhase("ready");
    }
  }, [level, payload, phase, streak, score, best]);

  const next = useCallback(() => {
    const ni = index + 1;
    setIndex(ni);
    void loadLevel(ni);
  }, [index, loadLevel]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
      e.preventDefault();
      if (phase === "result" && judgement?.breached) next();
      else submit();
    }
  };

  const breached = phase === "result" && judgement?.breached;
  const failed = phase === "result" && judgement && !judgement.breached;

  return (
    <main className="grid-bg flex min-h-dvh flex-col">
      {/* HUD */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-6">
        <Link href="/" className="glow text-lg font-extrabold tracking-[0.2em] text-[var(--phosphor)]">
          BREACH
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Stat label="SCORE" value={score.toLocaleString()} accent />
          <Stat label="STREAK" value={`×${streak}`} />
          <Stat label="ROUND" value={`${index + 1}`} />
          <Stat label="BEST" value={best.toLocaleString()} />
          <OgBadge online={ogOnline} model={model} />
          <button
            onClick={() => setBoardOpen(true)}
            className="hud-chip px-3 py-1 text-[10px] tracking-widest text-[var(--cyan)] hover:text-[var(--phosphor)]"
          >
            ◍ BOARD
          </button>
        </div>
      </header>

      <Leaderboard
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        score={score}
        rounds={index}
      />

      <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Target dossier */}
        <section className="panel scan-flicker flex flex-col p-5">
          <div className="flex items-center justify-between text-[11px] tracking-widest text-[var(--muted)]">
            <span>TARGET DOSSIER</span>
            <span>
              DIFF{" "}
              <span className="text-[var(--amber)]">
                {"▮".repeat(level?.difficulty ?? 1)}
                <span className="text-[var(--line-bright)]">
                  {"▯".repeat(5 - (level?.difficulty ?? 1))}
                </span>
              </span>
            </span>
          </div>

          {phase === "loading" || !level ? (
            <div className="mt-10 flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
              <span className="caret">spawning target on {ogOnline ? "0G Compute" : "local range"}</span>
            </div>
          ) : (
            <div className="mt-3 flex flex-1 flex-col">
              <h2 className="glow-cyan text-2xl font-bold text-[var(--cyan)]">
                {level.codename}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--fg)]/85">
                {level.briefing}
              </p>

              <dl className="mt-5 space-y-3 text-sm">
                <Field label="ATTACK SURFACE" value={level.surface} />
                <Field label="OBJECTIVE" value={level.objective} mono />
              </dl>

              {/* Hint */}
              <div className="mt-auto pt-5">
                {showHint ? (
                  <div className="rounded-md border border-[var(--line-bright)] bg-[var(--amber)]/5 p-3 text-xs text-[var(--amber)]">
                    ⚑ {level.hint}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowHint(true)}
                    className="text-xs text-[var(--muted)] underline-offset-4 hover:text-[var(--amber)] hover:underline"
                  >
                    {misses >= 1 ? "⚑ stuck? reveal a hint" : "reveal a hint"}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Console */}
        <section className="panel flex flex-col p-5">
          <div className="text-[11px] tracking-widest text-[var(--muted)]">
            EXPLOIT CONSOLE
          </div>

          {/* output */}
          <div className="mt-3 min-h-[150px] flex-1 rounded-md border border-[var(--line)] bg-black/40 p-3 text-sm">
            {phase === "judging" && (
              <div className="text-[var(--muted)]">
                <span className="caret">
                  routing payload through {ogOnline ? "0G adjudicator" : "local range"}
                </span>
              </div>
            )}
            {phase === "result" && judgement && (
              <div className={`rise ${failed ? "shake" : ""}`}>
                <div
                  className={`mb-2 text-xs font-bold tracking-widest ${
                    breached ? "text-[var(--phosphor)] glow" : "text-[var(--danger)]"
                  }`}
                >
                  {breached ? "◉ BREACH CONFIRMED" : "✕ ATTACK REPELLED"}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[var(--fg)]/90">
                  <Typewriter text={judgement.systemResponse} speed={9} />
                </pre>
                <div className="mt-3 border-t border-[var(--line)] pt-2 text-xs text-[var(--muted)]">
                  {judgement.technique && (
                    <span className="text-[var(--cyan)]">
                      {judgement.technique}
                    </span>
                  )}
                  {judgement.technique && " — "}
                  {judgement.analysis}
                </div>
                {breached && (
                  <div className="mt-2 text-xs text-[var(--phosphor)]">
                    +{judgement.points} pts
                    {streak > 1 ? ` · streak ×${streak} (+${(streak - 1) * 25})` : ""}
                    {" · "}flaw was{" "}
                    <span className="text-[var(--amber)]">
                      {VULN_LABELS[level!.vuln]}
                    </span>
                  </div>
                )}
              </div>
            )}
            {(phase === "ready" || phase === "loading") && (
              <div className="text-[var(--muted)]">
                {phase === "loading"
                  ? "› establishing link…"
                  : "› target live. craft your payload and transmit."}
              </div>
            )}
          </div>

          {/* input */}
          <div className="mt-3">
            <label className="text-[11px] tracking-widest text-[var(--muted)]">
              PAYLOAD → <span className="text-[var(--cyan)]">{level?.inputLabel ?? "input"}</span>
            </label>
            <div className="mt-1 flex items-start gap-2 rounded-md border border-[var(--line-bright)] bg-black/50 p-2">
              <span className="pt-2 text-[var(--phosphor)]">❯</span>
              <textarea
                ref={inputRef}
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                onKeyDown={onKey}
                rows={2}
                spellCheck={false}
                disabled={phase === "judging" || phase === "loading"}
                placeholder={"' OR 1=1 --"}
                className="min-h-[44px] flex-1 resize-none bg-transparent text-sm text-[var(--fg)] caret-[var(--phosphor)] outline-none placeholder:text-[var(--muted)]/50 disabled:opacity-50"
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-[var(--muted)]">
                Enter to transmit · Shift+Enter for newline
              </span>
              {breached ? (
                <button onClick={next} className="btn pulse-ring px-6 py-2 text-xs font-bold tracking-widest">
                  NEXT TARGET ▸
                </button>
              ) : (
                <div className="flex gap-2">
                  {failed && (
                    <button
                      onClick={next}
                      className="px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
                    >
                      skip ↷
                    </button>
                  )}
                  <button
                    onClick={submit}
                    disabled={!payload.trim() || phase === "judging" || phase === "loading"}
                    className="btn px-6 py-2 text-xs font-bold tracking-widest"
                  >
                    {phase === "judging" ? "TRANSMITTING…" : "TRANSMIT ▸"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer className="px-4 pb-3 text-center text-[10px] text-[var(--muted)] sm:px-6">
        Simulated targets only — every system here is hallucinated by AI on 0G.
        Never point real exploits at systems you don&apos;t own.
      </footer>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="hud-chip flex items-baseline gap-1.5 px-3 py-1">
      <span className="text-[10px] tracking-widest text-[var(--muted)]">{label}</span>
      <span className={`font-bold ${accent ? "text-[var(--phosphor)] glow" : "text-[var(--fg)]"}`}>
        {value}
      </span>
    </div>
  );
}

function OgBadge({ online, model }: { online: boolean | null; model: string }) {
  const color =
    online === null ? "var(--muted)" : online ? "var(--phosphor)" : "var(--amber)";
  const label =
    online === null ? "0G · linking" : online ? `0G · ${model}` : "0G · local range";
  return (
    <div className="hud-chip flex items-center gap-1.5 px-3 py-1" title="AI inference source">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      <span className="text-[10px] tracking-widest" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] tracking-widest text-[var(--muted)]">{label}</dt>
      <dd className={`mt-0.5 text-[var(--fg)]/90 ${mono ? "font-mono text-[13px]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
