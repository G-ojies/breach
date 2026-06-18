"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/lib/leaderboard";

type SubmitState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "done"; rank: number; persisted: boolean; txHash: string | null };

export default function Leaderboard({
  open,
  onClose,
  score,
  rounds,
}: {
  open: boolean;
  onClose: () => void;
  score: number;
  rounds: number;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [storage, setStorage] = useState(false);
  const [handle, setHandle] = useState("");
  const [submit, setSubmit] = useState<SubmitState>({ phase: "idle" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/leaderboard", { cache: "no-store" });
      const d = await r.json();
      setEntries(d.entries ?? []);
      setStorage(Boolean(d.storage));
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setHandle(localStorage.getItem("breach_handle") || "");
    setSubmit({ phase: "idle" });
    void load();
  }, [open, load]);

  const doSubmit = useCallback(async () => {
    if (score <= 0 || submit.phase === "submitting") return;
    const h = handle.trim() || "anon";
    localStorage.setItem("breach_handle", h);
    setSubmit({ phase: "submitting" });
    try {
      const r = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: h, score, rounds }),
      });
      const d = await r.json();
      setEntries(d.entries ?? []);
      setSubmit({
        phase: "done",
        rank: d.rank ?? -1,
        persisted: Boolean(d.persisted),
        txHash: d.txHash ?? null,
      });
    } catch {
      setSubmit({ phase: "done", rank: -1, persisted: false, txHash: null });
    }
  }, [handle, score, rounds, submit.phase]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="panel rise w-full max-w-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="glow text-lg font-extrabold tracking-[0.2em] text-[var(--phosphor)]">
            ◍ GLOBAL BOARD
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--fg)]"
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <div className="mt-1 text-[10px] tracking-widest text-[var(--muted)]">
          {storage ? "PERSISTED ON 0G STORAGE · KV" : "0G STORAGE OFFLINE · LOCAL ONLY"}
        </div>

        {/* list */}
        <div className="mt-4 max-h-[46vh] overflow-y-auto rounded-md border border-[var(--line)] bg-black/40">
          {loading && entries.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--muted)]">
              <span className="caret">loading from 0G</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--muted)]">
              No breaches recorded yet. Be the first.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {entries.map((e, i) => (
                <li
                  key={`${e.handle}-${e.ts}`}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-6 text-right font-bold ${
                        i === 0
                          ? "text-[var(--amber)]"
                          : i < 3
                            ? "text-[var(--cyan)]"
                            : "text-[var(--muted)]"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[var(--fg)]">{e.handle}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--muted)]">
                      {e.rounds} rds
                    </span>
                    <span className="font-bold text-[var(--phosphor)]">
                      {e.score.toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* submit */}
        <div className="mt-4 rounded-md border border-[var(--line-bright)] bg-black/40 p-3">
          {submit.phase === "done" ? (
            <div className="text-sm">
              {submit.rank > 0 ? (
                <span className="text-[var(--phosphor)] glow">
                  ◉ Ranked #{submit.rank} with {score.toLocaleString()} pts
                </span>
              ) : (
                <span className="text-[var(--muted)]">
                  Submitted {score.toLocaleString()} pts — keep climbing.
                </span>
              )}
              <div className="mt-1 text-[11px] text-[var(--muted)]">
                {submit.persisted ? (
                  <>
                    written to 0G Storage
                    {submit.txHash && (
                      <>
                        {" · "}
                        <a
                          href={`https://chainscan-galileo.0g.ai/tx/${submit.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--cyan)] underline-offset-2 hover:underline"
                        >
                          view tx ↗
                        </a>
                      </>
                    )}
                  </>
                ) : (
                  "saved locally · 0G sync pending (fund the burner to persist)"
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="your handle"
                maxLength={16}
                spellCheck={false}
                className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-black/50 px-3 py-2 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--muted)]/50"
              />
              <button
                onClick={doSubmit}
                disabled={score <= 0 || submit.phase === "submitting"}
                className="btn whitespace-nowrap px-4 py-2 text-xs font-bold tracking-widest"
                title={score <= 0 ? "Score a breach first" : "Submit to 0G"}
              >
                {submit.phase === "submitting"
                  ? "WRITING TO 0G…"
                  : `SUBMIT ${score.toLocaleString()}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
