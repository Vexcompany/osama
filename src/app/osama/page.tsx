/**
 * OSAMA login — Step 1: email entry.
 *
 * If the visitor is already authenticated, we forward them straight
 * to the dashboard. Otherwise we render the email form.
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import { assertOsamaAccess } from "@/lib/auth/supabase-server";
import { isAllowlistConfigured } from "@/lib/auth/allowlist";

import { LoginForm } from "./LoginForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function OsamaLoginPage() {
  // If already signed in, skip the login screen.
  const user = await assertOsamaAccess();
  if (user) redirect("/osama/dashboard");

  const allowlistOk = isAllowlistConfigured();

  return (
    <div className={styles.wrap}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path
              d="M12 3 C7 8 7 12 12 15.5 C17 12 17 8 12 3 Z"
              fill="rgba(255,255,255,0.95)"
            />
            <path
              d="M12 8.5 C9.5 11 9.5 13.5 12 16 C14.5 13.5 14.5 11 12 8.5 Z"
              fill="#0b4d68"
            />
          </svg>
        </span>
        <span className={styles.brandSub}>OSAMA Panel</span>
        <span className={styles.brandByline}>oleh OSIS · internal</span>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
              <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 10 V7.5 C8 5.57 9.79 4 12 4 C14.21 4 16 5.57 16 7.5 V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>Masuk Panel</h1>
            <p className={styles.sub}>
              Masukkan email pengurus OSIS yang terdaftar. Kami akan mengirim
              kode verifikasi ke emailmu.
            </p>
          </div>
        </div>

        {!allowlistOk ? (
          <div className={styles.configError} role="alert">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6 L10 11 M10 14 L10 14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span>Panel belum dikonfigurasi. Hubungi administrator.</span>
          </div>
        ) : (
          <LoginForm />
        )}

        <div className={styles.notPublic}>
          <p>
            Panel ini hanya untuk pengurus OSIS. Tidak ada pendaftaran publik.
          </p>
          <Link href="/" className={styles.backLink}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
              <path d="M16 10 L4 10 M8 5 L4 10 L8 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Kembali ke halaman aspirasi
          </Link>
        </div>
      </div>
    </div>
  );
}
