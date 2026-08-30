/**
 * NVIDIA NIM provider.
 *
 * Docs: https://docs.api.nvidia.com/nim/reference/
 * Endpoint: https://integrate.api.nvidia.com/v1/chat/completions
 * Auth: Bearer API key.
 */
import "server-only";

import {
  TaksakaUpstreamError,
  type ChatMessage,
} from "../types";

const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

export interface NvidiaConfig {
  apiKey: string;
  model: string;
}

export function isNvidiaConfigured(cfg: NvidiaConfig | undefined): cfg is NvidiaConfig {
  return Boolean(cfg && cfg.apiKey && cfg.model);
}

export async function nvidiaComplete(
  cfg: NvidiaConfig,
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
    throw new TaksakaUpstreamError("nvidia rate limited", {
      cooldownSeconds: 60,
    });
  }
  if (res.status === 408) {
    throw new TaksakaUpstreamError("nvidia timeout", {
      cooldownSeconds: 30,
    });
  }
  if (res.status === 401 || res.status === 403) {
    throw new TaksakaUpstreamError("nvidia auth failed", {
      fatal: true,
    });
  }
  if (res.status >= 500) {
    throw new TaksakaUpstreamError(`nvidia ${res.status}`, {
      cooldownSeconds: 30,
    });
  }
  if (!res.ok) {
    throw new TaksakaUpstreamError(`nvidia ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new TaksakaUpstreamError("nvidia empty response");
  }
  return content;
}
