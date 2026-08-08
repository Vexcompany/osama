/**
 * Public page — OSIS Ngobrol Yuk (V1).
 *
 * One screen, one job: collect an aspiration. The underwater scene is a
 * fixed background layer; the content layer is a single card that fits
 * on a phone screen without scrolling on first paint.
 */
import { AspirationForm } from "@/components/aspiration/AspirationForm";
import { UnderwaterBackground } from "@/components/underwater/UnderwaterBackground";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <UnderwaterBackground />

      <div className={styles.center}>
        <header className={styles.header}>
          <div className={styles.brand} aria-label="OSIS Ngobrol Yuk">
            <span className={styles.brandMark} aria-hidden="true">
              <svg viewBox="0 0 40 40" width="32" height="32">
                <defs>
                  <radialGradient id="lg" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="60%" stopColor="#8de4ff" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#1c6f8b" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="20" cy="20" r="17" fill="url(#lg)" />
                <path
                  d="M8 22 C 12 26, 28 26, 32 22"
                  fill="none"
                  stroke="#06222e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.55"
                />
              </svg>
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandTitle}>OSIS</span>
              <span className={styles.brandSub}>Ngobrol Yuk</span>
            </span>
          </div>
          <h1 className={styles.title}>Sampaikan aspirasimu untuk OSIS</h1>
          <p className={styles.subtitle}>
            Anonim, mudah, dan langsung sampai. Tidak perlu akun, tidak perlu
            email — cukup tulis dan kirim.
          </p>
        </header>

        <section className={styles.card} aria-label="Formulir Aspirasi">
          <AspirationForm />
        </section>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} OSIS</span>
          <span aria-hidden="true">·</span>
          <span>Ngobrol Yuk</span>
        </footer>
      </div>
    </main>
  );
}
