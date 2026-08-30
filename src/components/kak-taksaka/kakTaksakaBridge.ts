/**
 * Client bridge to /api/taksaka.
 *
 * V3.2: the server is self-healing. If the user's session is
 * missing or stale, the API route issues a fresh session and
 * processes the request. There is no 401 to retry — every
 * legitimate request gets a successful response (or a
 * server-side error that we surface as the fallback message).
 *
 * The browser automatically sends the HttpOnly session cookie
 * (credentials: same-origin). The route rotates the cookie on
 * every successful request, but the browser handles that
 * transparently for the next call.
 *
 * No provider names, no system prompt, no internal error detail
 * is ever exposed by these functions.
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
  isFallback: boolean;
}

const FALLBACK_TEXT = GENERIC_ERROR_MESSAGE.trim();

async function postChat(trimmed: ChatMessage[]): Promise<Response> {
  return fetch("/api/taksaka", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({ messages: trimmed }),
  });
}

function readApiMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const m = (data as { message?: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return fallback;
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

  let res: Response;
  try {
    res = await postChat(trimmed);
  } catch {
    return { ok: false, message: FALLBACK_TEXT, isFallback: true };
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

  const data = await res.json().catch(() => null);
  const text = readApiMessage(data, "").trim();
  if (!text) {
    return { ok: false, message: FALLBACK_TEXT, isFallback: true };
  }
  return {
    ok: true,
    message: text,
    isFallback: text === FALLBACK_TEXT,
  };
}
