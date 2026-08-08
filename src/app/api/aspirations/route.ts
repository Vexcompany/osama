/**
 * POST /api/aspirations
 *
 * Public aspiration submission endpoint. V1 does not require auth.
 *
 * Flow:
 *   1. Read the JSON body (small, 32kb cap configured in next.config).
 *   2. Apply per-IP rate limit.
 *   3. Honeypot check (bots fill hidden fields, real users do not).
 *   4. Zod-validate the payload (topic / message / anonymous).
 *   5. Generate an internal Case ID.
 *   6. Persist via the aspirations repository.
 *   7. Return a minimal success response — NO caseId to the client.
 *
 * Errors are returned as a small discriminated union so the client can
 * show field-level errors without leaking server internals.
 */
import { NextRequest, NextResponse } from "next/server";

import { insertAspiration } from "@/lib/db/aspirations";
import { generateCaseId } from "@/lib/case-id";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  parseSubmit,
  type FieldErrors,
} from "@/lib/validation/aspiration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ErrorBody {
  ok: false;
  error:
    | { kind: "rate_limited"; retryAfterSeconds: number }
    | { kind: "spam" }
    | { kind: "invalid"; fieldErrors: FieldErrors }
    | { kind: "server"; message: string };
}

interface SuccessBody {
  ok: true;
}

function clientIp(req: NextRequest): string {
  // Trust x-forwarded-for first (we run behind a proxy); fall back to other
  // common headers, then "unknown" so rate limiting still works.
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

function jsonError(status: number, body: ErrorBody): NextResponse<ErrorBody> {
  return NextResponse.json<ErrorBody>(body, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse<ErrorBody | SuccessBody>> {
  // 1. Body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid", fieldErrors: { message: "Format permintaan tidak valid." } },
    });
  }

  // 2. Rate limit
  const ip = clientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json<ErrorBody>(
      {
        ok: false,
        error: { kind: "rate_limited", retryAfterSeconds },
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }

  // 3+4. Validate (includes honeypot check).
  const result = parseSubmit(raw);
  if (!result.ok) {
    if (result.kind === "spam") {
      return jsonError(400, { ok: false, error: { kind: "spam" } });
    }
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid", fieldErrors: result.fieldErrors },
    });
  }

  // 5+6. Persist
  try {
    const caseId = generateCaseId();
    await insertAspiration({
      caseId,
      topic: result.data.topic,
      message: result.data.message,
      anonymous: result.data.anonymous,
    });
  } catch (err) {
    // Log internally; do not leak details.
    console.error("[aspirations] insert failed", err);
    return jsonError(500, {
      ok: false,
      error: { kind: "server", message: "Gagal mengirim aspirasi. Coba lagi sebentar." },
    });
  }

  // 7. Success — note: no caseId in the response.
  return NextResponse.json<SuccessBody>({ ok: true }, { status: 201 });
}

// Reject other methods explicitly.
export async function GET(): Promise<NextResponse<ErrorBody>> {
  return jsonError(405, {
    ok: false,
    error: { kind: "invalid", fieldErrors: { message: "Metode tidak diizinkan." } },
  });
}
