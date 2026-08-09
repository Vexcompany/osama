"use client";

/**
 * AspirationForm (V1 UI revision)
 *
 * NGL-style: one textarea, a counter, and a send button. Nothing else.
 *
 * The user types a message, sees a live counter, and taps "Kirim".
 * Anonymity is the default and only mode — there is no toggle in the UI.
 * The form auto-grows up to a sensible max height; no layout jump.
 */
import { useId, useState, useTransition, type FormEvent } from "react";

import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { SuccessState } from "./SuccessState";
import {
  aspirationSchema,
  MESSAGE_MAX,
  type FieldErrors,
} from "@/lib/validation/aspiration";
import styles from "./AspirationForm.module.css";

type Phase = "idle" | "submitting" | "success" | "error";

const HONEYPOT_NAME =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_HONEYPOT_FIELD_NAME ?? "website_url")
    : "website_url";

export function AspirationForm() {
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [lastCaseId, setLastCaseId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const messageId = useId();
  const honeyId = useId();

  function resetForm() {
    setMessage("");
    setHoneypot("");
    setFieldErrors({});
    setFormError(null);
    setLastCaseId(null);
    setPhase("idle");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === "submitting") return;

    setFieldErrors({});
    setFormError(null);

    // Client-side validation first for instant feedback.
    const parsed = aspirationSchema.safeParse({ message });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "message" && !errs.message) {
          errs.message = issue.message;
        }
      }
      setFieldErrors(errs);
      return;
    }

    setPhase("submitting");

    const payload = {
      message: parsed.data.message,
      [HONEYPOT_NAME]: honeypot,
    };

    interface SubmitResult {
      ok: boolean;
      caseId?: string;
      fieldErrors?: FieldErrors;
      formError?: string;
    }

    const result: SubmitResult = await new Promise((resolve) => {
      startTransition(async () => {
        try {
          const res = await fetch("/api/aspirations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.status === 429) {
            const data = await res.json().catch(() => null);
            const retry =
              Number(data?.error?.retryAfterSeconds) ||
              Number(res.headers.get("Retry-After")) ||
              30;
            resolve({
              ok: false,
              formError: `Terlalu banyak permintaan. Coba lagi dalam ${retry} detik.`,
            });
            return;
          }

          if (res.status === 201) {
            const data = (await res.json().catch(() => null)) as
              | { ok: true; caseId?: string }
              | null;
            resolve({ ok: true, caseId: data?.caseId });
            return;
          }

          if (res.status === 400) {
            const data = await res.json().catch(() => null);
            if (data?.error?.kind === "spam") {
              resolve({ ok: false, formError: "Permintaan ditolak." });
              return;
            }
            resolve({ ok: false, fieldErrors: data?.error?.fieldErrors ?? {} });
            return;
          }

          resolve({ ok: false, formError: "Gagal mengirim. Coba lagi sebentar." });
        } catch {
          resolve({ ok: false, formError: "Tidak dapat terhubung. Periksa koneksi internetmu." });
        }
      });
    });

    if (result.ok) {
      setLastCaseId(result.caseId ?? null);
      setPhase("success");
      return;
    }

    if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    if (result.formError) setFormError(result.formError);
    setPhase("error");
  }

  if (phase === "success") {
    return <SuccessState caseId={lastCaseId} onAgain={resetForm} />;
  }

  const messageLeft = MESSAGE_MAX - message.length;
  const disabled = phase === "submitting" || isPending;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* Honeypot: visually hidden, but assistive tech will skip it because
          we set aria-hidden + tabIndex=-1. Real users will not fill it. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={honeyId}>{HONEYPOT_NAME}</label>
        <input
          id={honeyId}
          type="text"
          name={HONEYPOT_NAME}
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <AutoGrowTextarea
        id={messageId}
        name="message"
        className={`${styles.textarea} ${fieldErrors.message ? styles.inputError : ""}`}
        placeholder="Tulis pesanmu di sini..."
        maxLength={MESSAGE_MAX}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          if (fieldErrors.message) {
            setFieldErrors((f) => ({ ...f, message: undefined }));
          }
        }}
        disabled={disabled}
        aria-invalid={Boolean(fieldErrors.message)}
        aria-describedby={
          fieldErrors.message ? `${messageId}-err` : `${messageId}-count`
        }
      />

      <div className={styles.metaRow}>
        {fieldErrors.message ? (
          <span id={`${messageId}-err`} className={styles.errorText} role="alert">
            {fieldErrors.message}
          </span>
        ) : (
          <span className={styles.spacer} aria-hidden="true" />
        )}
        <span
          id={`${messageId}-count`}
          className={`${styles.counter} ${messageLeft <= 30 ? styles.counterWarn : ""}`}
          aria-live="polite"
        >
          {message.length}/{MESSAGE_MAX}
        </span>
      </div>

      {formError ? (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        className={styles.submit}
        disabled={disabled || message.trim().length === 0}
        aria-busy={disabled}
        data-tour="submit-button"
      >
        {disabled ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span>Mengirim…</span>
          </>
        ) : (
          <span>Kirim</span>
        )}
      </button>
    </form>
  );
}
