/**
 * POST /api/aspirations
 *
 * Public aspiration submission endpoint. V1 does not require auth.
 *
 * Flow (V3.3):
 *   1. Read the JSON body (small, 32kb cap configured in next.config).
 *   2. Apply per-IP rate limit.
 *   3. Honeypot check (bots fill hidden fields, real users do not).
 *   4. Zod-validate the payload.
 *   5. Run LOCAL content moderation on the message. If the message
 *      is blocked, return 200 with `{ ok: false, blocked: true,
 *      category }` — we deliberately do NOT insert into the
 *      database and do NOT forward to any AI provider. The client
 *      shows a hardcoded Kak Taksaka dialog keyed by `category`.
 *   6. Generate an internal Case ID.
 *   7. Persist via the aspirations repository.
 *   8. Return a minimal success response including the caseId.
 */
import { NextRequest, NextResponse } from "next/server";

import { insertAspiration } from "@/lib/db/aspirations";
import { generateCaseId } from "@/lib/case-id";
import { moderate, type ModerationCategory } from "@/lib/moderation";
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

interface BlockedBody {
  ok: false;
  blocked: true;
  category: ModerationCategory;
}

interface SuccessBody {
  ok: true;
  caseId: string;
}

type Body = ErrorBody | BlockedBody | SuccessBody;

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

function jsonBlocked(
  category: ModerationCategory,
): NextResponse<BlockedBody> {
  return NextResponse.json<BlockedBody>(
    { ok: false, blocked: true, category },
    { status: 200 },
  );
}

export async function POST(req: NextRequest): Promise<NextResponse<Body>> {
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

  // 5. Local content moderation (V3.3).
  //
  // IMPORTANT: this is the SECURITY boundary. The client may also
  // run a lighter check for UX, but a user who calls this endpoint
  // directly via curl/Postman/devtools still gets moderated here.
  //
  // If the message is blocked, we DO NOT insert and DO NOT forward
  // to any AI provider. The response carries just the category
  // (a generic identifier) so the client can pick a hardcoded
  // dialog. No matched terms, no dictionary, no rule patterns.
  const moderation = moderate(result.data.message);
  if (moderation.blocked) {
    console.warn(
      "[aspirations] blocked",
      {
        category: moderation.category,
        matchCount: moderation.matches.length,
        // Match reasons and terms are for server logs only.
        matches: moderation.matches.map((m) => ({
          category: m.category,
          term: m.term,
        })),
      },
    );
    // We always have a category when blocked.
    return jsonBlocked(moderation.category!);
  }

  // 6+7. Persist
  let caseId: string;
  try {
    caseId = generateCaseId();
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

  // 8. Success.
  return NextResponse.json<SuccessBody>({ ok: true, caseId }, { status: 201 });
}

export async function GET(): Promise<NextResponse<ErrorBody>> {
  return jsonError(405, {
    ok: false,
    error: { kind: "invalid", fieldErrors: { message: "Metode tidak diizinkan." } },
  });
}
