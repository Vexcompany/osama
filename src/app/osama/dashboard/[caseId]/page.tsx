/**
 * OSAMA case detail.
 *
 * Server component. Reads the aspiration, then hands off to a small
 * client component for the status mutation UI.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAspirationByCaseId } from "@/lib/db/admin";
import { OsamaCanvas } from "@/components/osama/OsamaCanvas";

import { CaseActions } from "./CaseActions";
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
        ← Kembali ke ringkasan
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
              <time dateTime={row.createdAt}>{formatTime(row.createdAt)}</time>
            </div>
          </div>
          {row.updatedAt !== row.createdAt ? (
            <div>
              <div className={styles.label}>Diperbarui</div>
              <div className={styles.metaValue}>
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

        <OsamaCanvas caseId={row.caseId} message={row.message} />
      </div>
    </div>
  );
}
