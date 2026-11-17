import test from "node:test";
import assert from "node:assert/strict";
import {
  isConnectionError,
  loadOfflineSnapshot,
  saveOfflineSnapshot,
  selectOfflineItems,
} from "@/lib/offlineSnapshot";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    raw: data,
  };
}

test("only active, public alerts are saved, with public fields only", () => {
  const items = selectOfflineItems("alerts", [
    { id: 1, title: "Flood", status: "Active", is_public: true, severity: "High", channels: ["sms"], rewards_eligible: true },
    { id: 2, title: "Old fire", status: "Resolved", is_public: true },
    { id: 3, title: "Draft", status: "Active", is_public: false },
  ]);
  assert.deepEqual(items.map((a) => a.id), [1]);
  assert.equal("channels" in items[0], false);
  assert.equal("rewards_eligible" in items[0], false);
});

test("saved alerts, hazards and roads can be read back with the time they were saved", () => {
  const storage = memoryStorage();
  const now = Date.parse("2026-11-15T08:00:00Z");
  saveOfflineSnapshot("alerts", [{ id: "a", title: "Flood", status: "Active" }], { storage, now });
  saveOfflineSnapshot("hazards", [{ id: "h", dangerous_location: "Bagasbas", status: "Active" }], { storage, now });
  saveOfflineSnapshot("roads", [{ id: "r", title: "Vinzons Ave", status: "Active", route_status: "Closed" }], { storage, now });

  assert.equal(loadOfflineSnapshot("alerts", { storage }).items[0].title, "Flood");
  assert.equal(loadOfflineSnapshot("alerts", { storage }).savedAt, "2026-11-15T08:00:00.000Z");
  assert.equal(loadOfflineSnapshot("hazards", { storage }).items[0].dangerous_location, "Bagasbas");
  assert.equal(loadOfflineSnapshot("roads", { storage }).items[0].route_status, "Closed");
});

test("broken or blocked storage never breaks the app", () => {
  const broken = {
    getItem: () => "{not json",
    setItem: () => { throw new Error("QuotaExceededError"); },
  };
  assert.doesNotThrow(() => saveOfflineSnapshot("alerts", [{ id: 1, status: "Active" }], { storage: broken }));
  assert.equal(loadOfflineSnapshot("alerts", { storage: broken }), null);
  assert.equal(loadOfflineSnapshot("alerts", { storage: null }), null);
  assert.equal(loadOfflineSnapshot("unknown", { storage: memoryStorage() }), null);
});

test("connection errors are told apart from server errors", () => {
  assert.equal(isConnectionError(new TypeError("Failed to fetch")), true);
  assert.equal(isConnectionError({ message: "TypeError: NetworkError when attempting to fetch resource." }), true);
  assert.equal(isConnectionError({ message: "permission denied for table crisis_alerts" }), false);
});
