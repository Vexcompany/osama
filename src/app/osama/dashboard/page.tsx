import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';
import { getDashboardCases } from '@/lib/db/admin';
import LogoutButton from './LogoutButton';
import '@/styles/dashboard.css';

type Tab = 'terbaru' | 'populer' | 'ditanggapi';

interface Props {
  searchParams: { tab?: Tab };
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Baru',
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

const AVATARS: Record<number, string> = {
  0: '🪼',
  1: '🦑',
  2: '🐠',
  3: '🦈',
  4: '🐙',
  5: '🐚',
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

export default async function DashboardPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/osama');

  const activeTab: Tab = searchParams.tab ?? 'terbaru';
  const cases = await getDashboardCases({ tab: activeTab });

  const totalCount = cases.length;
  const newCount = cases.filter(c => c.status === 'new').length;
  const resolvedCount = cases.filter(c => c.status === 'resolved').length;

  return (
    <div className="dashboard-root">

      {/* ── Header ── */}
      <header className="dash-header" role="banner">
        <div className="dash-header__brand">
          <div className="dash-header__logo" aria-hidden="true">✦</div>
          <span className="dash-header__title">OSIS Ngobrol Yuk!</span>
        </div>
        <div className="dash-header__actions">
          <LogoutButton />
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero-banner" aria-label="Ringkasan panel">
        <div className="hero-banner__text">
          <h2>Hai! 👋</h2>
          <p>
            {totalCount} aspirasi masuk.{' '}
            {newCount > 0 && <>{newCount} belum diproses.</>}
          </p>
          <Link href="/" className="btn-primary" aria-label="Lihat form aspirasi publik">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Form Aspirasi
          </Link>
        </div>
        <div className="hero-banner__art" aria-hidden="true">🧴</div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 4px', fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>Total: <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong></span>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span style={{ color: 'var(--text-muted)' }}>Ditanggapi: <strong style={{ color: 'var(--status-resolved)' }}>{resolvedCount}</strong></span>
      </div>

      {/* ── Tabs ── */}
      <nav className="tab-bar" role="tablist" aria-label="Filter aspirasi">
        {(['terbaru', 'populer', 'ditanggapi'] as Tab[]).map(tab => (
          <Link
            key={tab}
            href={`/osama/dashboard?tab=${tab}`}
            className={`tab-bar__item${activeTab === tab ? ' active' : ''}`}
            role="tab"
            aria-selected={activeTab === tab}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </nav>

      {/* ── Case List ── */}
      <main className="card-list" role="main" aria-label="Daftar aspirasi">
        {cases.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌊</div>
            Belum ada aspirasi di sini.
          </div>
        )}

        {cases.map((c, idx) => (
          <Link
            key={c.id}
            href={`/osama/dashboard/${c.case_id}`}
            className="aspiration-card"
            aria-label={`Buka aspirasi: ${c.topic}`}
          >
            <div className="aspiration-card__top">
              <div className="card-avatar" aria-hidden="true">
                {AVATARS[idx % Object.keys(AVATARS).length]}
              </div>
              <div className="aspiration-card__meta">
                <div className="aspiration-card__title-row">
                  <span className="aspiration-card__title">{c.topic}</span>
                  <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge--new'}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
                <span className="aspiration-card__time">{relativeTime(c.created_at)}</span>
              </div>
            </div>

            <p className="aspiration-card__excerpt">{c.message}</p>

            <div className="aspiration-card__footer">
              <span className="like-count" aria-label="Jumlah dukungan">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {c.like_count ?? 0}
              </span>
            </div>
          </Link>
        ))}
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="bottom-nav" role="navigation" aria-label="Navigasi utama">
        <Link href="/osama/dashboard" className="nav-item active" aria-current="page">
          <span className="nav-item__icon" aria-hidden="true">🏠</span>
          Beranda
        </Link>
        <Link href="/osama/dashboard?tab=terbaru" className="nav-item">
          <span className="nav-item__icon" aria-hidden="true">📋</span>
          Aspirasi
        </Link>
        <Link href="/" className="nav-fab" aria-label="Kirim aspirasi baru">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </Link>
        <button className="nav-item" disabled aria-disabled="true">
          <span className="nav-item__icon" aria-hidden="true">🔔</span>
          Notifikasi
        </button>
        <Link href="/osama" className="nav-item">
          <span className="nav-item__icon" aria-hidden="true">👤</span>
          Profil
        </Link>
      </nav>

    </div>
  );
}
