import test from "node:test";
import assert from "node:assert/strict";
import { dispatchNotificationServer } from "../src/lib/notificationDispatch.server.js";

/** A fake database: the user has a phone in Profile but none verified in Supabase Auth. */
function fakeAdmin() {
  const queued = [];
  const chain = (table) => {
    const q = {
      _insert: null,
      select() { return q; },
      eq() { return q; },
      insert(rows) { q._insert = rows; return q; },
      async maybeSingle() {
        return {
          data: { id: "u1", user_type: "admin", notification_channels: { sms: true, email: true, app: true }, email: null, phone: "09171234567", sms_suspended_at: null },
          error: null,
        };
      },
      async single() { return { data: { id: "n1" }, error: null }; },
      then(resolve) {
        if (table === "notification_deliveries") {
          queued.push(...q._insert);
          return resolve({ data: q._insert.map((r, i) => ({ ...r, id: `d${i}` })), error: null });
        }
        return resolve({ data: null, error: null });
      },
    };
    return q;
  };
  return {
    queued,
    from: chain,
    auth: { admin: { getUserById: async () => ({ data: { user: { id: "u1", email: "a@example.test", email_confirmed_at: null, phone: "", phone_confirmed_at: null } }, error: null }) } },
  };
}

const notice = { userId: "u1", title: "Missing tourist: Ana", message: "…", channels: ["web", "sms"], priority: "CRITICAL" };

test("urgent safety notices text the phone saved in Profile when none is verified", async () => {
  const admin = fakeAdmin();
  await dispatchNotificationServer({ ...notice, adminClient: admin, processDeliveries: async () => {}, urgentSmsToProfilePhone: true });
  const sms = admin.queued.filter((d) => d.channel === "sms");
  assert.equal(sms.length, 1);
  assert.match(sms[0].recipient, /9171234567$/);
});

test("routine notices still text only verified phones", async () => {
  const admin = fakeAdmin();
  await dispatchNotificationServer({ ...notice, adminClient: admin, processDeliveries: async () => {} });
  assert.equal(admin.queued.filter((d) => d.channel === "sms").length, 0);
});
