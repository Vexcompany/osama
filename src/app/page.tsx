"use client";
/**
 * Public page — Osis Ngobrol Yuk (V6)
 *
 * Sections:
 *   - Fixed navbar
 *   - Hero section (full-viewport, deep-ocean composition)
 *   - Keunggulan section (feature highlights)
 *   - Aspiration form section
 *   - Rules & Notes section
 *   - Trust footer bar
 *
 * Kak Taksaka overlay stays untouched — read-only.
 */
import { AspirationForm } from "@/components/aspiration/AspirationForm";
import { KakTaksaka } from "@/components/kak-taksaka/KakTaksaka";
import { UnderwaterBackground } from "@/components/underwater/UnderwaterBackground";
import { Navbar } from "@/components/nav/Navbar";
import styles from "./page.module.css";

const FEATURES = [
  {
    title: "Aman & Anonim",
    desc: "Identitasmu terjaga sepenuhnya. Kamu bisa bersuara tanpa khawatir siapapun tahu.",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path d="M12 20.5 C12 20.5 5 16.5 5 11 V5.5 L12 3 L19 5.5 V11 C19 16.5 12 20.5 12 20.5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 11.5 L11 13.5 L15 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Langsung ke OSIS",
    desc: "Aspirasimu langsung diterima pengurus OSIS tanpa perantara yang tidak perlu.",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 L22 2 Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Untuk Perubahan",
    desc: "Setiap aspirasi dipertimbangkan berdasarkan urgensi, dampak, dan kelayakannya.",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path d="M12 3 L14.5 8.5 L20 9.2 L16 13 L17.1 18.6 L12 15.8 L6.9 18.6 L8 13 L4 9.2 L9.5 8.5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "100% Gratis",
    desc: "Tidak ada biaya apapun. Platform ini adalah program kerja OSIS untuk seluruh siswa.",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
        <path d="M20 11 V21 H4 V11 M22 6 H2 V11 H22 V6 Z M12 21 V11 M12 11 C12 11 9.5 7.5 6.5 7.5 C4.5 7.5 4 11 6.5 11 C9.5 11 12 11 12 11 C12 11 14.5 7.5 17.5 7.5 C19.5 7.5 20 11 17.5 11 C14.5 11 12 11 12 11 Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <main className={styles.main}>
      <UnderwaterBackground />

      {/* Navigation */}
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section id="hero" className={styles.hero} aria-label="Beranda">
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            OSIS Ngobrol Yuk · SMKN 5 Madiun
          </div>

          <h1 className={styles.heroTitle}>
            Suaramu Penting,
            <br />
            <span className={styles.heroAccent}>Bersama Kita Beraksi</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Sampaikan aspirasi, saran, dan masukanmu untuk membuat SMKN 5
            Madiun menjadi lebih baik.
          </p>

          <div className={styles.heroCtas}>
            <a
              href="#aspirasi"
              className={styles.ctaPrimary}
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#aspirasi")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M2 10 C2 5.58 5.58 2 10 2 C14.42 2 18 5.58 18 10 C18 14.42 14.42 18 10 18 C5.58 18 2 14.42 2 10 Z" stroke="currentColor" strokeWidth="1.6" />
                <path d="M7 10 L13 10 M10 7 L13 10 L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Kirim Aspirasi
            </a>
            <a
              href="#keunggulan"
              className={styles.ctaSecondary}
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#keunggulan")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Lihat Informasi
            </a>
          </div>

          {/* Trust badges */}
          <div className={styles.trustRow} aria-label="Keunggulan platform">
            <span className={styles.trustItem}>
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
                <path d="M10 2 L13 6 L18 7 L14 11 L15 16 L10 14 L5 16 L6 11 L2 7 L7 6 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
              </svg>
              Aman &amp; Anonim
            </span>
            <span className={styles.trustDivider} aria-hidden="true" />
            <span className={styles.trustItem}>
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
                <path d="M3 10 L17 10 M11 4 L17 10 L11 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Langsung ke OSIS
            </span>
            <span className={styles.trustDivider} aria-hidden="true" />
            <span className={styles.trustItem}>
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
                <path d="M10 2 L13 7 L18 8 L14 12.5 L15 18 L10 15.5 L5 18 L6 12.5 L2 8 L7 7 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              100% Gratis
            </span>
          </div>
        </div>

        {/* Scroll cue */}
        <span className={styles.scrollCue} aria-hidden="true">
          <span className={styles.scrollCueDot} />
        </span>
      </section>

      {/* ── Keunggulan ───────────────────────────────────────────────── */}
      <section id="keunggulan" className={styles.section} aria-label="Keunggulan">
        <div className={styles.sectionInner}>
          <div className={styles.sectionEyebrow}>Mengapa Osis Ngobrol Yuk?</div>
          <h2 className={styles.sectionTitle}>
            Platform Aspirasi yang Aman &amp; Tepat Sasaran
          </h2>
          <p className={styles.sectionDesc}>
            Dirancang khusus untuk siswa SMKN 5 Madiun agar setiap suara bisa
            didengar dan ditindaklanjuti oleh OSIS.
          </p>

          <div className={styles.keunggulanGrid}>
            {FEATURES.map((f, i) => (
              <article key={f.title} className={styles.keunggulanCard}>
                <div className={styles.keunggulanCardTop}>
                  <div className={styles.keunggulanIcon} aria-hidden="true">
                    {f.icon}
                  </div>
                  <span className={styles.keunggulanIndex} aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className={styles.keunggulanTitle}>{f.title}</h3>
                <p className={styles.keunggulanDesc}>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Aspiration form ──────────────────────────────────────────── */}
      <section id="aspirasi" className={styles.formSection} aria-label="Formulir Aspirasi">
        <div className={styles.formLayout}>
          {/* Left info column */}
          <div className={styles.formInfo} id="tentang">
            <div className={styles.formInfoEyebrow}>
              <svg viewBox="0 0 20 20" width="13" height="13" fill="none" aria-hidden="true">
                <path d="M10 2 L13 6 L18 7 L14 11 L15 16 L10 14 L5 16 L6 11 L2 7 L7 6 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
              </svg>
              Osis Ngobrol Yuk
            </div>
            <h2 className={styles.formInfoTitle}>Ruang Aspirasimu</h2>
            <p className={styles.formInfoDesc}>
              Sampaikan aspirasi, kritik, atau saranmu secara bebas dan
              bertanggung jawab. Setiap suara penting untuk membangun sekolah
              yang lebih baik bersama.
            </p>

            <ul className={styles.featureList} role="list">
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="12" height="12" fill="none">
                    <path d="M4 10 L8 14 L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Identitasmu terjaga sepenuhnya
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="12" height="12" fill="none">
                    <path d="M4 10 L8 14 L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Langsung diterima pengurus OSIS
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="12" height="12" fill="none">
                    <path d="M4 10 L8 14 L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Gratis tanpa biaya apapun
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="12" height="12" fill="none">
                    <path d="M4 10 L8 14 L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Dapat dikirim kapan saja
              </li>
            </ul>
          </div>

          {/* Form card */}
          <div
            className={styles.formCard}
            aria-label="Formulir kirim aspirasi"
            data-tour="message-form"
          >
            <div className={styles.formCardHeader}>
              <div className={styles.formCardIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                  <path d="M21 15 C21 15.5304 20.7893 16.0391 20.4142 16.4142 C20.0391 16.7893 19.5304 17 19 17 H7 L3 21 V5 C3 4.46957 3.21071 3.96086 3.58579 3.58579 C3.96086 3.21071 4.46957 3 5 3 H19 C19.5304 3 20.0391 3.21071 20.4142 3.58579 C20.7893 3.96086 21 4.46957 21 5 V15 Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <div>
                <h3 className={styles.formCardTitle}>Kirim Aspirasi</h3>
                <p className={styles.formCardSubtitle}>
                  Sampaikan aspirasimu secara bebas dan bertanggung jawab.
                </p>
              </div>
            </div>

            <AspirationForm />
          </div>
        </div>
      </section>

      {/* ── Rules & Notes ────────────────────────────────────────────── */}
      <section id="rules" className={styles.section} aria-label="Aturan dan Catatan">
        <div className={styles.sectionInner}>
          <div className={styles.sectionEyebrow}>Baca Sebelum Mengirim</div>
          <h2 className={styles.sectionTitle}>Rules &amp; Notes</h2>
          <p className={styles.sectionDesc}>
            Osis Ngobrol Yuk adalah ruang aspirasi yang aman dan bertanggung
            jawab. Harap perhatikan aturan berikut.
          </p>

          <div className={styles.rulesGrid}>
            {/* Rules card */}
            <div className={styles.rulesCard}>
              <div className={styles.rulesCardHeader}>
                <div className={styles.rulesCardIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    <path d="M8 9 H16 M8 13 H16 M8 17 H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className={styles.rulesCardTitle}>Rules</h3>
              </div>
              <ol className={styles.rulesList}>
                <li>Osis Ngobrol Yuk! adalah program kerja OSIS untuk menampung aspirasi siswa siswi SMKN 5 Madiun secara digital.</li>
                <li>Gunakan Bahasa yang Sopan &amp; Santun saat akan menyampaikan aspirasi.</li>
                <li>Dilarang menyebut nama siswa/guru secara langsung dalam konteks negatif.</li>
                <li>Pastikan informasi/masukan yang disampaikan benar dan bisa dipertanggungjawabkan.</li>
                <li>Aspirasi sebaiknya berdasarkan pengalaman sendiri atau yang benar-benar terjadi di lingkungan sekolah.</li>
                <li>Dilarang membagikan data pribadi (nomor HP, alamat, dll).</li>
                <li>Boleh tidak mencantumkan nama, tapi tetap harus jujur dan tidak menyalahgunakan anonimitas.</li>
                <li>Hindari penggunaan huruf kapital berlebihan, tanda seru berulang (!!!), atau kata-kata emosional.</li>
              </ol>
            </div>

            {/* Notes card */}
            <div className={styles.rulesCard}>
              <div className={styles.rulesCardHeader}>
                <div className={styles.rulesCardIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path d="M12 20.5 C12 20.5 5 16.5 5 11 V5.5 L12 3 L19 5.5 V11 C19 16.5 12 20.5 12 20.5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M12 8.5 L12 12 M12 15 L12 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className={styles.rulesCardTitle}>Notes</h3>
              </div>
              <ol className={styles.rulesList}>
                <li>OSIS berhak menyaring semua saran, masukan, dan aspirasi yang masuk.</li>
                <li>Aspirasi yang melanggar aturan tidak akan diproses atau dipublikasikan.</li>
                <li>
                  OSIS berhak menentukan aspirasi mana yang diprioritaskan berdasarkan:
                  <ul className={styles.rulesSubList}>
                    <li>Tingkat urgensi</li>
                    <li>Dampak bagi siswa</li>
                    <li>Kelayakan untuk direalisasikan</li>
                  </ul>
                </li>
                <li>
                  OSIS berhak tidak menindaklanjuti aspirasi yang:
                  <ul className={styles.rulesSubList}>
                    <li>Tidak relevan</li>
                    <li>Tidak memiliki solusi</li>
                    <li>Tidak realistis untuk dilaksanakan</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust footer bar ─────────────────────────────────────────── */}
      <footer className={styles.trustBar} aria-label="Keunggulan Osis Ngobrol Yuk">
        <div className={styles.trustBarInner}>
          <div className={styles.trustBarItem}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
              <path d="M12 20.5 C12 20.5 5 16.5 5 11 V5.5 L12 3 L19 5.5 V11 C19 16.5 12 20.5 12 20.5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <div>
              <strong>Aman &amp; Anonim</strong>
              <span>Identitas kamu terjaga</span>
            </div>
          </div>
          <div className={styles.trustBarItem}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
              <path d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 L22 2 Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <strong>Langsung ke OSIS</strong>
              <span>Aspirasi sampai ke kami</span>
            </div>
          </div>
          <div className={styles.trustBarItem}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
              <path d="M12 3 L14.5 8.5 L20 9.2 L16 13 L17.1 18.6 L12 15.8 L6.9 18.6 L8 13 L4 9.2 L9.5 8.5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <div>
              <strong>Untuk Perubahan</strong>
              <span>Bersama membangun sekolah</span>
            </div>
          </div>
          <div className={styles.trustBarItem}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
              <path d="M20 11 V21 H4 V11 M22 6 H2 V11 H22 V6 Z M12 21 V11 M12 11 C12 11 9.5 7.5 6.5 7.5 C4.5 7.5 4 11 6.5 11 C9.5 11 12 11 12 11 C12 11 14.5 7.5 17.5 7.5 C19.5 7.5 20 11 17.5 11 C14.5 11 12 11 12 11 Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <strong>100% Gratis</strong>
              <span>Tanpa biaya apapun</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Kak Taksaka overlay — READ ONLY, do not modify */}
      <KakTaksaka />
    </main>
  );
}
