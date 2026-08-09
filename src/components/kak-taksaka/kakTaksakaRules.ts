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
 * V3.2: The tour dialog is COMPLETELY hardcoded. There is no
 * network call when the tour runs. /api/taksaka is reserved for
 * the AI chat only.
 */

export const TAKSAKA_TOUR_STORAGE_KEY = "taksaka:intro-completed:v1";
export const TAKSAKA_TOUR_VERSION = 1;

export const TAKSAKA_MAX_MESSAGE_CHARS = 2000;
export const TAKSAKA_MAX_HISTORY_MESSAGES = 10;

/**
 * Each tour step points at an element on the page via [data-tour].
 * The selector, the placement hint, and the dialog copy are all
 * public. We do NOT include any system prompt or backend info.
 *
 * Note the field name is `message` (not `body`) to match the
 * public contract: a tour step is a (target, title, message)
 * tuple.
 */
export interface TourStep {
  id: string;
  /** CSS selector for the element to spotlight. */
  target: string;
  /** Where to position the dialog relative to the spotlight. */
  placement: "top" | "bottom" | "left" | "right" | "auto";
  /** Heading shown in the dialog. */
  title: string;
  /** Body copy shown under the heading. */
  message: string;
}

/**
 * Hardcoded tour steps. No API call. No AI. No dynamic content.
 * If you need to change the copy, edit this constant.
 */
export const TOUR_STEPS: ReadonlyArray<TourStep> = [
  {
    id: "open",
    target: "[data-tour='brand']",
    placement: "bottom",
    title: "Halo! Aku Kak Taksaka 👋",
    message:
      "Selamat datang di Ngobrol Yuk. Aku akan menemanimu sebentar untuk menjelaskan cara mengirim ceritamu.",
  },
  {
    id: "write-story",
    target: "[data-tour='message-form']",
    placement: "top",
    title: "Tulis ceritamu",
    message:
      "Di sini kamu bisa menuliskan ceritamu. Tidak perlu nama, tidak perlu email — langsung tulis saja apa yang ingin kamu sampaikan.",
  },
  {
    id: "submit-story",
    target: "[data-tour='submit-button']",
    placement: "top",
    title: "Kirim cerita",
    message:
      "Kalau sudah selesai, kirim lewat tombol ini. Pesanmu akan sampai ke OSIS secara anonim.",
  },
  {
    id: "case-id",
    target: "[data-tour='case-id']",
    placement: "top",
    title: "Case ID",
    message:
      "Setelah terkirim, kamu akan mendapat Case ID. Ini adalah nomor referensi yang bisa kamu gunakan untuk menanyakan kelanjutan ceritamu nanti.",
  },
  {
    id: "taksaka-button",
    target: "[data-tour='taksaka-button']",
    placement: "left",
    title: "Panggil Kak Taksaka",
    message:
      "Kalau kamu butuh bantuan atau ingin bertanya sesuatu, kamu bisa memanggil aku lagi lewat tombol ini kapan saja.",
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
