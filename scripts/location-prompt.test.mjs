import test from "node:test";
import assert from "node:assert/strict";
import { LOCATION_PROMPT_SNOOZE_MS, shouldShowLocationPrompt } from "@/lib/locationPrompt";

const base = { role: "tourist", sharing: false, snoozedUntil: null, startGuideDone: true, permission: "prompt", geolocation: true, path: "/crisis", nowMs: 1_000_000 };

test("a signed-in tourist who hasn't shared location is asked", () => {
  assert.equal(shouldShowLocationPrompt(base), true);
  assert.equal(shouldShowLocationPrompt({ ...base, permission: "granted" }), true); // browser allows, but they never opted in
});

test("nobody else is asked, and never twice at once", () => {
  assert.equal(shouldShowLocationPrompt({ ...base, role: "guide" }), false);
  assert.equal(shouldShowLocationPrompt({ ...base, role: "admin" }), false);
  assert.equal(shouldShowLocationPrompt({ ...base, sharing: true }), false);
  assert.equal(shouldShowLocationPrompt({ ...base, startGuideDone: false }), false);
});

test("respects the browser and 'Not now'", () => {
  assert.equal(shouldShowLocationPrompt({ ...base, permission: "denied" }), false);
  assert.equal(shouldShowLocationPrompt({ ...base, geolocation: false }), false);
  assert.equal(shouldShowLocationPrompt({ ...base, snoozedUntil: base.nowMs + LOCATION_PROMPT_SNOOZE_MS }), false);
  assert.equal(shouldShowLocationPrompt({ ...base, snoozedUntil: base.nowMs - 1 }), true); // 7 days passed
});

test("stays quiet on sign-in, staff and offline pages", () => {
  for (const path of ["/login", "/register", "/admin/users", "/guide", "/crisis/command", "/~offline"]) {
    assert.equal(shouldShowLocationPrompt({ ...base, path }), false, path);
  }
  for (const path of ["/", "/crisis", "/routes", "/profile"]) assert.equal(shouldShowLocationPrompt({ ...base, path }), true, path);
});
