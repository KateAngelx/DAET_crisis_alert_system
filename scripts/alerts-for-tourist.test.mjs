import test from "node:test";
import assert from "node:assert/strict";
import { alertsForTourist } from "@/lib/alertsForTourist";

const alert = (id, severity, extra = {}) => ({ id, severity, status: "Active", is_public: true, title: id, location: "", ...extra });
const group = { status: "active", destination: "Bagasbas Beach", starting_location: "Daet Plaza" };

test("serious alerts show for every tourist, most serious first", () => {
  const rows = alertsForTourist([alert("h", "High"), alert("l", "Low"), alert("c", "Critical")], null);
  assert.deepEqual(rows.map((row) => row.alert.id), ["c", "h"]);
  assert.equal(rows[0].reason, "Serious alert in Daet");
});

test("a minor alert on the tour route is shown with its reason", () => {
  const rows = alertsForTourist([alert("b", "Low", { location: "Bagasbas" }), alert("m", "Low", { location: "Mercedes" })], group);
  assert.deepEqual(rows.map((row) => row.alert.id), ["b"]);
  assert.equal(rows[0].reason, "On your tour route");
});

test("resolved and private alerts are left out", () => {
  const rows = alertsForTourist([
    alert("r", "Critical", { status: "Resolved" }),
    alert("p", "Critical", { is_public: false }),
  ], group);
  assert.equal(rows.length, 0);
});
