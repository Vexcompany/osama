"use client";

/**
 * OTP entry form.
 *
 * The OTP itself is sent via Supabase Auth, so we don't store or
 * return it anywhere. We just hand it to the server route, which
 * calls verifyOtp and sets the session cookie.
 */
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import styles from "./VerifyForm.module.css";

export function VerifyForm({ email }: { email: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmed = code.trim();
    if (!/^\d{6,8}$/.test(trimmed)) {
      setError("Kode verifikasi tidak valid.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/osama/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: trimmed }),
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
        // Use replace so the back button doesn't return to the OTP form.
        router.replace("/osama/dashboard");
        return;
      }

      const data = await res.json().catch(() => null);
      setError(
        data?.error?.message ?? "Kode verifikasi tidak valid.",
      );
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi internetmu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <label htmlFor="osama-otp" className={styles.label}>
        Kode Verifikasi
      </label>
      <input
        id="osama-otp"
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6,8}"
        maxLength={8}
        className={styles.input}
        placeholder="000000"
        value={code}
        onChange={(e) => {
          // Strip non-digits so users on mobile who paste/type with
          // spaces get a clean value.
          const next = e.target.value.replace(/\D/g, "");
          setCode(next);
          if (error) setError(null);
        }}
        disabled={submitting}
        autoFocus
        required
      />

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className={styles.submit}
        disabled={submitting || code.length < 6}
      >
        {submitting ? "Memverifikasi…" : "Verifikasi"}
      </button>
    </form>
  );
}
