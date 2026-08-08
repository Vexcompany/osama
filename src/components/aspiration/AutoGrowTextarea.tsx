"use client";

/**
 * AutoGrowTextarea
 *
 * A textarea that grows with its content up to a max height, with no
 * external dependency. Avoids layout shift by measuring after layout
 * via ResizeObserver.
 *
 * Default sizes are intentionally conservative for an NGL-style feel:
 *   - min: ~5 lines of body text (≈ 110px at 16px / 1.55 line-height)
 *   - max: tall enough to fit a long message without internal scroll
 *     on a typical phone, but small enough to never dominate the
 *     viewport.
 *
 * Why not just use the native element + CSS grid trick? It causes
 * a brief one-line height when content wraps, and on iOS it can
 * glitch while the keyboard is animating. The ResizeObserver approach
 * is reliable and cheap.
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

export interface AutoGrowTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
  maxHeight?: number;
}

export const AutoGrowTextarea = forwardRef<
  HTMLTextAreaElement,
  AutoGrowTextareaProps
>(function AutoGrowTextarea(
  { minHeight = 110, maxHeight = 320, onChange, value, style, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

  // Resize on value change (controlled) AND on content changes from
  // outside (autofill, IME, etc).
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = `${minHeight}px`;
    const next = Math.min(maxHeight, Math.max(minHeight, el.scrollHeight));
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, minHeight, maxHeight]);

  // Also resize on window resize so the layout reflows correctly.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      el.style.height = `${minHeight}px`;
      const next = Math.min(maxHeight, Math.max(minHeight, el.scrollHeight));
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minHeight, maxHeight]);

  return (
    <textarea
      ref={innerRef}
      value={value}
      onChange={onChange}
      rows={3}
      style={{
        width: "100%",
        minHeight,
        maxHeight,
        resize: "none",
        // Smooth height transitions are tempting but cause a noticeable
        // "drift" on iOS during keyboard animation. We do NOT animate.
        transition: "none",
        ...style,
      }}
      {...rest}
    />
  );
});
