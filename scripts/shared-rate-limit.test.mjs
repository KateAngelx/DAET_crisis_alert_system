import test from "node:test";
import assert from "node:assert/strict";
import {
  consumeSharedRateLimit,
  hashRateLimitKey,
  resetSharedRateLimitState,
} from "@/lib/sharedRateLimit.server";

const NOW = Date.parse("2026-11-14T08:00:00Z");

/** Stand-in for the consume_rate_limit database function, shared by every "server". */
function fakeDatabase() {
  const rows = new Map();
  const seenKeys = [];
  return {
    seenKeys,
    rpc: async (name, { p_key, p_limit, p_window_ms }) => {
      assert.equal(name, "consume_rate_limit");
      seenKeys.push(p_key);
      const row = rows.get(p_key);
      if (!row || row.resetAt <= NOW) rows.set(p_key, { count: 1, resetAt: NOW + p_window_ms });
      else row.count += 1;
      const { count, resetAt } = rows.get(p_key);
      return {
        data: [{ allowed: count <= p_limit, remaining: Math.max(p_limit - count, 0), reset_at: new Date(resetAt).toISOString() }],
        error: null,
      };
    },
  };
}

test("the limit holds across server instances because the count is shared", async () => {
  resetSharedRateLimitState();
  const db = fakeDatabase();
  // Three different "servers" all talk to the same database.
  const results = [];
  for (let i = 0; i < 4; i += 1) {
    results.push(await consumeSharedRateLimit("rl:register:203.0.113.5", 3, 60 * 60_000, { client: db, now: NOW }));
  }
  assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false]);
  assert.ok(results.every((r) => r.shared));
  assert.equal(results[3].remaining, 0);
});

test("IP addresses, phones and emails are never stored as plain text", async () => {
  resetSharedRateLimitState();
  const db = fakeDatabase();
  await consumeSharedRateLimit("rl:guest-incident-contact:09171234567", 5, 60_000, { client: db, now: NOW });
  assert.equal(db.seenKeys[0], hashRateLimitKey("rl:guest-incident-contact:09171234567"));
  assert.match(db.seenKeys[0], /^[0-9a-f]{64}$/);
  assert.ok(!db.seenKeys[0].includes("0917"));
});

test("if the database is not set up yet, per-server limits still protect the form", async () => {
  resetSharedRateLimitState();
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(message);
  try {
    let calls = 0;
    const missing = {
      rpc: async () => {
        calls += 1;
        return { data: null, error: { code: "PGRST202", message: "function not found" } };
      },
    };
    const key = `rl:test-missing:${Math.random()}`;
    const results = [];
    for (let i = 0; i < 3; i += 1) {
      results.push(await consumeSharedRateLimit(key, 2, 60_000, { client: missing, now: NOW }));
    }
    assert.deepEqual(results.map((r) => r.allowed), [true, true, false]);
    assert.ok(results.every((r) => !r.shared));
    assert.equal(calls, 1, "stops asking the database after it reports the function is missing");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /046_shared_rate_limits/);
  } finally {
    console.warn = originalWarn;
  }
});

test("a database outage never blocks real users", async () => {
  resetSharedRateLimitState();
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const broken = { rpc: async () => { throw new Error("connection reset"); } };
    const result = await consumeSharedRateLimit(`rl:test-outage:${Math.random()}`, 5, 60_000, { client: broken, now: NOW });
    assert.equal(result.allowed, true);
    assert.equal(result.shared, false);
  } finally {
    console.warn = originalWarn;
  }
});

test("with no database configured, the per-server counter is used", async () => {
  resetSharedRateLimitState();
  const result = await consumeSharedRateLimit(`rl:test-none:${Math.random()}`, 1, 60_000, { client: null, now: NOW });
  assert.equal(result.allowed, true);
  assert.equal(result.shared, false);
});
