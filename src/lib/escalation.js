/**
 * Automatic escalation of urgent items nobody has acted on. Shared by the job, settings and tests.
 * It stays inside the Tourism Office: admins are re-alerted, nobody outside is texted.
 */

export const ESCALATION_DEFAULTS = { enabled: true, minutes: 10 };

export const ESCALATION_KIND_LABELS = {
  checkin: "Tourist needs help",
  missing: "Missing tourist",
  incident: "Critical incident report",
  guide_emergency: "Guide emergency report",
};

/** What stops escalation, shown to admins so they know which button to press. */
export const ESCALATION_STOP_ACTION = {
  checkin: "Mark handled",
  missing: "Acknowledge",
  incident: "move it to Received",
  guide_emergency: "Acknowledge",
};

export function normalizeEscalationSettings(raw = {}) {
  const minutes = Math.round(Number(raw.escalation_minutes ?? raw.minutes));
  return {
    enabled: raw.escalation_enabled ?? raw.enabled ?? ESCALATION_DEFAULTS.enabled,
    minutes: Number.isFinite(minutes) ? Math.min(120, Math.max(3, minutes)) : ESCALATION_DEFAULTS.minutes,
  };
}

/**
 * Check settings an admin submitted.
 * @returns {{ ok: true, value } | { ok: false, error: string }}
 */
export function validateEscalationSettings(input) {
  const minutes = Math.round(Number(input?.minutes));
  if (!Number.isFinite(minutes) || minutes < 3 || minutes > 120) {
    return { ok: false, error: "Choose between 3 and 120 minutes." };
  }
  return { ok: true, value: { enabled: input?.enabled !== false, minutes } };
}

/** The level an item should be at now: 0 (just reported), 1 (re-alert admins), 2 (re-alert admins again). */
export function escalationLevelDue(startedAt, minutes, nowMs = Date.now()) {
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return 0;
  const waited = nowMs - started;
  const step = minutes * 60 * 1000;
  if (waited >= 2 * step) return 2;
  if (waited >= step) return 1;
  return 0;
}

/** SMS / notice text for one escalation step. */
export function escalationMessage(item, level, minutes) {
  const label = ESCALATION_KIND_LABELS[item.kind] || "Urgent report";
  const waited = level >= 2 ? minutes * 2 : minutes;
  const base = `${label}: ${item.summary}. No response after ${waited} min.`;
  const contact = level >= 2 && item.contact ? ` Contact: ${item.contact}.` : "";
  return `${base}${contact} Open CONNECT-DAET and ${ESCALATION_STOP_ACTION[item.kind] || "respond"}.`;
}
