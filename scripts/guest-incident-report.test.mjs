import test from "node:test";
import assert from "node:assert/strict";
import {
  GUEST_INCIDENT_CATEGORIES,
  MIN_FILL_MS,
  validateGuestIncidentReport,
} from "@/lib/guestIncidentReport";

const NOW = Date.parse("2026-11-14T08:00:00Z");

function report(extra = {}) {
  return {
    name: "Ana Cruz",
    phone: "0917 123 4567",
    email: "",
    category: "Accident",
    severity: "High",
    location: "Bagasbas Beach",
    description: "A surfer was hurt near the lifeguard tower.",
    website: "",
    startedAt: NOW - 60_000,
    ...extra,
  };
}

test("a complete guest report is accepted and cleaned up", () => {
  const result = validateGuestIncidentReport(report({ name: "  Ana   Cruz ", latitude: 14.13, longitude: 122.98 }), NOW);
  assert.equal(result.ok, true);
  assert.equal(result.value.name, "Ana Cruz");
  assert.equal(result.value.phone, "09171234567");
  assert.equal(result.value.email, null);
  assert.equal(result.value.latitude, 14.13);
});

test("a guest must leave a phone number or email", () => {
  assert.equal(validateGuestIncidentReport(report({ phone: "", email: "" }), NOW).ok, false);
  assert.equal(validateGuestIncidentReport(report({ phone: "", email: "ana@example.com" }), NOW).ok, true);
  assert.equal(validateGuestIncidentReport(report({ phone: "12345" }), NOW).ok, false);
  assert.equal(validateGuestIncidentReport(report({ phone: "", email: "not-an-email" }), NOW).ok, false);
});

test("bots are stopped by the hidden field and the minimum fill time", () => {
  const trap = validateGuestIncidentReport(report({ website: "http://spam.example" }), NOW);
  assert.equal(trap.ok, false);
  assert.equal(trap.spam, true);
  const tooFast = validateGuestIncidentReport(report({ startedAt: NOW - (MIN_FILL_MS - 1) }), NOW);
  assert.equal(tooFast.spam, true);
  assert.equal(validateGuestIncidentReport(report({ startedAt: undefined }), NOW).spam, true);
});

test("guests cannot pick guide assistance or unknown categories", () => {
  assert.ok(!GUEST_INCIDENT_CATEGORIES.includes("Tourist Assistance"));
  assert.equal(validateGuestIncidentReport(report({ category: "Tourist Assistance" }), NOW).ok, false);
  assert.equal(validateGuestIncidentReport(report({ category: "Hacked" }), NOW).ok, false);
});

test("short or missing details are rejected", () => {
  assert.equal(validateGuestIncidentReport(report({ description: "help" }), NOW).ok, false);
  assert.equal(validateGuestIncidentReport(report({ location: "" }), NOW).ok, false);
  assert.equal(validateGuestIncidentReport(report({ name: "A" }), NOW).ok, false);
  assert.equal(validateGuestIncidentReport(null, NOW).ok, false);
});
