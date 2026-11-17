import test from "node:test";
import assert from "node:assert/strict";
import {
  alertAcceptsCheckins,
  summarizeCheckins,
  validateCheckin,
} from "@/lib/alertCheckins";
import { formatCrisisAlertSms } from "@/lib/smsMessageFormat";

test("tourists can answer safe, need help or evacuated; only guides can mark missing", () => {
  assert.equal(validateCheckin({ status: "safe" }).ok, true);
  assert.equal(validateCheckin({ status: "need_help" }).ok, true);
  assert.equal(validateCheckin({ status: "evacuated" }).ok, true);
  assert.equal(validateCheckin({ status: "missing" }).ok, false);
  assert.equal(validateCheckin({ status: "missing" }, { byGuide: true }).ok, true);
  assert.equal(validateCheckin({ status: "fine" }).ok, false);
  assert.equal(validateCheckin(null).ok, false);
});

test("notes are tidied and kept short", () => {
  const result = validateCheckin({ status: "need_help", note: "  near   the   lighthouse  " });
  assert.equal(result.value.note, "near the lighthouse");
  assert.equal(validateCheckin({ status: "safe", note: "   " }).value.note, null);
  assert.equal(validateCheckin({ status: "need_help", note: "x".repeat(500) }).value.note.length, 300);
});

test("only active alerts that ask for it accept check-ins", () => {
  assert.equal(alertAcceptsCheckins({ checkin_requested: true, status: "Active" }), true);
  assert.equal(alertAcceptsCheckins({ checkin_requested: true, status: "Resolved" }), false);
  assert.equal(alertAcceptsCheckins({ checkin_requested: false, status: "Active" }), false);
  assert.equal(alertAcceptsCheckins(null), false);
});

test("the summary counts each answer and who has not replied", () => {
  const summary = summarizeCheckins(
    [
      { status: "safe" },
      { status: "safe" },
      { status: "evacuated" },
      { status: "need_help", handled_at: null },
      { status: "missing", handled_at: "2026-11-15T09:00:00Z" },
    ],
    20
  );
  assert.deepEqual(
    { safe: summary.safe, evacuated: summary.evacuated, need_help: summary.need_help, missing: summary.missing },
    { safe: 2, evacuated: 1, need_help: 1, missing: 1 }
  );
  assert.equal(summary.replied, 5);
  assert.equal(summary.noReply, 15);
  assert.equal(summary.unhandledUrgent, 1);
  assert.equal(summarizeCheckins([{ status: "safe" }], 0).noReply, 0);
});

test("alerts that ask for check-ins tell tourists how to reply by SMS", () => {
  assert.match(formatCrisisAlertSms({ title: "Typhoon", checkin_requested: true }), /I'm safe or I need help/);
  assert.doesNotMatch(formatCrisisAlertSms({ title: "Typhoon" }), /I'm safe/);
});
