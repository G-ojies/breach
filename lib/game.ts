/**
 * BREACH — game model, prompts, and the offline fallback engine.
 *
 * The AI is the game: 0G Compute generates each target and adjudicates every
 * exploit. When 0G is unreachable (or no key is set) we fall back to a small
 * set of hand-authored targets + a heuristic judge so a demo never dies.
 */

export type VulnType =
  | "sqli"
  | "xss"
  | "auth_bypass"
  | "cmd_injection"
  | "path_traversal"
  | "ssti"
  | "nosql"
  | "idor";

export const VULN_LABELS: Record<VulnType, string> = {
  sqli: "SQL Injection",
  xss: "Cross-Site Scripting",
  auth_bypass: "Authentication Bypass",
  cmd_injection: "Command Injection",
  path_traversal: "Path Traversal",
  ssti: "Server-Side Template Injection",
  nosql: "NoSQL Injection",
  idor: "Insecure Direct Object Reference",
};

export interface Level {
  id: string;
  codename: string; // e.g. "HELIOS Auth Gateway"
  briefing: string; // 1–2 sentence narrative setup
  surface: string; // what the attack surface is, in plain terms
  inputLabel: string; // label shown above the player's payload box
  objective: string; // what counts as a breach, in plain terms
  vuln: VulnType; // the intended flaw (sent to the AI judge, hidden in UI until solved)
  hint: string; // a nudge the player can unlock
  difficulty: 1 | 2 | 3 | 4 | 5;
  points: number; // base reward for a clean breach
}

export interface Judgement {
  breached: boolean;
  systemResponse: string; // in-character output from the target
  analysis: string; // short post-mortem of what the payload did
  technique: string | null; // detected technique, if any
  points: number; // points to award (0 on miss)
}

/* ------------------------------------------------------------------ *
 *  Prompts
 * ------------------------------------------------------------------ */

export function levelSystemPrompt(): string {
  return [
    "You are the level generator for BREACH, a hacking game where players exploit AI-simulated systems.",
    "You invent a single vulnerable target with EXACTLY ONE intended web vulnerability.",
    "The target must be realistic, self-contained, and solvable by typing a single payload or short request.",
    "Make targets vivid and varied: invent a product codename, a backstory, and a concrete attack surface.",
    "Difficulty 1 = textbook obvious; 5 = requires a clever or chained payload.",
    "",
    "Respond with ONLY a JSON object, no prose, no code fences, matching:",
    "{",
    '  "codename": string,        // product/system name, e.g. "HELIOS Auth Gateway"',
    '  "briefing": string,        // 1-2 sentences of narrative setup',
    '  "surface": string,         // the attack surface in plain terms, e.g. "Login form with username + password"',
    '  "inputLabel": string,      // short label for the player input box, e.g. "username"',
    '  "objective": string,       // what counts as a breach, plain terms',
    '  "vuln": one of ["sqli","xss","auth_bypass","cmd_injection","path_traversal","ssti","nosql","idor"],',
    '  "hint": string,            // one nudge that does NOT give away the full payload',
    '  "difficulty": 1|2|3|4|5,',
    '  "points": integer 100-500 // scale with difficulty',
    "}",
  ].join("\n");
}

export function levelUserPrompt(opts: {
  difficulty: number;
  preferVuln?: VulnType;
  nonce: string;
}): string {
  const v = opts.preferVuln
    ? `Make the intended vulnerability: ${opts.preferVuln} (${VULN_LABELS[opts.preferVuln]}).`
    : "Pick any one of the supported vulnerability types; vary it from common choices.";
  return [
    `Generate a fresh target at difficulty ${opts.difficulty}.`,
    v,
    `Uniqueness token (do not mention it, just ensure novelty): ${opts.nonce}.`,
    "Avoid reusing the codename 'HELIOS'. Be inventive.",
  ].join("\n");
}

export function judgeSystemPrompt(): string {
  return [
    "You are the adjudicator AND the live target system for BREACH, a hacking game.",
    "You are given a vulnerable target's spec (including its intended flaw and objective) and the player's payload.",
    "Do TWO things:",
    "1) Role-play the target's realistic response to the payload as terminal/HTTP output (in-character, concise).",
    "2) Decide whether the payload genuinely exploits THIS target's intended vulnerability to meet the objective.",
    "",
    "Judging rules:",
    "- Reward real exploitation technique for the intended vuln, even if syntax is imperfect but clearly correct in intent.",
    "- Do NOT award a breach for random guesses, valid-but-benign input, or attacks against a different vuln class.",
    "- Be fair but not a pushover. A blank or off-target payload is a miss.",
    "- Creative but technically sound payloads that achieve the objective count as a breach.",
    "",
    "CRITICAL — systemResponse MUST match your verdict:",
    "- If breached=true, systemResponse shows the EXPLOIT SUCCEEDING: leaked data, dumped /etc/passwd, 'admin session granted', the executed result, etc. NEVER an error or rejection.",
    "- If breached=false, systemResponse shows the attack FAILING: an error, rejection, or normal benign output. NEVER leaked data.",
    "- The systemResponse and breached must tell the same story.",
    "",
    "Respond with ONLY a JSON object, no prose, no code fences:",
    "{",
    '  "breached": boolean,',
    '  "systemResponse": string,   // the in-character output the player sees',
    '  "analysis": string,         // 1-2 sentences: what the payload did / why it passed or failed',
    '  "technique": string|null,   // name of the technique used, or null',
    '  "points": integer           // award the target points on breach, else 0',
    "}",
  ].join("\n");
}

export function judgeUserPrompt(level: Level, payload: string): string {
  return [
    "TARGET SPEC:",
    JSON.stringify(
      {
        codename: level.codename,
        surface: level.surface,
        inputLabel: level.inputLabel,
        objective: level.objective,
        intendedVuln: level.vuln,
        basePoints: level.points,
        difficulty: level.difficulty,
      },
      null,
      2,
    ),
    "",
    `PLAYER PAYLOAD (into "${level.inputLabel}"):`,
    payload.slice(0, 1000),
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 *  Offline fallback engine
 * ------------------------------------------------------------------ */

export const FALLBACK_LEVELS: Level[] = [
  {
    id: "fb-1",
    codename: "ACME Staff Portal",
    briefing:
      "ACME's internal staff portal still runs a login form wired straight into its user database. Get in as an administrator.",
    surface: "Login form — username and password fields",
    inputLabel: "username",
    objective: "Authenticate as any admin without knowing a valid password.",
    vuln: "sqli",
    hint: "The username goes straight into a SQL WHERE clause. What makes a condition always true?",
    difficulty: 1,
    points: 120,
  },
  {
    id: "fb-2",
    codename: "ChatterBox Guestbook",
    briefing:
      "ChatterBox renders every guestbook comment back to visitors with no sanitisation. Prove you can run script in their browser.",
    surface: "Public comment box rendered as HTML on the page",
    inputLabel: "comment",
    objective: "Inject markup that executes JavaScript when the page renders.",
    vuln: "xss",
    hint: "Closing tags and an event handler or <script> will be reflected verbatim.",
    difficulty: 1,
    points: 130,
  },
  {
    id: "fb-3",
    codename: "PingMaster Diagnostics",
    briefing:
      "PingMaster lets ops staff ping a host from a web box. The host string is dropped into a shell command. Read the server's secrets.",
    surface: "Network tool that runs `ping <your input>` on the server",
    inputLabel: "host",
    objective: "Run an extra command on the server, e.g. read /etc/passwd.",
    vuln: "cmd_injection",
    hint: "Shells chain commands with ; && | — append your own.",
    difficulty: 2,
    points: 200,
  },
  {
    id: "fb-4",
    codename: "VaultDocs Downloader",
    briefing:
      "VaultDocs serves files by name from a documents folder, trusting whatever path you ask for. Escape the folder.",
    surface: "File download endpoint: /download?file=<your input>",
    inputLabel: "file",
    objective: "Read a file outside the intended documents directory.",
    vuln: "path_traversal",
    hint: "Where does ../ take you?",
    difficulty: 2,
    points: 190,
  },
  {
    id: "fb-5",
    codename: "MongoLogin Beta",
    briefing:
      "MongoLogin built auth on a NoSQL store and passes your JSON body straight into the query. Log in as admin.",
    surface: "JSON login API: { user, pass } queried against a Mongo collection",
    inputLabel: "password (JSON value)",
    objective: "Bypass the password check using a query operator.",
    vuln: "nosql",
    hint: "Operators like $ne or $gt turn an equality check into 'anything'.",
    difficulty: 3,
    points: 260,
  },
  {
    id: "fb-6",
    codename: "RenderForge Templates",
    briefing:
      "RenderForge greets you by injecting your name into a server-side template. Make the server evaluate your expression.",
    surface: "Greeting field rendered through a server-side template engine",
    inputLabel: "name",
    objective: "Get the template engine to evaluate an arithmetic expression you supply.",
    vuln: "ssti",
    hint: "What does {{7*7}} render to if the engine trusts you?",
    difficulty: 3,
    points: 280,
  },
];

/**
 * Heuristic offline judge — pattern matches a payload against the intended
 * vuln. Intentionally lenient toward clearly-correct technique. Only used when
 * 0G Compute is unavailable.
 */
export function heuristicJudge(level: Level, payload: string): Judgement {
  const p = payload.trim();
  const lower = p.toLowerCase();
  const miss = (msg: string): Judgement => ({
    breached: false,
    systemResponse: msg,
    analysis: "Payload did not trigger the intended flaw.",
    technique: null,
    points: 0,
  });
  if (!p) return miss("> empty input rejected.");

  const win = (response: string, technique: string): Judgement => ({
    breached: true,
    systemResponse: response,
    analysis: `Exploited ${VULN_LABELS[level.vuln]} to satisfy: ${level.objective}`,
    technique,
    points: level.points,
  });

  switch (level.vuln) {
    case "sqli": {
      if (
        /('|")?\s*or\s+('|")?\s*\d+\s*=\s*\d+/i.test(p) ||
        /'\s*or\s*'?[^']*'?\s*=\s*'?/i.test(p) ||
        /--|#|\/\*/.test(p) ||
        /union\s+select/i.test(p) ||
        /'\s*;/.test(p)
      ) {
        return win(
          "200 OK — auth bypassed. Session established as admin (uid=1).",
          "Boolean-based SQL injection",
        );
      }
      return miss("Login failed: invalid credentials.");
    }
    case "xss": {
      if (
        /<script[\s>]/i.test(p) ||
        /on\w+\s*=/i.test(p) ||
        /<img[^>]+onerror/i.test(p) ||
        /<svg[^>]+onload/i.test(p) ||
        /javascript:/i.test(p)
      ) {
        return win(
          "Comment saved. Rendered payload fired: alert() executed in the visitor's browser.",
          "Reflected/stored XSS",
        );
      }
      return miss("Comment saved as plain text. No script executed.");
    }
    case "cmd_injection": {
      if (
        /[;&|`]/.test(p) ||
        /\$\(/.test(p) ||
        /\b(cat|ls|id|whoami|uname)\b/i.test(p)
      ) {
        return win(
          "PING ok.\nroot:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
          "OS command injection",
        );
      }
      return miss("PING: 3 packets transmitted, 3 received.");
    }
    case "path_traversal": {
      if (/\.\.[\/\\]/.test(p) || /%2e%2e/i.test(p) || /\/etc\/passwd/i.test(p)) {
        return win(
          "Serving file:\nroot:x:0:0:root:/root:/bin/bash",
          "Directory traversal",
        );
      }
      return miss("File not found in documents/.");
    }
    case "nosql": {
      if (/\$(ne|gt|gte|lt|regex|where|in|nin)\b/i.test(p) || /\{\s*"\$/.test(p)) {
        return win(
          '{ "status": "ok", "role": "admin" } — query matched without a valid password.',
          "NoSQL operator injection",
        );
      }
      return miss('{ "status": "denied" }');
    }
    case "ssti": {
      if (/\{\{.*[\*\+\-\/].*\}\}/.test(p) || /\$\{.*\}/.test(p) || /<%=.*%>/.test(p)) {
        return win(
          "Hello, 49! — the template engine evaluated your expression server-side.",
          "Server-side template injection",
        );
      }
      return miss("Hello, " + p.slice(0, 24) + "! (rendered literally)");
    }
    case "auth_bypass": {
      if (/admin|true|1|bypass|--/i.test(lower)) {
        return win("Access granted. Welcome, administrator.", "Authentication bypass");
      }
      return miss("Access denied.");
    }
    case "idor": {
      if (/\b\d+\b/.test(p)) {
        return win(
          "Returned record for another user — access control not enforced.",
          "IDOR / broken object-level authorization",
        );
      }
      return miss("No such record.");
    }
    default:
      return miss("No effect.");
  }
}

/** Cycle through fallback levels deterministically by index. */
export function fallbackLevelAt(index: number): Level {
  const base = FALLBACK_LEVELS[index % FALLBACK_LEVELS.length];
  return { ...base, id: `${base.id}-${index}` };
}
