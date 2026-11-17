import test from "node:test";
import assert from "node:assert/strict";
import { todayInPhilippines, tourScheduleError, touristTourReminderText } from "@/lib/tourGroupRoute";

// 2026-11-15 10:00 in the Philippines.
const NOW = Date.parse("2026-11-15T10:00:00+08:00");

test("today is worked out in Philippine time", () => {
  assert.equal(todayInPhilippines(NOW), "2026-11-15");
  assert.equal(todayInPhilippines(Date.parse("2026-11-15T17:00:00Z")), "2026-11-16"); // 01:00 PHT next day
});

test("a new tour cannot start in the past", () => {
  assert.match(tourScheduleError({ start_date: "2026-11-14" }, { nowMs: NOW }), /can't be in the past/);
  assert.equal(tourScheduleError({ start_date: "2026-11-15" }, { nowMs: NOW }), null);
  assert.equal(tourScheduleError({ start_date: "2026-11-20", end_date: "2026-11-21" }, { nowMs: NOW }), null);
  assert.equal(tourScheduleError({}, { nowMs: NOW }), null); // dates are optional
});

test("a tour that already started can keep its start date, but not move to another past day", () => {
  const original = { originalStartDate: "2026-11-10", nowMs: NOW };
  assert.equal(tourScheduleError({ start_date: "2026-11-10", end_date: "2026-11-16" }, original), null);
  assert.match(tourScheduleError({ start_date: "2026-11-09" }, original), /can't be in the past/);
});

test("a new tour's end must still be ahead, and after its start", () => {
  assert.match(
    tourScheduleError({ start_date: "2026-11-15", end_date: "2026-11-15", end_time: "09:00" }, { nowMs: NOW }),
    /already passed/
  );
  assert.equal(
    tourScheduleError({ start_date: "2026-11-15", end_date: "2026-11-15", end_time: "18:00" }, { nowMs: NOW }),
    null
  );
  assert.match(tourScheduleError({ start_date: "2026-11-20", end_date: "2026-11-18" }, { nowMs: NOW }), /on or after/);
  assert.match(tourScheduleError({ end_time: "18:00" }, { nowMs: NOW }), /end date before/);
});

test("tourists get a one-hour and an ended reminder", () => {
  const tour = { name: "Bagasbas Surf Day", end_date: "2026-11-15", end_time: "17:00:00" };
  assert.match(touristTourReminderText(tour, "one-hour").title, /ends in about one hour/);
  assert.match(touristTourReminderText(tour, "due").title, /has ended/);
  assert.match(touristTourReminderText(tour, "due").message, /911/);
});
