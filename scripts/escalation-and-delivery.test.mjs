import test from "node:test";
import assert from "node:assert/strict";
import {
  escalationLevelDue,
  escalationMessage,
  normalizeEscalationSettings,
  validateEscalationSettings,
} from "@/lib/escalation";
import {
  buildRecipientRows,
  pickNonResponders,
  resendWaitMs,
  summarizeRecipients,
} from "@/lib/alertDeliveryReport";
import { notificationIconName } from "@/lib/typeIcons";

const START = "2026-11-16T02:00:00.000Z";
const at = (min) => Date.parse(START) + min * 60_000;

test("escalation steps: admins after N minutes, outside contacts after 2N", () => {
  assert.equal(escalationLevelDue(START, 10, at(5)), 0);
  assert.equal(escalationLevelDue(START, 10, at(10)), 1);
  assert.equal(escalationLevelDue(START, 10, at(19)), 1);
  assert.equal(escalationLevelDue(START, 10, at(20)), 2);
  assert.equal(escalationLevelDue("not a date", 10, at(60)), 0);
});

test("escalation settings are checked and tidied", () => {
  assert.match(validateEscalationSettings({ minutes: 1 }).error, /3 and 120/);
  assert.match(validateEscalationSettings({ minutes: 10, contacts: [{ name: "MDRRMO", phone: "123" }] }).error, /valid Philippine mobile/);
  const ok = validateEscalationSettings({ minutes: "15", contacts: [{ name: " MDRRMO  Daet ", phone: "0917 123 4567" }, { name: "", phone: "" }] });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.minutes, 15);
  assert.equal(ok.value.contacts.length, 1);
  assert.equal(ok.value.contacts[0].name, "MDRRMO Daet");
  assert.match(ok.value.contacts[0].phone, /9171234567$/);
  assert.deepEqual(normalizeEscalationSettings({}), { enabled: true, minutes: 10, contacts: [] });
});

test("escalation messages say what happened and what to press", () => {
  const item = { kind: "missing", summary: "Ana Cruz, last seen at Bagasbas", contact: "Guide Ben 0917…" };
  assert.match(escalationMessage(item, 1, 10), /No response after 10 min.*Acknowledge/);
  assert.match(escalationMessage(item, 2, 10), /ESCALATION.*20 min.*Contact: Guide Ben/);
});

test("the delivery report merges in-app, SMS, email, reminders and replies per person", () => {
  const rows = buildRecipientRows({
    notifications: [
      { user_id: "a", is_read: true },
      { user_id: "b", is_read: false },
      { user_id: "c", is_read: false, dismissed_at: "2026-11-16T02:05:00Z" },
    ],
    deliveries: [
      { user_id: "a", channel: "sms", status: "sent", idempotency_key: "a-crisis-alert:x:created-sms" },
      { user_id: "b", channel: "sms", status: "failed", last_error: "Invalid number", idempotency_key: "b-crisis-alert:x:created-sms" },
      { user_id: "d", channel: "email", status: "sent", idempotency_key: "d-crisis-alert:x:created-email" },
      { user_id: "b", channel: "sms", status: "sent", idempotency_key: "b-crisis-alert:x:resend:1-sms" },
    ],
    checkins: [{ user_id: "d", status: "safe" }],
    profiles: [
      { id: "a", full_name: "Ana", user_type: "tourist", phone: "0917" },
      { id: "b", full_name: "Ben", user_type: "tourist", phone: "0918" },
      { id: "c", full_name: "Cy", user_type: "guide" },
      { id: "d", full_name: "Di", user_type: "tourist" },
    ],
  });
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  assert.equal(byName.Ana.opened, true);
  assert.equal(byName.Ben.sms, "failed");
  assert.equal(byName.Ben.smsError, "Invalid number");
  assert.equal(byName.Ben.resent, "sent");
  assert.equal(byName.Ben.noConfirmedContact, false); // the reminder got through
  assert.equal(byName.Cy.opened, true); // dismissed counts as seen
  assert.equal(byName.Di.reply, "safe");

  const s = summarizeRecipients(rows);
  assert.equal(s.recipients, 4);
  assert.equal(s.smsFailed, 1);
  assert.equal(s.reminded, 1);
  assert.equal(s.replied, 1);
});

test("non-responders are tourists who have not opened, or not answered a check-in", () => {
  const rows = [
    { role: "tourist", opened: false, reply: null, name: "A" },
    { role: "tourist", opened: true, reply: null, name: "B" },
    { role: "tourist", opened: true, reply: "safe", name: "C" },
    { role: "guide", opened: false, reply: null, name: "G" },
  ];
  assert.deepEqual(pickNonResponders(rows).map((r) => r.name), ["A"]);
  assert.deepEqual(pickNonResponders(rows, { checkinRequested: true }).map((r) => r.name), ["A", "B"]);
});

test("reminders wait 10 minutes between rounds", () => {
  const now = Date.parse("2026-11-16T03:00:00Z");
  assert.equal(resendWaitMs(null, now), 0);
  assert.equal(resendWaitMs("2026-11-16T02:45:00Z", now), 0);
  assert.equal(resendWaitMs("2026-11-16T02:55:00Z", now), 5 * 60_000);
});

test("escalation notices get a warning icon", () => {
  assert.equal(notificationIconName({ notification_type: "urgent_escalation", related_type: "alert" }), "TriangleAlert");
});
