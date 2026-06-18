/**
 * BREACH leaderboard — shared types + pure board logic.
 * No server-only imports here so the client can import the types.
 */

export interface LeaderboardEntry {
  handle: string;
  score: number;
  rounds: number;
  ts: number;
}

export interface Board {
  entries: LeaderboardEntry[];
  updated: number;
}

export const MAX_ENTRIES = 50;

export const EMPTY_BOARD: Board = { entries: [], updated: 0 };

/** Allow a-z A-Z 0-9 _ - , 1–16 chars; fall back to "anon". */
export function sanitizeHandle(raw: unknown): string {
  const s = String(raw ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 16);
  return s || "anon";
}

/**
 * Insert/replace an entry, keeping the BEST score per handle (case-insensitive),
 * sorted by score desc then earliest timestamp, trimmed to MAX_ENTRIES.
 * Returns the new board and the 1-based rank of `entry` (or -1 if it didn't place).
 */
export function upsertEntry(
  board: Board,
  entry: LeaderboardEntry,
): { board: Board; rank: number } {
  const key = (h: string) => h.toLowerCase();
  const map = new Map<string, LeaderboardEntry>();
  for (const e of board.entries) map.set(key(e.handle), e);

  const existing = map.get(key(entry.handle));
  if (!existing || entry.score > existing.score) {
    map.set(key(entry.handle), entry);
  }

  const sorted = [...map.values()].sort(
    (a, b) => b.score - a.score || a.ts - b.ts,
  );
  const trimmed = sorted.slice(0, MAX_ENTRIES);

  const rank =
    trimmed.findIndex((e) => key(e.handle) === key(entry.handle)) + 1 || -1;

  return {
    board: { entries: trimmed, updated: entry.ts },
    rank: rank > 0 ? rank : -1,
  };
}
