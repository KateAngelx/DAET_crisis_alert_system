/** Dedupe public analytics fetches on pages that mount multiple KPI widgets (mobile-friendly). */

const TTL_MS = 60_000;
let cachedAt = 0;
let cachedStats = null;
let inflight = null;

export async function fetchPublicStatsCached() {
  const now = Date.now();
  if (cachedStats && now - cachedAt < TTL_MS) {
    return cachedStats;
  }
  if (inflight) return inflight;

  inflight = fetch("/api/analytics/public-stats", { cache: "no-store" })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load stats");
      cachedStats = data.stats ?? null;
      cachedAt = Date.now();
      return cachedStats;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
