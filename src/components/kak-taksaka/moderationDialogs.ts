/**
 * Hardcoded Kak Taksaka moderation dialogs.
 *
 * V3.3: when the server-side content moderation blocks a
 * submission, the client shows one of these dialogs. They are
 * 100% hardcoded, 0 AI tokens consumed, 0 API calls.
 *
 * The keys are the moderation category identifiers used by
 * `src/lib/moderation`. The values are the actual user-facing
 * copy. Wording is friendly and non-judgmental — we ask the
 * user to try again, not lecture them.
 *
 * The shape of each entry is intentionally simple so V4 (Claude)
 * can polish the visuals without touching the data.
 */

import type { ModerationCategory } from "@/lib/moderation";

export interface ModerationDialog {
  title: string;
  message: string;
}

export const MODERATION_DIALOGS: Record<ModerationCategory, ModerationDialog> = {
  profanity: {
    title: "Kak Taksaka",
    message:
      "Bahasanya dijaga yaa. Yuk sampaikan ceritamu dengan bahasa yang lebih baik.",
  },
  sexual_vulgarity: {
    title: "Kak Taksaka",
    message:
      "Aku dengar kamu, tapi tolong hindari bahasa yang vulgar ya. Ceritakan dengan cara yang lebih sopan.",
  },
  harassment: {
    title: "Kak Taksaka",
    message:
      "Aku paham kamu ingin menyampaikan sesuatu. Yuk hindari menghina atau menyerang orang lain di dalam ceritamu.",
  },
  bullying: {
    title: "Kak Taksaka",
    message:
      "Kalau ada yang menyakitimu, ceritakan saja. Tapi yuk hindari membalas dengan cara yang sama.",
  },
  hate_speech: {
    title: "Kak Taksaka",
    message:
      "Yuk tetap saling menghargai. Ceritakan masalahnya tanpa menyerang kelompok atau orang lain ya.",
  },
  threat: {
    title: "Kak Taksaka",
    message:
      "Aku paham perasaanmu. Tapi tolong ceritakan tanpa ancaman ya — kita cari cara yang lebih aman untuk menyampaikannya.",
  },
  slur: {
    title: "Kak Taksaka",
    message:
      "Yuk kita jaga agar ceritamu tidak menyinggung kelompok mana pun. Ceritakan masalahmu dengan cara yang lebih baik.",
  },
};

export function getModerationDialog(category: ModerationCategory): ModerationDialog {
  return (
    MODERATION_DIALOGS[category] ?? {
      title: "Kak Taksaka",
      message:
        "Aku belum bisa menerima pesan itu. Yuk coba tulis ulang dengan cara yang lebih baik.",
    }
  );
}
