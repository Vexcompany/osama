"use client";

/**
 * Kak Taksaka intro — first visit overlay.
 *
 * The brief describes an NPC-tutorial-game feel. We present a single
 * soft card with the avatar and a friendly welcome, plus a primary
 * "Mulai" button (starts the tour) and a "Lewati" link (skips
 * entirely, sets the localStorage flag).
 */
import { useEffect, useState } from "react";

import { KakTaksakaAvatar } from "./KakTaksakaAvatar";
import styles from "./KakTaksakaIntro.module.css";

export function KakTaksakaIntro({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 16);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        className={`${styles.card} ${shown ? styles.shown : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kt-intro-title"
      >
        <div className={styles.avatar}>
          <KakTaksakaAvatar size={88} expression="wave" />
        </div>
        <h2 id="kt-intro-title" className={styles.title}>
          Hai! Aku Kak Taksaka 👋
        </h2>
        <p className={styles.body}>
          Mau aku jelaskan sekilas cara pakai Ngobrol Yuk? Bisa kok,
          santai saja.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={onStart}
            autoFocus
          >
            Mulai
          </button>
          <button type="button" className={styles.secondary} onClick={onSkip}>
            Lewati
          </button>
        </div>
      </div>
    </div>
  );
}
