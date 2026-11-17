/** Scheduled-job secret checks (no Next.js imports, so tests can load it). */
import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison so the secret cannot be guessed from response timing. */
export function secretsMatch(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The secret a scheduler sent: `x-cron-secret`, or `Authorization: Bearer …` (what Vercel Cron sends). */
export function readCronToken(request) {
  const header = request.headers.get("x-cron-secret");
  if (header) return header;
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
}

/**
 * Decide whether a scheduled-job request is allowed.
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function checkCronSecret(request, env = process.env) {
  const secret = env.CRON_SECRET || env.NOTIFICATION_INTERNAL_SECRET;
  if (!secret) return { ok: false, status: 503, error: "CRON_SECRET is not configured" };
  if (!secretsMatch(readCronToken(request), secret)) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true };
}

