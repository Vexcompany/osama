"use client";

/**
 * Kak Taksaka tour — spotlight walkthrough.
 *
 * Implementation notes (the brief is specific):
 *   - Spotlight is dynamic: it measures the target with
 *     getBoundingClientRect() on mount, on resize, on scroll, and on
 *     a ResizeObserver against the target. NO hardcoded coordinates.
 *   - The dim layer is a single full-viewport element with a CSS
 *     box-shadow "cutout" using the target's rect. No canvas, no
 *     WebGL, no animation loop.
 *   - The dialog is positioned to one of the requested placements
 *     (top/bottom/left/right) and clamped to the viewport on small
 *     screens so it never goes off-screen.
 *   - If a target can't be found we advance to the next step rather
 *     than block the tour.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { KakTaksakaAvatar } from "./KakTaksakaAvatar";
import { TOUR_STEPS, type TourStep } from "./kakTaksakaRules";
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

function placementFor(rect: RectBox, vp: { w: number; h: number }, dialog: { w: number; h: number }) {
  // Returns the dialog position based on the requested placement,
  // with auto-fallback when there isn't enough room.
  const pad = SPOTLIGHT_PADDING;
  const gap = DIALOG_GAP;
  const targetCx = rect.left + rect.width / 2;
  const targetCy = rect.top + rect.height / 2;

  // Try bottom first on wide screens, top on small ones.
  const fits = (side: "top" | "bottom" | "left" | "right") => {
    if (side === "top") return rect.top - pad - gap - dialog.h >= VIEWPORT_MARGIN;
    if (side === "bottom") return rect.top + rect.height + pad + gap + dialog.h <= vp.h - VIEWPORT_MARGIN;
    if (side === "left") return rect.left - pad - gap - dialog.w >= VIEWPORT_MARGIN;
    return rect.right + pad + gap + dialog.w <= vp.w - VIEWPORT_MARGIN;
  };

  let side: "top" | "bottom" | "left" | "right" = "bottom";
  if (!fits(side)) side = "top";
  if (!fits(side)) side = "right";
  if (!fits(side)) side = "left";
  if (!fits(side)) side = "bottom"; // give up; dialog may overlap but never go off-screen

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
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<RectBox | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [dialogSize, setDialogSize] = useState({ w: 320, h: 180 });
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<Element | null>(null);

  const step: TourStep | null = useMemo(
    () => TOUR_STEPS[stepIndex] ?? null,
    [stepIndex],
  );

  // Resolve target + measure.
  useLayoutEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    targetRef.current = el;
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => {
      setRect(readRect(el));
      setViewport({
        w: window.innerWidth,
        h: window.innerHeight,
      });
    };
    update();

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

  // Measure dialog after mount so we can position it.
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

  // Keyboard: Enter advances, Esc ends the tour.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onEnd();
      if (e.key === "Enter" || e.key === " ") {
        // Don't hijack the spacebar if the user is typing in an input.
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

  // Compute spotlight + dialog placement.
  const pad = SPOTLIGHT_PADDING;
  let spotlightStyle: React.CSSProperties | null = null;
  let dialogStyle: React.CSSProperties = {
    left: VIEWPORT_MARGIN,
    top: VIEWPORT_MARGIN,
    visibility: "hidden",
  };
  let side: "top" | "bottom" | "left" | "right" = "bottom";
  if (rect && viewport.w > 0) {
    const spLeft = rect.left - pad;
    const spTop = rect.top - pad;
    const spW = rect.width + pad * 2;
    const spH = rect.height + pad * 2;
    spotlightStyle = {
      left: `${spLeft}px`,
      top: `${spTop}px`,
      width: `${spW}px`,
      height: `${spH}px`,
      borderRadius: `${SPOTLIGHT_RADIUS}px`,
    };
    const placement = placementFor(rect, viewport, dialogSize);
    side = placement.side;
    dialogStyle = {
      left: `${placement.dialogLeft}px`,
      top: `${placement.dialogTop}px`,
      visibility: "visible",
    };
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kt-tour-title"
    >
      {/* Dim overlay with spotlight cutout. We use a single element
          with a giant box-shadow whose "hole" is the target rect. */}
      <div className={styles.dim} aria-hidden="true" />
      {spotlightStyle ? (
        <div className={styles.spotlight} style={spotlightStyle} aria-hidden="true" />
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
        <p className={styles.body}>{step.body}</p>
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
