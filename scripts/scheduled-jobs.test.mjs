import test from "node:test";
import assert from "node:assert/strict";
import { checkCronSecret, readCronToken, secretsMatch } from "@/lib/cronAuth";
import { getTourEndReminderKind, getTourGroupEndAt } from "@/lib/tourGroupRoute";
import { getInactiveDays, isInactiveOverThreshold } from "@/lib/userActivity";

const request = (headers) => new Request("http://localhost/api/cron/x", { headers });

test("scheduled jobs accept the secret as Bearer (Vercel) or x-cron-secret", () => {
  const env = { CRON_SECRET: "s3cret" };
  assert.deepEqual(checkCronSecret(request({ Authorization: "Bearer s3cret" }), env), { ok: true });
  assert.deepEqual(checkCronSecret(request({ "x-cron-secret": "s3cret" }), env), { ok: true });
  assert.equal(readCronToken(request({ authorization: "bearer s3cret" })), "s3cret");
});

test("scheduled jobs refuse a wrong, missing or unconfigured secret", () => {
  const env = { CRON_SECRET: "s3cret" };
  assert.equal(checkCronSecret(request({ Authorization: "Bearer wrong" }), env).status, 401);
  assert.equal(checkCronSecret(request({}), env).status, 401);
  assert.equal(checkCronSecret(request({ Authorization: "Bearer s3cret" }), {}).status, 503);
  assert.equal(secretsMatch("abc", "abcd"), false);
  assert.equal(secretsMatch("", ""), false);
});

test("the internal notification secret still works when CRON_SECRET is not set", () => {
  const env = { NOTIFICATION_INTERNAL_SECRET: "internal" };
  assert.equal(checkCronSecret(request({ "x-cron-secret": "internal" }), env).ok, true);
});

// Tours end at a Philippine time (UTC+8).
const tour = (extra = {}) => ({ end_date: "2026-11-14", end_time: "17:00:00", ...extra });
const at = (iso) => Date.parse(iso);

test("tour end time is read in Philippine time", () => {
  assert.equal(getTourGroupEndAt(tour()).toISOString(), "2026-11-14T09:00:00.000Z");
  assert.equal(getTourGroupEndAt({ end_date: "2026-11-14" }).toISOString(), "2026-11-14T15:59:59.000Z");
  assert.equal(getTourGroupEndAt({}), null);
});

test("a guide gets the one-hour reminder, then the due reminder, once each", () => {
  assert.equal(getTourEndReminderKind(tour(), at("2026-11-14T07:30:00+08:00")), null);
  assert.equal(getTourEndReminderKind(tour(), at("2026-11-14T16:10:00+08:00")), "one-hour");
  assert.equal(getTourEndReminderKind(tour({ end_reminder_1h_sent_at: "x" }), at("2026-11-14T16:20:00+08:00")), null);
  assert.equal(getTourEndReminderKind(tour({ end_reminder_1h_sent_at: "x" }), at("2026-11-14T17:00:00+08:00")), "due");
  assert.equal(getTourEndReminderKind(tour({ end_reminder_due_sent_at: "x" }), at("2026-11-14T17:05:00+08:00")), null);
});

test("a late scheduler run still sends the due reminder", () => {
  assert.equal(getTourEndReminderKind(tour(), at("2026-11-14T19:45:00+08:00")), "due");
});

test("date-only tours get no one-hour reminder, only the due one at day's end", () => {
  const dateOnly = { end_date: "2026-11-14" };
  assert.equal(getTourEndReminderKind(dateOnly, at("2026-11-14T23:30:00+08:00")), null);
  assert.equal(getTourEndReminderKind(dateOnly, at("2026-11-15T00:00:30+08:00")), "due");
});

test("SMS is paused only after 30 full days without activity", () => {
  const now = at("2026-11-14T08:00:00Z");
  const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isInactiveOverThreshold({ last_seen_at: daysAgo(29) }, 30, now), false);
  assert.equal(isInactiveOverThreshold({ last_seen_at: daysAgo(30) }, 30, now), true);
  // The most recent of sign-in, last seen and sign-up counts.
  assert.equal(isInactiveOverThreshold({ created_at: daysAgo(90), last_login_at: daysAgo(2) }, 30, now), false);
  assert.equal(getInactiveDays({}, now), null);
  assert.equal(isInactiveOverThreshold({}, 30, now), false);
});
