# BREACH — Demo Video Script (≈2:30, max 3:00)

**Goal:** show the AI-native loop *running on 0G* in under 3 minutes. Show the
product, not slides. Record real screen capture.

---

### 0:00 – 0:15 — Hook (cold open, no intro)
*(Screen: the BREACH landing page, phosphor title glowing.)*
> "This is a hacking game. But the levels don't exist — until an AI dreams them
> up. Every target, every verdict, runs on 0G Compute. Let me show you."

*Click **JACK IN**.*

### 0:15 – 0:25 — Prove it's on 0G
*(Screen: hover the HUD badge `0G · qwen2.5-omni-7b`, green dot.)*
> "See that badge? Every call you're about to watch is inference running on 0G's
> network — paid per token from an on-chain balance. Not OpenAI. 0G."

### 0:25 – 1:05 — The core loop, win #1
*(Screen: the first AI-generated target dossier.)*
> "0G just generated this target — a login portal with a hidden flaw. It's never
> made this exact one before."

*Type `' OR 1=1 --` into the console. Hit TRANSMIT.*
> "I'll inject some SQL…"

*(Screen: 'routing payload through 0G adjudicator' → BREACH CONFIRMED, points tick up.)*
> "…and a *second* AI on 0G role-plays the system, confirms the breach, and scores
> it. Plus-250."

### 1:05 – 1:45 — Infinite & adaptive, win #2
*Click **NEXT TARGET**. A different vuln class appears (e.g. command injection).*
> "Next round — totally different system, different vulnerability. The AI adapts
> the difficulty as I climb."

*Read the dossier aloud in one line, type the matching exploit (e.g. `; cat /etc/passwd`). TRANSMIT → breach, show the realistic /etc/passwd dump.*
> "Command injection this time. And the AI doesn't just say 'yes' — it generates
> the actual system output. Look at that."

### 1:45 – 2:05 — Show the judge has teeth
*Trigger a new level, type a wrong-class or junk payload → ATTACK REPELLED.*
> "It's not a pushover, either. Wrong technique? Repelled — with feedback on why.
> The AI genuinely understands the exploit, not just keywords."

### 2:05 – 2:25 — The board is on 0G too
*Click **◍ BOARD**, type a handle, hit **SUBMIT**. Show "written to 0G Storage", then click **view tx ↗** → the 0G explorer opens on a real transaction.*
> "And it's not just the AI that's on 0G — the leaderboard is too. Submitting my
> score writes it to 0G Storage and settles on-chain. There's the transaction.
> Compute *and* storage, both decentralized."

### 2:25 – 2:40 — Close
*(Screen: streak counter / score climbing, then back to the glowing title.)*
> "Infinite AI-generated levels. Real exploitation. An AI referee, and an
> on-chain board — all on 0G. That's BREACH. Play it: breach-ebon.vercel.app."

---

### Recording tips
- Capture at 1280×800+; the CRT/phosphor look reads great on video.
- Pre-load the page so the first target is already generated (no dead air).
- If a 0G call is slow, the typewriter + "routing through 0G" line covers it —
  lean into it as drama.
- Keep your cursor moving; narrate over every wait. No silent gaps.
- One clean take of each breach beats a perfect script. Re-roll levels until you
  get a punchy one (the /etc/passwd dump always lands).
- **Before recording the board beat: fund the burner wallet** at faucet.0g.ai so
  the submit shows "written to 0G Storage" + a live tx link (not "0G sync
  pending"). Verify once off-camera — the explorer link should open a real tx.
