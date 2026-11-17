import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit.server";
import { consumeSharedRateLimit } from "@/lib/sharedRateLimit.server";

/** Named limits — tune via env overrides where noted. */
export const API_RATE_LIMITS = {
  // Each place may need up to 3 searches (Daet, province, country); results are cached server-side.
  geocode: { limit: 60, windowMs: 60_000 },
  feedbackGet: { limit: 60, windowMs: 60_000 },
  feedbackPost: { limit: 8, windowMs: 60 * 60_000 },
  // Walk-in (no account) incident reports: per IP, and per phone/email per day.
  guestIncident: { limit: 3, windowMs: 60 * 60_000 },
  guestIncidentContact: { limit: 5, windowMs: 24 * 60 * 60_000 },
  pageView: { limit: 120, windowMs: 60 * 60_000 },
  forgotPassword: { limit: 5, windowMs: 60 * 60_000 },
  register: { limit: 8, windowMs: 60 * 60_000 },
  ensureProfile: { limit: 40, windowMs: 60_000 },
  heartbeat: { limit: 24, windowMs: 60 * 60_000 },
  dispatch: { limit: 40, windowMs: 60_000 },
  assignmentRespond: { limit: 20, windowMs: 60_000 },
  publicStats: { limit: 40, windowMs: 60_000 },
  adminBroadcast: { limit: 10, windowMs: 60_000 },
  adminSmsTest: { limit: 6, windowMs: 60_000 },
  adminExport: { limit: 10, windowMs: 60_000 },
  deleteAccount: { limit: 3, windowMs: 60 * 60_000 },
  notificationChannels: { limit: 30, windowMs: 60_000 },
  guideAssistanceRequest: { limit: 5, windowMs: 60 * 60_000 },
};

function rateLimitJson(retryAfterSec, message = "Too many requests. Please try again later.") {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * Returns a 429 NextResponse when limited, otherwise null.
 * @param {Request} request
 * @param {{ name: string, limit: number, windowMs: number, keyPart?: string }} config
 */
export function enforceRateLimit(request, { name, limit, windowMs, keyPart = "" }) {
  const ip = getClientIp(request);
  const suffix = keyPart ? `:${keyPart}` : "";
  const key = `rl:${name}:${ip}${suffix}`;
  const result = consumeRateLimit(key, limit, windowMs);
  if (result.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return rateLimitJson(retryAfter);
}

export function enforceRateLimitByKey(keyPart, { name, limit, windowMs }) {
  const key = `rl:${name}:${keyPart}`;
  const result = consumeRateLimit(key, limit, windowMs);
  if (result.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return rateLimitJson(retryAfter);
}

/**
 * Like enforceRateLimit, but counted in the database so the limit holds across every
 * server instance. Use for public, abuse-prone forms (sign-up, password reset, feedback,
 * guest reports). Must be awaited.
 */
export async function enforceSharedRateLimit(request, { name, limit, windowMs, keyPart = "" }) {
  const ip = getClientIp(request);
  const suffix = keyPart ? `:${keyPart}` : "";
  const result = await consumeSharedRateLimit(`rl:${name}:${ip}${suffix}`, limit, windowMs);
  if (result.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return rateLimitJson(retryAfter);
}

/** Shared (database) version of enforceRateLimitByKey. Must be awaited. */
export async function enforceSharedRateLimitByKey(keyPart, { name, limit, windowMs }) {
  const result = await consumeSharedRateLimit(`rl:${name}:${keyPart}`, limit, windowMs);
  if (result.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return rateLimitJson(retryAfter);
}
