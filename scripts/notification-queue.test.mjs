import test from "node:test";
import assert from "node:assert/strict";
import {
  processNotificationDeliveries,
  STALE_DELIVERY_MS,
  STUCK_PROCESSING_MS,
} from "@/lib/notificationQueue.server";

const NOW = Date.parse("2026-11-14T08:00:00Z");

/** Minimal in-memory stand-in for the Supabase query builder calls the queue uses. */
function fakeSupabase(rows) {
  const table = rows.map((r) => ({ ...r }));
  const query = (mode, patch) => {
    const filters = [];
    let order = null;
    let limit = Infinity;
    let wantRows = mode === "select";
    const builder = {
      select() { wantRows = true; return builder; },
      eq(col, val) { filters.push((r) => r[col] === val); return builder; },
      in(col, vals) { filters.push((r) => vals.includes(r[col])); return builder; },
      lt(col, val) { filters.push((r) => r[col] < val); return builder; },
      order(col, { ascending }) { order = { col, ascending }; return builder; },
      limit(n) { limit = n; return builder; },
      then(resolve) {
        let matched = table.filter((r) => filters.every((f) => f(r)));
        if (order) {
          matched.sort((a, b) => (a[order.col] < b[order.col] ? -1 : 1) * (order.ascending ? 1 : -1));
        }
        matched = matched.slice(0, limit);
        if (mode === "update") matched.forEach((r) => Object.assign(r, patch));
        resolve({ data: wantRows ? matched.map((r) => ({ ...r })) : null, error: null });
      },
    };
    return builder;
  };
  return {
    table,
    from: () => ({
      select: () => query("select"),
      update: (patch) => query("update", patch),
    }),
  };
}

function row(id, extra = {}) {
  return {
    id,
    channel: "sms",
    status: "pending",
    recipient: "+639171234567",
    body: "Test alert",
    priority: "NORMAL",
    retry_count: 0,
    max_retries: 3,
    created_at: new Date(NOW - 60_000).toISOString(),
    updated_at: new Date(NOW - 60_000).toISOString(),
    ...extra,
  };
}

const okSender = () => async () => ({ success: true, messageId: "m1" });

test("a broadcast sends every listed delivery, not only the first 80", async () => {
  const rows = Array.from({ length: 130 }, (_, i) => row(`d${i}`));
  const db = fakeSupabase(rows);
  let sent = 0;
  const result = await processNotificationDeliveries({
    deliveryIds: rows.map((r) => r.id),
    supabase: db,
    senders: { sms: async () => { sent += 1; return { success: true }; }, email: okSender() },
    clock: () => NOW,
  });
  assert.equal(sent, 130);
  assert.equal(result.processed, 130);
  assert.ok(db.table.every((r) => r.status === "sent"));
});

test("a delivery already claimed by another run is not sent twice", async () => {
  const db = fakeSupabase([row("a", { status: "processing" }), row("b", { status: "sent" }), row("c")]);
  let sent = 0;
  await processNotificationDeliveries({
    deliveryIds: ["a", "b", "c"],
    supabase: db,
    senders: { sms: async () => { sent += 1; return { success: true }; } },
    clock: () => NOW,
  });
  assert.equal(sent, 1);
});

test("the scheduled run retries failed messages and recovers stuck ones", async () => {
  const stuckAt = new Date(NOW - STUCK_PROCESSING_MS - 1000).toISOString();
  const db = fakeSupabase([
    row("retry", { status: "retrying", retry_count: 1 }),
    row("stuck", { status: "processing", updated_at: stuckAt }),
    row("fresh-processing", { status: "processing", updated_at: new Date(NOW).toISOString() }),
  ]);
  const result = await processNotificationDeliveries({
    supabase: db,
    senders: { sms: okSender() },
    clock: () => NOW,
  });
  const byId = Object.fromEntries(db.table.map((r) => [r.id, r]));
  assert.equal(result.recovered, 1);
  assert.equal(byId.retry.status, "sent");
  assert.equal(byId.stuck.status, "sent");
  assert.equal(byId.stuck.retry_count, 1);
  assert.equal(byId["fresh-processing"].status, "processing");
});

test("out-of-date messages are cancelled instead of sent", async () => {
  const old = new Date(NOW - STALE_DELIVERY_MS - 1000).toISOString();
  const db = fakeSupabase([row("old", { created_at: old })]);
  let sent = 0;
  const result = await processNotificationDeliveries({
    supabase: db,
    senders: { sms: async () => { sent += 1; return { success: true }; } },
    clock: () => NOW,
  });
  assert.equal(result.cancelled, 1);
  assert.equal(sent, 0);
  assert.equal(db.table[0].status, "cancelled");
});

test("urgent messages are sent before normal ones", async () => {
  const db = fakeSupabase([
    row("normal", { body: "normal", created_at: new Date(NOW - 120_000).toISOString() }),
    row("critical", { body: "critical", priority: "CRITICAL" }),
  ]);
  const order = [];
  await processNotificationDeliveries({
    supabase: db,
    senders: { sms: async ({ message }) => { order.push(message); return { success: true }; } },
    clock: () => NOW,
  });
  db.table.forEach((r) => assert.equal(r.status, "sent"));
  assert.deepEqual(order, ["critical", "normal"]);
});

test("work left when time runs out stays pending for the next run", async () => {
  const rows = Array.from({ length: 6 }, (_, i) => row(`t${i}`));
  const db = fakeSupabase(rows);
  let now = NOW;
  const result = await processNotificationDeliveries({
    deliveryIds: rows.map((r) => r.id),
    supabase: db,
    senders: { sms: async () => { now += 10_000; return { success: true }; } },
    clock: () => now,
    timeBudgetMs: 25_000,
  });
  assert.ok(result.deferred > 0);
  const pending = db.table.filter((r) => r.status === "pending").length;
  assert.equal(pending, result.deferred);
});

test("a failed send is marked retrying, then failed after the last attempt", async () => {
  const db = fakeSupabase([row("f", { retry_count: 2 })]);
  await processNotificationDeliveries({
    deliveryIds: ["f"],
    supabase: db,
    senders: { sms: async () => ({ success: false, error: "network timeout" }) },
    clock: () => NOW,
  });
  assert.equal(db.table[0].status, "failed");
  assert.equal(db.table[0].retry_count, 3);
});
