"use client";

/**
 * AspirationForm (V3.3)
 *
 * NGL-style: one textarea, a counter, and a send button. Nothing else.
 *
 * V3.3 adds:
 *   - Client-side moderation preview. The form runs a local
 *     rule subset against the message and shows a hardcoded
 *     Kak Taksaka dialog if the content is blocked. The user
 *     can edit and resubmit.
 *   - The server runs the full moderation pipeline too. The
 *     client preview is a UX helper, not a security boundary.
 *   - If the server still rejects (e.g. client preview missed a
 *     pattern), the same hardcoded dialog flow runs.
 *
 * The textarea auto-grows. No layout jump. No change to V1's
 * NGL-style copy.
 */
import { useId, useState, useTransition, type FormEvent } from "react";

import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { SuccessState } from "./SuccessState";
import { KakTaksakaModerationDialog } from "@/components/kak-taksaka/KakTaksakaModerationDialog";
import {
  getModerationDialog,
  type ModerationDialog,
} from "@/components/kak-taksaka/moderationDialogs";
import { moderateClient, type ClientCategory } from "@/components/kak-taksaka/moderationClient";
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
  // V3.3: when the moderation pipeline blocks a submission we
  // store the category so the hardcoded dialog can render. The
  // message itself is NOT cleared — the user can edit and
  // resubmit.
  const [moderationDialog, setModerationDialog] =
    useState<ModerationDialog | null>(null);
  const [isPending, startTransition] = useTransition();

  const messageId = useId();
  const honeyId = useId();

  function resetForm() {
    setMessage("");
    setHoneypot("");
    setFieldErrors({});
    setFormError(null);
    setLastCaseId(null);
    setModerationDialog(null);
    setPhase("idle");
  }

  function dismissModeration() {
    setModerationDialog(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === "submitting") return;

    setFieldErrors({});
    setFormError(null);
    setModerationDialog(null);

    // Client-side moderation preview. NEVER a security boundary.
    const clientMod = moderateClient(message);
    if (clientMod.blocked && clientMod.category) {
      setModerationDialog(getModerationDialog(clientMod.category));
      return;
    }

    // Validation (length etc.).
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
      moderationCategory?: ClientCategory;
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

          // The server returns 200 with `{ ok: false, blocked: true,
          // category }` when the moderation pipeline blocks the
          // submission. We translate that into the same hardcoded
          // dialog flow the client preview uses.
          if (res.ok) {
            const data = (await res.json().catch(() => null)) as
              | {
                  ok?: boolean;
                  caseId?: string;
                  blocked?: boolean;
                  category?: string;
                }
              | null;
            if (data?.blocked && data?.category) {
              resolve({
                ok: false,
                moderationCategory: data.category as ClientCategory,
              });
              return;
            }
            if (data?.ok) {
              resolve({ ok: true, caseId: data.caseId });
              return;
            }
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

    if (result.moderationCategory) {
      setModerationDialog(getModerationDialog(result.moderationCategory));
      // Don't clear the message; let the user fix it.
      setPhase("idle");
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
          // If a moderation dialog is showing and the user starts
          // editing again, dismiss it so they can re-submit cleanly.
          if (moderationDialog) setModerationDialog(null);
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

      {moderationDialog ? (
        <KakTaksakaModerationDialog
          dialog={moderationDialog}
          onDismiss={dismissModeration}
        />
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
          <>
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true" className={styles.sendIcon}>
              <path d="M2 10 L18 2 L11 18 L9 11 Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Kirim Aspirasi</span>
          </>
        )}
      </button>
    </form>
  );
}
