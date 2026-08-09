"use client";

/**
 * Kak Taksaka avatar.
 *
 * V3.2: replaced the placeholder SVG with a stylized Paskibra (PAGASKA)
 * mascot. The brief for V3 is "Kak Taksaka" — a friendly Paskibra
 * character from Paskibra Gala Taksaka, SMK Negeri 5 Madiun. The
 * current SVG is intentionally minimal (silhouette + key Paskibra
 * uniform elements: pet (peci) cap, white dress uniform, epaulet,
 * belt) so it reads as a Paskibra at any size without requiring
 * raster art. V4 (Claude) will replace this with the final
 * illustrated mascot if a raster is supplied.
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
      <defs>
        {/* Cap (pet) — dark navy */}
        <linearGradient id="kt-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2540" />
          <stop offset="100%" stopColor="#0c1426" />
        </linearGradient>
        {/* Cap brim — gold trim */}
        <linearGradient id="kt-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7d27a" />
          <stop offset="100%" stopColor="#c8901f" />
        </linearGradient>
        {/* White uniform */}
        <linearGradient id="kt-uniform" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dde6ef" />
        </linearGradient>
        {/* Cape (red) */}
        <linearGradient id="kt-cape" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8281e" />
          <stop offset="100%" stopColor="#7a120c" />
        </linearGradient>
        {/* Halo bubble behind the character */}
        <radialGradient id="kt-halo" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="60%" stopColor="rgba(141,228,255,0.16)" />
          <stop offset="100%" stopColor="rgba(141,228,255,0)" />
        </radialGradient>
      </defs>

      {/* Halo behind the head */}
      <circle cx="32" cy="26" r="28" fill="url(#kt-halo)" />

      {/* Cape (behind body) — only when waving */}
      {expression === "wave" ? (
        <path
          d="M16 30 Q 12 38 14 50 L 22 50 L 22 30 Z"
          fill="url(#kt-cape)"
          opacity="0.85"
        />
      ) : null}

      {/* Body — white dress uniform */}
      <path
        d="M22 36 L 42 36 L 44 56 L 20 56 Z"
        fill="url(#kt-uniform)"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth="0.4"
      />
      {/* Epaulets */}
      <path
        d="M21 35 L 24 38 L 22 40 Z"
        fill="url(#kt-gold)"
      />
      <path
        d="M43 35 L 40 38 L 42 40 Z"
        fill="url(#kt-gold)"
      />
      {/* Belt */}
      <rect x="20" y="48" width="24" height="2.5" fill="#0c1426" />
      <rect
        x="30.5"
        y="47.8"
        width="3"
        height="3"
        fill="url(#kt-gold)"
        stroke="#0c1426"
        strokeWidth="0.3"
      />
      {/* Collar V */}
      <path
        d="M28 36 L 32 41 L 36 36 Z"
        fill="url(#kt-cape)"
      />
      {/* Chest badge (PAGASKA emblem placeholder) */}
      <circle
        cx="32"
        cy="44"
        r="2"
        fill="url(#kt-gold)"
        stroke="#0c1426"
        strokeWidth="0.3"
      />
      <path
        d="M30.5 44 L 31.5 45 L 33.5 43"
        fill="none"
        stroke="#0c1426"
        strokeWidth="0.5"
        strokeLinecap="round"
      />

      {/* Head */}
      <ellipse cx="32" cy="24" rx="9" ry="10" fill="#f4d2b0" />
      {/* Hair tuft (small, dark, at the front) */}
      <path
        d="M25 18 Q 30 14 38 17 L 36 20 Q 32 18 28 20 Z"
        fill="#1a1410"
        opacity="0.85"
      />

      {/* Pet (peci cap) */}
      <path
        d="M22 17 Q 32 9 42 17 L 41 19 Q 32 13 23 19 Z"
        fill="url(#kt-cap)"
        stroke="#000"
        strokeWidth="0.3"
      />
      {/* Cap gold band */}
      <rect x="22.5" y="18.5" width="19" height="1.4" fill="url(#kt-gold)" />
      {/* Cap front emblem (small star-like) */}
      <circle cx="32" cy="15.5" r="1.4" fill="url(#kt-gold)" />
      <path
        d="M32 14.3 L 32.3 15.2 L 33.2 15.2 L 32.5 15.8 L 32.7 16.7 L 32 16.2 L 31.3 16.7 L 31.5 15.8 L 30.8 15.2 L 31.7 15.2 Z"
        fill="#0c1426"
      />

      {/* Eyes */}
      {expression === "thinking" ? (
        <>
          <circle cx="28" cy="24" r="1.1" fill="#1a1410" />
          <circle cx="36" cy="24" r="1.1" fill="#1a1410" />
        </>
      ) : expression === "wave" ? (
        <>
          <path
            d="M26 24 Q 28 22 30 24"
            fill="none"
            stroke="#1a1410"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M34 23 Q 36 21 38 23"
            fill="none"
            stroke="#1a1410"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M25.5 24 Q 28 22 30.5 24"
            fill="none"
            stroke="#1a1410"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M33.5 24 Q 36 22 38.5 24"
            fill="none"
            stroke="#1a1410"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Cheek blush (subtle) */}
      <ellipse cx="26" cy="27" rx="1.2" ry="0.7" fill="#f4a8a0" opacity="0.5" />
      <ellipse cx="38" cy="27" rx="1.2" ry="0.7" fill="#f4a8a0" opacity="0.5" />

      {/* Mouth */}
      {expression === "thinking" ? (
        <path
          d="M30 28.5 Q 32 28 34 28.5"
          fill="none"
          stroke="#1a1410"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M29 28.5 Q 32 31 35 28.5"
          fill="none"
          stroke="#1a1410"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      )}

      {/* Waving arm when expression === "wave" */}
      {expression === "wave" ? (
        <g>
          {/* arm */}
          <path
            d="M42 40 Q 50 36 52 26"
            fill="none"
            stroke="url(#kt-uniform)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* hand */}
          <circle cx="52" cy="25" r="2.4" fill="#f4d2b0" />
        </g>
      ) : null}

      {/* Small flag pole hint on the body when not waving — subtle */}
      {expression !== "wave" ? (
        <g opacity="0.85">
          <line
            x1="50"
            y1="22"
            x2="50"
            y2="58"
            stroke="#7a4d1e"
            strokeWidth="0.6"
          />
          <path
            d="M50 22 L 56 24 L 50 28 Z"
            fill="url(#kt-cape)"
          />
          <text
            x="51"
            y="27"
            fontSize="2.6"
            fontWeight="700"
            fill="#f7d27a"
            textAnchor="middle"
            fontFamily="serif"
            letterSpacing="0.1"
          >
            PG
          </text>
        </g>
      ) : null}
    </svg>
  );
}
