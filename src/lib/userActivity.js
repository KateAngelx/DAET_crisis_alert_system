/** Shared user activity thresholds and helpers */

export const ONLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const INACTIVE_THRESHOLD_DAYS = 30;

export function getLastActivityAt(profile) {
  const candidates = [profile?.last_seen_at, profile?.last_login_at, profile?.created_at].filter(Boolean);
  if (candidates.length === 0) return null;
  return candidates.reduce((latest, ts) => {
    const t = new Date(ts).getTime();
    return t > latest ? t : latest;
  }, 0);
}

export function isUserOnline(profile, nowMs = Date.now()) {
  if (!profile?.last_seen_at) return false;
  return nowMs - new Date(profile.last_seen_at).getTime() <= ONLINE_THRESHOLD_MS;
}

export function getInactiveDays(profile, nowMs = Date.now()) {
  const last = getLastActivityAt(profile);
  if (!last) return null;
  return Math.floor((nowMs - last) / (24 * 60 * 60 * 1000));
}

export function isInactiveOverThreshold(profile, thresholdDays = INACTIVE_THRESHOLD_DAYS, nowMs = Date.now()) {
  const days = getInactiveDays(profile, nowMs);
  if (days === null) return false;
  return days >= thresholdDays;
}

export function isSmsSuspended(profile) {
  return Boolean(profile?.sms_suspended_at);
}
