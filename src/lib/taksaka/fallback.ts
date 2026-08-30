/**
 * Final fallback response.
 *
 * If all providers fail, we still need to return something useful.
 * This is the "graceful degraded" message — a single safe sentence
 * that does not leak any internal information.
 *
 * This is server-only so the exact copy and behavior can be tweaked
 * without affecting the client.
 */
import "server-only";

export const TAKSAKA_FALLBACK_MESSAGE =
  "Maaf, Kak Taksaka sedang mengalami sedikit kendala. Coba tanyakan lagi sebentar yaa.";

/**
 * Detect whether a message is essentially the fallback text. Used by
 * the API to skip processing narratives on the response.
 */
export function isFallbackMessage(content: string): boolean {
  return content.trim() === TAKSAKA_FALLBACK_MESSAGE;
}
