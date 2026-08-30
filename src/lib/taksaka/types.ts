/**
 * Types shared by the server-side Taksaka pipeline.
 *
 * All modules under src/lib/taksaka are server-only. Nothing here
 * is intended to leak to the client bundle.
 */
import "server-only";

/** A single turn in a conversation. */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** What the router eventually hands back to the API route. */
export interface TaksakaResult {
  /** The final assistant message. */
  message: string;
  /**
   * Total number of providers attempted. Surfaced for server logs
   * only; not returned to the client.
   */
  attempts: number;
  /**
   * Which provider ultimately answered. Server logs only; never
   * returned to the client.
   */
  provider: string;
}

export interface TaksakaRequest {
  messages: ChatMessage[];
}

export class TaksakaUpstreamError extends Error {
  /** True when the failure is a config/auth issue that should NOT
   *  trigger an automatic fallback to the next provider. */
  readonly fatal: boolean;
  /** Cooldown hint (seconds) for the provider that just failed. */
  readonly cooldownSeconds: number;

  constructor(
    message: string,
    opts: { fatal?: boolean; cooldownSeconds?: number } = {},
  ) {
    super(message);
    this.fatal = opts.fatal ?? false;
    this.cooldownSeconds = opts.cooldownSeconds ?? 0;
    this.name = "TaksakaUpstreamError";
  }
}

export class TaksakaAllProvidersFailed extends Error {
  constructor(message = "all providers failed") {
    super(message);
    this.name = "TaksakaAllProvidersFailed";
  }
}
