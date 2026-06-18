import "server-only";
import OpenAI from "openai";

/**
 * 0G Compute — inference layer.
 *
 * BREACH runs its AI on 0G's decentralized compute network, NOT a centralized
 * provider. We talk to the 0G Compute *Router* — an OpenAI-compatible endpoint
 * that load-balances across the providers serving each model on 0G. The only
 * secret our app holds is a server-side `sk-...` Router key minted at pc.0g.ai.
 *
 * Docs: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router
 */

const ROUTER_BASE_URL =
  process.env.ZG_ROUTER_BASE_URL?.trim() || "https://router-api.0g.ai/v1";

// Model id strings rotate on 0G; discover live ones at GET /v1/models.
// Verified live on the Router (Jun 2026): deepseek-v4-flash (cheap + fast,
// great for a game loop), deepseek-v3, deepseek-v4-pro, glm-5, and 0G's own
// 0gm-1.0-35b-a3b. We default to flash for low latency.
export const OG_MODEL = process.env.ZG_MODEL?.trim() || "deepseek-v4-flash";

const apiKey = process.env.ZG_ROUTER_API_KEY?.trim();

/** Whether real 0G Compute inference is wired up (a Router key is present). */
export function ogConfigured(): boolean {
  return Boolean(apiKey);
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!apiKey) throw new Error("ZG_ROUTER_API_KEY is not set");
  if (!client) {
    client = new OpenAI({
      baseURL: ROUTER_BASE_URL,
      apiKey,
      // 0G providers can be cold; give them room before we fall back.
      timeout: 45_000,
      maxRetries: 1,
    });
  }
  return client;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Run a chat completion on 0G Compute and return the raw assistant text.
 * Throws on any failure so callers can fall back to local play.
 */
export async function ogChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; json?: boolean } = {},
): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: OG_MODEL,
    messages,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 900,
    // All current 0G-served models advertise response_format support; asking
    // for a JSON object makes parsing far more reliable than raw prose.
    ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
  });
  const text = completion.choices?.[0]?.message?.content;
  if (!text) throw new Error("0G Compute returned an empty completion");
  return text;
}

/**
 * Ask 0G for JSON and parse it defensively. Many open models wrap JSON in
 * ```json fences or add prose; we extract the first balanced object.
 */
export async function ogChatJSON<T>(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<T> {
  const raw = await ogChat(messages, { ...opts, json: true });
  return extractJSON<T>(raw);
}

export function extractJSON<T>(raw: string): T {
  // Strip code fences if present.
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  // Find the first `{` and the matching closing `}`.
  const start = s.indexOf("{");
  if (start === -1) throw new Error("No JSON object in model output");
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(s.slice(start, i + 1)) as T;
      }
    }
  }
  throw new Error("Unbalanced JSON in model output");
}
