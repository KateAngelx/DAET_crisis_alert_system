/** Validation for incident reports from walk-in tourists without an account. */

import { INCIDENT_CATEGORIES, INCIDENT_SEVERITIES } from "@/lib/constants";
import { normalizePhilippinePhone } from "@/lib/phoneUtils";

/** Guide assignment needs an account, so guests cannot pick "Tourist Assistance". */
export const GUEST_INCIDENT_CATEGORIES = INCIDENT_CATEGORIES.filter((c) => c !== "Tourist Assistance");

/** A form sent faster than this after opening is almost certainly a bot. */
export const MIN_FILL_MS = 4_000;
/** A form left open longer than this must be reloaded (stops replaying an old token forever). */
export const MAX_FILL_MS = 24 * 60 * 60_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * @returns {{ ok: true, value: object } | { ok: false, error: string, spam?: boolean }}
 */
export function validateGuestIncidentReport(body, now = Date.now()) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };

  // Spam checks: a hidden field people never fill in, and a minimum time on the form.
  if (String(body.website ?? "").trim() !== "") {
    return { ok: false, error: "Report could not be sent.", spam: true };
  }
  const startedAt = Number(body.startedAt);
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_MS || now - startedAt > MAX_FILL_MS) {
    return { ok: false, error: "Please reload the page and fill in the form again.", spam: true };
  }

  const name = text(body.name, 80);
  if (name.length < 2) return { ok: false, error: "Please enter your name." };

  const rawPhone = text(body.phone, 30);
  const phone = rawPhone ? normalizePhilippinePhone(rawPhone) : null;
  if (rawPhone && !phone) {
    return { ok: false, error: "Enter a valid Philippine mobile number (e.g. 0917 123 4567)." };
  }
  const email = text(body.email, 120).toLowerCase();
  if (email && !EMAIL_PATTERN.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!phone && !email) {
    return { ok: false, error: "Enter a mobile number or email so the tourism office can reach you." };
  }

  const category = GUEST_INCIDENT_CATEGORIES.includes(body.category) ? body.category : null;
  if (!category) return { ok: false, error: "Choose what happened." };

  const severity = INCIDENT_SEVERITIES.includes(body.severity) ? body.severity : "Medium";

  const location = text(body.location, 500);
  if (location.length < 3) return { ok: false, error: "Please say where it happened." };

  const description = String(body.description ?? "").trim().slice(0, 2000);
  if (description.length < 10) return { ok: false, error: "Please describe what happened (at least 10 characters)." };

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const hasCoords =
    body.latitude != null && body.longitude != null &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

  return {
    ok: true,
    value: {
      name,
      phone,
      email: email || null,
      category,
      severity,
      location,
      description,
      latitude: hasCoords ? latitude : null,
      longitude: hasCoords ? longitude : null,
    },
  };
}
