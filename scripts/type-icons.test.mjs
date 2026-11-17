import test from "node:test";
import assert from "node:assert/strict";
import {
  alertTypeIconName,
  hazardTypeIconName,
  notificationIconName,
  roadStatusIconName,
  HAZARD_TYPE_ICONS,
} from "@/lib/typeIcons";
import { DANGER_TYPES } from "@/lib/dangerousLocationUtils";
// Same as DEFAULT_CRISIS_TYPE_OPTIONS in PublicCategorizedCardFilters.jsx (the alert type dropdown).
const DEFAULT_CRISIS_TYPE_OPTIONS = ["General", "Health", "Security", "Weather"];

test("each built-in alert type has its own icon", () => {
  assert.equal(alertTypeIconName("Weather"), "CloudLightning");
  assert.equal(alertTypeIconName("Health"), "HeartPulse");
  assert.equal(alertTypeIconName("Security"), "ShieldAlert");
  assert.equal(alertTypeIconName("General"), "Megaphone");
  const icons = DEFAULT_CRISIS_TYPE_OPTIONS.map(alertTypeIconName);
  assert.equal(new Set(icons).size, icons.length, "two alert types share an icon");
});

test("custom alert words still get a fitting icon", () => {
  assert.equal(alertTypeIconName("Flash flood"), "Waves");
  assert.equal(alertTypeIconName("Typhoon Signal #2"), "Wind");
  assert.equal(alertTypeIconName("Fire"), "Flame");
  assert.equal(alertTypeIconName("Earthquake"), "Activity");
  assert.equal(alertTypeIconName(undefined), "Megaphone");
});

test("every area hazard type has an icon", () => {
  for (const type of DANGER_TYPES) assert.ok(HAZARD_TYPE_ICONS[type], `${type} has no icon`);
  assert.equal(hazardTypeIconName("Flooding"), "Waves");
  assert.equal(hazardTypeIconName("Something new"), "TriangleAlert");
});

test("road statuses have icons", () => {
  assert.equal(roadStatusIconName("Closed"), "Ban");
  assert.equal(roadStatusIconName("Caution"), "TrafficCone");
  assert.equal(roadStatusIconName("Safe"), "CircleCheck");
});

test("notices take the icon of what they are about", () => {
  assert.equal(notificationIconName({ notification_type: "crisis_alert", related_type: "alert", title: "High Crisis Alert: Flood", message: "Weather alert for Bagasbas. Heavy rain." }), "CloudLightning");
  assert.equal(notificationIconName({ notification_type: "crisis_alert", related_type: "alert", title: "Low Crisis Alert: X", message: "Health alert for Daet. …" }), "HeartPulse");
  assert.equal(notificationIconName({ notification_type: "crisis_alert_resolved", title: "Resolved: Flood" }), "CircleCheck");
  assert.equal(notificationIconName({ notification_type: "dangerous_location", message: "Landslide reported at Km 5. Use alternative route" }), "Mountain");
  assert.equal(notificationIconName({ notification_type: "route_advisory", message: "Closed: Vinzons Ave" }), "Ban");
  assert.equal(notificationIconName({ notification_type: "reward_points", title: "You earned 10 points" }), "Coins");
  assert.equal(notificationIconName({ notification_type: "tour_group_end_reminder", related_type: "tour_group" }), "Users");
  assert.equal(notificationIconName({ notification_type: "crisis_checkin_urgent" }), "LifeBuoy");
  assert.equal(notificationIconName({ notification_type: "general" }), "Bell");
});
