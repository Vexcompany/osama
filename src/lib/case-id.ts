/**
 * Internal Case ID generator.
 *
 * Brief requirements:
 *  - Generated on the server.
 *  - Not sequential (no 1, 2, 3).
 *  - Hard to guess.
 *  - Used as a reference identifier in the success state (V1 UI
 *    revision) and by the OSAMA panel in V2.
 *
 * Format: OSM-<base32 of 10 random bytes>-<base32 of unix seconds mod>
 *         e.g. OSM-A3K9Z7XQ2P-7M4F
 *
 * The "OSM" prefix is mandatory and consistent across the database,
 * the success state, the OSAMA panel, and any detail view. Do not
 * change it without coordinating with the OSAMA panel.
 *
 * The base32 alphabet is Crockford's (no I/L/O/U to avoid confusion) and
 * we strip padding. We use the Web Crypto API which is available in both
 * Node 22 and the Edge runtime.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32

function toBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]!;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function generateCaseId(): string {
  const random = new Uint8Array(10);
  crypto.getRandomValues(random);
  const randPart = toBase32(random).slice(0, 10);

  // Time component — encoded as 4 base32 chars from unix ms, mixes in
  // some entropy from the random bytes so it isn't strictly sequential.
  const t = Date.now();
  const tBytes = new Uint8Array(4);
  new DataView(tBytes.buffer).setUint32(0, t >>> 0, false);
  // XOR with a slice of random for additional mixing
  tBytes[0] ^= random[0] ?? 0;
  tBytes[1] ^= random[1] ?? 0;
  tBytes[2] ^= random[2] ?? 0;
  tBytes[3] ^= random[3] ?? 0;
  const timePart = toBase32(tBytes).slice(0, 6);

  return `OSM-${randPart}-${timePart}`;
}
