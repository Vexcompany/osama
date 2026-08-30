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
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 11 V8 C8 5.79 9.79 4 12 4 C14.21 4 16 5.79 16 8 V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>Masukkan Kode Verifikasi</h1>
            <p className={styles.sub}>
              Kode 6 digit telah dikirim ke emailmu. Masukkan kode untuk
              melanjutkan.
            </p>
          </div>
        </div>

        <VerifyForm email={email} />

        <div className={styles.notPublic}>
          <Link href="/osama" className={styles.backLink}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
              <path d="M16 10 L4 10 M8 5 L4 10 L8 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Ganti email
          </Link>
        </div>
      </div>
    </div>
  );
}
