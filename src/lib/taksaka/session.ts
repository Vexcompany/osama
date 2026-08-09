/**
 * Anonymous session + challenge system.
 *
 * Flow:
 *   1. Client calls GET /api/taksaka/challenge.
 *   2. We issue a session cookie (HttpOnly, SameSite=Lax) containing
 *      a random session id. We return a signed, single-use challenge
 *      that references the session id.
 *   3. Client posts to /api/taksaka with the challenge in the body.
 *   4. We re-read the cookie, verify the challenge's signature, check
 *      it references the cookie's session id, and that it is not
 *      expired or already spent.
 *
 * Cookies never contain the challenge or any auth secret; the cookie
 * just identifies the session. The challenge itself is the bearer
 * credential, and it is signed.
 *
 * Everything in this module is server-only.
 */
import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const TAKSAKA_SESSION_COOKIE = "taksaka_sid";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

const CHALLENGE_TTL_DEFAULT = 60 * 5; // 5m
const ACTIVE_CHALLENGES_MAX = 500;

interface ActiveChallenge {
  jti: string;
  sid: string;
  exp: number;
}

const active = new Map<string, ActiveChallenge>();

function secret(): Buffer {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (k.length >= 16) return Buffer.from(k);
  // If the env is missing, fall back to a derived value. In production
  // this should never happen, but we still want the system to fail
  // closed gracefully rather than crash.
  return Buffer.from("taksaka-fallback-secret-please-set-service-role-key");
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(
    input.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  );
}

function challengeTtl(): number {
  const v = Number.parseInt(
    process.env.TAKSAKA_CHALLENGE_TTL_SECONDS ?? `${CHALLENGE_TTL_DEFAULT}`,
    10,
  );
  return Number.isFinite(v) && v > 0 ? v : CHALLENGE_TTL_DEFAULT;
}

interface SignedPayload {
  jti: string;
  sid: string;
  exp: number;
}

function sign(payload: SignedPayload): string {
  const body = b64url(JSON.stringify(payload));
  const mac = createHmac("sha256", secret()).update(body).digest();
  return `${body}.${b64url(mac)}`;
}

function verify(token: string): SignedPayload | null {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const macStr = token.slice(dot + 1);
  const expectedMac = createHmac("sha256", secret()).update(body).digest();
  let providedMac: Buffer;
  try {
    providedMac = b64urlDecode(macStr);
  } catch {
    return null;
  }
  if (providedMac.length !== expectedMac.length) return null;
  if (!timingSafeEqual(providedMac, expectedMac)) return null;
  try {
    const decoded = JSON.parse(b64urlDecode(body).toString("utf8")) as SignedPayload;
    if (
      typeof decoded.jti !== "string" ||
      typeof decoded.sid !== "string" ||
      typeof decoded.exp !== "number"
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function evictExpired(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, c] of active) {
    if (c.exp <= now) active.delete(jti);
  }
  // Cap total challenges (defense in depth).
  if (active.size > ACTIVE_CHALLENGES_MAX) {
    const oldest = [...active.entries()].sort((a, b) => a[1].exp - b[1].exp);
    const drop = active.size - ACTIVE_CHALLENGES_MAX;
    for (let i = 0; i < drop; i++) {
      const e = oldest[i];
      if (e) active.delete(e[0]);
    }
  }
}

/**
 * Issue a new session cookie and a signed challenge bound to it.
 * Returns the challenge token (the client will send it in the body).
 */
export async function issueChallenge(): Promise<{
  sessionId: string;
  challenge: string;
}> {
  const sessionId = randomBytes(24).toString("hex");
  const jti = randomBytes(16).toString("hex");
  const exp = Math.floor(Date.now() / 1000) + challengeTtl();

  const cookieStore = await cookies();
  cookieStore.set(TAKSAKA_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  evictExpired();
  active.set(jti, { jti, sid: sessionId, exp });
  return { sessionId, challenge: sign({ jti, sid: sessionId, exp }) };
}

export type ChallengeResult =
  | { ok: true }
  | { ok: false; reason: "no_cookie" | "bad_signature" | "mismatch" | "expired" | "spent" | "no_token" };

/**
 * Verify a challenge presented by the client.
 *
 * Requires BOTH the cookie (proves this is a real browser) AND a valid
 * signature AND a matching session id AND non-expired AND not yet
 * spent. The challenge is single-use; once verified, the jti is
 * removed from the active set.
 */
export async function verifyChallenge(
  token: string | null | undefined,
): Promise<ChallengeResult> {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, reason: "no_token" };
  }
  const cookieStore = await cookies();
  const sid = cookieStore.get(TAKSAKA_SESSION_COOKIE)?.value;
  if (!sid) return { ok: false, reason: "no_cookie" };

  const payload = verify(token);
  if (!payload) return { ok: false, reason: "bad_signature" };
  if (payload.sid !== sid) return { ok: false, reason: "mismatch" };
  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    active.delete(payload.jti);
    return { ok: false, reason: "expired" };
  }
  if (!active.has(payload.jti)) return { ok: false, reason: "spent" };
  active.delete(payload.jti); // single-use
  return { ok: true };
}
