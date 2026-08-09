"use client";

/**
 * Lightweight toast stack for non-blocking Kak Taksaka warnings.
 *
 * The chat already shows errors inline, so this is mostly used for
 * subtle hints like "rate limited, try again later" or the global
 * "Taksaka is busy" hint we show once per session.
 */
import styles from "./KakTaksakaWarning.module.css";

export interface KakTaksakaWarning {
  id: number;
  text: string;
  tone: "info" | "warn";
}

export function KakTaksakaWarning({
  warnings,
  onDismiss,
}: {
  warnings: KakTaksakaWarning[];
  onDismiss: (id: number) => void;
}) {
  if (warnings.length === 0) return null;
  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {warnings.map((w) => (
        <button
          key={w.id}
          type="button"
          className={`${styles.toast} ${w.tone === "warn" ? styles.warn : styles.info}`}
          onClick={() => onDismiss(w.id)}
        >
          {w.text}
        </button>
      ))}
    </div>
  );
}
