/**
 * Basic in-memory rate limiter, keyed by client IP.
 *
 * V1 scope: a soft guard against casual spam. V2 will swap this for
 * Upstash/Redis so limits are shared across instances.
 *
 * The map is intentionally bounded (we cap the number of tracked IPs)
 * to avoid unbounded memory growth in long-running Node processes.
 */
import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_KEYS = 5_000;

const buckets = new Map<string, Bucket>();

function now(): number {
  return Date.now();
}

function windowMs(): number {
  const v = Number.parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "60", 10);
  return Number.isFinite(v) && v > 0 ? v * 1000 : 60_000;
}

function maxRequests(): number {
  const v = Number.parseInt(process.env.RATE_LIMIT_MAX ?? "3", 10);
  return Number.isFinite(v) && v > 0 ? v : 3;
}

function evictIfNeeded(): void {
  if (buckets.size <= MAX_KEYS) return;
  // Cheap eviction: drop the oldest 10% by resetAt.
  const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  const drop = Math.ceil(MAX_KEYS * 0.1);
  for (let i = 0; i < drop; i++) {
    const entry = sorted[i];
    if (entry) buckets.delete(entry[0]);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Returns whether a request from `key` is allowed and when the bucket resets.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const t = now();
  const w = windowMs();
  const max = maxRequests();

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= t) {
    buckets.set(key, { count: 1, resetAt: t + w });
    evictIfNeeded();
    return { ok: true, remaining: max - 1, resetAt: t + w };
  }

  existing.count += 1;
  const ok = existing.count <= max;
  return {
    ok,
    remaining: Math.max(0, max - existing.count),
    resetAt: existing.resetAt,
  };
}
