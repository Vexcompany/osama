/**
 * Server-side data access for the OSAMA admin dashboard.
 */
import { createClient } from '@/lib/db/client';

export interface CaseRow {
  id: number;
  case_id: string;
  topic: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  admin_reply?: string | null;
  like_count?: number;
}

export const ASPIRATION_STATUSES = ['new', 'processing', 'resolved', 'archived'] as const;
export type AspirationStatus = (typeof ASPIRATION_STATUSES)[number];

type Tab = 'terbaru' | 'populer' | 'ditanggapi';

export async function getDashboardCases({
  tab = 'terbaru',
  limit = 50,
}: {
  tab?: Tab;
  limit?: number;
} = {}): Promise<CaseRow[]> {
  const supabase = createClient();

  let query = supabase
    .from('aspirations')
    .select('id, case_id, topic, message, status, created_at, updated_at, admin_reply')
    .limit(limit);

  switch (tab) {
    case 'ditanggapi':
      query = query.eq('status', 'resolved').order('updated_at', { ascending: false });
      break;
    case 'populer':
      query = query.order('created_at', { ascending: true });
      break;
    case 'terbaru':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CaseRow[];
}

export async function getCaseById(caseId: string): Promise<CaseRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('aspirations')
    .select('id, case_id, topic, message, status, created_at, updated_at, admin_reply')
    .eq('case_id', caseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as CaseRow | null;
}

export const getAspirationByCaseId = getCaseById;

export async function updateAdminReply(
  caseId: string,
  adminReply: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('aspirations')
    .update({ admin_reply: adminReply || null, updated_at: new Date().toISOString() })
    .eq('case_id', caseId)
    .select('case_id')
    .maybeSingle();

  if (error) return { ok: false, reason: error.message };
  if (!data) return { ok: false, reason: 'not_found' };
  return { ok: true };
}

function isValidTransition(from: AspirationStatus, to: AspirationStatus): boolean {
  if (from === to) return true;
  const transitions: Record<AspirationStatus, AspirationStatus[]> = {
    new: ['processing', 'archived'],
    processing: ['resolved', 'archived'],
    resolved: ['archived'],
    archived: [],
  };
  return transitions[from].includes(to);
}

export async function updateStatus(
  caseId: string,
  nextStatus: AspirationStatus,
): Promise<
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'invalid_transition' | string }
> {
  const supabase = createClient();
  const current = await getCaseById(caseId);
  if (!current) return { ok: false, reason: 'not_found' };

  const from = current.status as AspirationStatus;
  if (!ASPIRATION_STATUSES.includes(from) || !ASPIRATION_STATUSES.includes(nextStatus)) {
    return { ok: false, reason: 'invalid_transition' };
  }
  if (!isValidTransition(from, nextStatus)) {
    return { ok: false, reason: 'invalid_transition' };
  }

  const { error } = await supabase
    .from('aspirations')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('case_id', caseId);

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
