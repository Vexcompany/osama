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
            }`}
            onClick={() => setStatus(t)}
            disabled={busy !== null}
          >
            {busy === t ? "…" : `→ ${LABEL[t]}`}
          </button>
        ))}
      </div>
    </div>
  );
}
