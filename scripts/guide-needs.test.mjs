import test from "node:test";
import assert from "node:assert/strict";
import { buildGuideNeeds } from "@/lib/guideNeeds";

test("nothing to do gives an empty list", () => {
  assert.deepEqual(buildGuideNeeds(), []);
});

test("missing tourists and check-ins come first and are urgent", () => {
  const rows = buildGuideNeeds({
    waitingAssistance: 1,
    incidents: [
      { id: "a", status: "Pending", category: "Missing Person", location: "Bagasbas" },
      { id: "b", status: "Pending", category: "Accident" },
      { id: "c", status: "Closed", category: "Missing Person" },
    ],
    unaccounted: [{ alertId: "x", count: 2, title: "Typhoon" }],
  });
  assert.deepEqual(rows.map((r) => r.id), ["missing-a", "checkin-x", "assistance", "reports"]);
  assert.equal(rows[0].urgent, true);
  assert.equal(rows[0].title, "Missing tourist near Bagasbas");
  assert.equal(rows[1].title, "2 tourists not accounted for");
  assert.equal(rows[3].title, "1 open report");
});
