/** Canonical public site URL for auth redirects and email links */
export function getSiteUrl(request) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const origin = request?.headers?.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  const host = request?.headers?.get("x-forwarded-host") || request?.headers?.get("host");
  const proto = request?.headers?.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  return "http://localhost:3000";
}
