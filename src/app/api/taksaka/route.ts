/**
 * POST /api/taksaka
 *
 * V3.2: the API route is the only place that issues and verifies
 * session cookies. The middleware just sets a placeholder cookie
 * on the user's first request so the browser has a taksaka_sid
 * to send up. The actual token is generated and stored server-side
 * here, in an in-memory table.
 *
 *   - If the cookie is missing or is the placeholder, we issue a
 *     new session, set the cookie, and process the request.
 *   - If the cookie is a known token, we rotate it (single-use)
 *     and process the request.
 *   - If the cookie is unknown (was rotated away or never existed
 *     in our table), we issue a fresh session. This is the rare
 *     case where the user lost their session and we silently
 *     start a new one.
 *
 * Response shape (unchanged from V3.1):
 *   { ok: true, message: "..." }
 *   { ok: false, error: { kind: "...", message: "..." } }
 */
import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { moderate, type ModerationCategory } from "@/lib/moderation";
import { TAKSAKA_FALLBACK_MESSAGE, isFallbackMessage } from "@/lib/taksaka/fallback";
import { runTaksaka } from "@/lib/taksaka/router";
import {
  TAKSAKA_SESSION_COOKIE,
  issueNewSession,
  verifyAndRotate,
} from "@/lib/taksaka/session";
import { TaksakaAllProvidersFailed } from "@/lib/taksaka/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_MESSAGE_CHARS_DEFAULT = 2000;
const MAX_HISTORY_DEFAULT = 10;
const MAX_BODY_BYTES = 32 * 1024;
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

function readNum(name: string, def: number): number {
  const v = Number.parseInt(process.env[name] ?? `${def}`, 10);
  return Number.isFinite(v) && v > 0 ? v : def;
}

interface ErrorBody {
  ok: false;
  error: {
    kind:
      | "rate_limited"
      | "invalid_request"
      | "session"
      | "server"
      | "moderation";
    message: string;
    retryAfterSeconds?: number;
    category?: ModerationCategory;
  };
}

interface BlockedBody {
  ok: false;
  blocked: true;
  category: ModerationCategory;
}

interface SuccessBody {
  ok: true;
  message: string;
}

type Body = ErrorBody | BlockedBody | SuccessBody;

function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(TAKSAKA_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

function err(
  status: number,
  body: ErrorBody,
  sessionToken?: string,
): NextResponse<Body> {
  const res = NextResponse.json<Body>(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  if (sessionToken) setSessionCookie(res, sessionToken);
  return res;
}

function ok(body: SuccessBody, sessionToken: string): NextResponse<Body> {
  const res = NextResponse.json<Body>(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
  setSessionCookie(res, sessionToken);
  return res;
}

/**
 * Resolve a session token for this request.
 *
 *   1. If the cookie carries a known token, rotate it (single-use)
 *      and return the new token.
 *   2. Otherwise, issue a brand new session.
 *
 * Self-healing: a user who lost their session just gets a fresh
 * one. We never 401 on session issues.
 */
function resolveSession(provided: string | null | undefined): string {
  const rotated = verifyAndRotate(provided);
  if (rotated.ok && rotated.rotatedToken) {
    return rotated.rotatedToken;
  }
  return issueNewSession().token;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<Body>> {
  // 1. Body size guard.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return err(
      413,
      {
        ok: false,
        error: { kind: "invalid_request", message: "Permintaan terlalu besar." },
      },
      resolveSession(req.cookies.get(TAKSAKA_SESSION_COOKIE)?.value),
    );
  }

  // 2. Parse JSON.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return err(
      400,
      {
        ok: false,
        error: { kind: "invalid_request", message: "Format permintaan tidak valid." },
      },
      resolveSession(req.cookies.get(TAKSAKA_SESSION_COOKIE)?.value),
    );
  }

  if (!raw || typeof raw !== "object") {
    return err(
      400,
      {
        ok: false,
        error: { kind: "invalid_request", message: "Format permintaan tidak valid." },
      },
      resolveSession(req.cookies.get(TAKSAKA_SESSION_COOKIE)?.value),
    );
  }

  const obj = raw as Record<string, unknown>;
  const messagesRaw = obj.messages;

  // 3. Session resolution. Self-healing.
  const provided = req.cookies.get(TAKSAKA_SESSION_COOKIE)?.value;
  const sessionToken = resolveSession(provided);

  // 4. Rate limit per session token.
  const rateKey = `taksaka:${sessionToken}`;
  const rl = checkRateLimit(rateKey);
  if (!rl.ok) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rl.resetAt - Date.now()) / 1000),
    );
    const res = NextResponse.json<Body>(
      {
        ok: false,
        error: {
          kind: "rate_limited",
          message: "Terlalu banyak permintaan. Coba lagi sebentar.",
          retryAfterSeconds,
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
    setSessionCookie(res, sessionToken);
    return res;
  }

  // 5. Validate messages.
  if (!Array.isArray(messagesRaw)) {
    return err(
      400,
      {
        ok: false,
        error: { kind: "invalid_request", message: "Pesan tidak valid." },
      },
      sessionToken,
    );
  }

  const maxChars = readNum("TAKSAKA_MAX_MESSAGE_CHARS", MAX_MESSAGE_CHARS_DEFAULT);
  const maxHistory = readNum("TAKSAKA_MAX_HISTORY_MESSAGES", MAX_HISTORY_DEFAULT);

  if (messagesRaw.length === 0 || messagesRaw.length > maxHistory) {
    return err(
      400,
      {
        ok: false,
        error: { kind: "invalid_request", message: "Pesan tidak valid." },
      },
      sessionToken,
    );
  }

  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const entry of messagesRaw) {
    if (!entry || typeof entry !== "object") {
      return err(
        400,
        {
          ok: false,
          error: { kind: "invalid_request", message: "Pesan tidak valid." },
        },
        sessionToken,
      );
    }
    const m = entry as Record<string, unknown>;
    const role = m.role;
    const content = m.content;
    if (role !== "user" && role !== "assistant") {
      return err(
        400,
        {
          ok: false,
          error: { kind: "invalid_request", message: "Pesan tidak valid." },
        },
        sessionToken,
      );
    }
    if (typeof content !== "string") {
      return err(
        400,
        {
          ok: false,
          error: { kind: "invalid_request", message: "Pesan tidak valid." },
        },
        sessionToken,
      );
    }
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return err(
        400,
        {
          ok: false,
          error: { kind: "invalid_request", message: "Pesan kosong." },
        },
        sessionToken,
      );
    }
    if (trimmed.length > maxChars) {
      return err(
        400,
        {
          ok: false,
          error: {
            kind: "invalid_request",
            message: `Pesan terlalu panjang (maks ${maxChars} karakter).`,
          },
        },
        sessionToken,
      );
    }
    history.push({ role, content: trimmed });
  }

  const last = history[history.length - 1]!;
  if (last.role !== "user") {
    return err(
      400,
      {
        ok: false,
        error: { kind: "invalid_request", message: "Pesan terakhir harus dari user." },
      },
      sessionToken,
    );
  }

  // 5b. Local content moderation (V3.3). The chat endpoint runs
  // the same pipeline as /api/aspirations so we never forward
  // restricted content to a provider (no wasted AI token).
  //
  // We only moderate the LAST user message — earlier history
  // turns were either generated by the assistant or moderated
  // at the time they were sent.
  const moderation = moderate(last.content);
  if (moderation.blocked) {
    console.warn(
      "[taksaka] blocked",
      {
        category: moderation.category,
        matchCount: moderation.matches.length,
      },
    );
    const res = NextResponse.json<Body>(
      { ok: false, blocked: true, category: moderation.category! },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
    setSessionCookie(res, sessionToken);
    return res;
  }

  // 6. Run the router.
  try {
    const result = await runTaksaka(history);
    return ok({ ok: true, message: result.message }, sessionToken);
  } catch (caught) {
    if (caught instanceof TaksakaAllProvidersFailed) {
      return ok({ ok: true, message: TAKSAKA_FALLBACK_MESSAGE }, sessionToken);
    }
    console.error("[taksaka] internal error", caught);
    if (isFallbackMessage(TAKSAKA_FALLBACK_MESSAGE)) {
      return ok({ ok: true, message: TAKSAKA_FALLBACK_MESSAGE }, sessionToken);
    }
    return err(
      500,
      {
        ok: false,
        error: { kind: "server", message: "Tidak dapat memproses permintaan." },
      },
      sessionToken,
    );
  }
}

export function GET(): NextResponse<Body> {
  return err(
    405,
    {
      ok: false,
      error: { kind: "invalid_request", message: "Metode tidak diizinkan." },
    },
    "",
  );
}
