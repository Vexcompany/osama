/**
 * Client bridge to /api/taksaka.
 *
 * Handles:
 *   - Fetching a fresh challenge (HttpOnly session cookie is set by
 *     the server in the same response).
 *   - Sending a chat request with the challenge + messages.
 *
 * No provider names, no system prompt, no internal error detail is
 * ever exposed by these functions.
 */
import {
  GENERIC_ERROR_MESSAGE,
  TAKSAKA_MAX_HISTORY_MESSAGES,
  TAKSAKA_MAX_MESSAGE_CHARS,
} from "./kakTaksakaRules";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  ok: boolean;
  message: string;
  /** True if the response is the generic fallback; used by the UI to
   *  decide whether to show a "warning" hint to the user. */
  isFallback: boolean;
}

const FALLBACK_TEXT = GENERIC_ERROR_MESSAGE.trim();

let cachedChallenge: { token: string; fetchedAt: number } | null = null;
const CHALLENGE_TTL_MS = 60_000;

async function getChallenge(): Promise<string> {
  const now = Date.now();
  if (cachedChallenge && now - cachedChallenge.fetchedAt < CHALLENGE_TTL_MS) {
    return cachedChallenge.token;
  }
  const res = await fetch("/api/taksaka/challenge", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("challenge_failed");
  }
  const data = (await res.json()) as { challenge?: string };
  if (!data.challenge) throw new Error("challenge_failed");
  cachedChallenge = { token: data.challenge, fetchedAt: now };
  return data.challenge;
}

function invalidateChallenge(): void {
  cachedChallenge = null;
}

export async function sendChat(
  messages: ChatMessage[],
): Promise<ChatResult> {
  // Trim to a safe size before sending.
  const trimmed = messages.slice(-TAKSAKA_MAX_HISTORY_MESSAGES);
  // Defensive validation; the server is still authoritative.
  for (const m of trimmed) {
    if (typeof m.content !== "string") {
      return { ok: false, message: FALLBACK_TEXT, isFallback: true };
    }
    if (m.content.length > TAKSAKA_MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        message: `Pesan terlalu panjang (maks ${TAKSAKA_MAX_MESSAGE_CHARS} karakter).`,
        isFallback: false,
      };
    }
  }

  let challenge: string;
  try {
    challenge = await getChallenge();
  } catch {
    return { ok: false, message: FALLBACK_TEXT, isFallback: true };
  }

  let res: Response;
  try {
    res = await fetch("/api/taksaka", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ challenge, messages: trimmed }),
    });
  } catch {
    return { ok: false, message: FALLBACK_TEXT, isFallback: true };
  }

  if (res.status === 401) {
    // Challenge expired or invalid; force a refresh on next send.
    invalidateChallenge();
    return {
      ok: false,
      message: "Sesi berakhir. Coba kirim lagi yaa.",
      isFallback: false,
    };
  }
  if (res.status === 429) {
    const data = (await res.json().catch(() => null)) as
      | { error?: { retryAfterSeconds?: number; message?: string } }
      | null;
    return {
      ok: false,
      message:
        data?.error?.message ??
        "Terlalu banyak permintaan. Coba lagi sebentar.",
      isFallback: false,
    };
  }

  if (!res.ok) {
    return { ok: false, message: FALLBACK_TEXT, isFallback: true };
  }

  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; message?: string }
    | null;
  const text = (data?.message ?? "").trim();
  if (!text) {
    return { ok: false, message: FALLBACK_TEXT, isFallback: true };
  }
  return {
    ok: true,
    message: text,
    isFallback: text === FALLBACK_TEXT,
  };
}
