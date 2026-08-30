"use client";

/**
 * Status mutation controls.
 *
 * The available actions are computed from the server-supplied current
 * status using the same transition rules as the API route. We don't
 * trust the client to enforce transitions; the server does that too.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AspirationStatus } from "@/lib/db/admin";
import styles from "./case.module.css";

const TRANSITIONS: Record<AspirationStatus, AspirationStatus[]> = {
  new: ["processing", "archived"],
  processing: ["resolved", "archived"],
  resolved: ["archived"],
  archived: [],
};

const LABEL: Record<AspirationStatus, string> = {
  new: "Baru",
  processing: "Diproses",
  resolved: "Selesai",
  archived: "Arsipkan",
};

const ICONS: Record<AspirationStatus, React.ReactNode> = {
  new: (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M10 2 L13 6 L18 7 L14 11 L15 16 L10 14 L5 16 L6 11 L2 7 L7 6 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  processing: (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M10 3 V6 M10 14 V17 M3 10 H6 M14 10 H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  resolved: (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10.5 L9 13 L13.5 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  archived: (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8 H17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 11 H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export function CaseActions({
  caseId,
  currentStatus,
}: {
  caseId: string;
  currentStatus: AspirationStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<AspirationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targets = TRANSITIONS[currentStatus];

  async function setStatus(next: AspirationStatus) {
    if (busy) return;
    setError(null);
    setBusy(next);
    try {
      const res = await fetch(
        `/api/osama/cases/${encodeURIComponent(caseId)}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      if (res.status === 401) {
        // Session expired; bounce to login.
        router.replace("/osama");
        return;
      }
      if (res.status === 409) {
        setError("Transisi status tidak diizinkan untuk status saat ini.");
        return;
      }
      if (!res.ok) {
        setError("Gagal memperbarui status. Coba lagi.");
        return;
      }
      // Re-fetch the server component.
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi internetmu.");
    } finally {
      setBusy(null);
    }
  }

  if (targets.length === 0) {
    return (
      <div className={styles.actions}>
        <p className={styles.actionsEmpty}>
          Status ini tidak memiliki transisi lebih lanjut.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.actions}>
      {error ? (
        <div className={styles.actionsError} role="alert">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
            <path d="M10 3 L17 16 H3 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M10 8 V11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M10 13.8 V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      ) : null}
      <div className={styles.actionsRow}>
        {targets.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.actionBtn} ${
              t === "resolved" ? styles.actionPrimary : ""
            } ${t === "archived" ? styles.actionArchive : ""}`}
            onClick={() => setStatus(t)}
            disabled={busy !== null}
          >
            {busy === t ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              ICONS[t]
            )}
            {LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
