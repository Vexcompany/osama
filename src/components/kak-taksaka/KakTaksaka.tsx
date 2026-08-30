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
 * Persistence (V3.1 PATCH):
 *   Whether the user has already seen the current dialog
 *   version is stored in localStorage under the key
 *   `taksaka_dialog_version`. The value is the dialog version
 *   STRING (e.g. "3.1"), not a boolean. Bumping
 *   TAKSAKA_DIALOG_VERSION re-shows the intro for everyone —
 *   returning users see the new copy when the version changes.
 *
 * First-paint behavior:
 *   The initial overlay state is "none" on BOTH the server and
 *   the first client render. We then read localStorage in a
 *   useEffect and, if the dialog version has not been seen,
 *   switch the overlay to "intro". This avoids the "flash of
 *   intro on reload" failure mode: a user who has already
 *   completed the tutorial will never see the dialog again,
 *   not even for a single frame.
 *
 *   A new user pays a sub-frame delay (1 tick) before the
 *   intro appears. That's intentional — the spec is explicit
 *   that a returning user must not see the dialog auto-open.
 *
 * Tutorial exit semantics:
 *   Skip, Close (Esc), Finish, and clicking Lanjut on the
 *   last step all call `finishIntro`, which writes the
 *   current dialog version to localStorage and dismisses
 *   the overlay. The user is never forced to see the same
 *   dialog version twice.
 *
 * No /api/taksaka call is made for the tutorial.
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
  readDialogVersionSeen,
  writeDialogVersionSeen,
} from "./kakTaksakaRules";
import styles from "./KakTaksaka.module.css";

type Overlay = "intro" | "tour" | "none";

interface Warning {
  id: number;
  text: string;
  tone: "info" | "warn";
}

export function KakTaksaka() {
  // Initial overlay state is "none" on both server and the
  // very first client render. The mount effect below then
  // consults localStorage and shows the intro if the user
  // has not yet seen the current dialog version. This pattern
  // guarantees that a returning user never sees the dialog
  // re-appear, even for one frame.
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const warnedRef = useRef(false);

  // Mount: read the versioned localStorage flag once. If the
  // stored value is the current TAKSAKA_DIALOG_VERSION, the
  // user has already seen the dialog → stay on "none". If not
  // (empty, missing, or stale version), show the intro.
  useEffect(() => {
    if (!readDialogVersionSeen()) {
      setOverlay("intro");
    }
  }, []);

  const finishIntro = useCallback(() => {
    writeDialogVersionSeen();
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
