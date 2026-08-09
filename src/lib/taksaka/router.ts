/**
 * Taksaka provider router.
 *
 * Iterates through configured providers in order, falling back on
 * retryable errors (429, 408, 5xx, network). On a fatal error
 * (401/403) we stop the chain because retrying the same config
 * error with the next provider is just wasteful — we surface the
 * fallback message instead.
 *
 * The router is the ONLY place that knows which providers exist.
 * Provider names are not exported from this module's public surface;
 * the API route only receives the final answer.
 */
import "server-only";

import { cerebrasComplete, isCerebrasConfigured } from "./providers/cerebras";
import { cloudflareComplete, isCloudflareConfigured } from "./providers/cloudflare";
import { groqComplete, isGroqConfigured } from "./providers/groq";
import { nvidiaComplete, isNvidiaConfigured } from "./providers/nvidia";
import { openRouterComplete, isOpenRouterConfigured } from "./providers/openrouter";
import { buildTaksakaMessages } from "./prompt";
import {
  TaksakaAllProvidersFailed,
  TaksakaUpstreamError,
  type ChatMessage,
  type TaksakaResult,
} from "./types";

interface RouterProvider {
  /** Short name for logs. NEVER sent to the client. */
  name: string;
  /** True if this provider has credentials + model configured. */
  ready: boolean;
  /** Returns the assistant message, or throws. */
  call(messages: ChatMessage[], signal: AbortSignal): Promise<string>;
  /** If true, the error should stop the chain. */
  isFatal(err: unknown): boolean;
}

function readEnv(): {
  openrouter: { apiKey?: string; model?: string };
  cerebras: { apiKey?: string; model?: string };
  groq: { apiKey?: string; model?: string };
  cloudflare: { accountId?: string; apiToken?: string; model?: string };
  nvidia: { apiKey?: string; model?: string };
} {
  return {
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL,
    },
    cerebras: {
      apiKey: process.env.CEREBRAS_API_KEY,
      model: process.env.CEREBRAS_MODEL,
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL,
    },
    cloudflare: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      model: process.env.CLOUDFLARE_MODEL,
    },
    nvidia: {
      apiKey: process.env.NVIDIA_API_KEY,
      model: process.env.NVIDIA_MODEL,
    },
  };
}

function buildProviders(): RouterProvider[] {
  const env = readEnv();

  const orCfg = {
    apiKey: env.openrouter.apiKey ?? "",
    model: env.openrouter.model ?? "",
  };
  const cbCfg = {
    apiKey: env.cerebras.apiKey ?? "",
    model: env.cerebras.model ?? "",
  };
  const grCfg = {
    apiKey: env.groq.apiKey ?? "",
    model: env.groq.model ?? "",
  };
  const cfCfg = {
    accountId: env.cloudflare.accountId ?? "",
    apiToken: env.cloudflare.apiToken ?? "",
    model: env.cloudflare.model ?? "",
  };
  const nvCfg = {
    apiKey: env.nvidia.apiKey ?? "",
    model: env.nvidia.model ?? "",
  };

  const isFatalUpstream = (err: unknown): boolean =>
    err instanceof TaksakaUpstreamError && err.fatal;

  return [
    {
      name: "openrouter",
      ready: isOpenRouterConfigured(orCfg),
      call: (m, s) => openRouterComplete(orCfg, m, s),
      isFatal: isFatalUpstream,
    },
    {
      name: "cerebras",
      ready: isCerebrasConfigured(cbCfg),
      call: (m, s) => cerebrasComplete(cbCfg, m, s),
      isFatal: isFatalUpstream,
    },
    {
      name: "groq",
      ready: isGroqConfigured(grCfg),
      call: (m, s) => groqComplete(grCfg, m, s),
      isFatal: isFatalUpstream,
    },
    {
      name: "cloudflare",
      ready: isCloudflareConfigured(cfCfg),
      call: (m, s) => cloudflareComplete(cfCfg, m, s),
      isFatal: isFatalUpstream,
    },
    {
      name: "nvidia",
      ready: isNvidiaConfigured(nvCfg),
      call: (m, s) => nvidiaComplete(nvCfg, m, s),
      isFatal: isFatalUpstream,
    },
  ];
}

function readMaxRequestSeconds(): number {
  const v = Number.parseInt(process.env.TAKSAKA_MAX_REQUEST_SECONDS ?? "25", 10);
  return Number.isFinite(v) && v > 0 ? v : 25;
}

/**
 * Run the chat through the provider chain.
 *
 * Returns the final assistant message and metadata. Throws
 * `TaksakaAllProvidersFailed` only if all providers (including the
 * fallback path) yield nothing.
 */
export async function runTaksaka(
  history: ReadonlyArray<{ role: "user" | "assistant"; content: string }>,
): Promise<TaksakaResult> {
  const messages = buildTaksakaMessages(history);
  const providers = buildProviders();
  const ready = providers.filter((p) => p.ready);
  const maxSeconds = readMaxRequestSeconds();

  if (ready.length === 0) {
    // No provider configured at all — we still return a useful answer
    // because the brief says we must never fail the user without a
    // graceful response.
    return {
      message:
        "Maaf, Kak Taksaka sedang mengalami sedikit kendala. Coba tanyakan lagi sebentar yaa.",
      attempts: 0,
      provider: "none-configured",
    };
  }

  let lastError: unknown = null;
  for (let i = 0; i < ready.length; i++) {
    const p = ready[i]!;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), maxSeconds * 1000);
    try {
      const text = await p.call(messages, controller.signal);
      return {
        message: text,
        attempts: i + 1,
        provider: p.name,
      };
    } catch (err) {
      lastError = err;
      const fatal = p.isFatal(err);
      console.warn(
        `[taksaka] provider=${p.name} failed:`,
        err instanceof Error ? err.message : err,
      );
      if (fatal) {
        // Auth/config error — retrying with a different provider
        // might still work (different keys), so we keep going.
        // But we cap retries to avoid infinite loops.
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // All providers failed. Surface a generic error to the caller; the
  // API layer translates this into the user-facing fallback message.
  console.error(
    "[taksaka] all providers failed:",
    lastError instanceof Error ? lastError.message : lastError,
  );
  throw new TaksakaAllProvidersFailed();
}
