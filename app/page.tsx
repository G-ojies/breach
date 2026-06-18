import Link from "next/link";

export default function Home() {
  return (
    <main className="grid-bg relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* top status bar */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between border-b border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">
        <span className="tracking-widest">BREACH://arena</span>
        <span className="hidden sm:inline">
          AI-native target range · powered by{" "}
          <span className="text-[var(--cyan)] glow-cyan">0G Compute</span>
        </span>
      </div>

      <div className="scan-flicker flex flex-col items-center text-center">
        <div className="hud-chip mb-7 px-4 py-1.5 text-[11px] tracking-widest text-[var(--phosphor)]">
          ◦ ZERO CUP 2026 · AI-NATIVE ON 0G
        </div>

        <h1
          className="glow text-6xl font-extrabold tracking-[0.18em] text-[var(--phosphor)] sm:text-8xl"
          style={{ letterSpacing: "0.16em" }}
        >
          BREACH
        </h1>

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-[var(--fg)]/80 sm:text-base">
          Every target is a living system{" "}
          <span className="text-[var(--cyan)]">dreamed up by AI</span> and
          guarded by an{" "}
          <span className="text-[var(--cyan)]">AI adjudicator</span> — both
          running on 0G&apos;s decentralized compute. Type a real exploit. If it
          lands, you&apos;re in.
        </p>

        <Link
          href="/play"
          className="btn pulse-ring mt-10 px-10 py-3.5 text-sm font-bold tracking-widest"
        >
          ▸ JACK IN
        </Link>

        <div className="mt-14 grid w-full max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={i} className="panel p-4">
              <div className="text-[var(--phosphor)]/70 text-xs">0{i + 1}</div>
              <div className="mt-1 text-sm font-bold text-[var(--fg)]">
                {s.title}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 px-5 text-center text-[10px] text-[var(--muted)]">
        For authorized practice only · payloads run against simulated targets,
        never real systems
      </div>
    </main>
  );
}

const STEPS = [
  {
    title: "AI spawns a target",
    body: "0G Compute invents a unique vulnerable system every round — no two runs the same.",
  },
  {
    title: "You attack it",
    body: "SQLi, XSS, command injection, traversal… type a genuine payload into the live box.",
  },
  {
    title: "AI judges the hit",
    body: "An on-chain-paid adjudicator role-plays the system and rules on whether you popped it.",
  },
];
