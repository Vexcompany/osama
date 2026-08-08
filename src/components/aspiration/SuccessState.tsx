"use client";

/**
 * SuccessState
 *
 * Calm, single-card success screen. No browser alert, no popup.
 * Offers a "Kirim Aspirasi Lagi" CTA that resets the form.
 */
import { useEffect, useState } from "react";

import styles from "./SuccessState.module.css";

export function SuccessState({ onAgain }: { onAgain: () => void }) {
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
      <div className={styles.bubble} aria-hidden="true">
        <svg viewBox="0 0 64 64" width="56" height="56">
          <defs>
            <radialGradient id="sgrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#8de4ff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1c6f8b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill="url(#sgrad)" />
          <path
            d="M20 33 L29 42 L46 24"
            fill="none"
            stroke="#06222e"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className={styles.title}>
        <span className={styles.sparkle} aria-hidden="true">✨</span> Aspirasi terkirim!
      </h2>
      <p className={styles.body}>
        Aspirasimu berhasil dikirim. Terima kasih sudah ikut menyampaikan
        suara untuk OSIS.
      </p>
      <button type="button" className={styles.again} onClick={onAgain}>
        Kirim Aspirasi Lagi
      </button>
    </div>
  );
}
