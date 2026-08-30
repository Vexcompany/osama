/**
 * Text normalization for moderation.
 *
 * Lives in its own file (no `server-only` marker) so the
 * client-side preview module can use the SAME normalizer as the
 * server pipeline. The rule list itself stays server-only.
 */

/**
 * Normalize text for moderation checks. The output is the only
 * string the rule engine ever sees. The original input is NOT
 * modified — we work on a copy.
 *
 * Steps:
 *   1. Unicode NFKD decomposition so accented characters become
 *      base + combining marks; we then strip the combining marks
 *      to defeat trivial "kòntòl" bypasses.
 *   2. Lowercase.
 *   3. Strip a small set of leetspeak substitutions: 0→o, 1→i/l,
 *      3→e, 4→a, 5→s, 7→t, 8→b, 9→g, @→a, $→s, !→i, |→i.
 *   4. Collapse runs of 3+ identical characters down to a single
 *      character. "konnntol" → "kontol" (and "konnnnnnnnnnnnnnnnnnntol"
 *      → "kontol"). Using length-1 collapse keeps the rule's token
 *      dictionary meaningful; length-2 would produce "konntol" which
 *      still doesn't match "kontol".
 *   5. Replace any non-letter, non-digit, non-space character with
 *      a single space. This handles "k.o.n.t.o.l" and "k o n t o l"
 *      uniformly.
 *   6. Collapse whitespace.
 *   7. Trim.
 */
export function normalize(input: string): string {
  if (!input) return "";
  const decomposed = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const lowered = decomposed.toLowerCase();
  const leet = lowered
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/9/g, "g")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/\|/g, "i");
  const collapsed = leet.replace(/(.)\1{2,}/g, "$1");
  const cleaned = collapsed.replace(/[^a-z\s]+/g, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Split the normalized text into word tokens. We use a simple
 * space split — normalization already stripped everything that
 * isn't a letter or space.
 */
export function tokenize(normalized: string): string[] {
  if (!normalized) return [];
  return normalized.split(" ").filter((t) => t.length > 0);
}

/**
 * Generate the candidate token list for moderation matching.
 *
 * Some bypasses insert whitespace into a banned word: "ko ntol"
 * or "k o n t o l". A naive tokenization gives us ["ko", "ntol"]
 * or ["k", "o", "n", "t", "o", "l"] — neither contains "kontol".
 *
 * To catch these, we ALSO produce joined adjacent tokens. We
 * join in windows of 2 AND 3 so that "k o n t o l" yields a
 * "kontol" candidate. (A 6-character word that has been split
 * by spaces can be recovered with a 3-window join of the
 * correct subsequence.) The matching logic also compares with
 * spaces stripped, so a 2-token term like "anjing kamu" matches
 * the single concatenated token "anjingkamu".
 */
export function tokenCandidates(normalized: string): string[] {
  const base = tokenize(normalized);
  if (base.length < 2) return base;

  const out = [...base];
  for (let i = 0; i < base.length - 1; i++) {
    out.push(base[i] + base[i + 1]);
  }
  for (let i = 0; i < base.length - 2; i++) {
    out.push(base[i] + base[i + 1] + base[i + 2]);
  }
  // Also include the whole joined string so that split-with-
  // separator bypasses like "k.o.n.t.o.l" → "k o n t o l" can
  // be matched as a single contiguous unit.
  out.push(base.join(""));
  return out;
}
