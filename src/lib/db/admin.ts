/**
 * OSAMA panel repository.
 *
 * All admin-side reads/writes go through this module. Uses the
 * service-role Supabase client, which bypasses RLS. Access control
 * is enforced at the API layer (must be authenticated OSAMA user
 * with allowlisted email) — the database has its own RLS policies
 * as defense in depth.
 */
import "server-only";

import { getSupabaseAdmin } from "./client";

export type AspirationStatus = "new" | "processing" | "resolved" | "archived";

export const ASPIRATION_STATUSES: AspirationStatus[] = [
  "new",
  "processing",
  "resolved",
  "archived",
];

export interface AspirationRow {
  caseId: string;
  topic: string;
  message: string;
  anonymous: boolean;
  status: AspirationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AspirationListItem {
  caseId: string;
  topic: string;
  message: string;
  status: AspirationStatus;
  createdAt: string;
}

const ALLOWED_TRANSITIONS: Record<AspirationStatus, AspirationStatus[]> = {
  new: ["processing", "archived"],
  processing: ["resolved", "archived"],
  resolved: ["archived"],
  archived: [],
};

export function canTransition(
  from: AspirationStatus,
  to: AspirationStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface ListOptions {
  status?: AspirationStatus;
  limit?: number;
}

export async function listAspirations(
  opts: ListOptions = {},
): Promise<AspirationListItem[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("aspirations")
    .select("case_id, topic, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);

  if (opts.status) query = query.eq("status", opts.status);

  const { data, error } = await query;
  if (error) {
    throw new Error(`listAspirations failed: ${error.message}`);
  }
  return (data ?? []).map((r) => ({
    caseId: r.case_id as string,
    topic: r.topic as string,
    message: r.message as string,
    status: r.status as AspirationStatus,
    createdAt: r.created_at as string,
  }));
}

export interface Counts {
  new: number;
  processing: number;
  resolved: number;
  archived: number;
  total: number;
}

export async function getCounts(): Promise<Counts> {
  const supabase = getSupabaseAdmin();
  // We use count with head:true to avoid transferring rows. status
  // values are constrained at the schema level (CHECK constraint)
  // so we can rely on the union to be exhaustive.
  const statuses: AspirationStatus[] = ["new", "processing", "resolved", "archived"];
  const results = await Promise.all(
    statuses.map((s) =>
      supabase
        .from("aspirations")
        .select("id", { count: "exact", head: true })
        .eq("status", s)
        .then(({ count }) => count ?? 0),
    ),
  );
  const [n, p, r, a] = results;
  return {
    new: n ?? 0,
    processing: p ?? 0,
    resolved: r ?? 0,
    archived: a ?? 0,
    total: (n ?? 0) + (p ?? 0) + (r ?? 0) + (a ?? 0),
  };
}

export async function getAspirationByCaseId(
  caseId: string,
): Promise<AspirationRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("aspirations")
    .select("case_id, topic, message, anonymous, status, created_at, updated_at")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) {
    throw new Error(`getAspirationByCaseId failed: ${error.message}`);
  }
  if (!data) return null;

  return {
    caseId: data.case_id as string,
    topic: data.topic as string,
    message: data.message as string,
    anonymous: data.anonymous as boolean,
    status: data.status as AspirationStatus,
    createdAt: data.created_at as string,
    updatedAt: (data.updated_at as string) ?? (data.created_at as string),
  };
}

export interface UpdateStatusResult {
  ok: boolean;
  reason?: "not_found" | "invalid_transition" | "db_error";
  detail?: string;
}

export async function updateStatus(
  caseId: string,
  next: AspirationStatus,
): Promise<UpdateStatusResult> {
  const supabase = getSupabaseAdmin();

  const current = await getAspirationByCaseId(caseId);
  if (!current) return { ok: false, reason: "not_found" };
  if (!canTransition(current.status, next)) {
    return { ok: false, reason: "invalid_transition" };
  }

  const { error } = await supabase
    .from("aspirations")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("case_id", caseId);

  if (error) {
    return { ok: false, reason: "db_error", detail: error.message };
  }
  return { ok: true };
}
