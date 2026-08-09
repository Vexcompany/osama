"use client";

/**
 * Kak Taksaka chat panel.
 *
 * Modal-style panel with:
 *   - Message list (user / assistant turns)
 *   - Processing narrative while the request is in flight
 *   - Text input with character counter
 *   - Header with close button
 *
 * The narrative is purely cosmetic. It cycles through
 * PROCESSING_NARRATIVE based on elapsed time, and STOPS as soon as
 * the response arrives — even if we are still on the first line.
 * The narrative never reflects the actual model state, provider,
 * or any internal detail.
 */
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";

import { KakTaksakaAvatar } from "./KakTaksakaAvatar";
import { sendChat } from "./kakTaksakaBridge";
import {
  PROCESSING_NARRATIVE,
  TAKSAKA_MAX_MESSAGE_CHARS,
} from "./kakTaksakaRules";
import styles from "./KakTaksakaChat.module.css";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  isFallback?: boolean;
}

export function KakTaksakaChat({
  turns,
  busy,
  onClose,
  onSend,
}: {
  turns: ChatTurn[];
  busy: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [narrative, setNarrative] = useState<string>(PROCESSING_NARRATIVE[0]?.text ?? "");
  const startedAtRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // When busy starts, start the narrative clock.
  useEffect(() => {
    if (busy) {
      startedAtRef.current = Date.now();
      setNarrative(PROCESSING_NARRATIVE[0]?.text ?? "");
    } else {
      startedAtRef.current = null;
    }
  }, [busy]);

  // While busy, advance the narrative based on elapsed time.
  useEffect(() => {
    if (!busy) return;
    const interval = window.setInterval(() => {
      const start = startedAtRef.current;
      if (start == null) return;
      const elapsed = Date.now() - start;
      let next = PROCESSING_NARRATIVE[0]?.text ?? "";
      for (const step of PROCESSING_NARRATIVE) {
        if (elapsed >= step.afterMs) next = step.text;
      }
      setNarrative(next);
    }, 500);
    return () => window.clearInterval(interval);
  }, [busy]);

  // Auto-scroll the list to the bottom when turns change.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, busy, narrative]);

  // Focus the input on open.
  useEffect(() => {
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 220);
    return () => window.clearTimeout(t);
  }, []);

  // Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > TAKSAKA_MAX_MESSAGE_CHARS) return;
    onSend(trimmed);
    setText("");
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
    }
  }

  const charsLeft = TAKSAKA_MAX_MESSAGE_CHARS - text.length;

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="Chat Kak Taksaka">
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Tutup chat"
        tabIndex={-1}
      />
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerAvatar}>
              <KakTaksakaAvatar size={36} expression="happy" />
            </span>
            <div>
              <div className={styles.headerTitle}>Kak Taksaka</div>
              <div className={styles.headerSub}>Ngobrol Yuk</div>
            </div>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Tutup"
          >
            ×
          </button>
        </header>

        <div ref={listRef} className={styles.list} role="log" aria-live="polite">
          {turns.map((t) => (
            <div
              key={t.id}
              className={`${styles.bubble} ${
                t.role === "user" ? styles.bubbleUser : styles.bubbleAssistant
              } ${t.isFallback ? styles.bubbleFallback : ""}`}
            >
              {t.role === "assistant" ? (
                <span className={styles.bubbleAvatar} aria-hidden="true">
                  <KakTaksakaAvatar size={24} expression="happy" />
                </span>
              ) : null}
              <div className={styles.bubbleBody}>{t.content}</div>
            </div>
          ))}

          {busy ? (
            <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
              <span className={styles.bubbleAvatar} aria-hidden="true">
                <KakTaksakaAvatar size={24} expression="thinking" />
              </span>
              <div className={`${styles.bubbleBody} ${styles.thinking}`}>
                <span className={styles.thinkingDot} aria-hidden="true" />
                <span className={styles.thinkingText}>{narrative}</span>
              </div>
            </div>
          ) : null}
        </div>

        <form className={styles.composer} onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Tulis pesanmu..."
            maxLength={TAKSAKA_MAX_MESSAGE_CHARS}
            rows={1}
            disabled={busy}
          />
          <div className={styles.composerRow}>
            <span
              className={`${styles.counter} ${charsLeft <= 200 ? styles.counterWarn : ""}`}
              aria-live="polite"
            >
              {text.length}/{TAKSAKA_MAX_MESSAGE_CHARS}
            </span>
            <button
              type="submit"
              className={styles.send}
              disabled={busy || text.trim().length === 0}
            >
              {busy ? "..." : "Kirim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
