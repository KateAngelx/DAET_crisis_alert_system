import test from "node:test";
import assert from "node:assert/strict";
import {
  INCIDENT_STATUS_FOR_MISSING,
  MISSING_STATUSES,
  composeMissingDescription,
  isMissingPersonCategory,
  missingStatusMessage,
  validateMissingPerson,
} from "@/lib/missingPersons";
import { INCIDENT_CATEGORIES } from "@/lib/constants";
import { notificationIconName } from "@/lib/typeIcons";
import { getNotificationHref } from "@/lib/notificationLinks";

const NOW = Date.parse("2026-11-15T12:00:00+08:00");

test("the report form already offers the Missing Person category", () => {
  assert.ok(INCIDENT_CATEGORIES.includes("Missing Person"));
  assert.equal(isMissingPersonCategory("Missing Person"), true);
  assert.equal(isMissingPersonCategory("Accident"), false);
});

test("a name (or tag) and last-seen place are required", () => {
  assert.match(validateMissingPerson({ lastSeenLocation: "Bagasbas" }, { nowMs: NOW }).error, /name/);
  assert.match(validateMissingPerson({ personName: "Ana" }, { nowMs: NOW }).error, /last seen/);
  const ok = validateMissingPerson({ personName: "  Ana   Cruz ", lastSeenLocation: "Bagasbas Beach" }, { nowMs: NOW });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.personName, "Ana Cruz");
  assert.equal(ok.value.taggedUserId, null);
});

test("the last-seen time cannot be in the future or over 30 days ago", () => {
  const base = { personName: "Ana", lastSeenLocation: "Bagasbas" };
  assert.match(validateMissingPerson({ ...base, lastSeenAt: "2026-11-15T14:00:00+08:00" }, { nowMs: NOW }).error, /future/);
  assert.match(validateMissingPerson({ ...base, lastSeenAt: "2026-10-01T10:00:00+08:00" }, { nowMs: NOW }).error, /30 days/);
  assert.equal(validateMissingPerson({ ...base, lastSeenAt: "2026-11-15T09:30:00+08:00" }, { nowMs: NOW }).value.lastSeenAt, "2026-11-15T01:30:00.000Z");
});

test("a map pin is kept only when both coordinates are given", () => {
  const base = { personName: "Ana", lastSeenLocation: "Bagasbas" };
  assert.deepEqual(
    [validateMissingPerson({ ...base, latitude: 14.13, longitude: 122.98 }).value.latitude, validateMissingPerson({ ...base, latitude: 14.13 }).value.latitude],
    [14.13, null]
  );
});

test("the report description carries the key facts", () => {
  const text = composeMissingDescription({
    personName: "Ana Cruz",
    lastSeenLocation: "Bagasbas Beach",
    lastSeenAt: "2026-11-15T01:30:00.000Z",
    personDescription: "Red shirt, about 20",
    details: "Went swimming",
  });
  assert.match(text, /^MISSING: Ana Cruz\./);
  assert.match(text, /Bagasbas Beach/);
  assert.match(text, /Red shirt/);
  assert.match(text, /Went swimming/);
});

test("every search status maps to a report status and a message", () => {
  for (const status of MISSING_STATUSES) {
    assert.ok(INCIDENT_STATUS_FOR_MISSING[status], status);
    assert.match(missingStatusMessage(status, "Ana"), /Ana/);
  }
  assert.match(missingStatusMessage("found_safe", "Ana", "With her guide"), /Note: With her guide/);
});

test("missing-person notices get their own icon and open the right page", () => {
  assert.equal(notificationIconName({ notification_type: "missing_person_reported" }), "UserSearch");
  assert.equal(notificationIconName({ notification_type: "missing_person_found_safe" }), "CircleCheck");
  const notice = { related_type: "missing_person", related_id: "x" };
  assert.equal(getNotificationHref(notice, "admin"), "/crisis/command");
  assert.equal(getNotificationHref(notice, "guide"), "/guide/crisis");
  assert.equal(getNotificationHref(notice, "tourist"), "/crisis");
});
