# BREACH

**An AI-native hacking game — built on 0G.**

[![Play live](https://img.shields.io/badge/▸_play-breach--ebon.vercel.app-43f5a0?style=flat-square)](https://breach-ebon.vercel.app)
[![Built on 0G](https://img.shields.io/badge/built_on-0G_Compute_+_Storage-38e1ff?style=flat-square)](https://0g.ai)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![Zero Cup 2026](https://img.shields.io/badge/Zero_Cup-2026-ffcf6b?style=flat-square)](https://0g.ai)

Every target is a vulnerable system *invented by AI*. Every exploit you type is
*judged by AI*. Both the generator and the adjudicator run on **0G Compute**,
0G's decentralized inference network — not a centralized API. Remove the AI and
there is no game: that's what makes BREACH AI-native rather than AI-flavored.

> Built for the 0G Labs **Zero Cup 2026** Vibe Coding Tournament.

![BREACH — a live AI-generated target on 0G Compute, with the green `0G · qwen2.5-omni-7b` badge in the HUD](public/screenshot.png)

---

## How it plays

1. **AI spawns a target.** 0G Compute generates a unique vulnerable system each
   round — a login form, a ping tool, a template engine — with exactly one
   hidden flaw (SQLi, XSS, command injection, path traversal, SSTI, NoSQLi…).
2. **You attack it.** Type a real payload into the live console.
3. **AI judges the hit.** A second model on 0G role-plays the target's response
   *and* rules on whether your payload genuinely exploited the intended flaw.
   Score, streaks, and round counter climb as you go.

No two runs are the same, because the levels are generated, not scripted.

## Why it's "AI-native on 0G"

- **Inference runs on 0G Compute** via the OpenAI-compatible
  [Router](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router)
  (`https://router-api.0g.ai/v1`). The app holds only a server-side `sk-...`
  Router key; payment for inference settles on the 0G network.
- **The AI is the engine, not a feature.** Level design and adjudication are
  both LLM calls. There is no hardcoded level list in the live path.
- **State lives on 0G too.** The global leaderboard is persisted to **0G Storage**
  (decentralized KV). Each score is signed by an app-owned burner wallet and
  settles on-chain via the 0G Flow contract — you get a tx hash back, viewable on
  the explorer. So BREACH spans both 0G Compute *and* 0G Storage.
- **Network:** 0G Galileo Testnet (chain ID `16602`).

## Run it

```bash
npm install
cp .env.example .env.local   # then paste your 0G Router key (see below)
npm run dev                  # http://localhost:3000
```

The game runs **with or without** a 0G key:

| Mode | Trigger | Behavior |
| --- | --- | --- |
| **0G Compute** | `ZG_ROUTER_API_KEY` set | Infinite AI-generated targets + AI judging on 0G. HUD badge: `0G · <model>`. |
| **Local range** | no key / 0G unreachable | Falls back to a hand-authored target set + heuristic judge so a demo never dies. HUD badge: `0G · local range`. |

### Getting a 0G Router key

1. Go to **https://pc.0g.ai** and connect a wallet (MetaMask or social login).
2. Fund it with testnet **0G** from **https://faucet.0g.ai** (0.1 0G/day).
   Network: 0G Galileo Testnet · Chain ID `16602` · RPC `https://evmrpc-testnet.0g.ai`.
3. Deposit a little 0G to the Router and mint an API key.
4. Paste it into `.env.local` as `ZG_ROUTER_API_KEY=sk-...`.

Discover live model ids at `GET https://router-api.0g.ai/v1/models`. Verified
live options include `deepseek-v4-flash` (default — cheap + fast), `deepseek-v3`,
`deepseek-v4-pro`, `glm-5`, and 0G's own `0gm-1.0-35b-a3b`. Inference is
fractions of a cent per round; all models are TEE-attested.

## Architecture

```
app/
  page.tsx                  landing / hero
  play/page.tsx             the game (client): HUD, dossier, exploit console
  api/level/route.ts        POST → generate a target on 0G (fallback: local set)
  api/judge/route.ts        POST → adjudicate a payload on 0G (fallback: heuristic)
  api/status/route.ts       GET  → is 0G Compute + Storage wired up?
  api/leaderboard/route.ts  GET  → read the global board from 0G Storage (KV)
  api/score/route.ts        POST → write a score to 0G Storage (serialized)
lib/
  og.ts                     0G Compute Router client (OpenAI-compatible)
  game.ts                   types, prompts, offline fallback engine
  storage.ts                0G Storage (KV) layer — read/write, cache, write lock
  leaderboard.ts            shared board types + pure upsert/rank logic
components/
  Leaderboard.tsx           the ◍ BOARD modal: live board + score submission
```

### 0G Storage (leaderboard) setup — optional

The board persists when a funded burner wallet is configured. Set `ZG_PRIVATE_KEY`
to an **app-owned** key (not a user wallet), fund its address at
[faucet.0g.ai](https://faucet.0g.ai), and writes settle on-chain. Leave it blank
to run the board in local-only mode (no persistence). See `.env.example`.

## Safety

Every target is hallucinated by AI and exists only as text. No payload touches a
real system. BREACH is a practice range — never point real exploits at systems
you don't own.
