/**
 * Aspiration validation schemas.
 *
 * Single source of truth for what a valid aspiration looks like.
 * The same schema is imported by the client form (for instant feedback)
 * and by the server route (for authoritative validation).
 *
 * V1 UI revision: only the `message` field is exposed in the public
 * form. There is no topic, no subject, no anonymous toggle. Anonymity
 * is the only mode; the server derives a `topic` value for the legacy
 * column so the existing database schema does not have to change.
 */
import { z } from "zod";

export const MESSAGE_MAX = 500;

export const aspirationSchema = z.object({
  message: z
    .string({ required_error: "Pesan wajib diisi." })
    .trim()
    .min(1, "Pesan wajib diisi.")
    .max(MESSAGE_MAX, `Pesan maksimal ${MESSAGE_MAX} karakter.`),
});

export type AspirationInput = z.infer<typeof aspirationSchema>;

/**
 * The full payload the API actually receives, including anti-spam fields
 * that the UI never renders (honeypot).
 */
export const aspirationSubmitSchema = z
  .object({
    message: aspirationSchema.shape.message,
  })
  // The honeypot field is dynamic; pass-through anything else and we
  // look it up manually after parsing so the schema doesn't need to
  // know the field name statically.
  .passthrough();

export type AspirationSubmitInput = z.infer<typeof aspirationSubmitSchema>;

export const HONEYPOT_FIELD_NAME =
  process.env.HONEYPOT_FIELD_NAME ?? "website_url";

/**
 * Human-readable field errors keyed by field name. Safe to send to the client.
 */
export type FieldErrors = Partial<Record<keyof AspirationInput, string>>;

/**
 * Parses and validates a raw submit payload. The honeypot is checked
 * separately so we can keep its field name configurable.
 */
export function parseSubmit(raw: unknown):
  | { ok: true; data: AspirationInput }
  | { ok: false; kind: "spam" | "invalid"; fieldErrors: FieldErrors } {
  const parsed = aspirationSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "invalid",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const record = raw as Record<string, unknown> | null;
  const honeypotValue = record?.[HONEYPOT_FIELD_NAME];
  if (typeof honeypotValue === "string" && honeypotValue.length > 0) {
    return { ok: false, kind: "spam", fieldErrors: {} };
  }

  return { ok: true, data: parsed.data };
}

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof AspirationInput | undefined;
    if (key && !out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}
