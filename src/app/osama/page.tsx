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
        <span className={styles.brandSub}>OSAMA Panel</span>
        <span className={styles.brandByline}>oleh OSIS · internal</span>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>Masuk Panel</h1>
        <p className={styles.sub}>
          Masukkan email pengurus OSIS yang terdaftar. Kami akan mengirim
          kode verifikasi ke emailmu.
        </p>

        {!allowlistOk ? (
          <div className={styles.configError} role="alert">
            Panel belum dikonfigurasi. Hubungi administrator.
          </div>
        ) : (
          <LoginForm />
        )}

        <div className={styles.notPublic}>
          <p>
            Panel ini hanya untuk pengurus OSIS. Tidak ada pendaftaran
            publik.
          </p>
          <Link href="/" className={styles.backLink}>
            ← Kembali ke halaman aspirasi
          </Link>
        </div>
      </div>
    </div>
  );
}
