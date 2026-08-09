/**
 * OSAMA dashboard — overview.
 *
 * Server component. Renders:
 *   - Status counts
 *   - Recent aspirations (newest 20)
 *
 * All data is fetched via the admin repository (service role) — the
 * publishable Supabase key has no read access to the table, per RLS.
 */
import Link from "next/link";

import { getCounts, listAspirations } from "@/lib/db/admin";

import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

function formatTime(iso: string): string {
  // Render the time in Asia/Jakarta regardless of the server's
  // local timezone. The DB stores UTC ISO timestamps; we want
  // every admin to see the same Indonesian time for the same row.
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function statusLabel(s: string): string {
  switch (s) {
    case "new":
      return "Baru";
    case "processing":
      return "Diproses";
    case "resolved":
      return "Selesai";
    case "archived":
      return "Diarsipkan";
    default:
      return s;
  }
}

function statusClass(s: string): string {
  switch (s) {
    case "new":
      return styles.statusNew;
    case "processing":
      return styles.statusProcessing;
    case "resolved":
      return styles.statusResolved;
    case "archived":
      return styles.statusArchived;
    default:
      return "";
  }
}

export default async function DashboardHome() {
  const [counts, recent] = await Promise.all([
    getCounts(),
    listAspirations({ limit: 20 }),
  ]);

  return (
    <>
      <section className={styles.statsGrid} aria-label="Ringkasan">
        <StatCard label="Baru" value={counts.new} accent="new" />
        <StatCard label="Diproses" value={counts.processing} accent="processing" />
        <StatCard label="Selesai" value={counts.resolved} accent="resolved" />
        <StatCard label="Total" value={counts.total} accent="total" />
      </section>

      <section className={styles.listCard} aria-label="Aspirasi Terbaru">
        <header className={styles.listHeader}>
          <h2 className={styles.listTitle}>Aspirasi Terbaru</h2>
          <span className={styles.listSubtitle}>
            {recent.length === 0
              ? "Belum ada aspirasi."
              : `${recent.length} entri terbaru`}
          </span>
        </header>

        {recent.length === 0 ? (
          <p className={styles.emptyState}>
            Aspirasi yang dikirim melalui halaman publik akan muncul di
            sini.
          </p>
        ) : (
          <ul className={styles.list}>
            {recent.map((row) => (
              <li key={row.caseId} className={styles.listItem}>
                <Link
                  href={`/osama/dashboard/${encodeURIComponent(row.caseId)}`}
                  className={styles.listLink}
                >
                  <span className={styles.caseId}>{row.caseId}</span>
                  <span className={styles.snippet}>
                    {row.message.length > 80
                      ? row.message.slice(0, 80) + "…"
                      : row.message}
                  </span>
                  <span className={styles.meta}>
                    <span
                      className={`${styles.statusPill} ${statusClass(row.status)}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                    <time
                      className={styles.time}
                      dateTime={row.createdAt}
                      title={row.createdAt}
                    >
                      {formatTime(row.createdAt)}
                    </time>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

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
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
