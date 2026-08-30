/**
 * Anonymous session system.
 *
 * V3.2 design (final): the API route is the only thing that issues
 * and verifies session cookies. The middleware just sets a
 * placeholder cookie so the browser has a taksaka_sid entry to
 * send on the first request.
 *
 * The token itself is a 32-byte random value stored in the
 * in-memory sessions table. The HttpOnly cookie carries the
 * token; the table maps token → { createdAt, lastSeenAt }.
 *
 *   - First request: the placeholder cookie value "init" is sent
 *     up. The route doesn't find it in the table, generates a
 *     fresh token, stores it, sets the new cookie, and proceeds.
 *   - Subsequent requests: the cookie carries the real token. The
 *     route looks it up, updates lastSeenAt, and proceeds.
 *   - The cookie value is also rotated on every successful
 *     request (single-use) so a leaked cookie has at most one
 *     request's worth of value.
 *
 * The in-memory table is the only place sessions live. There is
 * no signing. The cookie is HttpOnly so scripts can't read it,
 * and the table is server-side so a script can't fabricate a
 * matching token.
 *
 * This module is server-only (Node runtime).
 */
import "server-only";

import { randomBytes } from "node:crypto";

export const TAKSAKA_SESSION_COOKIE = "taksaka_sid";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

const ACTIVE_SESSIONS_MAX = 5000;
const PLACEHOLDER_VALUE = "init";

interface ActiveSession {
  token: string;
  createdAt: number;
  lastSeenAt: number;
}

const sessions = new Map<string, ActiveSession>();

function newToken(): string {
  return randomBytes(32).toString("hex");
}

function evictStale(): void {
  const now = Date.now();
  const cutoff = now - SESSION_COOKIE_MAX_AGE * 1000;
  for (const [k, v] of sessions) {
    if (v.lastSeenAt < cutoff) sessions.delete(k);
  }
  if (sessions.size > ACTIVE_SESSIONS_MAX) {
    const oldest = [...sessions.entries()].sort(
      (a, b) => a[1].lastSeenAt - b[1].lastSeenAt,
    );
    const drop = sessions.size - ACTIVE_SESSIONS_MAX;
    for (let i = 0; i < drop; i++) {
      const e = oldest[i];
      if (e) sessions.delete(e[0]);
    }
  }
}

export interface IssuedSession {
  token: string;
}

/**
 * Issue a brand new session token.
 */
export function issueNewSession(): IssuedSession {
  evictStale();
  const token = newToken();
  sessions.set(token, {
    token,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  });
  return { token };
}

export type VerifyResult =
  | { ok: true; token: string }
  | { ok: false; reason: "no_cookie" | "unknown_session" };

/**
 * Verify a presented session token. On success, the session is
 * "rotated": the old token is invalidated and a fresh one is
 * issued and returned to the caller so they can set it on the
 * response cookie.
 *
 * On failure (placeholder cookie, unknown token), no rotation.
 * The caller is expected to issue a new session in that case.
 */
export function verifyAndRotate(
  provided: string | null | undefined,
): VerifyResult & { rotatedToken?: string } {
  if (
    typeof provided !== "string" ||
    provided.length === 0 ||
    provided === PLACEHOLDER_VALUE
  ) {
    return { ok: false, reason: "no_cookie" };
  }
  const found = sessions.get(provided);
  if (!found) {
    return { ok: false, reason: "unknown_session" };
  }
  // Rotate: invalidate the old token, issue a new one.
  sessions.delete(provided);
  evictStale();
  const fresh = newToken();
  sessions.set(fresh, {
    token: fresh,
    createdAt: found.createdAt,
    lastSeenAt: Date.now(),
  });
  return { ok: true, token: fresh, rotatedToken: fresh };
}
