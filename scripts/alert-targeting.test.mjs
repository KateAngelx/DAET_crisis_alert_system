import test from "node:test";
import assert from "node:assert/strict";
import {
  DAET_CENTER,
  distanceKm,
  freshLocation,
  groupMatchesAlertArea,
  isTourGroupRunning,
  isTouristInDaetNow,
  philippineDate,
  roundCoordinate,
  touristMatchesAlertTarget,
  validateVisitDates,
} from "@/lib/alertTargeting";

// 2026-11-14 09:00 in the Philippines.
const NOW = Date.parse("2026-11-14T09:00:00+08:00");
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

test("dates are compared in Philippine time", () => {
  assert.equal(philippineDate(Date.parse("2026-11-14T17:30:00Z")), "2026-11-15"); // 01:30 PHT next day
  assert.equal(philippineDate(NOW), "2026-11-14");
});

test("a tourist is in Daet now by visit dates, a running tour, or recent app use", () => {
  assert.equal(isTouristInDaetNow({ visit_start_date: "2026-11-12", visit_end_date: "2026-11-16" }, [], NOW), true);
  assert.equal(isTouristInDaetNow({ visit_start_date: "2026-11-20", visit_end_date: "2026-11-22" }, [], NOW), false);
  assert.equal(isTouristInDaetNow({ visit_start_date: "2026-11-10" }, [], NOW), true); // arrived, no leave date
  assert.equal(isTouristInDaetNow({}, [{ status: "active", start_date: "2026-11-14", end_date: "2026-11-14" }], NOW), true);
  assert.equal(isTouristInDaetNow({}, [{ status: "completed", start_date: "2026-11-14", end_date: "2026-11-14" }], NOW), false);
  assert.equal(isTouristInDaetNow({ last_seen_at: daysAgo(1) }, [], NOW), true);
  assert.equal(isTouristInDaetNow({ last_seen_at: daysAgo(5) }, [], NOW), false);
  assert.equal(isTouristInDaetNow({}, [], NOW), false);
});

test("a tour group with no dates counts as running while active", () => {
  assert.equal(isTourGroupRunning({ status: "active" }, "2026-11-14"), true);
  assert.equal(isTourGroupRunning({ status: "active", end_date: "2026-11-13" }, "2026-11-14"), false);
});

test("area matching links a tour group's places to the alert's location", () => {
  const alert = { location: "Bagasbas Beach", title: "Rip current warning" };
  assert.equal(groupMatchesAlertArea({ destination: "Bagasbas" }, alert), true);
  assert.equal(groupMatchesAlertArea({ destination: "Bagasbas Beach, Daet" }, alert), true);
  assert.equal(groupMatchesAlertArea({ starting_location: "Mercedes Port" }, alert), false);
  assert.equal(groupMatchesAlertArea({ destination: "" }, alert), false);
});

test("each target scope picks the right tourists", () => {
  const alert = { location: "Bagasbas", title: "Flooding" };
  const touring = [{ status: "active", start_date: "2026-11-14", end_date: "2026-11-15", destination: "Bagasbas Beach" }];
  const elsewhere = [{ status: "active", start_date: "2026-11-14", end_date: "2026-11-15", destination: "Mercedes" }];
  const away = { visit_start_date: "2027-01-01", visit_end_date: "2027-01-05" };

  assert.equal(touristMatchesAlertTarget({ scope: "all", profile: away, alert, nowMs: NOW }), true);
  assert.equal(touristMatchesAlertTarget({ scope: "in_daet", profile: away, alert, nowMs: NOW }), false);
  assert.equal(touristMatchesAlertTarget({ scope: "in_daet", profile: {}, groups: elsewhere, alert, nowMs: NOW }), true);
  assert.equal(touristMatchesAlertTarget({ scope: "area", profile: {}, groups: touring, alert, nowMs: NOW }), true);
  assert.equal(touristMatchesAlertTarget({ scope: "area", profile: {}, groups: elsewhere, alert, nowMs: NOW }), false);
  // Unknown scopes fall back to everyone, so nobody is dropped by mistake.
  assert.equal(touristMatchesAlertTarget({ scope: "typo", profile: away, alert, nowMs: NOW }), true);
});

test("visit dates are checked before saving", () => {
  assert.equal(validateVisitDates("", "", NOW), null);
  assert.equal(validateVisitDates("2026-11-14", "2026-11-18", NOW), null);
  assert.match(validateVisitDates("2026-11-18", "2026-11-14", NOW), /on or after/);
  assert.match(validateVisitDates("14/11/2026", "", NOW), /valid dates/);
  assert.match(validateVisitDates("2024-01-01", "2024-01-03", NOW), /over a year ago/);
});

// ---- Opt-in shared location and "within X km of the pin" ----

const BAGASBAS = [14.1372, 122.9816];
const located = (lat, lng, hoursAgo = 1) => ({
  location: { latitude: lat, longitude: lng, recorded_at: new Date(NOW - hoursAgo * 60 * 60 * 1000).toISOString() },
});

test("distances and rounding are sensible", () => {
  const km = distanceKm(DAET_CENTER, BAGASBAS);
  assert.ok(km > 3.5 && km < 4.5, `Daet center to Bagasbas should be about 4 km, got ${km}`);
  assert.equal(roundCoordinate(14.137198), 14.137);
});

test("a shared location older than 48 hours is ignored", () => {
  assert.deepEqual(freshLocation(located(14.13, 122.98, 47), NOW), [14.13, 122.98]);
  assert.equal(freshLocation(located(14.13, 122.98, 49), NOW), null);
  assert.equal(freshLocation({}, NOW), null);
});

test("a shared location inside Daet counts as being in Daet now", () => {
  assert.equal(isTouristInDaetNow(located(14.137, 122.98), [], NOW), true);
  assert.equal(isTouristInDaetNow(located(14.5995, 120.9842), [], NOW), false); // Manila, no other signal
});

test("rip current at Bagasbas, within 3 km: the scenario tourists", () => {
  const alert = { latitude: BAGASBAS[0], longitude: BAGASBAS[1], target_radius_km: 3, location: "Bagasbas", title: "Rip current" };
  const gets = (profile, groups = []) => touristMatchesAlertTarget({ scope: "radius", profile, groups, alert, nowMs: NOW });

  // Ana: shares location, at Bagasbas 2 hours ago → yes.
  assert.equal(gets(located(14.139, 122.979, 2)), true);
  // Ben: shares location, in town about 6 km away → no.
  assert.equal(gets(located(14.095, 122.93, 3)), false);
  // Carla: no location, but her visit dates say she is in Daet today → yes (included to be safe).
  assert.equal(gets({ visit_start_date: "2026-11-13", visit_end_date: "2026-11-16" }), true);
  // Dan: location 3 days old (expired), no dates, no tour, last seen 3 days ago → no.
  assert.equal(gets({ ...located(14.139, 122.979, 72), last_seen_at: daysAgo(3) }), false);
  // Ella: lives in Manila, nothing says she is in Daet → no.
  assert.equal(gets({ visit_start_date: "2026-10-01", visit_end_date: "2026-10-03" }), false);
});

test("a distance alert without a map pin goes to everyone in Daet now", () => {
  const noPin = { target_radius_km: 3, location: "Bagasbas" };
  assert.equal(touristMatchesAlertTarget({ scope: "radius", profile: located(14.095, 122.93), alert: noPin, nowMs: NOW }), true);
});
