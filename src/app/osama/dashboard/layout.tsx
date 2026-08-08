/**
 * Protected OSAMA dashboard layout.
 *
 * This is the real security boundary. EVERY request to ANY route
 * under /osama/dashboard/* runs through this layout's auth check
 * before any page renders. If the user is not authenticated AND on
 * the allowlist, they are redirected to /osama — they never see
 * dashboard content, not even for a flash.
 *
 * Per the brief: access control is at the server/auth layer, not
 * just UI.
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import { assertOsamaAccess } from "@/lib/auth/supabase-server";

import { LogoutButton } from "./LogoutButton";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await assertOsamaAccess();
  if (!user) redirect("/osama");

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandSub}>OSAMA Panel</span>
        </div>
        <div className={styles.userBlock}>
          <span className={styles.userEmail} title={user.email ?? ""}>
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      <nav className={styles.subnav}>
        <Link href="/osama/dashboard" className={styles.subnavLink}>
          Ringkasan
        </Link>
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
