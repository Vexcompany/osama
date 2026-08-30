/**
 * POST /api/osama/verify-otp
 *
 * Step 2 of OSAMA auth: user submits the email + 6-digit code they
 * received. We verify via Supabase Auth (which handles expiration,
 * attempt limits, and rate limiting). If verification succeeds AND
 * the user's email is on the allowlist, we set the session cookies
 * Supabase will use on subsequent requests and return success.
 *
 * If the email is not on the allowlist we explicitly sign the user
 * back out so no session is created, even if Supabase accepted the
 * OTP.
 */
import { NextRequest, NextResponse } from "next/server";

import { isAllowedEmail } from "@/lib/auth/allowlist";
import { getServerSupabase } from "@/lib/auth/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  email?: unknown;
  code?: unknown;
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

const GENERIC_DENIED = "Email tidak memiliki akses ke panel OSAMA.";

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
  const code = typeof raw.code === "string" ? raw.code.trim() : "";

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
  if (!/^\d{6,8}$/.test(code)) {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid", message: "Kode verifikasi tidak valid." },
    });
  }

  // Rate limit. We use a separate key from the request-otp limiter
  // so a flood of verifies doesn't block new requests, and vice versa.
  const ip = clientIp(req);
  const rl = checkRateLimit(`osama:verify-otp:${ip}`);
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

  // Verify the OTP via Supabase. This handles expiration, attempt
  // limits, and re-issuing semantics on the Supabase side.
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error || !data.user) {
    // Supabase's error message is intentionally not surfaced to the
    // client. We log it server-side for debugging.
    console.warn("[osama] verifyOtp failed", error?.message);
    return jsonError(400, {
      ok: false,
      error: {
        kind: "invalid",
        message: "Kode verifikasi tidak valid.",
      },
    });
  }

  // Defense in depth: even if Supabase accepted the OTP, deny the
  // session if the email is not on the OSAMA allowlist. This guards
  // against anyone who somehow gets an OTP for a non-allowlisted
  // address (e.g. via a future config error).
  if (!isAllowedEmail(data.user.email ?? "")) {
    await supabase.auth.signOut();
    return jsonError(403, {
      ok: false,
      error: { kind: "invalid", message: GENERIC_DENIED },
    });
  }

  // @supabase/ssr's getServerClient wrote the session cookies via
  // the set/remove cookie handlers above. We return success; the
  // client can now navigate to /osama/dashboard.
  return NextResponse.json<SuccessBody>({ ok: true }, { status: 200 });
}
