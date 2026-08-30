/**
 * POST /api/osama/cases/[caseId]/reply
 *
 * Save/update the admin reply for an aspiration case.
 * Authenticated OSAMA admin required.
 */
import { NextRequest, NextResponse } from "next/server";

import { assertOsamaAccess } from "@/lib/auth/supabase-server";
import { updateAdminReply } from "@/lib/db/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  adminReply?: unknown;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ caseId: string }> },
) {
  const user = await assertOsamaAccess();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { caseId } = await ctx.params;
  if (
    !caseId ||
    caseId.length > 100 ||
    !/^OSM-[A-Z0-9]{4,12}-[A-Z0-9]{4,12}$/.test(caseId)
  ) {
    return NextResponse.json(
      { ok: false, error: "Case ID tidak valid." },
      { status: 400 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  const replyStr =
    typeof body.adminReply === "string" ? body.adminReply.trim() : "";

  const result = await updateAdminReply(caseId, replyStr);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason ?? "Gagal menyimpan balasan." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, adminReply: replyStr }, { status: 200 });
}
