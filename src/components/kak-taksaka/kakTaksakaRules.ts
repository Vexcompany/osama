/**
 * Client-safe rules for Kak Taksaka.
 *
 * Anything in this file is safe to bundle to the client. The
 * system prompt, the provider list, the API key, and any other
 * internals live in src/lib/taksaka/ and are server-only.
 *
 * If you find yourself adding something sensitive here, move it
 * server-side instead.
 *
 * V3.1 PATCH: All Kak Taksaka static dialog copy is centralized
 * here. The dialog is rendered from this data with 0 AI calls.
 * The dialog is purely local; no /api/taksaka request is made
 * during the tutorial.
 *
 * V3.1 PATCH: The tutorial completed flag is stored in
 * localStorage under a versioned key. The stored value is the
 * dialog version string, NOT a boolean. Bumping
 * TAKSAKA_DIALOG_VERSION re-shows the dialog for every user,
 * which is the point: when the copy is updated we want
 * returning users to see the new copy too. The stored value
 * is compared as a string.
 */

/**
 * The current dialog version. Bump this string whenever the
 * intro or tour copy changes in a way you want returning users
 * to see. Old stored values that don't match this string will
 * trigger a re-display.
 *
 *   "3.0"  -> initial dialog (deprecated)
 *   "3.1"  -> re-architected versioned localStorage; wording
 *             polished
 *   "3.2"  -> copy aligned with the V4 polished homepage
 *             (SMKN 5 Madiun, "Suaramu Berarti", trust badges,
 *             glass cards, "Ruang Aspirasimu" copy)
 */
export const TAKSAKA_DIALOG_VERSION = "3.2";

/**
 * localStorage key. Namespaced under `taksaka_*` so we don't
 * pollute the rest of the app's storage. We never call
 * localStorage.clear(); we only touch this one key.
 */
export const TAKSAKA_DIALOG_STORAGE_KEY = "taksaka_dialog_version";

export const TAKSAKA_MAX_MESSAGE_CHARS = 2000;
export const TAKSAKA_MAX_HISTORY_MESSAGES = 10;

/**
 * Read the "tutorial already shown for THIS version" flag.
 *
 *   - On the server: returns false (we can't read localStorage
 *     on the server; we render a no-dialog state and let the
 *     client mount decide).
 *   - On the client: returns true only if the stored value
 *     matches TAKSAKA_DIALOG_VERSION exactly.
 */
export function readDialogVersionSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(TAKSAKA_DIALOG_STORAGE_KEY) ===
      TAKSAKA_DIALOG_VERSION
    );
  } catch {
    return false;
  }
}

/**
 * Persist that the current dialog version has been seen (or
 * skipped). Stores the version string verbatim under the
 * namespaced key. Replaces any prior value at the same key.
 *
 * Skip, Close, Finish and Next-past-last all call this — the
 * user is considered to have seen the tutorial for the current
 * version regardless of which exit they took.
 */
export function writeDialogVersionSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TAKSAKA_DIALOG_STORAGE_KEY,
      TAKSAKA_DIALOG_VERSION,
    );
  } catch {
    // localStorage may be unavailable (private mode, etc).
    // Safe to ignore — the dialog just shows again next time.
  }
}

/* ─────────────────────────────────────────────────────────────────────
   Dialog content
   ─────────────────────────────────────────────────────────────────────

   All copy below is HARD-CODED. There is no network call, no
   AI call, no dynamic content. If you need to change the
   wording, edit the constants here.

   Two shapes:

   - TAKSAKA_INTRO_DIALOG (one shot):
     Shown on the very first paint when the user has not yet
     seen the current dialog version. The card has a primary
     "Mulai" button (which starts the tour) and a secondary
     "Lewati" button (which dismisses and saves the version).
     Skip = Finish = save the current version.

   - TAKSAKA_TOUR_DIALOGS (a sequence of steps):
     Shown after the user presses Mulai. Each step points at
     an element on the page via [data-tour]. The tour has
     Lanjut (advance), Kembali (back, hidden on step 1),
     Lewati (skip-to-end), and Selesai (finish, on last step).
     Finish / Skip / Esc / last-Next all save the current
     version.

   The wording follows the Kak Taksaka persona: a friendly
   older sibling / OSIS buddy, not a form system. We avoid
   formal phrasing like "Silakan masukkan aspirasi Anda"
   and instead talk like Kak Taksaka would in person.
*/

export interface DialogCopy {
  /** Stable id for the dialog; used in dev tools and tests. */
  id: string;
  /** Heading shown in the dialog. */
  title: string;
  /** Body copy shown under the heading. */
  message: string;
}

export const TAKSAKA_INTRO_DIALOG: DialogCopy = {
  id: "welcome",
  title: "Halo! Aku Kak Taksaka 👋",
  message:
    "Selamat datang di Osis Ngobrol Yuk, ruang aspirasi SMKN 5 Madiun. Kalau mau, aku bisa jalanin tur singkat biar kamu familiar. Boleh juga langsung kirim aspirasimu — terserah kamu.",
};

/**
 * A tour step. Same as DialogCopy, but each step also points
 * at a target element on the page via a [data-tour] selector.
 * The placement hint is a UI concern for the tour renderer.
 */
export interface TourStep extends DialogCopy {
  /** CSS selector for the element to spotlight. */
  target: string;
  /** Where to position the dialog relative to the spotlight. */
  placement: "top" | "bottom" | "left" | "right" | "auto";
}

export const TAKSAKA_TOUR_DIALOGS: ReadonlyArray<TourStep> = [
  {
    id: "welcome",
    target: "[data-tour='brand']",
    placement: "bottom",
    title: "Suaramu berarti",
    message:
      "Ini Osis Ngobrol Yuk, ruang aspirasi OSIS SMKN 5 Madiun. Identitas kamu terjaga, pesanmu langsung sampai ke pengurus — aku cuma jagain alurnya, bukan baca isinya.",
  },
  {
    id: "aspiration",
    target: "[data-tour='message-form']",
    placement: "top",
    title: "Tulis ceritamu di sini",
    message:
      "Di kolom ini, tulis apa yang ingin kamu sampaikan — kritik, saran, atau cerita. Bebas, panjang pendek terserah, bahasa santai juga boleh. Kalau belum siap, tulis aja dulu seadanya.",
  },
  {
    id: "submit",
    target: "[data-tour='submit-button']",
    placement: "top",
    title: "Kirim lewat tombol ini",
    message:
      "Kalau sudah oke, tekan tombol Kirim Aspirasi. Pesanmu langsung sampai ke OSIS tanpa lewat aku, jadi aman dan privat. Aku cuma jagain di sini.",
  },
  {
    id: "case-id",
    target: "[data-tour='case-id']",
    placement: "top",
    title: "Simpan Case ID-mu",
    message:
      "Begitu terkirim, kamu dapat Case ID — semacam nomor resi. Itu pegangan kamu kalau mau nanya perkembangan aspirasimu nanti. OSIS tidak tahu identitasmu, jadi simpan baik-baik.",
  },
  {
    id: "taksaka-button",
    target: "[data-tour='taksaka-button']",
    placement: "left",
    title: "Panggil aku kapan saja",
    message:
      "Kalau butuh bantuan atau mau ngobrol, pencet tombol ini. Aku standby — bisa buat tanya cara pakai, curhat ringan, atau apa pun.",
  },
];

/** Processing narrative — purely cosmetic. The client cycles
 *  through these lines while the network request is in flight.
 *  When the response arrives, the cycle stops immediately. None
 *  of this reflects the actual model state; it's just a visual
 *  cue. */
export const PROCESSING_NARRATIVE: ReadonlyArray<{
  afterMs: number;
  text: string;
}> = [
  { afterMs: 0, text: "Kak Taksaka sedang memahami pertanyaanmu..." },
  { afterMs: 4500, text: "Sedang menyiapkan jawaban..." },
  { afterMs: 10000, text: "Kak Taksaka sedang merangkai jawabannya..." },
  { afterMs: 18000, text: "Sebentar lagi yaa, aku pastikan jawabannya pas..." },
];

/** Generic error to show when the API returns an error. Matches
 *  the server-side fallback message verbatim so we never need to
 *  leak anything else. */
export const GENERIC_ERROR_MESSAGE =
  "Maaf, Kak Taksaka sedang mengalami sedikit kendala. Coba tanyakan lagi sebentar yaa.";

/** Greeting shown when the chat is first opened (without sending
 *  a message yet). This is local-only; the actual answer
 *  generation happens via /api/taksaka. */
export const CHAT_GREETING =
  "Hai! Aku Kak Taksaka. Ada yang ingin kamu ceritakan atau tanyakan? Tulis saja di bawah yaa.";
