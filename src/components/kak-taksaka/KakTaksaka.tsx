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
 * Persistence: whether the user has finished the intro is stored
 * in localStorage with a version key. Bumping
 * TAKSAKA_TOUR_VERSION re-shows the intro for everyone, which is
 * intentional — the tour copy may need to be updated between
 * releases.
 *
 * V3.2: the initial overlay state is computed synchronously via
 * useState initializer + SSR guard, so the intro appears on the
 * very first paint (no flash of "no intro" before the effect
 * runs).
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

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

/**
 * Read the "tour completed" flag from localStorage. SSR-safe
 * (returns false on the server so the server-rendered HTML
 * matches the client's first render in absence of localStorage).
 */
function readTourCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(TAKSAKA_TOUR_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { v?: number; done?: boolean };
    return parsed.v === TAKSAKA_TOUR_VERSION && parsed.done === true;
  } catch {
    return false;
  }
}

function writeTourCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TAKSAKA_TOUR_STORAGE_KEY,
      JSON.stringify({ v: TAKSAKA_TOUR_VERSION, done: true }),
    );
  } catch {
    // localStorage may be unavailable; safe to ignore.
  }
}

export function KakTaksaka() {
  // useSyncExternalStore gives us a SSR-safe, hydration-safe way
  // to read the localStorage flag on the very first render — no
  // flash of "no intro" before the post-mount useEffect runs.
  const tourCompleted = useSyncExternalStore(
    () => () => {},
    readTourCompleted,
    () => false,
  );

  const [overlay, setOverlay] = useState<Overlay>(() =>
    tourCompleted ? "none" : "intro",
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const warnedRef = useRef(false);

  const finishIntro = useCallback(() => {
    writeTourCompleted();
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

      {/*
        The floating button is ALWAYS mounted so the
        [data-tour="taksaka-button"] target is present in the DOM
        on every render — including the very first visit, when the
        intro/tour is active. The button is visually hidden during
        the intro and tour (see KakTaksakaButton.module.css) and
        only becomes interactive when overlay === "none".

        Mounting-but-hiding avoids the "target not found" path in
        the tour and keeps the spotlight behaviour predictable.
      */}
      <KakTaksakaButton
        data-tour="taksaka-button"
        onClick={openChat}
        aria-label="Buka chat Kak Taksaka"
        hidden={overlay !== "none"}
      >
        <KakTaksakaAvatar size={56} expression="happy" />
      </KakTaksakaButton>

      <KakTaksakaWarning
        warnings={warnings}
        onDismiss={dismissWarning}
      />
    </>
  );
}
