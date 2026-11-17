/** "I'm safe / I need help" check-ins for crisis alerts. */

export const TOURIST_CHECKIN_STATUSES = ["safe", "need_help", "evacuated"];
/** Guides can also mark a tourist as missing. */
export const GUIDE_CHECKIN_STATUSES = ["safe", "need_help", "evacuated", "missing"];
/** Statuses that need someone from the office to act. */
export const URGENT_CHECKIN_STATUSES = ["need_help", "missing"];
export const CHECKIN_NOTE_MAX = 300;

export const CHECKIN_LABELS = {
  safe: "I'm safe",
  need_help: "I need help",
  evacuated: "Evacuated",
  missing: "Missing",
};

/** Admin / guide wording for a tourist's status. */
export const CHECKIN_STATUS_TEXT = {
  safe: "Safe",
  need_help: "Needs help",
  evacuated: "Evacuated",
  missing: "Missing",
  none: "No reply yet",
};

export const CHECKIN_BADGE = {
  safe: "bg-green-100 text-green-700",
  evacuated: "bg-blue-100 text-blue-700",
  need_help: "bg-red-100 text-red-700",
  missing: "bg-red-100 text-red-700",
  none: "bg-zinc-100 text-zinc-600",
};

/** Line added to alert notices and SMS when an alert asks for check-ins. */
export const CHECKIN_REQUEST_LINE = "Open CONNECT-DAET and tap I'm safe or I need help on this alert.";

/**
 * Validate a check-in. `byGuide` allows "missing".
 * @returns {{ ok: true, value: { status, note } } | { ok: false, error: string }}
 */
export function validateCheckin(body, { byGuide = false } = {}) {
  const allowed = byGuide ? GUIDE_CHECKIN_STATUSES : TOURIST_CHECKIN_STATUSES;
  const status = String(body?.status || "");
  if (!allowed.includes(status)) return { ok: false, error: "Choose a valid status." };
  const note = String(body?.note ?? "").replace(/\s+/g, " ").trim().slice(0, CHECKIN_NOTE_MAX);
  return { ok: true, value: { status, note: note || null } };
}

/** Whether an alert currently accepts check-ins. */
export function alertAcceptsCheckins(alert) {
  return Boolean(alert?.checkin_requested) && String(alert?.status || "").toLowerCase() === "active";
}

/**
 * Count replies. `reached` is how many tourists were sent the alert (for "no reply yet").
 * @returns {{ safe, need_help, evacuated, missing, replied, noReply, unhandledUrgent }}
 */
export function summarizeCheckins(rows = [], reached = 0) {
  const counts = { safe: 0, need_help: 0, evacuated: 0, missing: 0 };
  let unhandledUrgent = 0;
  for (const row of rows) {
    if (counts[row.status] === undefined) continue;
    counts[row.status] += 1;
    if (URGENT_CHECKIN_STATUSES.includes(row.status) && !row.handled_at) unhandledUrgent += 1;
  }
  const replied = rows.filter((r) => counts[r.status] !== undefined).length;
  return { ...counts, replied, noReply: Math.max(0, reached - replied), unhandledUrgent };
}
