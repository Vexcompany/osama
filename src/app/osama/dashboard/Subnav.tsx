"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./dashboard.module.css";

export function Subnav() {
  const pathname = usePathname();
  const isDashboardRoot = pathname === "/osama/dashboard";

  return (
    <nav className={styles.subnav}>
      <Link
        href="/osama/dashboard"
        className={styles.subnavLink}
        data-active={isDashboardRoot ? "true" : undefined}
      >
        Ringkasan
      </Link>
    </nav>
  );
}
