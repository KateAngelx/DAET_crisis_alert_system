import test from "node:test";
import assert from "node:assert/strict";
import { channelsForBroadcast, getBroadcastAlertChannels, isCriticalSeverity } from "@/lib/userNotificationChannels";
import { audienceForSeverity, audienceToUserTypes } from "@/lib/notificationAudience";

const everythingOff = {
  notification_channels: { email: false, sms: false, app: false, push: false },
  last_seen_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  sms_suspended_at: new Date().toISOString(),
};

test("only Critical counts as critical", () => {
  assert.equal(isCriticalSeverity("Critical"), true);
  assert.equal(isCriticalSeverity("critical"), true);
  assert.equal(isCriticalSeverity("High"), false);
  assert.equal(isCriticalSeverity(undefined), false);
});

test("a Critical alert uses every channel, even ones the person turned off or that were paused", () => {
  assert.deepEqual(channelsForBroadcast(everythingOff, "Critical"), { email: true, sms: true, app: true, push: true });
});

test("Low to High alerts still follow each person's settings", () => {
  for (const severity of ["Low", "Medium", "High"]) {
    const channels = channelsForBroadcast(everythingOff, severity);
    assert.equal(channels.sms, false, severity);
    assert.equal(channels.app, false, severity);
  }
});

test("the office's channel choice for the alert still applies", () => {
  const effective = getBroadcastAlertChannels({ email: false, sms: true, app: true }, channelsForBroadcast(everythingOff, "Critical"));
  assert.equal(effective.sms, true);
  assert.equal(effective.app, true);
  assert.equal(effective.email, false); // the alert itself was not sent by email
});

test("a Critical alert goes to tourists, guides and administrators whatever the audience setting", () => {
  const touristsOnly = { tourists: true, guides: false, admins: false };
  assert.deepEqual(audienceToUserTypes(audienceForSeverity(touristsOnly, "Critical")), ["tourist", "guide", "admin"]);
  assert.deepEqual(audienceToUserTypes(audienceForSeverity(touristsOnly, "High")), ["tourist"]);
});
