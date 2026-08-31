/** Protected OSAMA dashboard layout. */
import { redirect } from 'next/navigation';
import { assertOsamaAccess } from '@/lib/auth/supabase-server';
import { Subnav } from './Subnav';
import LogoutButton from './LogoutButton';
import styles from './dashboard.module.css';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await assertOsamaAccess();
  if (!user) redirect('/osama');

  const email = user.email ?? 'pengurus';

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={`${styles.container} ${styles.topbarInner}`}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                <path d="M12 3 C7 8 7 12 12 15.5 C17 12 17 8 12 3 Z" fill="rgba(255,255,255,0.95)" />
                <path d="M12 8.5 C9.5 11 9.5 13.5 12 16 C14.5 13.5 14.5 11 12 8.5 Z" fill="#0b4d68" />
              </svg>
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandSub}>OSAMA Panel</span>
              <span className={styles.brandTag}>Osis Ngobrol Yuk</span>
            </span>
          </div>

          <div className={styles.userBlock}>
            <span className={styles.userChip} title={email}>
              <span className={styles.userAvatar} aria-hidden="true">👤</span>
              <span className={styles.userEmail}>{email}</span>
              <span className={styles.userRole}>Pengurus</span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className={styles.container}><Subnav /></div>
      <main className={`${styles.container} ${styles.main}`}>{children}</main>
    </div>
  );
}
