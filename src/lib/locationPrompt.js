/** When to ask a tourist to share their location (the "Are you in Daet?" prompt). */

export const LOCATION_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const locationPromptKey = (userId) => `connect-daet:location-prompt:${userId}`;
export const startGuideDoneKey = (userId) => `connect-daet-start-guide-skipped:${userId}`;

/** Pages where the prompt would get in the way (sign-in, staff portals, the offline page). */
const QUIET_PATHS = [/^\/login/, /^\/register/, /^\/forgot-password/, /^\/reset-password/, /^\/admin/, /^\/guide/, /^\/crisis\/(command|roads|hazards)/, /^\/~offline/];

/**
 * @param {object} p
 * @param {string} p.role             signed-in user's role
 * @param {boolean} p.sharing         location sharing already on
 * @param {number|null} p.snoozedUntil "Not now" pressed until this time (ms)
 * @param {boolean} p.startGuideDone  the tourist start guide was finished or skipped
 * @param {string} p.permission       browser geolocation permission: granted | prompt | denied | unknown
 * @param {boolean} p.geolocation     the browser can share location at all
 * @param {string} p.path
 * @param {number} [p.nowMs]
 */
export function shouldShowLocationPrompt({ role, sharing, snoozedUntil, startGuideDone, permission, geolocation, path, nowMs = Date.now() }) {
  if (role !== "tourist" || sharing) return false;
  if (!geolocation || permission === "denied") return false; // blocked in the browser: don't nag
  if (!startGuideDone) return false; // one popup at a time
  if (snoozedUntil && nowMs < snoozedUntil) return false;
  if (QUIET_PATHS.some((re) => re.test(path || ""))) return false;
  return true;
}
