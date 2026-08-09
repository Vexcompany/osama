"use client";

/**
 * Kak Taksaka avatar.
 *
 * V3.2: the avatar is a `<img>` tag pointing at the public mascot
 * raster at `/kak-taksaka/mascot.jpg`. The brief is explicit:
 * the UI source MUST be the JPG, not the SVG placeholder.
 *
 * To swap the raster: replace `public/kak-taksaka/mascot.jpg`. No
 * code changes required. See `public/kak-taksaka/README.md`.
 *
 * The `expression` prop is preserved as an API but does not change
 * the image — different expressions can be added later by
 * shipping multiple JPGs (e.g. mascot-happy.jpg, mascot-wave.jpg)
 * and selecting between them here.
 */
import styles from "./KakTaksakaAvatar.module.css";

export type KakTaksakaExpression = "happy" | "thinking" | "wave";

export function KakTaksakaAvatar({
  size = 56,
  expression = "happy",
  className,
}: {
  size?: number;
  expression?: KakTaksakaExpression;
  className?: string;
}) {
  // The expression prop is currently a no-op; the JPG is the same
  // for all expressions. Keeping the API stable so V4 (Claude) can
  // drop in multiple files without changing call sites.
  void expression;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/kak-taksaka/mascot.png"
      alt="Kak Taksaka"
      width={size}
      height={size}
      className={`${styles.avatar} ${className ?? ""}`}
      draggable={false}
    />
  );
}
