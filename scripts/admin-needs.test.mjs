import test from "node:test";
import assert from "node:assert/strict";
import { buildAdminNeeds } from "@/lib/adminNeeds";

test("nothing to do gives an empty list", () => {
  assert.deepEqual(buildAdminNeeds(), []);
});

test("urgent rows first; escalated reports are not counted twice as new", () => {
  const rows = buildAdminNeeds({
    incidents: [
      { id: 1, status: "Submitted", escalation_level: 1 },
      { id: 2, status: "Submitted", escalation_level: 0 },
      { id: 3, status: "Closed", escalation_level: 2 },
    ],
    missingCases: [
      { search_status: "searching", acknowledged_at: null },
      { search_status: "searching", acknowledged_at: "2026-11-17T00:00:00Z" },
      { search_status: "found", acknowledged_at: null },
    ],
    pendingHelp: 2,
    smsFailures: [{ alertId: "a", failed: 3, title: "Flood" }, { alertId: "b", failed: 0 }],
  });
  assert.deepEqual(rows.map((r) => r.id), ["missing", "escalated", "new-reports", "help", "sms-a"]);
  assert.equal(rows[0].title, "1 missing tourist not acknowledged");
  assert.equal(rows[1].title, "1 report escalated");
  assert.equal(rows[2].title, "1 new report");
  assert.equal(rows[4].title, '3 texts failed for "Flood"');
  assert.ok(rows[0].urgent && rows[1].urgent && !rows[2].urgent);
});
