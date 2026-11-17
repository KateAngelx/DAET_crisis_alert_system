/** Automatic escalation of urgent items nobody has acted on. Shared by the job, settings and tests. */

import { normalizePhilippinePhone } from "@/lib/phoneUtils";

export const ESCALATION_DEFAULTS = { enabled: true, minutes: 10, contacts: [] };
export const MAX_ESCALATION_CONTACTS = 3;

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

function cleanContact(raw) {
  const name = String(raw?.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const phone = normalizePhilippinePhone(raw?.phone);
  return name && phone ? { name, phone } : null;
}

export function normalizeEscalationSettings(raw = {}) {
  const minutes = Math.round(Number(raw.escalation_minutes ?? raw.minutes));
  return {
    enabled: raw.escalation_enabled ?? raw.enabled ?? ESCALATION_DEFAULTS.enabled,
    minutes: Number.isFinite(minutes) ? Math.min(120, Math.max(3, minutes)) : ESCALATION_DEFAULTS.minutes,
    contacts: (Array.isArray(raw.escalation_contacts ?? raw.contacts) ? raw.escalation_contacts ?? raw.contacts : [])
      .map(cleanContact)
      .filter(Boolean)
      .slice(0, MAX_ESCALATION_CONTACTS),
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
  const list = Array.isArray(input?.contacts) ? input.contacts : [];
  if (list.length > MAX_ESCALATION_CONTACTS) return { ok: false, error: `Add at most ${MAX_ESCALATION_CONTACTS} outside contacts.` };
  const contacts = [];
  for (const raw of list) {
    if (!String(raw?.name ?? "").trim() && !String(raw?.phone ?? "").trim()) continue; // empty row
    const c = cleanContact(raw);
    if (!c) return { ok: false, error: "Each outside contact needs a name and a valid Philippine mobile number." };
    contacts.push(c);
  }
  return { ok: true, value: { enabled: input?.enabled !== false, minutes, contacts } };
}

/** The level an item should be at now: 0 (just reported), 1 (re-alert admins), 2 (outside contacts). */
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
  if (level >= 2) {
    return `CONNECT-DAET ESCALATION (Daet Tourism Office): ${base}${item.contact ? ` Contact: ${item.contact}.` : ""} Please assist or coordinate with the Tourism Office.`;
  }
  return `${base} Open CONNECT-DAET and ${ESCALATION_STOP_ACTION[item.kind] || "respond"}.`;
}
