"use client";

/**
 * Kak Taksaka intro — first visit overlay.
 *
 * The brief describes an NPC-tutorial-game feel. We present a
 * single soft card with the avatar and a friendly welcome, plus a
 * primary "Mulai" button (starts the tour) and a "Lewati" link
 * (skips entirely, sets the localStorage flag).
 *
 * V3.2: the card animates in via CSS keyframes on mount (no JS
 * state for "shown" anymore). The card is visible on the first
 * render — there's no opacity:0 → useEffect → setState → class
 * swap race. The dialog appears.
 *
 * Lifecycle (V3.1):
 *   - On mount, capture the previously focused element.
 *   - On unmount, release focus from anything still inside the
 *     intro and restore focus to the original element.
 *   - `role="dialog"` WITHOUT `aria-modal="true"`. The intro is
 *     a lightweight prompt, not a true modal — the previous
 *     build's `aria-modal` left browsers in a stale modal state.
 *   - Body data attribute on mount, removed on unmount.
 */
import { useEffect, useRef } from "react";

import { KakTaksakaAvatar } from "./KakTaksakaAvatar";
import styles from "./KakTaksakaIntro.module.css";

export function KakTaksakaIntro({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Mount: capture focus for later restore + mark body.
  useEffect(() => {
    const active = document.activeElement;
    previouslyFocusedRef.current =
      active instanceof HTMLElement ? active : null;
    document.body.setAttribute("data-taksaka-intro", "active");
    return () => {
      document.body.removeAttribute("data-taksaka-intro");
    };
  }, []);

  // Unmount: single authoritative cleanup.
  useEffect(() => {
    return () => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        active.closest("[data-taksaka-intro-root]")
      ) {
        active.blur();
      }
      const prev = previouslyFocusedRef.current;
      if (prev && document.contains(prev)) {
        try {
          prev.focus({ preventScroll: true });
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      data-taksaka-intro-root
    >
      <div
        className={styles.card}
        role="dialog"
        aria-labelledby="kt-intro-title"
      >
        <div className={styles.avatar}>
          <KakTaksakaAvatar size={88} expression="happy" />
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
