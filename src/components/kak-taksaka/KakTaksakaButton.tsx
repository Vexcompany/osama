"use client";

/**
 * Floating Kak Taksaka button.
 *
 * Fixed position, circular, glassy. The avatar inside is a child,
 * not part of the button styles. Uses transform/opacity for hover
 * and tap feedback; no animation loop.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./KakTaksakaButton.module.css";

export interface KakTaksakaButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
}

export function KakTaksakaButton(props: KakTaksakaButtonProps) {
  const { className, children, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`${styles.button} ${className ?? ""}`}
    >
      <span className={styles.inner}>{children}</span>
    </button>
  );
}
