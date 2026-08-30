"use client";

/**
 * Logout button.
 *
 * Calls /api/osama/logout to clear the Supabase session cookies,
 * then navigates to /osama. The dashboard layout's auth check will
 * also kick in on browser back, so the user cannot return to a
 * dashboard URL after logout.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./LogoutButton.module.css";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/osama/logout", { method: "POST" });
    } catch {
      // even if the request fails, we still navigate to /osama
    } finally {
      router.replace("/osama");
      router.refresh();
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.button}
      onClick={logout}
      disabled={busy}
      aria-label="Keluar dari panel"
    >
      {busy ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
          <path d="M13 5 L17.5 10 L13 15 M17.5 10 L7.5 10 M10 3 L4.5 3 C3.67 3 3 3.67 3 4.5 L3 15.5 C3 16.33 3.67 17 4.5 17 L10 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span>Keluar</span>
    </button>
  );
}
