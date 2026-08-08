/**
 * OSAMA login — Step 2: OTP entry.
 *
 * The user is expected to arrive here from /osama with `?email=...`
 * in the URL. The verify form does the actual OTP submission.
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import { assertOsamaAccess } from "@/lib/auth/supabase-server";

import { VerifyForm } from "./VerifyForm";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function OsamaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  // If already signed in, jump straight to the dashboard.
  const user = await assertOsamaAccess();
  if (user) redirect("/osama/dashboard");

  const params = await searchParams;
  const email = (params.email ?? "").trim();
  if (!email) {
    redirect("/osama");
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.brand}>
        <span className={styles.brandSub}>OSAMA Panel</span>
        <span className={styles.brandByline}>oleh OSIS · internal</span>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>Masukkan Kode Verifikasi</h1>
        <p className={styles.sub}>
          Kode 6 digit telah dikirim ke emailmu. Masukkan kode untuk
          melanjutkan.
        </p>

        <VerifyForm email={email} />

        <div className={styles.notPublic}>
          <Link href="/osama" className={styles.backLink}>
            ← Ganti email
          </Link>
        </div>
      </div>
    </div>
  );
}
