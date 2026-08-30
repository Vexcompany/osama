/**
 * POST /api/osama/request-otp
 *
 * Step 1 of OSAMA auth: user submits an email. The server checks
 * the allowlist BEFORE calling Supabase. If the email is not on
 * the allowlist we return the same generic response shape so a
 * non-allowlisted email cannot be distinguished from a non-existent
 * Supabase user.
 *
 * Per the brief, we do NOT return whether the email exists in
 * Supabase Auth. The Supabase call only happens for allowlisted
 * addresses, so the email is sent via Supabase's own OTP pipeline
 * (expiration, rate limiting, attempt limits handled by Supabase).
 */
import { NextRequest, NextResponse } from "next/server";

import { isAllowedEmail } from "@/lib/auth/allowlist";
import { getServerSupabase } from "@/lib/auth/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  email?: unknown;
}

interface ErrorBody {
  ok: false;
  error:
    | { kind: "rate_limited"; retryAfterSeconds: number }
    | { kind: "invalid"; message: string };
}

interface SuccessBody {
  ok: true;
}

const GENERIC_DENIED =
  "Email tidak memiliki akses ke panel OSAMA.";

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
  return NextResponse.json<ErrorBody>(body, { status });
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ErrorBody | SuccessBody>> {
  // 1. Parse body
  let raw: RequestBody;
  try {
    raw = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid", message: "Permintaan tidak valid." },
    });
  }

  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid", message: "Email tidak valid." },
    });
  }

  // 2. Rate limit by IP (separate from the public form's limiter).
  const ip = clientIp(req);
  const rl = checkRateLimit(`osama:request-otp:${ip}`);
  if (!rl.ok) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rl.resetAt - Date.now()) / 1000),
    );
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

  // 3. Allowlist check FIRST. If the email is not on the list, we
  //    return the same generic error a random email would. We do NOT
  //    call Supabase.
  if (!isAllowedEmail(email)) {
    return jsonError(403, {
      ok: false,
      error: { kind: "invalid", message: GENERIC_DENIED },
    });
  }

  // 4. Trigger Supabase OTP. We deliberately do not surface Supabase
  //    errors to the client. If something goes wrong we still return
  //    the success shape so the user cannot probe for valid emails.
  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Don't auto-create users; only allowlisted emails get here,
        // and we still want the sign-in flow (not sign-up).
        shouldCreateUser: false,
      },
    });
    if (error) {
      // Expected: if the user doesn't exist in Supabase Auth, the
      // call fails. Return a generic message either way.
      console.warn("[osama] signInWithOtp failed", error.message);
      return jsonError(400, {
        ok: false,
        error: {
          kind: "invalid",
          message: "Tidak dapat mengirim kode. Hubungi admin.",
        },
      });
    }
  } catch (err) {
    console.error("[osama] request-otp unexpected error", err);
    return jsonError(500, {
      ok: false,
      error: {
        kind: "invalid",
        message: "Tidak dapat mengirim kode. Hubungi admin.",
      },
    });
  }

  // 5. Generic success message. We do NOT echo the email back; the
  //    user already typed it.
  return NextResponse.json<SuccessBody>(
    { ok: true },
    { status: 200 },
  );
}
