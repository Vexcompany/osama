import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';
import { getCaseById } from '@/lib/db/admin';
import CaseActions from './CaseActions';
import '@/styles/dashboard.css';

interface Props {
  params: { caseId: string };
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Diterima',
  processing: 'Diproses',
  resolved: 'Ditanggapi',
  archived: 'Diarsip',
};

const STATUS_BADGE: Record<string, string> = {
  new: 'badge--new',
  processing: 'badge--processing',
  resolved: 'badge--resolved',
  archived: 'badge--archived',
};

function relativeTime(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}d yang lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
  return `${Math.floor(diff / 86400)} hari yang lalu`;
}

/** Buat timeline berdasarkan status saat ini */
function buildTimeline(status: string, createdAt: string, updatedAt: string) {
  const events: { key: string; label: string; time: string; dot: string }[] = [];

  events.push({ key: 'new', label: 'Diterima', time: relativeTime(createdAt), dot: 'timeline-dot--new' });

  if (['processing', 'resolved', 'archived'].includes(status)) {
    events.push({ key: 'processing', label: 'Diproses', time: relativeTime(updatedAt), dot: 'timeline-dot--processing' });
  }
  if (status === 'resolved') {
    events.push({ key: 'resolved', label: 'Ditanggapi', time: relativeTime(updatedAt), dot: 'timeline-dot--resolved' });
  }
  if (status === 'archived') {
    events.push({ key: 'archived', label: 'Diarsip', time: relativeTime(updatedAt), dot: 'timeline-dot--resolved' });
  }

  return events;
}

export default async function CaseDetailPage({ params }: Props) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/osama');

  const caseData = await getCaseById(params.caseId);
  if (!caseData) notFound();

  const timeline = buildTimeline(caseData.status, caseData.created_at, caseData.updated_at ?? caseData.created_at);
  const isResolved = caseData.status === 'resolved';

  return (
    <div className="detail-root">

      {/* ── Header ── */}
      <header className="detail-header">
        <Link href="/osama/dashboard" className="back-btn" aria-label="Kembali ke daftar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>

        <div className="case-chip">
          <span className="case-id-text">{caseData.case_id}</span>
          <span className={`badge ${STATUS_BADGE[caseData.status] ?? 'badge--new'}`}>
            {STATUS_LABELS[caseData.status] ?? caseData.status}
          </span>
        </div>

        <button className="icon-btn" aria-label="Opsi lainnya">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </header>

      {/* ── Subject card ── */}
      <div className="thread-subject" style={{ marginTop: 16 }}>
        <h1 className="thread-subject__title">{caseData.topic}</h1>
        <p className="thread-subject__meta">{relativeTime(caseData.created_at)}</p>
      </div>

      {/* ── Message thread ── */}
      <div className="message-thread" role="main" aria-label="Thread percakapan">

        {/* Pesan anonim (aspirasi awal) */}
        <div className="message-bubble">
          <div className="bubble-sender">
            <div className="bubble-sender__avatar" aria-hidden="true">👤</div>
            <span className="bubble-sender__name">Anonim</span>
            <span className="bubble-sender__time">{relativeTime(caseData.created_at)}</span>
          </div>
          <div className="bubble-body">{caseData.message}</div>
        </div>

        {/* Balasan OSIS (hanya tampil jika status resolved/processing) */}
        {isResolved && caseData.admin_reply && (
          <div className="message-bubble">
            <div className="bubble-sender bubble-sender--osis">
              <div className="bubble-sender__avatar" aria-hidden="true">🏫</div>
              <span className="bubble-sender__name">OSIS SMKN 5 MADIUN</span>
              <span className="bubble-sender__time">{relativeTime(caseData.updated_at ?? caseData.created_at)}</span>
            </div>
            <div className="bubble-body bubble-body--osis">{caseData.admin_reply}</div>
          </div>
        )}

        {/* Placeholder balasan jika sudah diproses tapi belum ditanggapi */}
        {caseData.status === 'processing' && !caseData.admin_reply && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            Aspirasi sedang diproses oleh OSIS…
          </div>
        )}

      </div>

      {/* ── Status Timeline ── */}
      <div className="status-timeline" aria-label="Riwayat status aspirasi">
        <p className="timeline-title">Status Aspirasi</p>
        <ol className="timeline-list" style={{ listStyle: 'none' }}>
          {timeline.map(item => (
            <li key={item.key} className="timeline-item">
              <div className={`timeline-dot ${item.dot}`} aria-hidden="true" />
              <div className="timeline-info">
                <div className="timeline-label">{item.label}</div>
                <div className="timeline-time">{item.time}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Admin Actions (update status) ── */}
      <div style={{ padding: '0 16px', marginTop: 8 }}>
        <CaseActions caseId={caseData.case_id} currentStatus={caseData.status} />
      </div>

      {/* ── Fixed CTA ── */}
      <div className="detail-cta">
        <Link href="/" className="btn-cta-full" aria-label="Kirim aspirasi baru">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Kirim Aspirasi Lain
        </Link>
      </div>

    </div>
  );
}
