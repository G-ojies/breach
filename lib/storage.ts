import "server-only";
import { ethers } from "ethers";
import {
  Indexer,
  Batcher,
  KvClient,
  getFlowContract,
} from "@0gfoundation/0g-storage-ts-sdk";
import {
  Board,
  EMPTY_BOARD,
  LeaderboardEntry,
  upsertEntry,
} from "./leaderboard";

/**
 * 0G Storage (Key-Value) layer for the global leaderboard.
 *
 * The board lives in 0G's decentralized KV store under one stable key. Writes
 * are signed by an app-owned BURNER wallet and settle on the 0G Flow contract;
 * reads come from the KV node. A short in-memory cache smooths the write→read
 * finality lag and keeps the board serving even if the KV node blips.
 *
 * All reads/writes are proxied through our API routes — the browser never talks
 * to the raw-IP KV node directly.
 */

const RPC = process.env.ZG_STORAGE_RPC?.trim() || "https://evmrpc-testnet.0g.ai";
const INDEXER =
  process.env.ZG_STORAGE_INDEXER?.trim() ||
  "https://indexer-storage-testnet-turbo.0g.ai";
const FLOW_ADDR =
  process.env.ZG_FLOW_CONTRACT?.trim() ||
  "0x22E03a6A89B950F1c82ec5e74F8eCa321a105296";
// Testnet KV read node — raw IP, may rotate; override via env if it moves.
const KV_NODE =
  process.env.ZG_KV_NODE?.trim() || "http://3.101.147.150:6789";

const STREAM_ID = ethers.id("breach-leaderboard-v1"); // stable bytes32 namespace
const BOARD_KEY = new TextEncoder().encode("board");
const PK = process.env.ZG_PRIVATE_KEY?.trim();

export function storageConfigured(): boolean {
  return Boolean(PK);
}

export function burnerAddress(): string | null {
  if (!PK) return null;
  try {
    return new ethers.Wallet(PK).address;
  } catch {
    return null;
  }
}

/* ---------------- in-memory cache ---------------- */
let cache: Board = EMPTY_BOARD;
let cacheTs = 0;
const CACHE_TTL = 10_000; // ms

function freshCache(): Board | null {
  return Date.now() - cacheTs < CACHE_TTL && cacheTs > 0 ? cache : null;
}
function primeCache(b: Board) {
  cache = b;
  cacheTs = Date.now();
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/* ---------------- write serialization ----------------
 * Every board write settles on-chain through ONE burner wallet, so concurrent
 * writes would (a) reuse the same nonce → tx collision, and (b) race on the
 * read-modify-write of the board → lost updates. We chain all save operations
 * through a single promise so they execute strictly one-at-a-time per instance.
 * (Across serverless instances the KV-latest read + cache still converge; this
 * lock removes the dominant within-instance corruption under load.)
 */
let writeChain: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  // keep the chain alive regardless of each task's success/failure
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/* ---------------- KV primitives ---------------- */

async function kvGetBoard(): Promise<Board | null> {
  const kv = new KvClient(KV_NODE);
  const val = await withTimeout(
    kv.getValue(STREAM_ID, BOARD_KEY), // no version arg = latest
    8000,
    "kv getValue",
  );
  if (!val || !val.data) return null;
  const json = Buffer.from(val.data, "base64").toString("utf8");
  const parsed = JSON.parse(json) as Board;
  if (!parsed || !Array.isArray(parsed.entries)) return null;
  return parsed;
}

async function kvSetBoard(
  board: Board,
): Promise<{ txHash?: string; rootHash?: string }> {
  if (!PK) throw new Error("ZG_PRIVATE_KEY not set");
  const provider = new ethers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(PK, provider);
  const indexer = new Indexer(INDEXER);

  const [nodes, selErr] = await withTimeout(
    indexer.selectNodes(1),
    15000,
    "selectNodes",
  );
  if (selErr) throw selErr;

  const flow = getFlowContract(FLOW_ADDR, signer);
  const batcher = new Batcher(1, nodes, flow, RPC);
  const data = new TextEncoder().encode(JSON.stringify(board));
  batcher.streamDataBuilder.set(STREAM_ID, BOARD_KEY, data);

  const [tx, err] = await withTimeout(batcher.exec(), 45000, "kv exec");
  if (err) throw err;
  const t = tx as { txHash?: string; rootHash?: string } | undefined;
  return { txHash: t?.txHash, rootHash: t?.rootHash };
}

/* ---------------- public API (used by routes) ---------------- */

export type LoadResult = { board: Board; source: "cache" | "0g" | "empty" };

/** Best-effort load: fresh cache → KV node → empty. Never throws. */
export async function loadBoard(): Promise<LoadResult> {
  const c = freshCache();
  if (c) return { board: c, source: "cache" };
  try {
    const b = await kvGetBoard();
    if (b) {
      primeCache(b);
      return { board: b, source: "0g" };
    }
  } catch (err) {
    console.error("[storage] kv read failed:", (err as Error).message);
  }
  // serve last-known cache even if stale, else empty
  return cacheTs > 0
    ? { board: cache, source: "cache" }
    : { board: EMPTY_BOARD, source: "empty" };
}

export type SaveResult = {
  board: Board;
  rank: number;
  persisted: boolean;
  txHash?: string;
  error?: string;
};

/**
 * Upsert a score, update the cache optimistically (so reads reflect it
 * immediately), then write through to 0G KV best-effort.
 *
 * The whole read-modify-write runs inside the serialize() lock so concurrent
 * submissions can't lose each other's entries or collide on the burner nonce.
 */
export async function saveScore(entry: LeaderboardEntry): Promise<SaveResult> {
  return serialize(async () => {
    const current = (await loadBoard()).board;
    const { board, rank } = upsertEntry(current, entry);
    primeCache(board); // optimistic: reflect immediately, smooth finality lag

    if (!storageConfigured()) {
      return { board, rank, persisted: false, error: "storage_not_configured" };
    }
    try {
      const { txHash } = await kvSetBoard(board);
      return { board, rank, persisted: true, txHash };
    } catch (err) {
      console.error("[storage] kv write failed:", (err as Error).message);
      return {
        board,
        rank,
        persisted: false,
        error: (err as Error).message,
      };
    }
  });
}
