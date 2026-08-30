/**
 * 404 page. Kept minimal and on-brand so the visual identity never
 * breaks even on edge cases.
 */
import Link from "next/link";

import { UnderwaterBackground } from "@/components/underwater/UnderwaterBackground";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.main}>
      <UnderwaterBackground />
      <div className={styles.inner}>
        <div className={styles.code} aria-hidden="true">
          404
        </div>
        <div className={styles.rule} aria-hidden="true" />
        <p className={styles.desc}>Halaman yang kamu cari tidak ada.</p>
        <Link href="/" className={styles.link}>
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
            <path d="M3 10 L9 4 M3 10 L9 16 M4.5 10 H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Kembali ke form
        </Link>
      </div>
    </main>
  );
}
