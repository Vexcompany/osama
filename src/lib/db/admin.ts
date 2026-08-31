/**
 * PATCH: tambahkan fungsi-fungsi ini ke src/lib/db/admin.ts yang sudah ada.
 *
 * getDashboardCases  — query list aspirasi dengan filter tab
 * getCaseById        — query satu case by case_id (sudah ada? merge saja)
 *
 * Asumsi tabel `public.aspirations` sudah punya kolom:
 *   case_id, topic, message, status, created_at, updated_at, admin_reply (nullable)
 *
 * Kolom `like_count` bersifat opsional (virtual / belum ada di schema).
 * Jika belum ada, hapus kolom itu dari select dan hapus field di type.
 */

import { createClient } from '@/lib/db/client';

// ── Types ──────────────────────────────────────────────────

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

// ── getDashboardCases ──────────────────────────────────────

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
    .select('id, case_id, topic, message, status, created_at, updated_at')
    .limit(limit);

  switch (tab) {
    case 'ditanggapi':
      query = query.eq('status', 'resolved').order('updated_at', { ascending: false });
      break;
    case 'populer':
      // Fallback: urutkan dari terlama (proxy "ramai dibahas") — bisa diganti jika ada kolom vote
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

// ── getCaseById ────────────────────────────────────────────

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
