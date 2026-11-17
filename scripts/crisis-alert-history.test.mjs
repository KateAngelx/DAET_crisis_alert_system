import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_CLEAR_MIN_LENGTH,
  buildAlertTimeline,
  describeAlertChanges,
  suggestAllClearMessage,
  validateAllClearMessage,
} from "@/lib/crisisAlertHistory";
import { formatCrisisAlertSms } from "@/lib/smsMessageFormat";

test("resolving needs a real All Clear message", () => {
  assert.match(validateAllClearMessage(""), /All Clear/);
  assert.match(validateAllClearMessage("ok"), /at least/);
  assert.match(validateAllClearMessage("x".repeat(501)), /under 500/);
  assert.equal(validateAllClearMessage("All clear: the beach road is open again."), null);
});

test("the suggested All Clear names the alert and passes the check", () => {
  const text = suggestAllClearMessage({ title: "Flooding", location: "Bagasbas" });
  assert.match(text, /Flooding at Bagasbas/);
  assert.ok(text.length >= ALL_CLEAR_MIN_LENGTH);
  assert.equal(validateAllClearMessage(text), null);
});

test("changes between versions are described in plain words", () => {
  const before = { severity: "Medium", title: "Flooding", location: "Bagasbas", type: "Weather", message: "Avoid the road." };
  const after = { ...before, severity: "High", message: "Water is rising; stay away." };
  assert.deepEqual(describeAlertChanges(after, before), ["Severity: Medium → High", "Details updated"]);
  assert.deepEqual(describeAlertChanges(before, before), []);
});

test("the timeline is newest first and ends with the All Clear", () => {
  const rows = [
    { id: "3", kind: "resolved", created_at: "2026-11-14T12:00:00Z", severity: "High", all_clear_message: "All clear: road reopened." },
    { id: "1", kind: "created", created_at: "2026-11-14T08:00:00Z", severity: "Medium", title: "Flooding", message: "Avoid the road." },
    { id: "2", kind: "updated", created_at: "2026-11-14T10:00:00Z", severity: "High", title: "Flooding", message: "Avoid the road." },
  ];
  const timeline = buildAlertTimeline(rows);
  assert.deepEqual(timeline.map((i) => i.label), ["All Clear", "Update", "Alert issued"]);
  assert.equal(timeline[0].allClear, "All clear: road reopened.");
  assert.deepEqual(timeline[1].changes, ["Severity: Medium → High"]);
});

test("the resolved SMS carries the All Clear text", () => {
  const sms = formatCrisisAlertSms(
    { title: "Flooding", location: "Bagasbas", all_clear_message: "Road reopened at 3 PM." },
    { resolved: true }
  );
  assert.match(sms, /RESOLVED/);
  assert.match(sms, /ALL CLEAR: Road reopened at 3 PM\./);
  // Older alerts with no All Clear text still produce a clean message.
  assert.doesNotMatch(formatCrisisAlertSms({ title: "Fire" }, { resolved: true }), /ALL CLEAR/);
});
