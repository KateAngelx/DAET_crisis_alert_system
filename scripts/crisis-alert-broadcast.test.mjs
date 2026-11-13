import test from "node:test";
import assert from "node:assert/strict";
import { channelFlagsToDb, channelsFromDb, channelsToDb } from "../src/lib/alertChannels.js";
import { adminAccessDecision } from "../src/lib/adminAccess.js";
import {
  broadcastConfirmationText,
  describeBroadcastAudience,
} from "../src/lib/broadcastConfirmation.js";
import {
  crisisAlertEventKey,
  crisisAlertEventStatusError,
  isUniqueViolation,
  planCrisisRecipientNotification,
} from "../src/lib/crisisAlertBroadcastPolicy.js";
import { getBroadcastAlertChannels } from "../src/lib/userNotificationChannels.js";
import { DEFAULT_NOTIFICATION_AUDIENCE } from "../src/lib/notificationAudience.js";

const ALERT_ID = "717cbb6e-2c92-4196-8101-ca66b6b7fe4b";
const USER_ID = "f6f0cd41-0d48-4555-b851-d25834bd1541";

function alert(overrides = {}) {
  return {
    id: ALERT_ID,
    title: "Flood",
    message: "Avoid the riverside road.",
    type: "Weather",
    severity: "High",
    location: "Bagasbas Beach, Daet",
    status: "Active",
    updated_at: "2026-11-12T00:00:00Z",
    resolved_at: null,
    ...overrides,
  };
}

test("a created notice is keyed only to the alert, not to later updates", () => {
  const created = crisisAlertEventKey(alert(), "created");
  const updated = crisisAlertEventKey(alert(), "updated");
  assert.equal(created, `crisis-alert:${ALERT_ID}:created`);
  assert.notEqual(created, updated);
  assert.equal(
    crisisAlertEventKey(alert({ updated_at: "2026-11-12T02:00:00Z", resolved_at: "2026-11-12T03:00:00Z" }), "created"),
    created
  );
});

test("an update or resolved notice ignores timestamps that do not change the alert content", () => {
  const first = crisisAlertEventKey(alert(), "updated");
  const sameContent = crisisAlertEventKey(
    alert({ updated_at: "2026-11-12T04:00:00Z", resolved_at: "2026-11-12T05:00:00Z" }),
    "updated"
  );
  const changedMessage = crisisAlertEventKey(alert({ message: "The road is closed." }), "updated");
  assert.equal(first, sameContent);
  assert.notEqual(first, changedMessage);
  assert.equal(
    crisisAlertEventKey(alert({ status: "Resolved" }), "resolved"),
    crisisAlertEventKey(alert({ status: "Resolved", resolved_at: "2026-11-12T06:00:00Z" }), "resolved")
  );
});

test("an existing in-app notice does not block a missing email or SMS delivery", () => {
  const eventKey = crisisAlertEventKey(alert(), "created");
  const emailKey = `${USER_ID}-${eventKey}-email`;
  const smsKey = `${USER_ID}-${eventKey}-sms`;
  const missingExternal = planCrisisRecipientNotification({
    userId: USER_ID,
    eventKey,
    alreadyNotified: true,
    sendInApp: true,
    sendEmail: true,
    sendSms: true,
    existingDeliveryKeys: new Set(),
  });
  assert.equal(missingExternal.insertNotification, false);
  assert.equal(missingExternal.queueEmail, true);
  assert.equal(missingExternal.queueSms, true);
  assert.equal(missingExternal.skip, false);

  const complete = planCrisisRecipientNotification({
    userId: USER_ID,
    eventKey,
    alreadyNotified: true,
    sendInApp: true,
    sendEmail: true,
    sendSms: true,
    existingDeliveryKeys: new Set([emailKey, smsKey]),
  });
  assert.equal(complete.skip, true);
});

test("email-only and SMS-only recipients are deduplicated by idempotency key", () => {
  const eventKey = crisisAlertEventKey(alert(), "created");
  const emailKey = `${USER_ID}-${eventKey}-email`;
  const first = planCrisisRecipientNotification({
    userId: USER_ID,
    eventKey,
    alreadyNotified: false,
    sendInApp: false,
    sendEmail: true,
    sendSms: false,
    existingDeliveryKeys: new Set(),
  });
  assert.deepEqual(
    { insertNotification: first.insertNotification, queueEmail: first.queueEmail, emailKey: first.emailKey },
    { insertNotification: false, queueEmail: true, emailKey }
  );

  const repeat = planCrisisRecipientNotification({
    userId: USER_ID,
    eventKey,
    alreadyNotified: false,
    sendInApp: false,
    sendEmail: true,
    sendSms: true,
    existingDeliveryKeys: new Set([emailKey]),
  });
  assert.equal(repeat.queueEmail, false);
  assert.equal(repeat.queueSms, true);
  assert.equal(isUniqueViolation({ code: "23505" }), true);
  assert.equal(isUniqueViolation({ code: "42501" }), false);
});

test("created and updated notices require an active alert, and resolved notices require a resolved alert", () => {
  assert.equal(crisisAlertEventStatusError("Active", "created"), null);
  assert.equal(crisisAlertEventStatusError("active", "updated"), null);
  assert.match(crisisAlertEventStatusError("Resolved", "created"), /active alert/);
  assert.match(crisisAlertEventStatusError("Active", "resolved"), /after the alert is resolved/);
  assert.equal(crisisAlertEventStatusError("Resolved", "resolved"), null);
});

test("an inactive administrator is rejected and an active administrator is allowed", () => {
  assert.equal(adminAccessDecision({ user_type: "admin", is_active: true }), null);
  assert.equal(adminAccessDecision({ user_type: "admin", is_active: false }), "Active administrator access required");
  assert.equal(adminAccessDecision({ user_type: "admin", is_active: null }), "Active administrator access required");
  assert.equal(adminAccessDecision({ user_type: "tourist", is_active: true }), "Admin access required");
  assert.equal(adminAccessDecision(null), "Admin access required");
});

test("the broadcast confirmation names the saved audience instead of always saying tourists", () => {
  assert.equal(describeBroadcastAudience(DEFAULT_NOTIFICATION_AUDIENCE), "Tourists and Tourism Guides");
  assert.equal(
    broadcastConfirmationText(DEFAULT_NOTIFICATION_AUDIENCE, { email: true, sms: true, app: true }),
    "This sends the crisis alert to Tourists and Tourism Guides through the channels you selected: in-app, email, and SMS."
  );
  assert.equal(
    broadcastConfirmationText({ tourists: true, guides: false, admins: true }, { email: true, sms: false, app: false }),
    "This sends the crisis alert to Tourists and Administrators through the channels you selected: email."
  );
  assert.match(
    broadcastConfirmationText({ tourists: false, guides: false, admins: false }, { email: true, sms: true, app: true }),
    /No recipient roles/
  );
});

test("turning every channel off stays off, and a missing channel value does not enable email or SMS", () => {
  assert.deepEqual(channelFlagsToDb({ email: false, sms: false, app: false }), []);
  assert.deepEqual(channelsToDb({ email: false, sms: false, app: false }), []);
  assert.deepEqual(channelFlagsToDb({ email: true, sms: false, app: true }), ["email", "web"]);
  assert.deepEqual(channelsFromDb([]), { email: false, sms: false, app: false });
  assert.deepEqual(channelsFromDb(null), { email: false, sms: false, app: false });
  assert.deepEqual(channelsFromDb(undefined), { email: false, sms: false, app: false });
  assert.deepEqual(channelsFromDb(["web"]), { email: false, sms: false, app: true });
  assert.deepEqual(channelsFromDb(["email", "sms", "web"]), { email: true, sms: true, app: true });
});

test("emergency broadcast email still ignores the profile email preference", () => {
  const channels = getBroadcastAlertChannels(
    { email: true, sms: true, app: true },
    { email: false, sms: false, app: true, push: false }
  );
  assert.equal(channels.email, true);
  assert.equal(channels.sms, false);
  assert.equal(channels.app, true);
});
