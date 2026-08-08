/**
 * Tiny middleware: add a few security headers to every response.
 *
 * Kept minimal on purpose — V1 doesn't need a full CSP work of art, but
 * we do want to set `X-Content-Type-Options` and friends by default.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: [
    // Run on everything except static assets and _next internals.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
