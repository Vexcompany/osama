"use client";

/**
 * Kak Taksaka avatar.
 *
 * A simple SVG that reads as a friendly character without bringing
 * in heavy assets. V4 Claude will polish the visual; the V3 version
 * is intentionally minimal but already brand-consistent with the
 * underwater theme.
 *
 * Server-safe: this is just markup, no API keys or secrets.
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
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`${styles.avatar} ${className ?? ""}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Halo / bubble background */}
      <defs>
        <radialGradient id="kt-halo" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="60%" stopColor="rgba(141,228,255,0.18)" />
          <stop offset="100%" stopColor="rgba(141,228,255,0)" />
        </radialGradient>
        <linearGradient id="kt-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a4ecff" />
          <stop offset="100%" stopColor="#4dc7ee" />
        </linearGradient>
        <linearGradient id="kt-suit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e3a4d" />
          <stop offset="100%" stopColor="#072732" />
        </linearGradient>
      </defs>

      {/* Soft halo */}
      <circle cx="32" cy="30" r="30" fill="url(#kt-halo)" />

      {/* Body (small diving-suit silhouette) */}
      <ellipse cx="32" cy="44" rx="16" ry="13" fill="url(#kt-body)" />
      <rect x="22" y="42" width="20" height="14" rx="6" fill="url(#kt-suit)" />

      {/* Head */}
      <circle cx="32" cy="26" r="14" fill="url(#kt-body)" />
      {/* Helmet rim */}
      <path
        d="M18 26 a14 14 0 0 1 28 0"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
      />

      {/* Eyes */}
      {expression === "thinking" ? (
        <>
          <circle cx="27.5" cy="26" r="1.7" fill="#06222e" />
          <circle cx="36.5" cy="26" r="1.7" fill="#06222e" />
        </>
      ) : (
        <>
          <path
            d="M24 27 q3.5 -4 7 0"
            fill="none"
            stroke="#06222e"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M33 27 q3.5 -4 7 0"
            fill="none"
            stroke="#06222e"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Mouth */}
      {expression === "happy" || expression === "wave" ? (
        <path
          d="M27 33 q5 4 10 0"
          fill="none"
          stroke="#06222e"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M28 33 q4 1 8 0"
          fill="none"
          stroke="#06222e"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}

      {/* Small wave arm when expression === "wave" */}
      {expression === "wave" ? (
        <g>
          <path
            d="M48 38 q4 -2 4 -8"
            fill="none"
            stroke="url(#kt-body)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="52" cy="28" r="3" fill="url(#kt-body)" />
        </g>
      ) : null}
    </svg>
  );
}
