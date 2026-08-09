"use client";

/**
 * Kak Taksaka intro — first-visit overlay.
 *
 * V3.1 PATCH: the dialog copy is sourced from
 * TAKSAKA_INTRO_DIALOG in kakTaksakaRules.ts, not hardcoded
 * inline. This keeps the wording consistent with the rest of
 * the Kak Taksaka dialogs and makes it easy to find and edit
 * in one place.
 *
 * Behavior contract:
 *   - Primary "Mulai" button: starts the tour.
 *   - Secondary "Lewati" button: dismisses and saves the
 *     current dialog version (so the user won't see the same
 *     intro again unless we bump the version).
 *   - Esc on the body: dismisses and saves the version
 *     (consistent with the tour's Esc behavior).
 *   - No /api/taksaka call. No AI.
 *
 * Visibility:
 *   The card is visible by default (opacity 1) and animates
 *   in via a CSS keyframe on mount. There is no
 *   `visibility: hidden` race. SSR renders the card markup
 *   so the very first paint includes the dialog (if the
 *   parent's overlay state is "intro"). The parent uses an
 *   effect-based version check to avoid the "flash of intro
 *   on reload" failure mode.
 *
 * Lifecycle:
 *   - On mount, capture the previously focused element.
 *   - On unmount, release focus from anything still inside
 *     the intro and restore focus to the original element.
 *   - `role="dialog"` WITHOUT `aria-modal="true"`. The intro
 *     is a lightweight prompt, not a true modal — the
 *     previous build's `aria-modal` left browsers in a stale
 *     modal state.
 */
import { useEffect, useRef } from "react";

import { KakTaksakaAvatar } from "./KakTaksakaAvatar";
import { TAKSAKA_INTRO_DIALOG } from "./kakTaksakaRules";
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

  // Esc dismisses the intro and saves the version.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

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
        aria-describedby="kt-intro-body"
      >
        <div className={styles.avatar}>
          <KakTaksakaAvatar size={88} expression="happy" />
        </div>
        <h2 id="kt-intro-title" className={styles.title}>
          {TAKSAKA_INTRO_DIALOG.title}
        </h2>
        <p id="kt-intro-body" className={styles.body}>
          {TAKSAKA_INTRO_DIALOG.message}
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
