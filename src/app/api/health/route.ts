/**
 * GET /api/health
 *
 * Tiny liveness probe. Returns 200 with a static payload so a load
 * balancer or uptime monitor can check the process without touching
 * Supabase.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, service: "osis-ngobrol-yuk", version: "1" });
}
