/** Missing-tourist reports: shared rules for the form, the server and the Command Center. */

export const MISSING_PERSON_CATEGORY = "Missing Person";
export const MISSING_STATUSES = ["searching", "found_safe", "found_injured", "closed"];
export const OPEN_MISSING_STATUSES = ["searching"];

export const MISSING_STATUS_LABELS = {
  searching: "Searching",
  found_safe: "Found safe",
  found_injured: "Found injured",
  closed: "Closed",
};

export const MISSING_STATUS_BADGE = {
  searching: "bg-red-100 text-red-700",
  found_safe: "bg-green-100 text-green-700",
  found_injured: "bg-orange-100 text-orange-700",
  closed: "bg-zinc-100 text-zinc-600",
};

/** Incident report status that goes with each search status. */
export const INCIDENT_STATUS_FOR_MISSING = {
  searching: "Responding",
  found_safe: "Resolved",
  found_injured: "Resolved",
  closed: "Closed",
};

const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export function isMissingPersonCategory(category) {
  return category === MISSING_PERSON_CATEGORY;
}

/**
 * Check the missing-person fields. `lastSeenAt` is an ISO time or a datetime-local string.
 * @returns {{ ok: true, value } | { ok: false, error: string }}
 */
export function validateMissingPerson(input, { nowMs = Date.now() } = {}) {
  const personName = clean(input?.personName, 120);
  const lastSeenLocation = clean(input?.lastSeenLocation, 500);
  const personDescription = clean(input?.personDescription, 1000) || null;
  if (!personName) return { ok: false, error: "Enter the missing person's name, or tag them." };
  if (!lastSeenLocation) return { ok: false, error: "Enter where the person was last seen." };

  let lastSeenAt = null;
  if (input?.lastSeenAt) {
    const ms = Date.parse(input.lastSeenAt);
    if (!Number.isFinite(ms)) return { ok: false, error: "Enter a valid last-seen time." };
    if (ms > nowMs + 5 * 60 * 1000) return { ok: false, error: "The last-seen time can't be in the future." };
    if (ms < nowMs - 30 * 24 * 60 * 60 * 1000) return { ok: false, error: "The last-seen time is more than 30 days ago." };
    lastSeenAt = new Date(ms).toISOString();
  }

  const lat = Number(input?.latitude);
  const lng = Number(input?.longitude);
  const hasPin = input?.latitude != null && input?.longitude != null && Number.isFinite(lat) && Number.isFinite(lng);
  const taggedUserId = typeof input?.taggedUserId === "string" && input.taggedUserId ? input.taggedUserId : null;

  return {
    ok: true,
    value: {
      personName,
      personDescription,
      lastSeenLocation,
      lastSeenAt,
      latitude: hasPin ? lat : null,
      longitude: hasPin ? lng : null,
      taggedUserId,
    },
  };
}

/** The report's description, so existing report views show the key facts without changes. */
export function composeMissingDescription({ personName, lastSeenLocation, lastSeenAt, personDescription, details }) {
  const when = lastSeenAt
    ? new Date(lastSeenAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })
    : "time not given";
  return [
    `MISSING: ${personName}.`,
    `Last seen at ${lastSeenLocation} (${when}).`,
    personDescription ? `Description: ${personDescription.replace(/[.!?]+$/, "")}.` : "",
    details ? `Details: ${details}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 5000);
}

/** Message for everyone involved when the search status changes. */
export function missingStatusMessage(status, personName, note) {
  const name = personName || "The missing person";
  const base = {
    searching: `${name} is still being searched for.`,
    found_safe: `${name} has been found safe.`,
    found_injured: `${name} has been found and is receiving help.`,
    closed: `The missing-person case for ${name} is closed.`,
  }[status] || `${name}: status updated.`;
  return note ? `${base} Note: ${note}` : base;
}
