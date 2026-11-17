import test from "node:test";
import assert from "node:assert/strict";
import { getSafetyStatus } from "@/lib/safetyStatus";

const alert = (id, severity, extra = {}) => ({ id, severity, status: "Active", is_public: true, ...extra });

test("no active alerts reads as safe", () => {
  const status = getSafetyStatus([alert("a", "Critical", { status: "Resolved" })]);
  assert.equal(status.tone, "safe");
  assert.equal(status.href, "/crisis");
});

test("one critical alert links straight to it", () => {
  const status = getSafetyStatus([alert("a", "Low"), alert("b", "Critical")]);
  assert.equal(status.tone, "critical");
  assert.match(status.text, /^1 critical alert in Daet/);
  assert.equal(status.href, "/crisis?alert=b");
});

test("several critical alerts open the list", () => {
  const status = getSafetyStatus([alert("a", "Critical"), alert("b", "Critical")]);
  assert.match(status.text, /^2 critical alerts/);
  assert.equal(status.href, "/crisis");
});

test("high beats low, low-only says no critical", () => {
  assert.equal(getSafetyStatus([alert("a", "High"), alert("b", "Low")]).tone, "high");
  const low = getSafetyStatus([alert("a", "Low"), alert("b", "Medium")]);
  assert.equal(low.tone, "low");
  assert.match(low.text, /No critical alerts\. 2 minor alerts/);
});

test("private alerts are ignored", () => {
  assert.equal(getSafetyStatus([alert("a", "Critical", { is_public: false })]).tone, "safe");
});

test("loading and errors only show before any alerts are known", () => {
  assert.equal(getSafetyStatus([], { loading: true }).tone, "loading");
  assert.equal(getSafetyStatus([], { error: "x" }).tone, "error");
  assert.equal(getSafetyStatus([alert("a", "High")], { loading: true }).tone, "high");
});

test("never says safe before the alerts have loaded once", () => {
  assert.equal(getSafetyStatus([], { loaded: false }).tone, "loading");
  assert.equal(getSafetyStatus([], { loaded: true }).tone, "safe");
  assert.equal(getSafetyStatus([], { loaded: false, error: "offline" }).tone, "error");
});
