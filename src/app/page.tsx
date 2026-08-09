/**
 * Public page — OSIS Ngobrol Yuk (V1 + V3).
 *
 * NGL-style: brand mark at the top, a calm description, then the
 * form card. No form title, no topic, no subject. The form is the page.
 *
 * A reserved slot at the top of the card is left as a placeholder so
 * V3 (Claude / Arena Direct Mode) can drop in a premium illustration
 * without restructuring the page.
 *
 * The KakTaksaka component overlays everything and provides the
 * first-visit intro, tour, and chat. It does not own any data the
 * public form needs.
 */
import { AspirationForm } from "@/components/aspiration/AspirationForm";
import { KakTaksaka } from "@/components/kak-taksaka/KakTaksaka";
import { UnderwaterBackground } from "@/components/underwater/UnderwaterBackground";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <UnderwaterBackground />

      <div className={styles.center}>
        <header className={styles.brandHeader} data-tour="brand">
          <div className={styles.brand} aria-label="OSIS Ngobrol Yuk">
            <span className={styles.brandMark} aria-hidden="true">
              <svg viewBox="0 0 40 40" width="28" height="28">
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
              <span className={styles.brandSub}>Ngobrol Yuk</span>
              <span className={styles.brandByline}>oleh OSIS</span>
            </span>
          </div>
        </header>

        <section className={styles.card} aria-label="Formulir Aspirasi">
          {/* V3 illustration slot — kept clean and content-agnostic so a
              premium SVG can be dropped in later without touching the
              page structure. Today: a small wordmark. */}
          <div className={styles.illustrationSlot} aria-hidden="true">
            <span className={styles.placeholderLabel}>OSIS · Aspirasi</span>
          </div>

          <div data-tour="message-form">
            <AspirationForm />
          </div>
        </section>

        <footer className={styles.footer}>
          <span>Anonim · {new Date().getFullYear()}</span>
        </footer>
      </div>

      <KakTaksaka />
    </main>
  );
}
