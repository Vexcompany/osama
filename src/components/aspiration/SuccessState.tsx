"use client";

/**
 * SuccessState (V1 UI revision)
 *
 * Calm single-card success. Shows the case id as a reference for the
 * sender. There is intentionally NO copy-to-clipboard, NO alert, NO
 * popup — the case id is a passive reference, not an action item.
 */
import { useEffect, useState } from "react";

import styles from "./SuccessState.module.css";

export function SuccessState({
  caseId,
  onAgain,
}: {
  caseId: string | null;
  onAgain: () => void;
}) {
  // Trigger the entrance animation only after mount so the initial
  // paint starts from the resting state (no flash of pre-animated content).
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 16);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      className={`${styles.wrap} ${shown ? styles.shown : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.checkBubble} aria-hidden="true">
        <svg viewBox="0 0 64 64" width="44" height="44">
          <path
            d="M18 33 L28 43 L46 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 className={styles.title}>Aspirasi berhasil dikirim!</h2>
      <p className={styles.body}>
        Terima kasih sudah menyampaikan suaramu untuk OSIS.
      </p>

      {caseId ? (
        <div className={styles.caseIdBlock} data-tour="case-id">
          <span className={styles.caseIdLabel}>Case ID</span>
          <span className={styles.caseIdValue}>{caseId}</span>
        </div>
      ) : null}

      <button type="button" className={styles.again} onClick={onAgain}>
        Kirim Aspirasi Lagi
      </button>
    </div>
  );
}
