/**
 * Cloudflare Workers AI provider.
 *
 * Docs: https://developers.cloudflare.com/workers-ai/api-reference/
 * Auth: Bearer API token.
 * URL pattern: https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}
 *
 * Cloudflare's REST API is called directly from this Vercel app.
 * No separate Worker is deployed.
 */
import "server-only";

import {
  TaksakaUpstreamError,
  type ChatMessage,
} from "../types";

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  model: string;
}

export function isCloudflareConfigured(
  cfg: CloudflareConfig | undefined,
): cfg is CloudflareConfig {
  return Boolean(cfg && cfg.accountId && cfg.apiToken && cfg.model);
}

export async function cloudflareComplete(
  cfg: CloudflareConfig,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<string> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    cfg.accountId,
  )}/ai/run/${encodeURIComponent(cfg.model)}`;

  // Cloudflare Workers AI uses a slightly different schema. We pass
  // an OpenAI-compatible shape via the `messages` field; CF supports
  // this for chat models in the `/ai/run/{model}` endpoint.
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiToken}`,
    },
    body: JSON.stringify({
      messages,
      max_tokens: 600,
      temperature: 0.7,
    }),
    signal,
  });

  if (res.status === 429) {
    throw new TaksakaUpstreamError("cloudflare rate limited", {
      cooldownSeconds: 60,
    });
  }
  if (res.status === 408) {
    throw new TaksakaUpstreamError("cloudflare timeout", {
      cooldownSeconds: 30,
    });
  }
  if (res.status === 401 || res.status === 403) {
    throw new TaksakaUpstreamError("cloudflare auth failed", {
      fatal: true,
    });
  }
  if (res.status >= 500) {
    throw new TaksakaUpstreamError(`cloudflare ${res.status}`, {
      cooldownSeconds: 30,
    });
  }
  if (!res.ok) {
    throw new TaksakaUpstreamError(`cloudflare ${res.status}`);
  }

  // Cloudflare returns { success, result: { response: "..." } } for
  // text generation, but newer chat-compatible models may return
  // { result: { response: "..." } } or { result: { choices: [...] } }.
  const data = (await res.json()) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?:
      | string
      | { response?: string; choices?: Array<{ message?: { content?: string } }> };
  };

  if (data.success === false) {
    const msg = data.errors?.[0]?.message ?? "cloudflare returned error";
    throw new TaksakaUpstreamError(msg, { fatal: true });
  }

  let content: string | undefined;
  if (typeof data.result === "string") {
    content = data.result;
  } else if (data.result && typeof data.result === "object") {
    content =
      data.result.response ??
      data.result.choices?.[0]?.message?.content ??
      undefined;
  }

  if (typeof content !== "string" || content.length === 0) {
    throw new TaksakaUpstreamError("cloudflare empty response");
  }
  return content;
}
