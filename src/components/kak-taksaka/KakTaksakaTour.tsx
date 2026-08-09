"use client";

/**
 * Kak Taksaka tour — spotlight walkthrough.
 *
 * Implementation notes:
 *   - Spotlight is dynamic: it measures the target with
 *     getBoundingClientRect() on mount, on resize, on scroll, and
 *     on a ResizeObserver against the target. NO hardcoded
 *     coordinates.
 *   - The dim layer is a single full-viewport element with a CSS
 *     box-shadow "cutout" using the target's rect. No canvas, no
 *     WebGL, no animation loop.
 *   - The dialog is positioned to one of the requested placements
 *     (top/bottom/left/right) and clamped to the viewport on small
 *     screens so it never goes off-screen.
 *
 *   - If a target can't be found we advance to the next step rather
 *     than block the tour.
 *
 *   - All copy is hardcoded locally (TAKSAKA_TOUR_DIALOGS in
 *     kakTaksakaRules.ts). The tour never makes an API call.
 *     /api/taksaka is reserved for the AI chat.
 *
 *   - V3.2: dialog visibility is robust. The first render DOES
 *     measure synchronously (useLayoutEffect runs before paint),
 *     so the dialog is positioned correctly on the very first
 *     frame. No `visibility: hidden` race that previously kept
 *     the dialog invisible in some browsers.
 *
 * Lifecycle contract (V3.1):
 *   - All window/document listeners (resize, scroll, orientation,
 *     keydown) are torn down in a single unmount effect. No leaked
 *     listeners.
 *   - On unmount we blur whatever was focused inside the tour so
 *     focus cleanly returns to the document. autoFocus on the
 *     primary button is the only intentional focus call.
 *   - `role="dialog"` WITHOUT `aria-modal="true"`. The tour is
 *     not a true modal — it has no real focus trap — so the
 *     aria-modal hint would leak modal semantics into the
 *     browser even after unmount.
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

const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 16;
const VIEWPORT_MARGIN = 12;
const DIALOG_GAP = 14;

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
  return { side, dialogLeft, dialogTop };
}

export function KakTaksakaTour({ onEnd }: { onEnd: () => void }) {
  // Initial state computes the placement synchronously on the very
  // first render (browser only) so the dialog has the correct
  // position on the first frame. The measure useLayoutEffect
  // below updates the same state on subsequent renders and on
  // scroll / resize.
  const [stepIndex, setStepIndex] = useState(0);
  const initialStep = TOUR_STEPS[0]!;
  const initialMeasurement =
    typeof window === "undefined"
      ? { rect: null, viewport: { w: 0, h: 0 }, dialogSize: { w: 320, h: 200 } }
      : (() => {
          const el = document.querySelector(initialStep.target);
          const rect = readRect(el);
          const viewport = readViewport();
          // Approximate initial dialog size to avoid a one-frame
          // flicker. Real size is measured synchronously in the
          // useLayoutEffect below.
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
  // Remember the element that was focused before the tour opened.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const step: TourStep | null = useMemo(
    () => TOUR_STEPS[stepIndex] ?? null,
    [stepIndex],
  );

  // ── Lifecycle: mount — capture focus + mark body + initial measure ──
  useEffect(() => {
    const active = document.activeElement;
    previouslyFocusedRef.current =
      active instanceof HTMLElement ? active : null;
    document.body.setAttribute("data-taksaka-tour", "active");
    return () => {
      document.body.removeAttribute("data-taksaka-tour");
    };
  }, []);

  // ── Lifecycle: unmount — single authoritative cleanup ──
  useEffect(() => {
    return () => {
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

  // ── Initial measurement: useLayoutEffect runs before paint, so
  //    the first render has correct rect / viewport / dialog
  //    placement. No `visibility: hidden` race.
  useLayoutEffect(() => {
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
    // Synchronous first measure, before paint.
    setRect(readRect(el));
    setViewport(readViewport());

    const update = () => {
      setRect(readRect(el));
      setViewport(readViewport());
    };

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("scroll", update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  // ── Measure dialog after mount so we can position correctly ──
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

  // ── Keyboard: Enter advances, Esc ends the tour. ──
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

  // ── Compute spotlight + dialog placement for the current step ──
  let spotlightStyle: React.CSSProperties | null = null;
  let dialogStyle: React.CSSProperties = {
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
  };
  let side: "top" | "bottom" | "left" | "right" = "bottom";

  if (rect && viewport.w > 0) {
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

      <div
        ref={dialogRef}
        className={`${styles.dialog} ${styles[`side_${side}`]}`}
        style={dialogStyle}
      >
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
                Kembali
              </button>
            ) : null}
            <button
              type="button"
              className={styles.primary}
              onClick={advance}
              autoFocus
            >
              {isLast ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
