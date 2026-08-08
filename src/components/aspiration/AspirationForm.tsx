"use client";

/**
 * AspirationForm
 *
 * The only interactive surface on the public page. Submits to
 *   POST /api/aspirations
 * and shows a calm success state on 2xx. Never shows the case id.
 *
 * UX constraints honored:
 *   - Mobile-first, single column.
 *   - Textarea auto-grows; never absurdly tall.
 *   - Character counter for topic and message.
 *   - "Kirim sebagai anonim" toggle, default ON.
 *   - Client + server validation (same zod schema on both sides).
 *   - Errors render in-place; no alerts, no layout jump.
 *   - Reduced-motion friendly.
 */
import { useId, useState, useTransition, type FormEvent } from "react";

import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { SuccessState } from "./SuccessState";
import {
  aspirationSchema,
  MESSAGE_MAX,
  TOPIC_MAX,
  type FieldErrors,
} from "@/lib/validation/aspiration";
import styles from "./AspirationForm.module.css";

type Phase = "idle" | "submitting" | "success" | "error";

interface SubmitResult {
  ok: boolean;
  fieldErrors?: FieldErrors;
  formError?: string;
  rateLimitedSeconds?: number;
}

const HONEYPOT_NAME =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_HONEYPOT_FIELD_NAME ?? "website_url")
    : "website_url";

export function AspirationForm() {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [honeypot, setHoneypot] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const topicId = useId();
  const messageId = useId();
  const anonId = useId();
  const honeyId = useId();

  function resetForm() {
    setTopic("");
    setMessage("");
    setAnonymous(true);
    setHoneypot("");
    setFieldErrors({});
    setFormError(null);
    setPhase("idle");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === "submitting") return;

    setFieldErrors({});
    setFormError(null);

    // Client-side validation first for instant feedback.
    const parsed = aspirationSchema.safeParse({ topic, message, anonymous });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          (key === "topic" || key === "message" || key === "anonymous") &&
          !errs[key]
        ) {
          errs[key] = issue.message;
        }
      }
      setFieldErrors(errs);
      return;
    }

    setPhase("submitting");

    const payload = {
      topic: parsed.data.topic,
      message: parsed.data.message,
      anonymous: parsed.data.anonymous,
      [HONEYPOT_NAME]: honeypot,
    };

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
            resolve({ ok: false, formError: `Terlalu banyak permintaan. Coba lagi dalam ${retry} detik.`, rateLimitedSeconds: retry });
            return;
          }

          if (res.status === 201) {
            resolve({ ok: true });
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
      setPhase("success");
      return;
    }

    if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    if (result.formError) setFormError(result.formError);
    setPhase("error");
  }

  if (phase === "success") {
    return <SuccessState onAgain={resetForm} />;
  }

  const topicLeft = TOPIC_MAX - topic.length;
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

      <div className={styles.field}>
        <label htmlFor={topicId} className={styles.label}>
          Topik
        </label>
        <input
          id={topicId}
          name="topic"
          type="text"
          className={`${styles.input} ${fieldErrors.topic ? styles.inputError : ""}`}
          placeholder="Ringkas topik aspirasimu..."
          maxLength={TOPIC_MAX}
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            if (fieldErrors.topic) {
              setFieldErrors((f) => ({ ...f, topic: undefined }));
            }
          }}
          disabled={disabled}
          aria-invalid={Boolean(fieldErrors.topic)}
          aria-describedby={fieldErrors.topic ? `${topicId}-err` : `${topicId}-count`}
          autoComplete="off"
        />
        <div className={styles.metaRow}>
          {fieldErrors.topic ? (
            <span id={`${topicId}-err`} className={styles.errorText} role="alert">
              {fieldErrors.topic}
            </span>
          ) : (
            <span className={styles.hint}>Singkat dan jelas.</span>
          )}
          <span
            id={`${topicId}-count`}
            className={`${styles.counter} ${topicLeft <= 10 ? styles.counterWarn : ""}`}
            aria-live="polite"
          >
            {topic.length}/{TOPIC_MAX}
          </span>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor={messageId} className={styles.label}>
          Isi Aspirasi
        </label>
        <AutoGrowTextarea
          id={messageId}
          name="message"
          className={`${styles.textarea} ${fieldErrors.message ? styles.inputError : ""}`}
          placeholder="Ceritakan saran, kritik, atau aspirasimu..."
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
            <span className={styles.hint}>Maksimal {MESSAGE_MAX} karakter.</span>
          )}
          <span
            id={`${messageId}-count`}
            className={`${styles.counter} ${messageLeft <= 30 ? styles.counterWarn : ""}`}
            aria-live="polite"
          >
            {message.length}/{MESSAGE_MAX}
          </span>
        </div>
      </div>

      <label className={styles.toggle} htmlFor={anonId}>
        <input
          id={anonId}
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          disabled={disabled}
        />
        <span className={styles.toggleTrack} aria-hidden="true">
          <span className={styles.toggleThumb} />
        </span>
        <span className={styles.toggleLabel}>Kirim sebagai anonim</span>
      </label>

      {formError ? (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        className={styles.submit}
        disabled={disabled}
        aria-busy={disabled}
      >
        {disabled ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span>Mengirim…</span>
          </>
        ) : (
          <>
            <span>Kirim Aspirasi</span>
            <span className={styles.submitIcon} aria-hidden="true">→</span>
          </>
        )}
      </button>
    </form>
  );
}
