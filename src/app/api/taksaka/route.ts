/**
 * POST /api/taksaka
 *
 * The only endpoint the browser talks to for AI. All provider calls
 * happen server-side; provider names and system prompts are not
 * exposed in any response.
 *
 * The request body is small and validated:
 *   {
 *     "challenge": "...",
 *     "messages": [
 *       { "role": "user" | "assistant", "content": "..." },
 *       ...
 *     ]
 *   }
 *
 * Response shape:
 *   { "ok": true, "message": "..." }
 *   { "ok": false, "error": { "kind": "...", "message": "..." } }
 *
 * Error kinds returned to the client are intentionally generic; no
 * provider / model / internal state is leaked.
 */
import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { TAKSAKA_FALLBACK_MESSAGE, isFallbackMessage } from "@/lib/taksaka/fallback";
import { runTaksaka } from "@/lib/taksaka/router";
import { TAKSAKA_SESSION_COOKIE, verifyChallenge } from "@/lib/taksaka/session";
import { TaksakaAllProvidersFailed } from "@/lib/taksaka/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // hard Vercel ceiling for this route

const MAX_MESSAGE_CHARS_DEFAULT = 2000;
const MAX_HISTORY_DEFAULT = 10;
const MAX_BODY_BYTES = 32 * 1024;

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
      | "challenge"
      | "server";
    message: string;
    retryAfterSeconds?: number;
  };
}

interface SuccessBody {
  ok: true;
  message: string;
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

function jsonError(
  status: number,
  body: ErrorBody,
): NextResponse<ErrorBody> {
  return NextResponse.json<ErrorBody>(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ErrorBody | SuccessBody>> {
  // 1. Body size guard.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError(413, {
      ok: false,
      error: { kind: "invalid_request", message: "Permintaan terlalu besar." },
    });
  }

  // 2. Parse JSON.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid_request", message: "Format permintaan tidak valid." },
    });
  }

  if (!raw || typeof raw !== "object") {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid_request", message: "Format permintaan tidak valid." },
    });
  }

  const obj = raw as Record<string, unknown>;
  const challenge = typeof obj.challenge === "string" ? obj.challenge : null;
  const messagesRaw = obj.messages;

  // 3. Challenge.
  const challengeResult = await verifyChallenge(challenge);
  if (!challengeResult.ok) {
    return jsonError(401, {
      ok: false,
      error: { kind: "challenge", message: "Sesi tidak valid. Muat ulang halaman." },
    });
  }

  // 4. Rate limit by session id (or IP fallback).
  const cookieStore = req.cookies;
  const sid = cookieStore.get(TAKSAKA_SESSION_COOKIE)?.value;
  const rateKey = sid ? `taksaka:${sid}` : `taksaka:ip:${clientIp(req)}`;
  const rl = checkRateLimit(rateKey);
  if (!rl.ok) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rl.resetAt - Date.now()) / 1000),
    );
    return NextResponse.json<ErrorBody>(
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
  }

  // 5. Validate messages.
  if (!Array.isArray(messagesRaw)) {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid_request", message: "Pesan tidak valid." },
    });
  }

  const maxChars = readNum("TAKSAKA_MAX_MESSAGE_CHARS", MAX_MESSAGE_CHARS_DEFAULT);
  const maxHistory = readNum("TAKSAKA_MAX_HISTORY_MESSAGES", MAX_HISTORY_DEFAULT);

  if (messagesRaw.length === 0 || messagesRaw.length > maxHistory) {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid_request", message: "Pesan tidak valid." },
    });
  }

  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const entry of messagesRaw) {
    if (!entry || typeof entry !== "object") {
      return jsonError(400, {
        ok: false,
        error: { kind: "invalid_request", message: "Pesan tidak valid." },
      });
    }
    const m = entry as Record<string, unknown>;
    const role = m.role;
    const content = m.content;
    if (role !== "user" && role !== "assistant") {
      return jsonError(400, {
        ok: false,
        error: { kind: "invalid_request", message: "Pesan tidak valid." },
      });
    }
    if (typeof content !== "string") {
      return jsonError(400, {
        ok: false,
        error: { kind: "invalid_request", message: "Pesan tidak valid." },
      });
    }
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return jsonError(400, {
        ok: false,
        error: { kind: "invalid_request", message: "Pesan kosong." },
      });
    }
    if (trimmed.length > maxChars) {
      return jsonError(400, {
        ok: false,
        error: {
          kind: "invalid_request",
          message: `Pesan terlalu panjang (maks ${maxChars} karakter).`,
        },
      });
    }
    history.push({ role, content: trimmed });
  }

  // Last message must be a user message — Taksaka is a responder.
  const last = history[history.length - 1]!;
  if (last.role !== "user") {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid_request", message: "Pesan terakhir harus dari user." },
    });
  }

  // 6. Run the router.
  try {
    const result = await runTaksaka(history);
    return NextResponse.json<SuccessBody>(
      { ok: true, message: result.message },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    if (err instanceof TaksakaAllProvidersFailed) {
      return NextResponse.json<SuccessBody>(
        { ok: true, message: TAKSAKA_FALLBACK_MESSAGE },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    // Internal error — log it, return a clean fallback.
    console.error("[taksaka] internal error", err);
    if (isFallbackMessage(TAKSAKA_FALLBACK_MESSAGE)) {
      return NextResponse.json<SuccessBody>(
        { ok: true, message: TAKSAKA_FALLBACK_MESSAGE },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }
    return jsonError(500, {
      ok: false,
      error: { kind: "server", message: "Tidak dapat memproses permintaan." },
    });
  }
}

export function GET(): NextResponse<ErrorBody> {
  return jsonError(405, {
    ok: false,
    error: { kind: "invalid_request", message: "Metode tidak diizinkan." },
  });
}
