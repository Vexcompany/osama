"use client";

/**
 * Step 1 form: email entry.
 *
 * On submit we POST to /api/osama/request-otp. The server does the
 * allowlist check before calling Supabase, so a random email gets
 * the same generic rejection as a non-allowlisted address.
 */
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import styles from "./LoginForm.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmed = email.trim();
    if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
      setError("Email tidak valid.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/osama/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        const retry =
          Number(data?.error?.retryAfterSeconds) ||
          Number(res.headers.get("Retry-After")) ||
          30;
        setError(`Terlalu banyak percobaan. Coba lagi dalam ${retry} detik.`);
        return;
      }

      if (res.ok) {
        // Pass the email to the verify step via the URL so the user
        // doesn't have to retype it. We deliberately do NOT use a
        // longer-lived query param trick; this is just a navigation.
        const params = new URLSearchParams({ email: trimmed });
        router.push(`/osama/verify?${params.toString()}`);
        return;
      }

      const data = await res.json().catch(() => null);
      setError(
        data?.error?.message ??
          "Tidak dapat mengirim kode. Coba lagi nanti.",
      );
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi internetmu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <label htmlFor="osama-email" className={styles.label}>
        Email
      </label>
      <input
        id="osama-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        className={styles.input}
        placeholder="nama@osis.example"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError(null);
        }}
        disabled={submitting}
        required
      />

      {error ? (
        <div className={styles.error} role="alert">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 6 L10 11 M10 14 L10 14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        className={styles.submit}
        disabled={submitting || email.trim().length === 0}
      >
        {submitting ? "Mengirim…" : "Lanjut"}
      </button>
    </form>
  );
}
