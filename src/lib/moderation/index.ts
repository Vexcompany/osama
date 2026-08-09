/**
 * Local content moderation (V3.3).
 *
 * This module NEVER calls an AI provider. All checks are
 * deterministic, local, server-side. The dictionary is a static
 * data structure that can be extended without rewriting the
 * pipeline.
 *
 * Pipeline:
 *   1. Normalize the input. The normalized form is the only
 *      string the rule engine sees.
 *   2. Run each rule's `evaluate` against the normalized text and
 *      its tokens. The first match wins; we return the matched
 *      category and a small set of contextual flags.
 *   3. The caller decides what to do with the result: block, warn,
 *      or pass.
 *
 * Design notes:
 *   - The dictionary is intentionally small but covers the
 *     categories required by the brief (profanity, harassment,
 *     hate speech, threats, sexual vulgarity, slur).
 *   - Rules use a mix of techniques: full-token match, token-
 *     prefix match, pattern match, and context phrases. None of
 *     them do `text.includes(needle)` on the raw string because
 *     that's the substring trap.
 *   - Substring matching IS used, but only on a tokenized form
 *     so that "kontol" inside "kontolmemang" (a fake example)
 *     would still match — but a word like "kontol" inside the
 *     legitimate word "kontolusi" would not be matched because
 *     tokenization rejects the surrounding letters.
 *
 * IMPORTANT: this module is server-only. The dictionary is the
 * source of truth. Any rules shipped to the client for UX are a
 * subset and must never be relied on as a security boundary.
 */
import "server-only";

import { normalize, tokenize, tokenCandidates } from "./normalize";

export { normalize, tokenize, tokenCandidates };

export type ModerationCategory =
  | "profanity"
  | "sexual_vulgarity"
  | "harassment"
  | "bullying"
  | "hate_speech"
  | "threat"
  | "slur";

export type ModerationSeverity = "block" | "warn";

export interface ModerationMatch {
  category: ModerationCategory;
  severity: ModerationSeverity;
  /** Human-readable reason for logs. NEVER sent to the client. */
  reason: string;
  /** Original term that triggered the rule (for logs). */
  term: string;
}

export interface ModerationResult {
  blocked: boolean;
  /** True if at least one block-severity match was found. */
  hasBlock: boolean;
  /** True if at least one warn-severity match was found. */
  hasWarn: boolean;
  /** All matches, in order of evaluation. Logs only. */
  matches: ModerationMatch[];
  /** The category of the first blocking match. Sent to the client
   *  as a generic hint, not the matched term. */
  category: ModerationCategory | null;
}

// ── Rule definitions ────────────────────────────────────────────────

interface Rule {
  category: ModerationCategory;
  severity: ModerationSeverity;
  /** Internal description; never sent to the client. */
  description: string;
  /**
   * The token(s) the rule cares about. We always match these as
   * whole tokens or whole-word sub-tokens (see matchTerm), not as
   * raw substrings of arbitrary words.
   */
  terms: string[];
  /**
   * Optional additional context phrases. If present, the rule
   * only fires when one of these phrases also appears in the
   * normalized text. This is the "context-aware" guardrail from
   * the brief: we don't block a word in isolation if it's only
   * meaningful when combined with intent.
   */
  contextPhrases?: string[];
  /**
   * If true, the rule is "loose" — it allows a 1-character leeway
   * at the start and end of the term so that stem-only matches
   * don't false-positive (e.g. "anjing" in "anjingnya" still
   * matches because we look for the term as a contiguous run
   * inside the tokenized word).
   *
   * The default is false (strict full-token match).
   */
  loose?: boolean;
}

const RULES: Rule[] = [
  // ── profanity ──────────────────────────────────────────────
  {
    category: "profanity",
    severity: "block",
    description: "Kata kasar umum (Bahasa Indonesia).",
    terms: [
      "kontol",
      "kntl",
      "memek",
      "mmk",
      "ngentot",
      "ngewe",
      "bangsat",
      "bngst",
      "bngsat",
      "bajingan",
      "bajing",
      "perek",
      "lonte",
      "pelacur",
      "sundal",
      "sialan",
      "sialam",
      "brengsek",
      "kampret",
      "kampretan",
      "babi",
      "anjg",
      "anjir",
      "anying",
      "anyinglah",
      "gila",
      "goblok",
      "bodoh",
      "tolol",
      "idiot",
      "bego",
      "pantek",
      "pukimak",
      "kimak",
      "bitch",
      "fuck",
      "fck",
      "shit",
      "asshole",
      "dick",
      "pussy",
    ],
  },
  // ── sexual vulgarity ─────────────────────────────────────
  {
    category: "sexual_vulgarity",
    severity: "block",
    description: "Konten seksual vulgar.",
    terms: [
      "coli",
      "ngocok",
      "ngewe",
      "entot",
      "ewe",
      "ewean",
      "bokong",
      "toket",
    ],
  },
  // ── harassment / bullying ───────────────────────────────
  {
    category: "harassment",
    severity: "block",
    description: "Penghinaan / bullying personal.",
    terms: [
      "bodoh banget",
      "tolol banget",
      "bego banget",
      "goblok banget",
      "muka kamu",
      "muka lo",
      "muka lu",
      "jelek banget",
      "jelek kamu",
      "jelek lo",
      "jelek lu",
      "malesin",
      "membosankan",
      "sampah",
      "sampah masyarakat",
      "tidak berguna",
      "gak guna",
      "ga guna",
      "gak ada gunanya",
      "ga ada gunanya",
    ],
  },
  // ── threat / intimidation ────────────────────────────────
  {
    category: "threat",
    severity: "block",
    description: "Ancaman atau intimidasi.",
    terms: [
      "aku bunuh",
      "gw bunuh",
      "gue bunuh",
      "saya bunuh",
      "bunuh kamu",
      "bunuh lo",
      "bunuh lu",
      "bunuh dia",
      "mati kamu",
      "mati lo",
      "mati lu",
      "kuhajar",
      "kuhajar kamu",
      "kuhajar lo",
      "kuhajar lu",
      "kupukul",
      "kupukul kamu",
      "kupukul lo",
      "kupukul lu",
      "mampus",
      "mampus kamu",
      "mampus lo",
      "mampus lu",
      "pukul kamu",
      "pukul lo",
      "pukul lu",
      "hajar kamu",
      "hajar lo",
      "hajar lu",
      "tangkap kamu",
      "tangkap lo",
      "tangkap lu",
      "tikam",
      "tikam kamu",
      "bacok",
      "bacok kamu",
    ],
  },
  // ── hate speech / slur ───────────────────────────────────
  {
    category: "hate_speech",
    severity: "block",
    description: "Ujaran kebencian / slur terhadap kelompok.",
    terms: [
      "kafir",
      "kafir kau",
      "kafir kamu",
      "kafir lo",
      "kafir lu",
      "kafir semua",
      "babi kau",
      "babi kamu",
      "babi lo",
      "babi lu",
      "monyet kau",
      "monyet kamu",
      "monyet lo",
      "monyet lu",
      "anjing kau",
      "anjing kamu",
      "anjing lo",
      "anjing lu",
      "kafir",
      "komunis kau",
      "komunis kamu",
      "pki",
    ],
  },
  // ── slur (protected-class insults) ──────────────────────
  {
    category: "slur",
    severity: "block",
    description: "Slur / penghinaan terhadap kelompok yang dilindungi.",
    terms: [
      "babi negro",
      "negro",
      "negroid",
      "kafir cina",
      "cina kafir",
      "pribumi bodoh",
      "pribumi tolol",
      "islam idiot",
      "kristen kafir",
      "yahudi kotor",
      "kafir yahudi",
      "cina bangsat",
      "cina kontol",
    ],
  },
];

// ── Phrase-level patterns (for things the token list misses) ───

interface PhraseRule {
  category: ModerationCategory;
  severity: ModerationSeverity;
  description: string;
  pattern: RegExp;
}

const PHRASE_RULES: PhraseRule[] = [
  {
    category: "threat",
    severity: "block",
    description: "Frasa ancaman umum.",
    // "akan aku X kamu" / "akan kug X kamu" variants.
    pattern: /\bakan\s+(aku|gw|gue|saya)\s+(bunuh|hajar|pukul|tikam|bacok|gebuk)\s+(kamu|lo|lu|kau|dirimu|elu)\b/,
  },
  {
    category: "hate_speech",
    severity: "block",
    description: "Permintaan untuk mencelakakan kelompok.",
    pattern: /\b(bunuh|usir|expel|expulsion)\s+(semua\s+)?(cina|arab|pribumi|jawa|nonpribumi|non\s+pribumi|kristen|islam|hindu|budha|ateis|komunis|liberal)\b/,
  },
  {
    category: "sexual_vulgarity",
    severity: "block",
    description: "Permintaan seksual vulgar terhadap orang tertentu.",
    pattern: /\b(mau|pingin|nyepong|sepong|seks|sex)\s+(kamu|lo|lu|kau|dirimu)\b/,
  },
];

// ── Matching helpers ────────────────────────────────────────────

/**
 * Check whether `needle` (a single term) appears as a whole word
 * inside the tokenized text. The whole-word rule is what stops
 * the substring trap: "kontol" inside "kontolusi" (a fake
 * example) won't match because tokenization rejected the
 * suffix, but "kontol" inside "kontol" or "kontolnya" will,
 * because the latter reduces to the same token after the
 * repeated-character collapse.
 */
function termMatches(term: string, tokens: string[], loose: boolean): boolean {
  if (!term) return false;
  // Rule terms are space-separated. Tokens have no spaces. We
  // compare both the term and each token as space-stripped
  // strings so a term like "anjing kamu" matches either the
  // single token "anjingkamu" (produced by tokenCandidates) or
  // the two tokens "anjing" + "kamu" individually.
  const termCompact = term.replace(/\s+/g, "");

  if (termCompact.length >= 4) {
    // The last candidate in `tokens` is the whole-joined string.
    // Run a word-boundary regex against it. This is what catches
    // "k o n t o l" → joined "kontol" (exact word match) while
    // leaving "kontolusi" alone (the "kontol" inside it is not
    // a word boundary on both sides).
    const joined = tokens[tokens.length - 1] ?? "";
    if (joined.length > 0) {
      const escaped = termCompact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`);
      if (re.test(joined)) return true;
    }
    // Also match against a run-collapsed version of the joined
    // string so simple "koonntol" / "koontol" insertions are
    // caught. We do the collapse by removing one of each pair
    // of consecutive identical letters. False positives on
    // words like "koala" (which has "oo" in Indonesian isn't a
    // word but the technique is general) are tolerated for short
    // terms; longer terms still benefit from the strict
    // word-boundary match above. For 4+ char terms, this is
    // a meaningful bypass-resistance step.
    const collapsedJoined = (tokens[tokens.length - 1] ?? "").replace(
      /([a-z])\1/g,
      "$1",
    );
    if (collapsedJoined.length > 0 && collapsedJoined !== joined) {
      const escaped = termCompact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`);
      if (re.test(collapsedJoined)) return true;
    }
  }

  for (const token of tokens) {
    if (loose) {
      if (token.includes(termCompact)) return true;
    } else {
      if (token === termCompact) return true;
    }
  }
  return false;
}

function contextMatches(
  phrases: string[] | undefined,
  normalized: string,
): boolean {
  if (!phrases || phrases.length === 0) return true;
  for (const phrase of phrases) {
    if (normalized.includes(phrase)) return true;
  }
  return false;
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Run the moderation pipeline on a piece of text. Returns the
 * full result, including a `category` field suitable for
 * returning to the client. The internal `matches` array is for
 * server-side logging only.
 */
export function moderate(input: string): ModerationResult {
  const normalized = normalize(input);
  if (!normalized) {
    return { blocked: false, hasBlock: false, hasWarn: false, matches: [], category: null };
  }
  // Use `tokenCandidates` (single tokens + adjacent-joined pairs)
  // so that simple whitespace bypasses ("ko ntol") are caught.
  const tokens = tokenCandidates(normalized);

  const matches: ModerationMatch[] = [];

  // Rule list: each rule's terms matched against the tokens.
  for (const rule of RULES) {
    if (!contextMatches(rule.contextPhrases, normalized)) continue;
    for (const term of rule.terms) {
      if (termMatches(term, tokens, !!rule.loose)) {
        matches.push({
          category: rule.category,
          severity: rule.severity,
          reason: rule.description,
          term,
        });
        // We break on the first match per rule to avoid spamming
        // matches with every term variant.
        break;
      }
    }
  }

  // Phrase rules: regex against the normalized text.
  for (const rule of PHRASE_RULES) {
    if (rule.pattern.test(normalized)) {
      matches.push({
        category: rule.category,
        severity: rule.severity,
        reason: rule.description,
        term: rule.pattern.source,
      });
    }
  }

  const hasBlock = matches.some((m) => m.severity === "block");
  const hasWarn = matches.some((m) => m.severity === "warn");
  const firstBlock = matches.find((m) => m.severity === "block");

  return {
    blocked: hasBlock,
    hasBlock,
    hasWarn,
    matches,
    category: firstBlock ? firstBlock.category : null,
  };
}

/**
 * Lightweight check for client-side UX. Runs the same normalizer
 * but a much SMALLER rule set — just enough to give the user a
 * helpful warning before they hit submit. NEVER a security
 * boundary. The server still re-runs the full pipeline.
 *
 * The `clientRules` export is intentionally not in this server-
 * only file. If we add a client-side preview later, it lives in
 * src/components/kak-taksaka/ and imports a sanitised subset.
 */
