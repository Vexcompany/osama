/**
 * POST /api/aspirations
 *
 * Public aspiration submission endpoint. V1 does not require auth.
 *
 * Flow:
 *   1. Read the JSON body (small, 32kb cap configured in next.config).
 *   2. Apply per-IP rate limit.
 *   3. Honeypot check (bots fill hidden fields, real users do not).
 *   4. Zod-validate the payload.
 *   5. Generate an internal Case ID.
 *   6. Persist via the aspirations repository. The legacy `topic` and
 *      `anonymous` columns are populated server-side so we don't have
 *      to touch the existing schema.
 *   7. Return a minimal success response including the caseId.
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
  caseId: string;
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
  let caseId: string;
  try {
    caseId = generateCaseId();
    // The DB still has `topic` and `anonymous` from V1's schema. We
    // derive a short topic from the first line of the message so the
    // column is never empty, and anonymity is always on (no toggle in
    // the V1 public UI).
    const firstLine = result.data.message
      .split(/\r?\n/, 1)[0]
      ?.trim()
      .slice(0, 80) ?? "Aspirasi";

    await insertAspiration({
      caseId,
      topic: firstLine.length > 0 ? firstLine : "Aspirasi",
      message: result.data.message,
      anonymous: true,
    });
  } catch (err) {
    console.error("[aspirations] insert failed", err);
    return jsonError(500, {
      ok: false,
      error: { kind: "server", message: "Gagal mengirim aspirasi. Coba lagi sebentar." },
    });
  }

  // 7. Success — caseId is shown to the user as a reference (V1 UI revision).
  return NextResponse.json<SuccessBody>({ ok: true, caseId }, { status: 201 });
}

export async function GET(): Promise<NextResponse<ErrorBody>> {
  return jsonError(405, {
    ok: false,
    error: { kind: "invalid", fieldErrors: { message: "Metode tidak diizinkan." } },
  });
}
