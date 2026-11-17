import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { consumeRateLimit } from "@/lib/rateLimit.server";

/** After the shared counter fails, use the in-memory one for a while instead of retrying every request. */
const BACKOFF_AFTER_ERROR_MS = 60_000;
const BACKOFF_WHEN_NOT_SET_UP_MS = 10 * 60_000;
let sharedUnavailableUntil = 0;
let warned = false;

/** Keys contain IPs, phone numbers or emails; only a hash is stored. */
export function hashRateLimitKey(key) {
  return createHash("sha256").update(String(key)).digest("hex");
}

function isNotSetUp(error) {
  // Function or table missing: migration 046 not applied yet.
  return ["42883", "42P01", "PGRST202", "PGRST205"].includes(error?.code);
}

/** For tests: forget a previous outage. */
export function resetSharedRateLimitState() {
  sharedUnavailableUntil = 0;
  warned = false;
}

/**
 * Count one request in the database so every server instance shares the same limit.
 * Falls back to the in-memory counter if the database is unavailable or not set up,
 * so a database problem never blocks real users.
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: number, shared: boolean }>}
 */
export async function consumeSharedRateLimit(key, limit, windowMs, { client, now = Date.now() } = {}) {
  const db = client === undefined ? getSupabaseAdmin() : client;

  if (db && now >= sharedUnavailableUntil) {
    try {
      const { data, error } = await db.rpc("consume_rate_limit", {
        p_key: hashRateLimitKey(key),
        p_limit: limit,
        p_window_ms: windowMs,
      });
      if (!error) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const resetAt = Date.parse(row.reset_at);
          return {
            allowed: Boolean(row.allowed),
            remaining: Number(row.remaining) || 0,
            resetAt: Number.isFinite(resetAt) ? resetAt : now + windowMs,
            shared: true,
          };
        }
      } else {
        sharedUnavailableUntil = now + (isNotSetUp(error) ? BACKOFF_WHEN_NOT_SET_UP_MS : BACKOFF_AFTER_ERROR_MS);
        if (!warned) {
          warned = true;
          console.warn(
            isNotSetUp(error)
              ? "[RateLimit] Shared limits need migration 046_shared_rate_limits.sql; using per-server limits for now."
              : `[RateLimit] Shared limit check failed (${error.message}); using per-server limits for now.`
          );
        }
      }
    } catch (err) {
      sharedUnavailableUntil = now + BACKOFF_AFTER_ERROR_MS;
      if (!warned) {
        warned = true;
        console.warn(`[RateLimit] Shared limit check failed (${err?.message}); using per-server limits for now.`);
      }
    }
  }

  return { ...consumeRateLimit(key, limit, windowMs), shared: false };
}
