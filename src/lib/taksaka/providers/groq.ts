/**
 * Groq provider.
 *
 * Docs: https://console.groq.com/docs/api-reference
 * Endpoint: https://api.groq.com/openai/v1/chat/completions
 * Auth: Bearer API key.
 */
import "server-only";

import {
  TaksakaUpstreamError,
  type ChatMessage,
} from "../types";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqConfig {
  apiKey: string;
  model: string;
}

export function isGroqConfigured(cfg: GroqConfig | undefined): cfg is GroqConfig {
  return Boolean(cfg && cfg.apiKey && cfg.model);
}

export async function groqComplete(
  cfg: GroqConfig,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.7,
      max_tokens: 600,
    }),
    signal,
  });

  if (res.status === 429) {
    throw new TaksakaUpstreamError("groq rate limited", {
      cooldownSeconds: 60,
    });
  }
  if (res.status === 408) {
    throw new TaksakaUpstreamError("groq timeout", {
      cooldownSeconds: 30,
    });
  }
  if (res.status === 401 || res.status === 403) {
    throw new TaksakaUpstreamError("groq auth failed", {
      fatal: true,
    });
  }
  if (res.status >= 500) {
    throw new TaksakaUpstreamError(`groq ${res.status}`, {
      cooldownSeconds: 30,
    });
  }
  if (!res.ok) {
    throw new TaksakaUpstreamError(`groq ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new TaksakaUpstreamError("groq empty response");
  }
  return content;
}
