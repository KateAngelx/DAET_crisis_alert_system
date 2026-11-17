import test from "node:test";
import assert from "node:assert/strict";
import { isCriticalArrival } from "@/lib/notificationCategory";

const alert = (title, extra = {}) => ({ notification_type: "crisis_alert", related_type: "crisis_alert", title, message: "", ...extra });

test("a critical crisis alert opens the centered pop-up for tourists and guides", () => {
  assert.equal(isCriticalArrival(alert("Critical: Flood at Bagasbas"), "tourist"), true);
  assert.equal(isCriticalArrival(alert("Critical: Flood at Bagasbas"), "guide"), true);
});

test("admins, lower levels, resolved alerts and other notices keep the small card", () => {
  assert.equal(isCriticalArrival(alert("Critical: Flood"), "admin"), false);
  assert.equal(isCriticalArrival(alert("High: Strong winds"), "tourist"), false);
  assert.equal(isCriticalArrival(alert("Resolved: Flood", { notification_type: "crisis_alert_resolved" }), "tourist"), false);
  assert.equal(isCriticalArrival({ notification_type: "points_awarded", title: "Critical" }, "tourist"), false);
  assert.equal(isCriticalArrival(null, "tourist"), false);
});
