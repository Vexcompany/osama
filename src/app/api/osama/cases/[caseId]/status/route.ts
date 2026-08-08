/**
 * POST /api/osama/cases/[caseId]/status
 *
 * Update the status of an aspiration. The user must be authenticated
 * AND on the allowlist. Status transitions are constrained to
 * `new → processing → resolved → archived` (see db/admin.ts).
 */
import { NextRequest, NextResponse } from "next/server";

import { assertOsamaAccess } from "@/lib/auth/supabase-server";
import {
  ASPIRATION_STATUSES,
  type AspirationStatus,
  updateStatus,
} from "@/lib/db/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  status?: unknown;
}

interface SuccessBody {
  ok: true;
  status: AspirationStatus;
}

interface ErrorBody {
  ok: false;
  error:
    | { kind: "unauthorized" }
    | { kind: "not_found" }
    | { kind: "invalid"; message: string }
    | { kind: "invalid_transition"; from: AspirationStatus; to: AspirationStatus }
    | { kind: "server"; message: string };
}

function jsonError(
  status: number,
  body: ErrorBody,
): NextResponse<ErrorBody> {
  return NextResponse.json<ErrorBody>(body, { status });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ caseId: string }> },
): Promise<NextResponse<ErrorBody | SuccessBody>> {
  // 1. Auth: must be a signed-in user on the allowlist.
  const user = await assertOsamaAccess();
  if (!user) {
    return jsonError(401, { ok: false, error: { kind: "unauthorized" } });
  }

  // 2. Validate the caseId from the route param.
  const { caseId } = await ctx.params;
  if (!caseId || caseId.length > 100 || !/^OSM-[A-Z0-9]{4,12}-[A-Z0-9]{4,12}$/.test(caseId)) {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid", message: "Case ID tidak valid." },
    });
  }

  // 3. Parse and validate the body.
  let raw: RequestBody;
  try {
    raw = (await req.json()) as RequestBody;
  } catch {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid", message: "Permintaan tidak valid." },
    });
  }
  const next = raw.status;
  if (typeof next !== "string" || !ASPIRATION_STATUSES.includes(next as AspirationStatus)) {
    return jsonError(400, {
      ok: false,
      error: { kind: "invalid", message: "Status tidak valid." },
    });
  }

  // 4. Persist.
  const result = await updateStatus(caseId, next as AspirationStatus);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return jsonError(404, { ok: false, error: { kind: "not_found" } });
    }
    if (result.reason === "invalid_transition") {
      // We don't know the from/to here without a second roundtrip,
      // so re-read for the response.
      const { getAspirationByCaseId } = await import("@/lib/db/admin");
      const current = await getAspirationByCaseId(caseId);
      return jsonError(409, {
        ok: false,
        error: {
          kind: "invalid_transition",
          from: (current?.status ?? "new") as AspirationStatus,
          to: next as AspirationStatus,
        },
      });
    }
    return jsonError(500, {
      ok: false,
      error: { kind: "server", message: "Gagal memperbarui status." },
    });
  }

  return NextResponse.json<SuccessBody>(
    { ok: true, status: next as AspirationStatus },
    { status: 200 },
  );
}
