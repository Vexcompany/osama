/**
 * POST /api/osama/logout
 *
 * Clears the Supabase session. We always return success even if
 * the caller wasn't authenticated, so a logout button can be hit
 * idempotently.
 */
import { NextRequest, NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/auth/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SuccessBody {
  ok: true;
}

export async function POST(
  _req: NextRequest,
): Promise<NextResponse<SuccessBody>> {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json<SuccessBody>({ ok: true });
}
