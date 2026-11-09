import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  planSubscriptionReconcile,
  runPushDeliveries,
  subscriptionsForRecipient,
} from "../src/lib/webPushTargets.mjs";

function device(userId, endpoint, extra = {}) {
  return {
    id: `${userId}:${endpoint}`,
    user_id: userId,
    endpoint,
    p256dh: `key-${endpoint}`,
    auth: `auth-${endpoint}`,
    enabled: true,
    disabled_reason: null,
    ...extra,
  };
}

function registerDevice(rows, { userId, endpoint, p256dh, auth }) {
  const next = rows.map((row) => (
    row.endpoint === endpoint && row.user_id !== userId && row.enabled
      ? { ...row, enabled: false, disabled_reason: "account_switch" }
      : row
  ));
  const existing = next.findIndex((row) => row.user_id === userId && row.endpoint === endpoint);
  const registered = {
    ...(existing >= 0 ? next[existing] : { id: `${userId}:${endpoint}` }),
    user_id: userId,
    endpoint,
    p256dh,
    auth,
    enabled: true,
    disabled_reason: null,
  };
  if (existing >= 0) next[existing] = registered;
  else next.push(registered);
  return next;
}

test("one account on two or three devices gets one send per device from one notification", async () => {
  const notification = { id: "notice-1", title: "Alert", message: "Flood" };
  for (const count of [2, 3]) {
    const rows = Array.from({ length: count }, (_, index) => device("tourist", `https://fcm.googleapis.com/device-${index + 1}`));
    const targets = subscriptionsForRecipient(rows, "tourist");
    assert.equal(targets.length, count);
    const sent = [];
    const { summary } = await runPushDeliveries(targets, async (row) => {
      sent.push({ endpoint: row.endpoint, notificationId: notification.id });
    });
    assert.equal(summary.sent, count);
    assert.equal(new Set(sent.map((item) => item.notificationId)).size, 1);
    assert.equal(new Set(sent.map((item) => item.endpoint)).size, count);
  }
});

test("another account is excluded and a repeated endpoint is sent once", () => {
  const rows = [
    device("tourist-a", "https://fcm.googleapis.com/phone"),
    device("tourist-a", "https://fcm.googleapis.com/laptop"),
    device("tourist-a", "https://fcm.googleapis.com/phone"),
    device("tourist-b", "https://fcm.googleapis.com/other-phone"),
    device("tourist-a", "https://fcm.googleapis.com/tablet", { enabled: false, disabled_reason: "user" }),
  ];
  const targets = subscriptionsForRecipient(rows, "tourist-a").map((row) => row.endpoint);
  assert.deepEqual(targets, [
    "https://fcm.googleapis.com/phone",
    "https://fcm.googleapis.com/laptop",
  ]);
  assert.deepEqual(
    subscriptionsForRecipient(rows, "tourist-b").map((row) => row.endpoint),
    ["https://fcm.googleapis.com/other-phone"]
  );
});

test("an expired subscription does not stop delivery to the account's other devices", async () => {
  const targets = [
    device("tourist", "https://fcm.googleapis.com/phone"),
    device("tourist", "https://fcm.googleapis.com/laptop"),
    device("tourist", "https://web.push.apple.com/ipad"),
  ];
  const { summary } = await runPushDeliveries(targets, async (row) => {
    if (row.endpoint.includes("laptop")) {
      const error = new Error("gone");
      error.statusCode = 410;
      throw error;
    }
  });
  assert.equal(summary.sent, 2);
  assert.equal(summary.expired, 1);
  assert.equal(summary.failed, 0);
  assert.deepEqual(summary.expiredIds, ["tourist:https://fcm.googleapis.com/laptop"]);
});

test("a failed device does not cancel the remaining devices", async () => {
  const targets = [
    device("tourist", "https://fcm.googleapis.com/phone"),
    device("tourist", "https://fcm.googleapis.com/laptop"),
  ];
  const { summary } = await runPushDeliveries(targets, async (row) => {
    if (row.endpoint.includes("phone")) throw new Error("temporary push outage");
  });
  assert.equal(summary.sent, 1);
  assert.equal(summary.failed, 1);
});

test("registering another device keeps the first device keys", () => {
  let rows = registerDevice([], {
    userId: "tourist",
    endpoint: "https://fcm.googleapis.com/phone",
    p256dh: "phone-key",
    auth: "phone-auth",
  });
  rows = registerDevice(rows, {
    userId: "tourist",
    endpoint: "https://fcm.googleapis.com/laptop",
    p256dh: "laptop-key",
    auth: "laptop-auth",
  });
  const phone = rows.find((row) => row.endpoint.endsWith("/phone"));
  assert.equal(phone.p256dh, "phone-key");
  assert.equal(phone.auth, "phone-auth");
  assert.equal(phone.enabled, true);
  assert.equal(subscriptionsForRecipient(rows, "tourist").length, 2);
});

test("account switching parks the previous account and restores it without a new opt-in", () => {
  let rows = registerDevice([], {
    userId: "tourist-a",
    endpoint: "https://fcm.googleapis.com/shared",
    p256dh: "shared-key",
    auth: "shared-auth",
  });
  rows = registerDevice(rows, {
    userId: "tourist-a",
    endpoint: "https://fcm.googleapis.com/phone",
    p256dh: "phone-key",
    auth: "phone-auth",
  });

  const sharedForB = rows.find((row) => row.user_id === "tourist-a" && row.endpoint.endsWith("/shared"));
  assert.deepEqual(planSubscriptionReconcile(sharedForB, "tourist-b"), {
    action: "park_other",
    deviceEnabled: false,
  });
  rows = rows.map((row) => (
    row.endpoint.endsWith("/shared") && row.user_id === "tourist-a"
      ? { ...row, enabled: false, disabled_reason: "account_switch" }
      : row
  ));
  assert.deepEqual(
    subscriptionsForRecipient(rows, "tourist-a").map((row) => row.endpoint),
    ["https://fcm.googleapis.com/phone"]
  );

  const parked = rows.find((row) => row.user_id === "tourist-a" && row.endpoint.endsWith("/shared"));
  assert.deepEqual(planSubscriptionReconcile(parked, "tourist-a"), {
    action: "restore",
    deviceEnabled: true,
  });
  rows = rows.map((row) => (
    row === parked ? { ...row, enabled: true, disabled_reason: null } : row
  ));
  assert.equal(subscriptionsForRecipient(rows, "tourist-a").length, 2);
});

test("a device the user turned off is not restored on the next login", () => {
  const row = device("tourist", "https://fcm.googleapis.com/laptop", {
    enabled: false,
    disabled_reason: "user",
  });
  assert.deepEqual(planSubscriptionReconcile(row, "tourist"), {
    action: "leave_disabled",
    deviceEnabled: false,
  });
});

test("migration keeps each device and does not re-enable every device on registration", () => {
  const sql = fs.readFileSync(new URL("../supabase/migrations/042_web_push_account_devices.sql", import.meta.url), "utf8");
  const register = sql.split("CREATE OR REPLACE FUNCTION public.register_web_push_subscription")[1]
    .split("CREATE OR REPLACE FUNCTION public.set_web_push_enabled")[0];
  const disableDevice = sql.split("CREATE OR REPLACE FUNCTION public.disable_web_push_device")[1]
    .split("CREATE OR REPLACE FUNCTION public.reconcile_web_push_device")[0];
  const reconcile = sql.split("CREATE OR REPLACE FUNCTION public.reconcile_web_push_device")[1]
    .split("CREATE OR REPLACE FUNCTION public.set_web_push_account_preference")[0];

  assert.match(register, /ON CONFLICT \(user_id, endpoint\)/);
  assert.match(register, /user_id <> p_user_id/);
  assert.doesNotMatch(register, /SET enabled = TRUE[\s\S]*WHERE user_id = p_user_id;/);
  assert.match(disableDevice, /endpoint = p_endpoint/);
  assert.match(disableDevice, /disabled_reason = 'user'/);
  assert.match(reconcile, /disabled_reason = 'account_switch'/);
  assert.match(reconcile, /user_id <> p_user_id/);
  assert.match(sql, /web_push_subscriptions_user_endpoint_key/);
});
