"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./dashboard.module.css";

export function Subnav() {
  const pathname = usePathname();
  const isDashboardRoot = pathname === "/osama/dashboard";

  return (
    <nav className={styles.subnav} aria-label="Navigasi panel">
      <Link
        href="/osama/dashboard"
        className={styles.subnavLink}
        data-active={isDashboardRoot ? "true" : undefined}
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <rect x="10.5" y="3" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <rect x="3" y="10.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        Ringkasan
      </Link>
    </nav>
  );
}
