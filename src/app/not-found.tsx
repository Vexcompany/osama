/**
 * 404 page. Kept minimal and on-brand so the visual identity never
 * breaks even on edge cases.
 */
import Link from "next/link";

import { UnderwaterBackground } from "@/components/underwater/UnderwaterBackground";

export default function NotFound() {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <UnderwaterBackground />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 700, color: "#eaf9ff" }}>404</div>
        <p style={{ color: "rgba(205,230,245,0.8)", margin: 0 }}>
          Halaman yang kamu cari tidak ada.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 18px",
            background: "rgba(255,255,255,0.92)",
            color: "#06222e",
            borderRadius: 12,
            fontWeight: 600,
            textDecoration: "none",
            marginTop: 6,
          }}
        >
          Kembali ke form
        </Link>
      </div>
    </main>
  );
}
