import test from "node:test";
import assert from "node:assert/strict";
import {
  isCrisisAlertNotification,
  isRewardNotification,
  splitRewardNotifications,
} from "@/lib/notificationCategory";
import { channelsFromProfile } from "@/lib/userNotificationChannels";
import { allEmergencyHotlines, hotlineTel, siteInfo } from "@/lib/siteInfo";
import { EMERGENCY_FALLBACK } from "@/lib/constants";

test("a points notification tied to an alert is a reward, not a crisis alert", () => {
  const reward = { notification_type: "points_awarded", related_type: "alert" };
  assert.equal(isRewardNotification(reward), true);
  assert.equal(isCrisisAlertNotification(reward), false);
  assert.equal(isRewardNotification({ notification_type: "incident_report_reward" }), true);
  assert.equal(isCrisisAlertNotification({ notification_type: "crisis_alert", related_type: "alert" }), true);
});

test("rewards are split away from alerts and updates", () => {
  const { updates, rewards } = splitRewardNotifications([
    { id: 1, notification_type: "crisis_alert" },
    { id: 2, notification_type: "points_awarded" },
    { id: 3, notification_type: "incident_submitted" },
  ]);
  assert.deepEqual(updates.map((n) => n.id), [1, 3]);
  assert.deepEqual(rewards.map((n) => n.id), [2]);
});

test("paused SMS stays off normally but is kept for Critical alerts", () => {
  const paused = { notification_channels: { sms: true, email: true, app: true }, sms_suspended_at: "2026-10-01" };
  assert.equal(channelsFromProfile(paused).sms, false);
  assert.equal(channelsFromProfile(paused, { ignoreSmsSuspension: true }).sms, true);
});

test("a user's own SMS opt-out is respected even for Critical alerts", () => {
  const optedOut = { notification_channels: { sms: false }, sms_suspended_at: "2026-10-01" };
  assert.equal(channelsFromProfile(optedOut, { ignoreSmsSuspension: true }).sms, false);
});

test("every page shares one hotline list with local numbers first", () => {
  assert.equal(EMERGENCY_FALLBACK.hotlines, allEmergencyHotlines);
  assert.equal(allEmergencyHotlines[0], siteInfo.localHotlines[0]);
  assert.equal(hotlineTel({ number: "0963-4646-708", tel: "+639634646708" }), "+639634646708");
  assert.equal(hotlineTel({ number: "911" }), "911");
});

test("place search tries Daet, then the province, then the country", async () => {
  const { buildGeocodeQueries } = await import("@/lib/geocodeLocation");
  assert.deepEqual(buildGeocodeQueries("Bagasbas Beach"), [
    "Bagasbas Beach, Daet, Camarines Norte, Philippines",
    "Bagasbas Beach, Camarines Norte, Philippines",
    "Bagasbas Beach, Philippines",
  ]);
  assert.deepEqual(buildGeocodeQueries("Daet Public Market"), [
    "Daet Public Market, Camarines Norte, Philippines",
    "Daet Public Market, Philippines",
  ]);
  assert.deepEqual(buildGeocodeQueries("  "), []);
});

test("in-app notifications take the same level as their alert, hazard or road", async () => {
  const { getNotificationSeverity } = await import("@/lib/notificationCategory");
  const alert = (title, priority) => ({ notification_type: "crisis_alert", related_type: "alert", title, priority });
  assert.equal(getNotificationSeverity(alert("Medium Crisis Alert: Flooding", "NORMAL")), "Medium");
  assert.equal(getNotificationSeverity(alert("Critical Crisis Alert Updated: Fire", "CRITICAL")), "Critical");
  assert.equal(getNotificationSeverity(alert("Low Crisis Alert: Traffic", "LOW")), "Low");
  assert.equal(getNotificationSeverity({ notification_type: "crisis_alert_resolved", related_type: "alert", title: "Resolved: Fire" }), "Resolved");

  const hazard = (priority) => ({ notification_type: "dangerous_location", related_type: "dangerous_location", priority, title: "Area Hazard: X" });
  assert.equal(getNotificationSeverity(hazard("CRITICAL")), "Critical");
  assert.equal(getNotificationSeverity(hazard("HIGH")), "Medium");

  const road = (message) => ({ notification_type: "route_advisory", related_type: "route_advisory", message, title: "Route Advisory: X" });
  assert.equal(getNotificationSeverity(road("Closed on Vinzons Ave.")), "High");
  assert.equal(getNotificationSeverity(road("Caution on Vinzons Ave.")), "Medium");
  assert.equal(getNotificationSeverity(road("Safe on Vinzons Ave.")), "Low");

  // Routine notices and rewards keep their usual colors.
  assert.equal(getNotificationSeverity({ notification_type: "incident_submitted", priority: "NORMAL", title: "Report received" }), null);
  assert.equal(getNotificationSeverity({ notification_type: "points_awarded", related_type: "alert", title: "Points awarded" }), null);
});
