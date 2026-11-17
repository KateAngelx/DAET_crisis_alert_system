import test from "node:test";
import assert from "node:assert/strict";
import { INCIDENT_STATUSES } from "@/lib/constants";
import { validateIncidentStatusTransition } from "@/lib/incidentAdminStatus";
import { getIncidentQuickActionsForReport, isIncidentClosed } from "@/lib/incidentAdminActions";
import { incidentReportEligibleForGuideAssignment } from "@/lib/incidentGuideEligibility";
import {
  incidentMatchesStatusFilter,
  incidentStatusesEquivalent,
  isArchiveIncidentStatus,
  normalizeIncidentStatusLabel,
} from "@/lib/incidentStatusUtils";

const GUIDE_ID = "44444444-4444-4444-8444-444444444444";

test("a normal report follows Submitted → Approved → Under Review → Responding → Resolved → Closed", () => {
  const path = ["Submitted", "Approved", "Under Review", "Responding", "Resolved", "Closed"];
  for (let i = 1; i < path.length; i += 1) {
    const result = validateIncidentStatusTransition(path[i - 1], path[i], "Accident", null);
    assert.equal(result.ok, true, `${path[i - 1]} → ${path[i]}: ${result.reason}`);
  }
});

test("steps cannot be skipped and final statuses cannot change", () => {
  assert.equal(validateIncidentStatusTransition("Submitted", "Resolved", "Accident").ok, false);
  assert.equal(validateIncidentStatusTransition("Submitted", "Closed", "Accident").ok, false);
  assert.equal(validateIncidentStatusTransition("Closed", "Responding", "Accident").ok, false);
  assert.equal(validateIncidentStatusTransition("Rejected", "Approved", "Accident").ok, false);
  assert.equal(validateIncidentStatusTransition("Approved", "Made Up", "Accident").ok, false);
});

test("only Tourist Assistance reports can be Assigned, and only with a guide", () => {
  assert.equal(validateIncidentStatusTransition("Approved", "Assigned", "Accident", GUIDE_ID).ok, false);
  assert.equal(validateIncidentStatusTransition("Approved", "Assigned", "Tourist Assistance", null).ok, false);
  assert.equal(validateIncidentStatusTransition("Approved", "Assigned", "Tourist Assistance", GUIDE_ID).ok, true);
  assert.equal(incidentReportEligibleForGuideAssignment({ category: "  tourist   ASSISTANCE " }), true);
  assert.equal(incidentReportEligibleForGuideAssignment("Fire"), false);
  assert.equal(incidentReportEligibleForGuideAssignment(null), false);
});

test("the old 'Received' status is treated as Approved", () => {
  assert.equal(validateIncidentStatusTransition("Received", "Under Review", "Accident").ok, true);
  assert.equal(normalizeIncidentStatusLabel("Received"), "Approved");
  assert.equal(incidentStatusesEquivalent("Received", "Approved"), true);
  assert.equal(incidentMatchesStatusFilter("Approved", "Received"), true);
});

test("every quick-action button is an allowed next step", () => {
  for (const category of ["Accident", "Tourist Assistance"]) {
    for (const status of [...INCIDENT_STATUSES, "Received"]) {
      for (const action of getIncidentQuickActionsForReport({ status, category })) {
        const assignedTo = action.nextStatus === "Assigned" ? GUIDE_ID : null;
        const result = validateIncidentStatusTransition(status, action.nextStatus, category, assignedTo);
        assert.equal(result.ok, true, `${category}: "${action.label}" from ${status} → ${action.nextStatus}: ${result.reason}`);
      }
    }
  }
});

test("non-guide reports never offer 'Assign guide'", () => {
  for (const status of INCIDENT_STATUSES) {
    const actions = getIncidentQuickActionsForReport({ status, category: "Fire" });
    assert.ok(!actions.some((a) => a.nextStatus === "Assigned"), status);
  }
});

test("finished reports move to the archive", () => {
  for (const status of ["Resolved", "Closed", "Rejected"]) {
    assert.equal(isArchiveIncidentStatus(status), true);
    assert.equal(isIncidentClosed(status), true);
  }
  assert.equal(isArchiveIncidentStatus("Responding"), false);
});
