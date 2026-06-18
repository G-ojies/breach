# BREACH — Zero Cup 2026 Submission

> **AI builds the box. You break it. AI decides if you won.**
> An AI-native hacking game where every level is invented by AI and every exploit is judged by AI — running on **0G Compute**, with the global leaderboard persisted on **0G Storage**.

**▶ Play now (no install, no signup): https://breach-ebon.vercel.app**
**Category:** Game

---

## What it is

BREACH is a web-hacking game with **no hardcoded levels**. Each round, 0G Compute
generates a brand-new vulnerable system — a login form, a chat server, a file
downloader — with exactly one hidden flaw: SQL injection, XSS, command injection,
path traversal, SSTI, NoSQL injection, and more.

You read the dossier, type a **real exploit**, and a second 0G inference call
role-plays the target's response *and* rules on whether you actually popped it.
Score, streaks, and difficulty climb as you go. Because the levels are generated,
not scripted, **no two runs are ever the same.**

## Why it's AI-native *on 0G* (not AI-flavored)

The AI isn't a feature bolted onto a game — **it is the game engine.** Two 0G
Compute Router inference calls form the entire core loop:

1. **Generate the target** — invent a unique vulnerable system + its hidden flaw.
2. **Judge the exploit** — simulate the target's response and decide if the
   player's payload genuinely exploited the intended vulnerability.

Remove the AI and there is no game. The inference runs on **0G's decentralized
compute network** (`qwen2.5-omni-7b`, TEE-attested), paid **per token from an
on-chain balance** — not a centralized API behind a server.

## Two 0G layers, not one

BREACH uses **0G Compute** for the game engine *and* **0G Storage** for state:

- **Compute** invents every target and judges every exploit (above).
- **Storage** holds the **global leaderboard** in 0G's decentralized KV store.
  Each submitted score is signed by an app-owned burner wallet and **settles
  on-chain via the 0G Flow contract** — you get back a real tx hash that opens
  on the 0G explorer. No central database; the board itself lives on 0G.

So the "built on 0G" story spans the whole stack: the AI runs on 0G, and the
competition it produces is stored on 0G.

## Built with

- **0G Compute Router** — OpenAI-compatible inference on 0G (testnet)
- **0G Storage (KV) SDK** — decentralized leaderboard, on-chain Flow settlement
- **Next.js 16 / React 19**, deployed on Vercel
- A **graceful local fallback range** so a live demo never dies if the network hiccups

## The grit (we shipped on bleeding-edge infra)

0G's **testnet Router endpoint isn't documented** — we found it by reading the
Playground's network calls in DevTools. We also caught that a model id in the
docs (`deepseek-v3.1`) doesn't actually exist on the Router, and swapped to a
live one. On the **Storage** side the testnet KV read node is a bare rotating IP
(no DNS), so we made it env-overridable and wrapped every call in timeouts with
a cache fallback. Then we shipped — end-to-end, on testnet, with real per-token
settlement *and* on-chain leaderboard writes.

## Try it in 30 seconds (for judges)

1. Open **https://breach-ebon.vercel.app** → click **JACK IN**.
2. The HUD badge reads **`0G · qwen2.5-omni-7b`** (green dot = live on 0G Compute).
3. First target is a login form. Type: **`' OR 1=1 --`** → **BREACH CONFIRMED**.
4. Hit **NEXT TARGET**, read the new dossier, and craft the matching exploit —
   e.g. `../../../../etc/passwd` for path traversal, `<script>alert(1)</script>`
   for XSS, `; cat /etc/passwd` for command injection.
5. Click **◍ BOARD**, enter a handle, **SUBMIT** your score — it writes to the
   **0G Storage** leaderboard and returns a tx hash you can open on the explorer.

**Safe by design:** every target is hallucinated text. No payload ever touches a
real system — BREACH is a practice range.

## What's next

- **Per-vuln ranked ladders** and seasonal resets on the 0G Storage board.
- **Daily seeded challenge** — one shared AI-generated target a day, global race.
- **On-chain proof-of-breach** — mint a verifiable record of a clean solve.

---

### One-liner (for the submission form)
> BREACH is an AI-native hacking game where 0G Compute invents a unique vulnerable system every round and an AI adjudicator judges your exploit — infinite AI-generated levels, real payloads, and a global leaderboard persisted on 0G Storage.

### Links
- **Live demo:** https://breach-ebon.vercel.app
- **Code:** https://github.com/G-ojies/breach
