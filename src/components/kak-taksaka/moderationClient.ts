/**
 * Client-side moderation preview (V3.3).
 *
 * This is a UX helper, NOT a security boundary. It runs the same
 * normalizer as the server pipeline so the user gets instant
 * feedback while typing, but the rule set is intentionally
 * abbreviated so we don't ship the entire server dictionary to
 * the browser. The server still re-runs the FULL pipeline.
 *
 * The server is the source of truth: if a user bypasses this
 * preview (by disabling JavaScript, by tampering, etc.) the
 * server-side moderation will still catch them.
 */
import { normalize, tokenCandidates } from "@/lib/moderation/normalize";

export type ClientCategory =
  | "profanity"
  | "harassment"
  | "hate_speech"
  | "threat"
  | "sexual_vulgarity";

export interface ClientModerationResult {
  blocked: boolean;
  category: ClientCategory | null;
}

/**
 * A *subset* of the server-side dictionary, safe to ship to the
 * client. Intentionally small. The server has the full list.
 */
const CLIENT_TERMS: Record<ClientCategory, string[]> = {
  profanity: [
    "kontol",
    "kntl",
    "memek",
    "ngentot",
    "bangsat",
    "bangsad",
    "bajingan",
    "perek",
    "lonte",
    "sialan",
    "brengsek",
    "kampret",
    "babi",
    "anjir",
    "anying",
    "goblok",
    "tolol",
    "bego",
    "pantek",
    "pukimak",
  ],
  sexual_vulgarity: ["coli", "ngocok", "entot", "ewe", "toket", "bokong"],
  harassment: [
    "jelek banget",
    "muka kamu",
    "muka lo",
    "sampah",
    "tidak berguna",
  ],
  threat: [
    "bunuh kamu",
    "bunuh lo",
    "mati kamu",
    "mati lo",
    "hajar kamu",
    "hajar lo",
    "pukul kamu",
    "pukul lo",
    "tikam kamu",
    "bacok",
    "mampus",
  ],
  hate_speech: [
    "kafir",
    "babi kau",
    "monyet kau",
    "anjing kau",
    "komunis",
  ],
};

export function moderateClient(input: string): ClientModerationResult {
  const normalized = normalize(input);
  if (!normalized) return { blocked: false, category: null };
  const tokens = tokenCandidates(normalized);

  for (const [category, terms] of Object.entries(CLIENT_TERMS) as Array<
    [ClientCategory, string[]]
  >) {
    for (const term of terms) {
      if (tokens.includes(term)) {
        return { blocked: true, category };
      }
    }
  }
  return { blocked: false, category: null };
}
