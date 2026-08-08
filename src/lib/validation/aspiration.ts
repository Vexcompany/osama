/**
 * Aspiration validation schemas.
 *
 * Single source of truth for what a valid aspiration looks like.
 * The same schema is imported by the client form (for instant feedback)
 * and by the server route (for authoritative validation).
 *
 * Limits match the brief:
 *  - topic: 1..80 chars
 *  - message: 1..500 chars
 */
import { z } from "zod";

export const TOPIC_MAX = 80;
export const MESSAGE_MAX = 500;

// Boolean with a runtime default of `true` but a clean `boolean` type.
// (z.boolean().default(true) narrows the output to the literal `true`
// in newer zod versions, which breaks downstream `boolean` expectations.)
const booleanWithDefault = (def: boolean) =>
  z
    .unknown()
    .transform((v): boolean => (typeof v === "boolean" ? v : def));

export const aspirationSchema = z.object({
  topic: z
    .string({ required_error: "Topik wajib diisi." })
    .trim()
    .min(1, "Topik wajib diisi.")
    .max(TOPIC_MAX, `Topik maksimal ${TOPIC_MAX} karakter.`),
  message: z
    .string({ required_error: "Isi aspirasi wajib diisi." })
    .trim()
    .min(1, "Isi aspirasi wajib diisi.")
    .max(MESSAGE_MAX, `Isi aspirasi maksimal ${MESSAGE_MAX} karakter.`),
  anonymous: booleanWithDefault(true),
});

export type AspirationInput = z.infer<typeof aspirationSchema>;

/**
 * The full payload the API actually receives, including anti-spam fields
 * that the UI never renders (honeypot).
 *
 * We accept the honeypot as an arbitrary string key — the API does the
 * lookup at parse time so the schema doesn't need to know the field
 * name statically. This keeps the env var configurable.
 */
export const aspirationSubmitSchema = z
  .object({
    topic: aspirationSchema.shape.topic,
    message: aspirationSchema.shape.message,
    anonymous: aspirationSchema.shape.anonymous,
  })
  // The honeypot field is dynamic; pass-through anything else as unknown
  // and we look it up manually after parsing.
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
