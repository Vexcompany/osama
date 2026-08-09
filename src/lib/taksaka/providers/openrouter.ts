/**
 * OpenRouter provider.
 *
 * Docs: https://openrouter.ai/docs
 * Auth: Bearer API key.
 * 429 / 5xx → throw TaksakaUpstreamError(retryable=true).
 * 401 / 403 → throw TaksakaUpstreamError(fatal=true).
 */
import "server-only";

import {
  TaksakaUpstreamError,
  type ChatMessage,
} from "../types";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
}

export function isOpenRouterConfigured(cfg: OpenRouterConfig | undefined): cfg is OpenRouterConfig {
  return Boolean(cfg && cfg.apiKey && cfg.model);
}

export async function openRouterComplete(
  cfg: OpenRouterConfig,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      // Recommended by OpenRouter; harmless to include.
      "HTTP-Referer": "https://osama.my.id",
      "X-Title": "Kak Taksaka",
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
    throw new TaksakaUpstreamError("openrouter rate limited", {
      cooldownSeconds: 60,
    });
  }
  if (res.status === 408) {
    throw new TaksakaUpstreamError("openrouter timeout", {
      cooldownSeconds: 30,
    });
  }
  if (res.status === 401 || res.status === 403) {
    throw new TaksakaUpstreamError("openrouter auth failed", {
      fatal: true,
    });
  }
  if (res.status >= 500) {
    throw new TaksakaUpstreamError(`openrouter ${res.status}`, {
      cooldownSeconds: 30,
    });
  }
  if (!res.ok) {
    throw new TaksakaUpstreamError(`openrouter ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new TaksakaUpstreamError("openrouter empty response");
  }
  return content;
}
