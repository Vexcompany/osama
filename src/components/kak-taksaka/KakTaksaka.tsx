"use client";

/**
 * KakTaksaka — main client orchestrator.
 *
 * Owns the top-level state of the whole Kak Taksaka feature:
 *   - intro overlay (first visit)
 *   - tour (the spotlight walkthrough)
 *   - chat panel
 *   - floating button
 *   - warning toasts
 *
 * The actual rendering is split across KakTaksakaButton, KakTaksakaTour,
 * KakTaksakaChat, and KakTaksakaIntro to keep this file readable.
 *
 * Persistence: whether the user has finished the intro is stored in
 * localStorage with a version key. Bumping TAKSAKA_TOUR_VERSION
 * re-shows the intro for everyone, which is intentional — the tour
 * copy may need to be updated between releases.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { KakTaksakaAvatar } from "./KakTaksakaAvatar";
import { KakTaksakaButton } from "./KakTaksakaButton";
import { KakTaksakaChat, type ChatTurn } from "./KakTaksakaChat";
import { KakTaksakaIntro } from "./KakTaksakaIntro";
import { KakTaksakaTour } from "./KakTaksakaTour";
import { KakTaksakaWarning } from "./KakTaksakaWarning";
import { sendChat } from "./kakTaksakaBridge";
import {
  CHAT_GREETING,
  TAKSAKA_TOUR_STORAGE_KEY,
  TAKSAKA_TOUR_VERSION,
} from "./kakTaksakaRules";
import styles from "./KakTaksaka.module.css";

type Overlay = "none" | "intro" | "tour" | "chat";

interface Warning {
  id: number;
  text: string;
  tone: "info" | "warn";
}

export function KakTaksaka() {
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const warnedRef = useRef(false);

  // On mount, decide whether to show the intro.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TAKSAKA_TOUR_STORAGE_KEY);
      const completed = raw ? (JSON.parse(raw) as { v?: number; done?: boolean }) : null;
      if (!completed || completed.v !== TAKSAKA_TOUR_VERSION || !completed.done) {
        setOverlay("intro");
      }
    } catch {
      // localStorage may be unavailable (private mode etc). Default
      // to showing the intro; the user can skip.
      setOverlay("intro");
    }
  }, []);

  const finishIntro = useCallback(() => {
    try {
      window.localStorage.setItem(
        TAKSAKA_TOUR_STORAGE_KEY,
        JSON.stringify({ v: TAKSAKA_TOUR_VERSION, done: true }),
      );
    } catch {
      // ignore
    }
    setOverlay("none");
  }, []);

  const startTour = useCallback(() => setOverlay("tour"), []);
  const skipTour = useCallback(() => finishIntro(), [finishIntro]);
  const endTour = useCallback(() => finishIntro(), [finishIntro]);

  const openChat = useCallback(() => {
    setChatOpen(true);
    if (chatTurns.length === 0) {
      setChatTurns([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: CHAT_GREETING,
        },
      ]);
    }
  }, [chatTurns.length]);

  const closeChat = useCallback(() => setChatOpen(false), []);

  const pushWarning = useCallback((text: string, tone: Warning["tone"] = "warn") => {
    setWarnings((prev) => [...prev, { id: Date.now() + Math.random(), text, tone }]);
  }, []);

  const dismissWarning = useCallback((id: number) => {
    setWarnings((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // Auto-dismiss warnings after 4s.
  useEffect(() => {
    if (warnings.length === 0) return;
    const timers = warnings.map((w) =>
      window.setTimeout(() => dismissWarning(w.id), 4000),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [warnings, dismissWarning]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (chatBusy) return;
      const trimmed = text.trim();
      if (trimmed.length === 0) return;

      const userTurn: ChatTurn = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      const newTurns: ChatTurn[] = [...chatTurns, userTurn];
      setChatTurns(newTurns);
      setChatBusy(true);

      const result = await sendChat(
        newTurns.map((t) => ({ role: t.role, content: t.content })),
      );

      const assistantTurn: ChatTurn = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.message,
        isFallback: result.isFallback,
      };
      setChatTurns((prev) => [...prev, assistantTurn]);
      setChatBusy(false);

      if (result.isFallback && !warnedRef.current) {
        warnedRef.current = true;
        pushWarning("Kak Taksaka sedang sedikit sibuk. Coba lagi sebentar yaa.", "warn");
      }
    },
    [chatBusy, chatTurns, pushWarning],
  );

  return (
    <>
      {/* Tour uses the avatar; when the tour is running, the floating
          button is hidden so it doesn't double as a spotlight target. */}
      {overlay === "intro" ? (
        <KakTaksakaIntro
          onStart={startTour}
          onSkip={skipTour}
        />
      ) : null}

      {overlay === "tour" ? (
        <KakTaksakaTour onEnd={endTour} />
      ) : null}

      {chatOpen ? (
        <KakTaksakaChat
          turns={chatTurns}
          busy={chatBusy}
          onClose={closeChat}
          onSend={sendMessage}
        />
      ) : null}

      {/* Floating button — only when no overlay is active. */}
      {overlay === "none" ? (
        <KakTaksakaButton
          data-tour="taksaka-button"
          onClick={openChat}
          aria-label="Buka chat Kak Taksaka"
        >
          <KakTaksakaAvatar size={56} expression="happy" />
        </KakTaksakaButton>
      ) : null}

      <KakTaksakaWarning
        warnings={warnings}
        onDismiss={dismissWarning}
      />
    </>
  );
}
