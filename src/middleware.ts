/**
 * Edge middleware.
 *
 * Two jobs:
 *   1. Add a small set of security headers to every response.
 *   2. Ensure the browser has a taksaka_sid cookie slot.
 *
 * The cookie value itself is just the literal string "init" — a
 * placeholder. The real session token is generated server-side by
 * the /api/taksaka route on the first request and stored in the
 * HttpOnly cookie that the route itself sets. The placeholder is
 * harmless: the route's resolveSession() treats it as "no cookie"
 * and issues a fresh token.
 *
 * Why a placeholder at all? So the browser carries a
 * taksaka_sid entry from the very first request, which makes
 * cookie handling on the client slightly more predictable and
 * helps some browsers / extensions that dislike writing cookies
 * via XHR.
 *
 * IMPORTANT: this is EDGE middleware. No `node:crypto`, no
 * server-only modules. Only Web Crypto and the standard fetch
 * APIs are available here.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const TAKSAKA_SESSION_COOKIE = "taksaka_sid";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h
const PLACEHOLDER_VALUE = "init";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Security headers.
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // Set a placeholder cookie if the user doesn't have one. The
  // /api/taksaka route will overwrite this with a real token on
  // the first successful request.
  const existing = req.cookies.get(TAKSAKA_SESSION_COOKIE)?.value;
  if (!existing) {
    res.cookies.set(TAKSAKA_SESSION_COOKIE, PLACEHOLDER_VALUE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE,
    });
  }

  return res;
}

export const config = {
  matcher: [
    // Run on everything except static assets and _next internals.
    "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
  ],
};
