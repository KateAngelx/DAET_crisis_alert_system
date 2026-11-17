import test from "node:test";
import assert from "node:assert/strict";
import { canDismissNotification, isDismissedNotification } from "@/lib/notificationCategory";

const alertNotice = (severity, extra = {}) => ({
  notification_type: "crisis_alert",
  related_type: "alert",
  title: `${severity} Crisis Alert: Flooding`,
  priority: severity === "Critical" ? "CRITICAL" : "HIGH",
  ...extra,
});

test("Low, Medium and High alert notices can be dismissed", () => {
  for (const severity of ["Low", "Medium", "High"]) {
    assert.equal(canDismissNotification(alertNotice(severity)), true, severity);
  }
});

test("Critical alert notices cannot be dismissed", () => {
  assert.equal(canDismissNotification(alertNotice("Critical")), false);
  assert.equal(
    canDismissNotification({ notification_type: "dangerous_location", related_type: "dangerous_location", priority: "CRITICAL", title: "Area Hazard: Bagasbas" }),
    false
  );
});

test("resolved notices and road advisories can be dismissed; account notices cannot", () => {
  assert.equal(canDismissNotification({ notification_type: "crisis_alert_resolved", related_type: "alert", priority: "CRITICAL", title: "Resolved: Typhoon" }), true);
  assert.equal(canDismissNotification({ notification_type: "route_advisory", related_type: "route_advisory", priority: "NORMAL", title: "Road", message: "Caution: slippery" }), true);
  assert.equal(canDismissNotification({ notification_type: "incident_status", related_type: "incident", priority: "NORMAL", title: "Report received" }), false);
  assert.equal(canDismissNotification({ notification_type: "reward_points", title: "You earned 10 points" }), false);
});

test("an already dismissed notice is recognised and not offered again", () => {
  const dismissed = alertNotice("Medium", { dismissed_at: "2026-11-15T10:00:00Z" });
  assert.equal(isDismissedNotification(dismissed), true);
  assert.equal(canDismissNotification(dismissed), false);
  assert.equal(isDismissedNotification(alertNotice("Medium")), false);
});
