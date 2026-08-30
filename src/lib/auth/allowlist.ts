/**
 * OSAMA Panel email allowlist.
 *
 * The brief is strict: ONLY two accounts may ever receive an OTP —
 * the official OSAMA and PAGASKA accounts. No public registration,
 * no admin self-service, no "create user" endpoint.
 *
 * The allowlist is sourced from a server-only environment variable,
 * never bundled to the client. The list itself is NOT returned to
 * the browser in any API response — only a boolean is allowed.
 *
 * Configuration:
 *   OSAMA_ALLOWED_EMAILS="osama@osis.example,pagaska@osis.example"
 *
 * Comparisons are case-insensitive and whitespace-trimmed.
 */
import "server-only";

let cached: Set<string> | null = null;

function load(): Set<string> {
  if (cached) return cached;
  const raw = process.env.OSAMA_ALLOWED_EMAILS ?? "";
  const list = raw
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  cached = new Set(list);
  return cached;
}

/**
 * Returns true iff `email` is on the allowlist. Never throws; never
 * reveals why an email is rejected.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return load().has(normalized);
}

/**
 * True iff the allowlist is configured with at least one address.
 * Used at startup to fail fast on misconfiguration rather than
 * silently locking everyone out.
 */
export function isAllowlistConfigured(): boolean {
  return load().size > 0;
}
