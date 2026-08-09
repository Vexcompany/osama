/**
 * Client-safe rules for Kak Taksaka.
 *
 * Anything in this file is safe to bundle to the client. The
 * system prompt, the provider list, the challenge secret, and any
 * other internals live in src/lib/taksaka/ and are server-only.
 *
 * If you find yourself adding something sensitive here, move it
 * server-side instead.
 */

export const TAKSAKA_TOUR_STORAGE_KEY = "taksaka:intro-completed:v1";
export const TAKSAKA_TOUR_VERSION = 1;

export const TAKSAKA_MAX_MESSAGE_CHARS = 2000;
export const TAKSAKA_MAX_HISTORY_MESSAGES = 10;

/** Each tour step points at an element on the page via [data-tour].
 *  The selector, the placement hint, and the dialog copy are all
 *  public. We do NOT include any system prompt or backend info. */
export interface TourStep {
  id: string;
  /** CSS selector for the element to spotlight. */
  target: string;
  /** Where to position the dialog relative to the spotlight. */
  placement: "top" | "bottom" | "left" | "right" | "auto";
  /** Heading. */
  title: string;
  /** Body. */
  body: string;
}

export const TOUR_STEPS: ReadonlyArray<TourStep> = [
  {
    id: "welcome",
    target: "[data-tour='brand']",
    placement: "bottom",
    title: "Halo! Aku Kak Taksaka 👋",
    body: "Aku akan menemani kamu menggunakan Ngobrol Yuk. Santai saja yaa, tidak perlu buru-buru.",
  },
  {
    id: "message-form",
    target: "[data-tour='message-form']",
    placement: "top",
    title: "Tulis curhatmu di sini",
    body: "Di bagian ini kamu bisa menuliskan apa yang ingin kamu ceritakan. Tidak ada judul, tidak perlu nama, langsung tulis saja.",
  },
  {
    id: "submit-button",
    target: "[data-tour='submit-button']",
    placement: "top",
    title: "Kirim pesannya",
    body: "Setelah selesai, kamu bisa mengirim pesannya lewat tombol ini. Pesanmu akan sampai ke OSIS secara anonim.",
  },
  {
    id: "case-id",
    target: "[data-tour='case-id']",
    placement: "top",
    title: "Ini Case ID kamu",
    body: "Setelah terkirim, kamu akan mendapat Case ID. Simpan baik-baik kalau suatu saat kamu ingin menanyakan kelanjutannya.",
  },
  {
    id: "taksaka-button",
    target: "[data-tour='taksaka-button']",
    placement: "left",
    title: "Panggil Kak Taksaka",
    body: "Kalau kamu butuh bantuan atau ingin bertanya sesuatu, kamu bisa memanggil aku lagi lewat tombol ini kapan saja.",
  },
];

/** Processing narrative — purely cosmetic. The client cycles through
 *  these lines while the network request is in flight. When the
 *  response arrives, the cycle stops immediately. None of this
 *  reflects the actual model state; it's just a visual cue. */
export const PROCESSING_NARRATIVE: ReadonlyArray<{
  afterMs: number;
  text: string;
}> = [
  { afterMs: 0, text: "Kak Taksaka sedang memahami pertanyaanmu..." },
  { afterMs: 4500, text: "Sedang menyiapkan jawaban..." },
  { afterMs: 10000, text: "Kak Taksaka sedang merangkai jawabannya..." },
  { afterMs: 18000, text: "Sebentar lagi yaa, aku pastikan jawabannya pas..." },
];

/** Generic error to show when the API returns an error. Matches the
 *  server-side fallback message verbatim so we never need to leak
 *  anything else. */
export const GENERIC_ERROR_MESSAGE =
  "Maaf, Kak Taksaka sedang mengalami sedikit kendala. Coba tanyakan lagi sebentar yaa.";

/** Greeting shown when the chat is first opened (without sending a
 *  message yet). This is local-only; the actual answer generation
 *  happens via /api/taksaka. */
export const CHAT_GREETING =
  "Hai! Aku Kak Taksaka. Ada yang ingin kamu ceritakan atau tanyakan? Tulis saja di bawah yaa.";
