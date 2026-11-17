import test from "node:test";
import assert from "node:assert/strict";
import { isPermanentSmsError, normalizePhilippinePhone, sendSms } from "@/lib/smsService";
import { formatCrisisAlertSms } from "@/lib/smsMessageFormat";

const SMS_ENV_KEYS = [
  "SMS_PRIMARY_PROVIDER",
  "SEMAPHORE_API_KEY",
  "SEMAPHORE_SENDER_NAME",
  "SEMAPHORE_API_URL",
  "IPROG_SMS_API_TOKEN",
  "IPROG_SMS_API_URL",
  "SMS_API_URL",
];

/** Runs `fn` with only the given SMS settings and a fake fetch that records calls. */
async function withSms(env, responder, fn) {
  const savedEnv = Object.fromEntries(SMS_ENV_KEYS.map((key) => [key, process.env[key]]));
  const savedFetch = globalThis.fetch;
  for (const key of SMS_ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const provider = String(url).includes("semaphore") ? "semaphore" : "iprog";
    calls.push({ provider, url: String(url), init });
    return responder(provider, calls.length);
  };
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of SMS_ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  }
}

const json = (status, body) => new Response(JSON.stringify(body), { status });
const BOTH = { SEMAPHORE_API_KEY: "sem-key", IPROG_SMS_API_TOKEN: "iprog-token" };

test("Philippine numbers are normalized; other numbers are rejected", () => {
  assert.equal(normalizePhilippinePhone("+63 917 123 4567"), "09171234567");
  assert.equal(normalizePhilippinePhone("9171234567"), "09171234567");
  assert.equal(normalizePhilippinePhone("0917-123-4567"), "09171234567");
  assert.equal(normalizePhilippinePhone("12345"), null);
  assert.equal(normalizePhilippinePhone(""), null);
});

test("Semaphore is used first and stops after it succeeds", async () => {
  await withSms(BOTH, () => json(200, [{ message_id: 101, status: "Queued", network: "Globe" }]), async (calls) => {
    const result = await sendSms({ to: "09171234567", message: "Test alert" });
    assert.equal(result.success, true);
    assert.equal(result.provider, "semaphore");
    assert.equal(result.messageId, "101");
    assert.equal(calls.length, 1);
  });
});

test("when Semaphore fails, the message falls back to iProg", async () => {
  const responder = (provider) =>
    provider === "semaphore" ? json(500, { error: "Server error" }) : json(200, { message_id: "ip-7" });
  await withSms(BOTH, responder, async (calls) => {
    const result = await sendSms({ to: "09171234567", message: "Test alert" });
    assert.equal(result.success, true);
    assert.equal(result.provider, "iprog");
    assert.equal(result.fallbackFrom, "semaphore");
    assert.deepEqual(calls.map((c) => c.provider), ["semaphore", "iprog"]);
  });
});

test("a network error on the first provider still falls back", async () => {
  const responder = (provider) => {
    if (provider === "semaphore") throw new TypeError("fetch failed");
    return json(200, { message_id: "ip-8" });
  };
  await withSms(BOTH, responder, async () => {
    const result = await sendSms({ to: "09171234567", message: "Test alert" });
    assert.equal(result.success, true);
    assert.equal(result.provider, "iprog");
  });
});

test("SMS_PRIMARY_PROVIDER=iprog tries iProg first", async () => {
  await withSms({ ...BOTH, SMS_PRIMARY_PROVIDER: "iprog" }, () => json(200, { message_id: "ip-9" }), async (calls) => {
    const result = await sendSms({ to: "09171234567", message: "Test alert" });
    assert.equal(result.provider, "iprog");
    assert.deepEqual(calls.map((c) => c.provider), ["iprog"]);
  });
});

test("when every provider fails the result is a retryable failure", async () => {
  await withSms(BOTH, () => json(503, { error: "Service unavailable" }), async () => {
    const result = await sendSms({ to: "09171234567", message: "Test alert" });
    assert.equal(result.success, false);
    assert.equal(result.permanent, false);
    assert.equal(result.apiAttempts, 2);
    assert.match(result.error, /semaphore: .*; iprog: /);
  });
});

test("a bad API key on every provider is a permanent failure (not retried)", async () => {
  await withSms(BOTH, () => json(401, { error: "Invalid API key" }), async () => {
    const result = await sendSms({ to: "09171234567", message: "Test alert" });
    assert.equal(result.success, false);
    assert.equal(result.permanent, true);
  });
});

test("an invalid phone number is permanent and makes no provider call", async () => {
  await withSms(BOTH, () => json(200, {}), async (calls) => {
    const result = await sendSms({ to: "12345", message: "Test alert" });
    assert.equal(result.success, false);
    assert.equal(result.permanent, true);
    assert.equal(calls.length, 0);
  });
});

test("with no provider configured, SMS is skipped instead of failing", async () => {
  await withSms({}, () => json(200, {}), async (calls) => {
    const result = await sendSms({ to: "09171234567", message: "Test alert" });
    assert.equal(result.skipped, true);
    assert.equal(calls.length, 0);
  });
});

test("an unknown primary provider is reported as a configuration error", async () => {
  await withSms({ ...BOTH, SMS_PRIMARY_PROVIDER: "twilio" }, () => json(200, {}), async (calls) => {
    const result = await sendSms({ to: "09171234567", message: "Test alert" });
    assert.equal(result.success, false);
    assert.equal(result.permanent, true);
    assert.equal(calls.length, 0);
  });
});

test("permanent SMS errors are told apart from temporary ones", () => {
  assert.equal(isPermanentSmsError("Invalid phone number"), true);
  assert.equal(isPermanentSmsError("Insufficient credits"), true);
  assert.equal(isPermanentSmsError("Unauthorized"), true);
  assert.equal(isPermanentSmsError("Gateway timeout"), false);
  assert.equal(isPermanentSmsError(""), false);
});

test("crisis alert SMS text includes the key facts", () => {
  const body = formatCrisisAlertSms({
    title: "Flooding",
    type: "Weather",
    severity: "High",
    location: "Bagasbas",
    message: "Avoid the beach road.",
  });
  assert.match(body, /CONNECT-DAET/);
  assert.match(body, /SEVERITY: High/);
  assert.match(body, /LOCATION: Bagasbas/);
  assert.match(formatCrisisAlertSms({ title: "Flooding" }, { resolved: true }), /RESOLVED/);
});
