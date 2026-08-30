"use client";

/**
 * Floating Kak Taksaka button.
 *
 * Fixed position, circular, glassy. The avatar inside is a child,
 * not part of the button styles. Uses transform/opacity for hover
 * and tap feedback; no animation loop.
 *
 * V3.2: the button is ALWAYS mounted (so the [data-tour]
 * target is in the DOM), but it can be visually hidden via the
 * `hidden` prop while the intro or tour is active. When `hidden`
 * is true, the button is `visibility: hidden` + `pointer-events:
 * none` (so it can't be tapped), but it still occupies space so
 * `getBoundingClientRect` returns a real rectangle for the tour
 * spotlight to measure.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./KakTaksakaButton.module.css";

export interface KakTaksakaButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
}

export function KakTaksakaButton(props: KakTaksakaButtonProps) {
  const { className, children, hidden, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`${styles.button} ${hidden ? styles.hidden : ""} ${className ?? ""}`}
      aria-hidden={hidden ? true : undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <span className={styles.inner}>{children}</span>
    </button>
  );
}
