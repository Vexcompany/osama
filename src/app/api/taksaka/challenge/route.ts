/**
 * GET /api/taksaka/challenge
 *
 * Issues an HttpOnly session cookie and returns a signed, single-use
 * challenge bound to that session. The client sends the challenge
 * token in subsequent POST /api/taksaka bodies.
 *
 * Why: a raw script that posts to /api/taksaka without ever calling
 * /challenge will have no session cookie. The server rejects the
 * post. The challenge itself is signed, single-use, and short-lived.
 */
import { NextResponse } from "next/server";

import { issueChallenge } from "@/lib/taksaka/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return issueChallenge().then(({ challenge }) => {
    return NextResponse.json(
      { challenge },
      {
        status: 200,
        headers: {
          // We don't want this response cached; the challenge is bound
          // to a session cookie that we just set.
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  });
}
