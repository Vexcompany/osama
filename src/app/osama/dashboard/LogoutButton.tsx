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
    >
      {busy ? "…" : "Keluar"}
    </button>
  );
}
