"use client";
/**
 * Public page — Osis Ngobrol Yuk (V5 — Rules, Notes & Keunggulan)
 *
 * Sections:
 *   - Fixed navbar (glass pill) — now with Keunggulan + Tentang OSIS
 *   - Hero section (full-viewport, underwater composition)
 *   - Keunggulan section (feature highlights)
 *   - Aspiration form section (glass panel)
 *   - Rules & Notes section (from OSIS Ngobrol Yuk reference)
 *   - Trust footer bar
 *
 * Kak Taksaka overlay stays untouched — read-only.
 */
import { AspirationForm } from "@/components/aspiration/AspirationForm";
import { KakTaksaka } from "@/components/kak-taksaka/KakTaksaka";
import { UnderwaterBackground } from "@/components/underwater/UnderwaterBackground";
import { CanvasAspirationAdmin } from "@/components/aspiration/CanvasAspirationAdmin";
import { Navbar } from "@/components/nav/Navbar";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <UnderwaterBackground />

      {/* Navigation */}
      <Navbar />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section id="hero" className={styles.hero} aria-label="Beranda">
        {/* CSS light rays */}
        <div className={styles.lightRays} aria-hidden="true">
          <div className={styles.ray} />
          <div className={styles.ray} />
          <div className={styles.ray} />
          <div className={styles.ray} />
          <div className={styles.ray} />
        </div>

        {/* Seaweed decorations */}
        <div className={styles.seaweedLeft} aria-hidden="true">
          <svg viewBox="0 0 60 200" width="60" height="200" fill="none">
            <path d="M30 200 C 20 170, 40 145, 25 120 C 10 95, 35 70, 20 45 C 10 25, 30 10, 30 0"
              stroke="#0d4a35" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M30 160 C 45 155, 50 140, 42 130" stroke="#0d4a35" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M25 110 C 8 105, 5 90, 12 80" stroke="#0d5840" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M22 65 C 38 60, 42 48, 35 40" stroke="#0d4a35" strokeWidth="4" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div className={styles.seaweedRight} aria-hidden="true">
          <svg viewBox="0 0 60 240" width="50" height="220" fill="none">
            <path d="M30 240 C 40 210, 18 185, 35 155 C 50 125, 22 100, 38 70 C 48 48, 28 22, 30 0"
              stroke="#0a4030" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M33 195 C 14 188, 10 172, 18 162" stroke="#0a4030" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M36 130 C 54 122, 56 108, 46 98" stroke="#0d5840" strokeWidth="4" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* Coral decorations */}
        <div className={styles.coralLeft} aria-hidden="true">
          <svg viewBox="0 0 120 90" width="120" height="90" fill="none">
            <ellipse cx="60" cy="80" rx="55" ry="10" fill="#071e28" opacity="0.5" />
            <path d="M30 70 C 30 50, 20 35, 25 20 C 28 10, 35 8, 38 20 C 40 30, 30 45, 32 55"
              stroke="#7a1f3c" strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="25" cy="18" r="7" fill="#a02a50" />
            <path d="M60 70 C 60 45, 50 28, 55 12 C 58 4, 65 2, 68 12 C 70 24, 60 42, 62 55"
              stroke="#5c1230" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="55" cy="10" r="8" fill="#8c1a40" />
            <circle cx="68" cy="8" r="6" fill="#c03060" />
            <path d="M90 70 C 90 52, 82 38, 86 25 C 89 16, 96 14, 98 24 C 100 35, 90 50, 92 62"
              stroke="#3a0e22" strokeWidth="5" strokeLinecap="round" fill="none" />
            <circle cx="86" cy="23" r="6" fill="#7a1a38" />
          </svg>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.badge} aria-label="SMKN 5 Madiun">
            <span className={styles.badgeDot} aria-hidden="true" />
            SMKN 5 MADIUN
          </div>

          <h1 className={styles.heroTitle}>
            Suaramu Berarti,
            <br />
            <span className={styles.heroAccent}>Bersama Kita Beraksi</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Sampaikan aspirasi, kritik, atau saranmu untuk
            <br className={styles.heroBreak} />
            membangun sekolah yang lebih baik.
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
                <path d="M2 10 C2 5.58 5.58 2 10 2 C14.42 2 18 5.58 18 10 C18 14.42 14.42 18 10 18 C5.58 18 2 14.42 2 10Z"
                  stroke="currentColor" strokeWidth="1.6" />
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
          <div className={styles.trustBadges} aria-label="Keunggulan platform">
            <div className={styles.trustBadge}>
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M10 2 L13 6 L18 7 L14 11 L15 16 L10 14 L5 16 L6 11 L2 7 L7 6 Z"
                  stroke="#8de4ff" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
              </svg>
              <span>Aman &amp; Anonim</span>
            </div>
            <div className={styles.trustDivider} aria-hidden="true" />
            <div className={styles.trustBadge}>
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M3 10 L17 10 M11 4 L17 10 L11 16" stroke="#8de4ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Langsung ke OSIS</span>
            </div>
            <div className={styles.trustDivider} aria-hidden="true" />
            <div className={styles.trustBadge}>
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M10 2 L13 7 L18 8 L14 12.5 L15 18 L10 15.5 L5 18 L6 12.5 L2 8 L7 7 Z"
                  fill="none" stroke="#8de4ff" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <span>100% Gratis</span>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className={styles.scrollCue} aria-hidden="true">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
            <path d="M5 7 L10 13 L15 7" stroke="rgba(140,220,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── Keunggulan Section ──────────────────────────────────────────── */}
      <section id="keunggulan" className={styles.keunggulanSection} aria-label="Keunggulan">
        <div className={styles.sectionGlow} aria-hidden="true" />
        <div className={styles.keunggulanInner}>
          <div className={styles.sectionLabel}>Mengapa Osis Ngobrol Yuk?</div>
          <h2 className={styles.sectionTitle}>Platform Aspirasi yang Aman &amp; Tepat Sasaran</h2>
          <p className={styles.sectionDesc}>
            Dirancang khusus untuk siswa SMKN 5 Madiun agar setiap suara bisa didengar dan ditindaklanjuti oleh OSIS.
          </p>
          <div className={styles.keunggulanGrid}>
            <div className={styles.keunggulanCard}>
              <div className={styles.keunggulanIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <path d="M12 22 C12 22 3 17 3 11 V5 L12 2 L21 5 V11 C21 17 12 22 12 22 Z"
                    stroke="#8de4ff" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                  <path d="M9 12 L11 14 L15 10" stroke="#8de4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className={styles.keunggulanTitle}>Aman &amp; Anonim</h3>
              <p className={styles.keunggulanDesc}>Identitasmu terjaga sepenuhnya. Kamu bisa bersuara tanpa khawatir siapapun tahu.</p>
            </div>
            <div className={styles.keunggulanCard}>
              <div className={styles.keunggulanIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <path d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 L22 2 Z"
                    stroke="#8de4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <h3 className={styles.keunggulanTitle}>Langsung ke OSIS</h3>
              <p className={styles.keunggulanDesc}>Aspirasimu langsung diterima pengurus OSIS tanpa perantara yang tidak perlu.</p>
            </div>
            <div className={styles.keunggulanCard}>
              <div className={styles.keunggulanIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    stroke="#8de4ff" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <h3 className={styles.keunggulanTitle}>Untuk Perubahan</h3>
              <p className={styles.keunggulanDesc}>Setiap aspirasi dipertimbangkan berdasarkan urgensi, dampak, dan kelayakannya.</p>
            </div>
            <div className={styles.keunggulanCard}>
              <div className={styles.keunggulanIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <path d="M20 12 V22 H4 V12 M22 7 H2 V12 H22 V7 Z M12 22 V7 M12 7 C12 7 9 3 6 3 C3 3 3 7 6 7 C9 7 12 7 12 7 C12 7 15 3 18 3 C21 3 21 7 18 7 C15 7 12 7 12 7 Z"
                    stroke="#8de4ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <h3 className={styles.keunggulanTitle}>100% Gratis</h3>
              <p className={styles.keunggulanDesc}>Tidak ada biaya apapun. Platform ini adalah program kerja OSIS untuk seluruh siswa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Aspiration Form Section ─────────────────────────────────────── */}
      <section id="aspirasi" className={styles.formSection} aria-label="Formulir Aspirasi">
        {/* Background glow */}
        <div className={styles.formGlow} aria-hidden="true" />

        {/* Decorative coral bottom */}
        <div className={styles.coralBottom} aria-hidden="true">
          <svg viewBox="0 0 300 80" width="300" height="80" fill="none">
            <path d="M20 80 C 20 55, 10 40, 14 25 C 17 15, 24 12, 26 22 C 28 34, 18 50, 20 65"
              stroke="#3a0e22" strokeWidth="5" strokeLinecap="round" />
            <circle cx="14" cy="23" r="6" fill="#5a1230" />
            <path d="M80 80 C 80 52, 68 35, 72 18 C 75 8, 83 6, 86 16 C 89 28, 78 46, 80 62"
              stroke="#4a1228" strokeWidth="6" strokeLinecap="round" />
            <circle cx="72" cy="16" r="8" fill="#7a1840" />
            <circle cx="86" cy="14" r="6" fill="#601030" />
            <path d="M150 80 C 150 58, 140 42, 144 28 C 147 18, 154 16, 156 26 C 158 38, 148 54, 150 68"
              stroke="#2a0a18" strokeWidth="4" strokeLinecap="round" />
            <circle cx="144" cy="26" r="5" fill="#481028" />
            <path d="M220 80 C 220 55, 210 38, 214 22 C 217 12, 225 10, 228 20 C 230 32, 220 48, 222 64"
              stroke="#3e1020" strokeWidth="5" strokeLinecap="round" />
            <circle cx="214" cy="20" r="7" fill="#661636" />
            <path d="M280 80 C 280 60, 270 45, 274 30 C 277 20, 284 18, 286 28 C 288 38, 278 54, 280 68"
              stroke="#2c0c1a" strokeWidth="4" strokeLinecap="round" />
            <circle cx="274" cy="28" r="5" fill="#501228" />
          </svg>
        </div>

        <div className={styles.formLayout}>
          {/* Left info column */}
          <div className={styles.formInfo} id="tentang">
            <div className={styles.formInfoBadge}>Osis Ngobrol Yuk</div>
            <h2 className={styles.formInfoTitle}>
              Ruang Aspirasimu
            </h2>
            <p className={styles.formInfoDesc}>
              Sampaikan aspirasi, kritik, atau saranmu secara bebas dan bertanggung jawab.
              Setiap suara penting untuk membangun sekolah yang lebih baik bersama.
            </p>

            <ul className={styles.featureList} role="list">
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                    <path d="M4 10 L8 14 L16 6" stroke="#8de4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Identitasmu terjaga sepenuhnya
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                    <path d="M4 10 L8 14 L16 6" stroke="#8de4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Langsung diterima pengurus OSIS
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                    <path d="M4 10 L8 14 L16 6" stroke="#8de4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Gratis tanpa biaya apapun
              </li>
              <li className={styles.featureItem}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                    <path d="M4 10 L8 14 L16 6" stroke="#8de4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Dapat dikirim kapan saja
              </li>
            </ul>
          </div>

          {/* Form card */}
          <div className={styles.formCard} aria-label="Formulir kirim aspirasi" data-tour="message-form">
            <div className={styles.formCardHeader}>
              <div className={styles.formCardIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                  <path d="M21 15 C21 15.5304 20.7893 16.0391 20.4142 16.4142 C20.0391 16.7893 19.5304 17 19 17 H7 L3 21 V5 C3 4.46957 3.21071 3.96086 3.58579 3.58579 C3.96086 3.21071 4.46957 3 5 3 H19 C19.5304 3 20.0391 3.21071 20.4142 3.58579 C20.7893 3.96086 21 4.46957 21 5 V15 Z"
                    stroke="#8de4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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

      {/* ── Canvas Story Generator (V3.1) ───────────────────────────────── */}
      <section
        id="canvas-story"
        className={styles.canvasSection}
        aria-label="Canvas Story Generator"
      >
        <div className={styles.canvasGlow} aria-hidden="true" />
        <div className={styles.canvasInner}>
          <div className={styles.sectionLabel}>Story Generator</div>
          <h2 className={styles.sectionTitle}>Canvas Aspirasi &amp; Balasan Admin</h2>
          <p className={styles.sectionDesc}>
            Lihat hasil Story Generator yang mengikuti template underwater,
            dengan form Balasan Admin di area dekat kura-kura.
            Teks Case ID dan pesan disusun sebaris dengan label di template,
            baseline disejajarkan dengan grid kertas. Admin bisa membalas
            di kolom Balasan Admin dan mengunduh hasilnya sebagai gambar.
          </p>
          <div className={styles.canvasCard}>
            <CanvasAspirationAdmin
              caseId="OSM-56PYOW2-SBTQ8M"
              message="Pagaska music bagus dan mantap sekali, mohon untuk terus ditingkatkan ke depannya agar OSIS semakin jaya!"
              initialAdminReply="Terima kasih atas aspirasinya! Kami akan segera menindaklanjuti hal ini."
            />
          </div>
        </div>
      </section>

      {/* ── Rules & Notes Section ───────────────────────────────────────── */}
      <section id="rules" className={styles.rulesSection} aria-label="Aturan dan Catatan">
        <div className={styles.rulesGlow} aria-hidden="true" />
        <div className={styles.rulesInner}>
          <div className={styles.sectionLabel}>Baca Sebelum Mengirim</div>
          <h2 className={styles.sectionTitle}>Rules &amp; Notes</h2>
          <p className={styles.sectionDesc}>
            Osis Ngobrol Yuk adalah ruang aspirasi yang aman dan bertanggung jawab. Harap perhatikan aturan berikut.
          </p>

          <div className={styles.rulesGrid}>
            {/* Rules card */}
            <div className={styles.rulesCard}>
              <div className={styles.rulesCardHeader}>
                <div className={styles.rulesCardIconWrap} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#8de4ff" strokeWidth="1.8" fill="none" />
                    <path d="M8 9 H16 M8 13 H16 M8 17 H12" stroke="#8de4ff" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className={styles.rulesCardTitle}>Rules!!!</h3>
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
                <div className={styles.rulesCardIconWrap} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path d="M12 22 C12 22 3 17 3 11 V5 L12 2 L21 5 V11 C21 17 12 22 12 22 Z"
                      stroke="#8de4ff" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                    <path d="M12 8 L12 12 M12 16 L12 16.5" stroke="#8de4ff" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className={styles.rulesCardTitle}>Notes!</h3>
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

      {/* ── Trust Footer Bar ────────────────────────────────────────────── */}
      <footer className={styles.trustBar} aria-label="Keunggulan Osis Ngobrol Yuk">
        <div className={styles.trustBarInner}>
          <div className={styles.trustBarItem}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M12 22 C12 22 3 17 3 11 V5 L12 2 L21 5 V11 C21 17 12 22 12 22 Z"
                stroke="#8de4ff" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
            </svg>
            <div>
              <strong>Aman &amp; Anonim</strong>
              <span>Identitas kamu terjaga</span>
            </div>
          </div>
          <div className={styles.trustBarItem}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 L22 2 Z"
                stroke="#8de4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <div>
              <strong>Langsung ke OSIS</strong>
              <span>Aspirasi sampai ke kami</span>
            </div>
          </div>
          <div className={styles.trustBarItem}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                stroke="#8de4ff" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
            </svg>
            <div>
              <strong>Untuk Perubahan</strong>
              <span>Bersama membangun sekolah</span>
            </div>
          </div>
          <div className={styles.trustBarItem}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M20 12 V22 H4 V12 M22 7 H2 V12 H22 V7 Z M12 22 V7 M12 7 C12 7 9 3 6 3 C3 3 3 7 6 7 C9 7 12 7 12 7 C12 7 15 3 18 3 C21 3 21 7 18 7 C15 7 12 7 12 7 Z"
                stroke="#8de4ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
