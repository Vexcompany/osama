"use client";

/**
 * Kak Taksaka moderation dialog (V3.3).
 *
 * A small inline card that appears when the moderation pipeline
 * (client preview OR server pipeline) blocks a submission. The
 * card uses the HARD-CODED dialog copy from
 * `moderationDialogs.ts` — no AI request is made to generate the
 * message.
 *
 * The user's textarea content is NOT cleared. They can edit the
 * message and resubmit. The dialog dismisses itself as soon as
 * the user types in the textarea, or via the explicit close
 * button.
 */
import { KakTaksakaAvatar } from "./KakTaksakaAvatar";
import type { ModerationDialog } from "./moderationDialogs";
import styles from "./KakTaksakaModerationDialog.module.css";

export function KakTaksakaModerationDialog({
  dialog,
  onDismiss,
}: {
  dialog: ModerationDialog;
  onDismiss: () => void;
}) {
  return (
    <div
      className={styles.card}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.header}>
        <span className={styles.avatar}>
          <KakTaksakaAvatar size={36} expression="thinking" />
        </span>
        <div className={styles.heading}>
          <span className={styles.label}>{dialog.title}</span>
          <p className={styles.message}>{dialog.message}</p>
        </div>
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={onDismiss}
        aria-label="Tutup pesan Kak Taksaka"
      >
        OK
      </button>
    </div>
  );
}
