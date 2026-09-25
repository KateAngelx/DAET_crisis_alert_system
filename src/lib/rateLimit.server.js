/** In-memory sliding-window rate limiter (per server instance). */

const buckets = new Map();
const MAX_BUCKETS = 20_000;
let lastPrune = 0;
const PRUNE_INTERVAL_MS = 60_000;

function pruneExpired(now) {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    const keys = buckets.keys();
    for (let i = 0; i < overflow; i += 1) {
      const k = keys.next();
      if (k.done) break;
      buckets.delete(k.value);
    }
  }
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.slice(0, 64);
  return "unknown";
}

/**
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function consumeRateLimit(key, limit, windowMs) {
  const now = Date.now();
  pruneExpired(now);
  const safeKey = String(key).slice(0, 256);
  const entry = buckets.get(safeKey);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(safeKey, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}
