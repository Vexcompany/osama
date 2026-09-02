"use client";

/**
 * Kak Taksaka tour — spotlight walkthrough.
 *
 * V4.0 — SMART SCROLL + OBSIDIAN POLISH
 *
 * Smart scroll: before spotlight activates, we:
 *   1. Find the target element
 *   2. Check if it's visible in viewport (with breathing room)
 *   3. If not, smooth-scroll to it with offset
 *   4. Wait for scroll to stabilize (via rAF + position check)
 *   5. Then measure with getBoundingClientRect()
 *   6. Activate spotlight + show dialog
 *
 * Spotlight tracks target on: scroll, resize, orientationchange.
 * Uses throttled rAF for recalibration. NO hardcoded pixel coords.
 *
 * Dialog positioning: auto-flips side to stay in viewport.
 * Tooltip never clips out or covers target.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { KakTaksakaAvatar } from "./KakTaksakaAvatar";
import {
  TAKSAKA_TOUR_DIALOGS as TOUR_STEPS,
  type TourStep,
} from "./kakTaksakaRules";
import styles from "./KakTaksakaTour.module.css";

const SPOTLIGHT_PADDING = 10;
const SPOTLIGHT_RADIUS = 16;
const VIEWPORT_MARGIN = 14;
const DIALOG_GAP = 16;
// Breathing room above/below target when scrolling into view
const SCROLL_BREATHING = 80;

interface RectBox {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface Viewport {
  w: number;
  h: number;
}

interface DialogSize {
  w: number;
  h: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function readRect(el: Element | null): RectBox | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  };
}

function readViewport(): Viewport {
  return { w: window.innerWidth, h: window.innerHeight };
}

/**
 * Check whether the target has adequate breathing room in viewport.
 * Returns true if the element is fully visible + has breathing room.
 */
function isWellVisible(rect: RectBox, vp: Viewport): boolean {
  return (
    rect.top >= SCROLL_BREATHING &&
    rect.bottom <= vp.h - SCROLL_BREATHING &&
    rect.left >= 0 &&
    rect.right <= vp.w
  );
}

/**
 * Scroll the target into view with breathing room, then wait for
 * position to stabilize. Returns a Promise that resolves when done.
 */
function scrollToTarget(el: Element, vp: Viewport): Promise<void> {
  return new Promise((resolve) => {
    const rect = el.getBoundingClientRect();
    if (isWellVisible(rect, vp)) {
      resolve();
      return;
    }

    // Calculate scroll offset: center the element vertically with breathing room
    const elementTop = rect.top + window.scrollY;
    const elementHeight = rect.height;
    const targetScrollY = elementTop - (vp.h / 2) + (elementHeight / 2);
    const clamped = Math.max(0, targetScrollY);

    window.scrollTo({ top: clamped, behavior: "smooth" });

    // Wait for scroll to stabilize: poll until position stops changing
    let lastY = window.scrollY;
    let stableCount = 0;
    const STABLE_FRAMES = 4;
    const MAX_FRAMES = 60; // ~1 second timeout
    let frames = 0;

    function checkStable() {
      const currentY = window.scrollY;
      if (Math.abs(currentY - lastY) < 1) {
        stableCount++;
        if (stableCount >= STABLE_FRAMES) {
          resolve();
          return;
        }
      } else {
        stableCount = 0;
      }
      lastY = currentY;
      frames++;
      if (frames >= MAX_FRAMES) {
        resolve(); // timeout fallback
        return;
      }
      requestAnimationFrame(checkStable);
    }

    // Start checking after a brief delay to let scroll begin
    setTimeout(() => requestAnimationFrame(checkStable), 50);
  });
}

function placementFor(rect: RectBox, vp: Viewport, dialog: DialogSize) {
  const pad = SPOTLIGHT_PADDING;
  const gap = DIALOG_GAP;
  const targetCx = rect.left + rect.width / 2;
  const targetCy = rect.top + rect.height / 2;

  const fits = (side: "top" | "bottom" | "left" | "right") => {
    if (side === "top")
      return rect.top - pad - gap - dialog.h >= VIEWPORT_MARGIN;
    if (side === "bottom")
      return (
        rect.top + rect.height + pad + gap + dialog.h <=
        vp.h - VIEWPORT_MARGIN
      );
    if (side === "left")
      return rect.left - pad - gap - dialog.w >= VIEWPORT_MARGIN;
    return rect.right + pad + gap + dialog.w <= vp.w - VIEWPORT_MARGIN;
  };

  let side: "top" | "bottom" | "left" | "right" = "bottom";
  if (!fits(side)) side = "top";
  if (!fits(side)) side = "right";
  if (!fits(side)) side = "left";
  if (!fits(side)) side = "bottom";

  let dialogLeft = 0;
  let dialogTop = 0;
  if (side === "top") {
    dialogLeft = clamp(
      targetCx - dialog.w / 2,
      VIEWPORT_MARGIN,
      vp.w - dialog.w - VIEWPORT_MARGIN,
    );
    dialogTop = rect.top - pad - gap - dialog.h;
  } else if (side === "bottom") {
    dialogLeft = clamp(
      targetCx - dialog.w / 2,
      VIEWPORT_MARGIN,
      vp.w - dialog.w - VIEWPORT_MARGIN,
    );
    dialogTop = rect.top + rect.height + pad + gap;
  } else if (side === "left") {
    dialogLeft = rect.left - pad - gap - dialog.w;
    dialogTop = clamp(
      targetCy - dialog.h / 2,
      VIEWPORT_MARGIN,
      vp.h - dialog.h - VIEWPORT_MARGIN,
    );
  } else {
    dialogLeft = rect.right + pad + gap;
    dialogTop = clamp(
      targetCy - dialog.h / 2,
      VIEWPORT_MARGIN,
      vp.h - dialog.h - VIEWPORT_MARGIN,
    );
  }

  // Final clamp: ensure dialog never exits viewport
  dialogLeft = clamp(dialogLeft, VIEWPORT_MARGIN, vp.w - dialog.w - VIEWPORT_MARGIN);
  dialogTop = clamp(dialogTop, VIEWPORT_MARGIN, vp.h - dialog.h - VIEWPORT_MARGIN);

  return { side, dialogLeft, dialogTop };
}

export function KakTaksakaTour({ onEnd }: { onEnd: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  // scrolling: true while we're waiting for auto-scroll to complete
  const [scrolling, setScrolling] = useState(false);

  const initialStep = TOUR_STEPS[0]!;
  const initialMeasurement =
    typeof window === "undefined"
      ? { rect: null, viewport: { w: 0, h: 0 }, dialogSize: { w: 320, h: 200 } }
      : (() => {
          const el = document.querySelector(initialStep.target);
          const rect = readRect(el);
          const viewport = readViewport();
          const w = Math.min(360, viewport.w - 24);
          const h = 200;
          return { rect, viewport, dialogSize: { w, h } };
        })();

  const [rect, setRect] = useState<RectBox | null>(initialMeasurement.rect);
  const [viewport, setViewport] = useState<Viewport>(initialMeasurement.viewport);
  const [dialogSize, setDialogSize] = useState<DialogSize>(
    initialMeasurement.dialogSize,
  );
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<Element | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const step: TourStep | null = useMemo(
    () => TOUR_STEPS[stepIndex] ?? null,
    [stepIndex],
  );

  // Mount
  useEffect(() => {
    const active = document.activeElement;
    previouslyFocusedRef.current =
      active instanceof HTMLElement ? active : null;
    document.body.setAttribute("data-taksaka-tour", "active");
    return () => {
      document.body.removeAttribute("data-taksaka-tour");
    };
  }, []);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        active.closest("[data-taksaka-tour-root]")
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

  // ── SMART SCROLL + MEASURE on step change ──────────────────────────
  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }

    const el = document.querySelector(step.target);
    targetRef.current = el;

    if (!el) {
      setRect(null);
      setViewport(readViewport());
      return;
    }

    const vp = readViewport();
    const currentRect = readRect(el);

    if (currentRect && isWellVisible(currentRect, vp)) {
      // Already visible — measure immediately, no scroll needed
      setRect(currentRect);
      setViewport(vp);
      setScrolling(false);
    } else {
      // Need to scroll first
      setScrolling(true);
      setRect(null); // hide spotlight while scrolling

      scrollToTarget(el, vp).then(() => {
        // Re-measure after scroll stabilizes
        setRect(readRect(el));
        setViewport(readViewport());
        setScrolling(false);
      });
    }
  }, [step]);

  // ── Live tracking: scroll / resize / orientation ───────────────────
  useLayoutEffect(() => {
    if (!step) return;

    const el = document.querySelector(step.target);
    if (!el) return;
    targetRef.current = el;

    // Throttled update via rAF
    let scheduled = false;
    const scheduleUpdate = () => {
      if (scheduled) return;
      scheduled = true;
      rafIdRef.current = requestAnimationFrame(() => {
        scheduled = false;
        if (!scrolling) {
          setRect(readRect(el));
          setViewport(readViewport());
        }
      });
    };

    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(el);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
    };
  }, [step, scrolling]);

  // ── Measure dialog size for placement ──────────────────────────────
  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setDialogSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stepIndex]);

  const advance = useCallback(() => {
    setStepIndex((i) => {
      const next = i + 1;
      if (next >= TOUR_STEPS.length) {
        onEnd();
        return i;
      }
      return next;
    });
  }, [onEnd]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onEnd();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        const tag = (document.activeElement?.tagName ?? "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, onEnd]);

  if (!step) return null;

  // Compute spotlight + dialog placement
  let spotlightStyle: React.CSSProperties | null = null;
  let dialogStyle: React.CSSProperties = {
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
  };
  let side: "top" | "bottom" | "left" | "right" = "bottom";

  if (rect && viewport.w > 0 && !scrolling) {
    const pad = SPOTLIGHT_PADDING;
    spotlightStyle = {
      left: `${rect.left - pad}px`,
      top: `${rect.top - pad}px`,
      width: `${rect.width + pad * 2}px`,
      height: `${rect.height + pad * 2}px`,
      borderRadius: `${SPOTLIGHT_RADIUS}px`,
    };
    const placement = placementFor(rect, viewport, dialogSize);
    side = placement.side;
    dialogStyle = {
      left: `${placement.dialogLeft}px`,
      top: `${placement.dialogTop}px`,
    };
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      className={styles.root}
      role="dialog"
      aria-labelledby="kt-tour-title"
      data-taksaka-tour-root
    >
      <div className={styles.dim} aria-hidden="true" />
      {spotlightStyle ? (
        <div
          className={styles.spotlight}
          style={spotlightStyle}
          aria-hidden="true"
        />
      ) : null}

      {/* Scrolling indicator */}
      {scrolling && (
        <div className={styles.scrollingHint} aria-live="polite" aria-label="Mengarahkan ke elemen...">
          <div className={styles.scrollingDot} />
          <span>Mengarahkan…</span>
        </div>
      )}

      <div
        ref={dialogRef}
        className={`${styles.dialog} ${styles[`side_${side}`]} ${scrolling ? styles.dialogHidden : ""}`}
        style={dialogStyle}
      >
        {/* Progress bar */}
        <div className={styles.progressBar} aria-hidden="true">
          <div
            className={styles.progressFill}
            style={{ width: `${((stepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        <div className={styles.dialogHeader}>
          <span className={styles.dialogAvatar}>
            <KakTaksakaAvatar size={36} expression="happy" />
          </span>
          <div className={styles.dialogHeading}>
            <span className={styles.stepLabel}>
              {stepIndex + 1} / {TOUR_STEPS.length}
            </span>
            <h2 id="kt-tour-title" className={styles.title}>
              {step.title}
            </h2>
          </div>
        </div>

        <p className={styles.body}>{step.message}</p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={onEnd}
          >
            Lewati
          </button>
          <div className={styles.actionsRight}>
            {!isFirst ? (
              <button
                type="button"
                className={styles.ghost}
                onClick={back}
              >
                ← Kembali
              </button>
            ) : null}
            <button
              type="button"
              className={styles.primary}
              onClick={advance}
              autoFocus
            >
              {isLast ? "Selesai ✓" : "Lanjut →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
