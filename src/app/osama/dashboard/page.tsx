/**
 * OSAMA dashboard — overview.
 *
 * Server component. Renders:
 *   - Status counts (streamed with a skeleton fallback)
 *   - Recent aspirations (newest 50) with client-side search/filter
 *
 * All data is fetched via the admin repository (service role) — the
 * publishable Supabase key has no read access to the table, per RLS.
 */
import { Suspense } from "react";

import { getCounts, listAspirations } from "@/lib/db/admin";

import { RecentListClient } from "./RecentListClient";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const today = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ringkasan</h1>
          <p className={styles.pageDesc}>
            Pantau aspirasi yang masuk dan status penanganannya.
          </p>
        </div>
        <div className={styles.pageHeaderDate}>
          <span className={styles.pageHeaderDot} aria-hidden="true" />
          {today}
        </div>
      </header>

      <section aria-label="Ringkasan statistik">
        <Suspense fallback={<StatsSkeleton />}>
          <StatsGrid />
        </Suspense>
      </section>

      <section className={styles.listCard} aria-label="Aspirasi Terbaru">
        <header className={styles.listHeader}>
          <div className={styles.listTitleWrap}>
            <h2 className={styles.listTitle}>Aspirasi Terbaru</h2>
            <span className={styles.listSubtitle}>
              Daftar aspirasi terbaru dari halaman publik
            </span>
          </div>
        </header>
        <Suspense fallback={<ListSkeleton />}>
          <RecentList />
        </Suspense>
      </section>
    </>
  );
}

async function StatsGrid() {
  const counts = await getCounts();

  return (
    <div className={styles.statsGrid} aria-label="Jumlah aspirasi per status">
      <StatCard label="Baru" value={counts.new} accent="new" />
      <StatCard label="Diproses" value={counts.processing} accent="processing" />
      <StatCard label="Selesai" value={counts.resolved} accent="resolved" />
      <StatCard label="Total" value={counts.total} accent="total" />
    </div>
  );
}

async function RecentList() {
  const recent = await listAspirations({ limit: 50 });
  return <RecentListClient rows={recent} />;
}

const STAT_ICONS: Record<string, React.ReactNode> = {
  new: (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true">
      <path d="M10 2 L13 6 L18 7 L14 11 L15 16 L10 14 L5 16 L6 11 L2 7 L7 6 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  processing: (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true">
      <path d="M10 3 V6 M10 14 V17 M3 10 H6 M14 10 H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  resolved: (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 10.5 L9 13 L13.5 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  total: (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true">
      <path d="M5 15 L5 9 M10 15 L10 5 M15 15 L15 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "new" | "processing" | "resolved" | "total";
}) {
  return (
    <div className={`${styles.stat} ${styles[`stat_${accent}`]}`}>
      <div className={styles.statTop}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statIcon} aria-hidden="true">
          {STAT_ICONS[accent]}
        </div>
      </div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className={styles.statsSkeleton} aria-hidden="true">
      <div className={styles.statSkeleton} />
      <div className={styles.statSkeleton} />
      <div className={styles.statSkeleton} />
      <div className={styles.statSkeleton} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className={styles.listSkeleton} aria-hidden="true">
      <div className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ width: "40%" }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`${styles.skeleton} ${styles.skeletonRow}`} />
      ))}
    </div>
  );
}
