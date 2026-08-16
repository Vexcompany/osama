/**
 * OSAMA case detail.
 *
 * Server component. Reads the aspiration, then hands off to a small
 * client component for the status mutation UI.
 */ 
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAspirationByCaseId } from "@/lib/db/admin";
import { CaseActions } from "./CaseActions";
import { AdminReplySection } from "./AdminReplySection";
import styles from "./case.module.css";

export const dynamic = "force-dynamic";

const CASE_ID_PATTERN = /^OSM-[A-Z0-9]{4,12}-[A-Z0-9]{4,12}$/;

function formatTime(iso: string): string {
  // Render in Asia/Jakarta so every admin sees the same time.
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
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

const STATUS_META: Record<string, { label: string; icon: React.ReactNode }> = {
  created: {
    label: "Dibuat",
    icon: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 6 V10 L12.5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  updated: {
    label: "Diperbarui",
    icon: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
        <path d="M14.5 7.5 C13.7 5.9 12 4.8 10 4.8 C7.2 4.8 5 7 5 9.8 C5 12.6 7.2 14.8 10 14.8 C12.3 14.8 14.2 13.4 15 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M14.5 4.5 V7.5 H11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  if (!CASE_ID_PATTERN.test(caseId)) notFound();

  const row = await getAspirationByCaseId(caseId);
  if (!row) notFound();

  return (
    <div className={styles.wrap}>
      <Link href="/osama/dashboard" className={styles.back}>
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
          <path d="M12 4 L6 10 L12 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Kembali ke ringkasan
      </Link>

      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div>
            <div className={styles.label}>Case ID</div>
            <div className={styles.caseId}>{row.caseId}</div>
          </div>
          <div className={`${styles.statusPill} ${styles[`status_${row.status}`]}`}>
            {statusLabel(row.status)}
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div>
            <div className={styles.label}>Dibuat</div>
            <div className={styles.metaValue}>
              {STATUS_META.created.icon}
              <time dateTime={row.createdAt}>{formatTime(row.createdAt)}</time>
            </div>
          </div>
          {row.updatedAt !== row.createdAt ? (
            <div>
              <div className={styles.label}>Diperbarui</div>
              <div className={styles.metaValue}>
                {STATUS_META.updated.icon}
                <time dateTime={row.updatedAt}>{formatTime(row.updatedAt)}</time>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.messageBlock}>
          <div className={styles.label}>Pesan</div>
          <p className={styles.message}>{row.message}</p>
        </div>

        <CaseActions caseId={row.caseId} currentStatus={row.status} />

        <AdminReplySection
          caseId={row.caseId}
          message={row.message}
          initialAdminReply={row.adminReply}
        />
      </div>
    </div>
  );
}
