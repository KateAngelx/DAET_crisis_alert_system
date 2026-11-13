import test from "node:test";
import assert from "node:assert/strict";
import {
  assertDispatchAuthorized,
  evaluateNotificationDispatch,
} from "../src/lib/notificationDispatchAuth.server.js";
import { verifiedDeliveryContacts } from "../src/lib/verifiedDeliveryContacts.js";

const INCIDENT_ID = "11111111-1111-4111-8111-111111111111";
const ASSIGNMENT_ID = "22222222-2222-4222-8222-222222222222";
const TOURIST_ID = "33333333-3333-4333-8333-333333333333";
const GUIDE_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const OTHER_ID = "66666666-6666-4666-8666-666666666666";

const tourist = { id: TOURIST_ID, user_type: "tourist" };
const guide = { id: GUIDE_ID, user_type: "guide" };
const admin = { id: ADMIN_ID, user_type: "admin" };
const otherTourist = { id: OTHER_ID, user_type: "tourist" };

const incident = {
  id: INCIDENT_ID,
  reporter_id: TOURIST_ID,
  assigned_to: GUIDE_ID,
};

const pendingAssignment = {
  id: ASSIGNMENT_ID,
  guide_id: GUIDE_ID,
  tourist_id: TOURIST_ID,
  status: "pending",
};

function evaluate(overrides) {
  return evaluateNotificationDispatch({
    caller: tourist,
    recipient: admin,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
    incident,
    assignment: null,
    ...overrides,
  });
}

test("email and SMS use a confirmed Auth contact and ignore profile addresses", () => {
  assert.equal(verifiedDeliveryContacts.length, 1);
  assert.deepEqual(
    verifiedDeliveryContacts({
      email: "verified@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      phone: "+639171234567",
      phone_confirmed_at: "2026-01-01T00:00:00Z",
    }),
    { email: "verified@example.com", phone: "+639171234567" }
  );
  assert.deepEqual(
    verifiedDeliveryContacts({
      email: "pending@example.com",
      email_confirmed_at: null,
      phone: "+639171234567",
      phone_confirmed_at: null,
    }),
    { email: null, phone: null }
  );
  assert.deepEqual(verifiedDeliveryContacts(null), { email: null, phone: null });
});

test("a tourist can notify an administrator about their own incident", () => {
  assert.deepEqual(evaluate().allowed, true);
});

test("a tourist cannot notify an administrator about someone else's incident", () => {
  const result = evaluate({
    incident: { ...incident, reporter_id: OTHER_ID },
  });
  assert.equal(result.allowed, false);
});

test("a missing or mismatched incident reference is rejected", () => {
  assert.equal(evaluate({ incident: null }).allowed, false);
  assert.equal(evaluate({ relatedId: OTHER_ID }).allowed, false);
  assert.equal(evaluate({ relatedId: "not-an-incident" }).allowed, false);
  assert.equal(evaluate({ relatedType: "assignment" }).allowed, false);
});

test("incident submission cannot be redirected to another tourist", () => {
  const result = evaluate({ recipient: otherTourist });
  assert.equal(result.allowed, false);
});

test("self-notification with an arbitrary type is rejected", () => {
  const result = evaluate({
    recipient: tourist,
    notificationType: "general",
    relatedType: null,
    relatedId: null,
    incident: null,
  });
  assert.equal(result.allowed, false);
});

test("an administrator can send a status update only to the reporter", () => {
  assert.equal(
    evaluate({
      caller: admin,
      recipient: tourist,
      notificationType: "incident_status",
    }).allowed,
    true
  );
  assert.equal(
    evaluate({
      caller: admin,
      recipient: otherTourist,
      notificationType: "incident_status",
    }).allowed,
    false
  );
  assert.equal(
    evaluate({
      caller: tourist,
      recipient: tourist,
      notificationType: "incident_status",
    }).allowed,
    false
  );
});

test("the assigned guide can notify the reporter, and no one else", () => {
  assert.equal(
    evaluate({
      caller: guide,
      recipient: tourist,
      notificationType: "incident_status",
    }).allowed,
    true
  );
  assert.equal(
    evaluate({
      caller: { ...guide, id: OTHER_ID },
      recipient: tourist,
      notificationType: "incident_status",
    }).allowed,
    false
  );
});

test("an assignment notice goes only to the guide stored on the incident", () => {
  assert.equal(
    evaluate({
      caller: admin,
      recipient: guide,
      notificationType: "incident_assigned",
    }).allowed,
    true
  );
  assert.equal(
    evaluate({
      caller: admin,
      recipient: otherTourist,
      notificationType: "incident_assigned",
    }).allowed,
    false
  );
  assert.equal(
    evaluate({
      caller: guide,
      recipient: guide,
      notificationType: "incident_assigned",
    }).allowed,
    false
  );
});

test("a guide can request only the tourist on a pending assignment", () => {
  const request = {
    caller: guide,
    recipient: tourist,
    notificationType: "guide_assignment_request",
    relatedType: "assignment",
    relatedId: ASSIGNMENT_ID,
    incident: null,
    assignment: pendingAssignment,
  };
  assert.equal(evaluate(request).allowed, true);
  assert.equal(evaluate({ ...request, recipient: otherTourist }).allowed, false);
  assert.equal(evaluate({ ...request, assignment: null }).allowed, false);
  assert.equal(
    evaluate({
      ...request,
      assignment: { ...pendingAssignment, status: "active" },
    }).allowed,
    false
  );
});

test("assignment responses follow the stored assignment and its status", () => {
  const accepted = {
    caller: tourist,
    recipient: guide,
    notificationType: "guide_assignment_accepted",
    relatedType: "assignment",
    relatedId: ASSIGNMENT_ID,
    incident: null,
    assignment: { ...pendingAssignment, status: "active" },
  };
  assert.equal(evaluate(accepted).allowed, true);
  assert.equal(evaluate({ ...accepted, recipient: otherTourist }).allowed, false);
  assert.equal(
    evaluate({
      ...accepted,
      notificationType: "guide_assignment_declined",
    }).allowed,
    false
  );
  assert.equal(
    evaluate({
      ...accepted,
      notificationType: "guide_assignment_declined",
      assignment: { ...pendingAssignment, status: "declined" },
    }).allowed,
    true
  );
});

test("active assignment notices stay inside the assignment", () => {
  const notice = {
    caller: tourist,
    notificationType: "guide_assignment",
    relatedType: "assignment",
    relatedId: ASSIGNMENT_ID,
    incident: null,
    assignment: { ...pendingAssignment, status: "active" },
  };
  assert.equal(evaluate({ ...notice, recipient: guide }).allowed, true);
  assert.equal(evaluate({ ...notice, recipient: tourist }).allowed, true);
  assert.equal(evaluate({ ...notice, recipient: otherTourist }).allowed, false);
  assert.equal(evaluate({ ...notice, caller: guide, recipient: tourist }).allowed, false);
});

function createAdmin(tables) {
  return {
    from(table) {
      const filters = [];
      const api = {
        select() {
          return api;
        },
        eq(column, value) {
          filters.push([column, value]);
          return api;
        },
        async maybeSingle() {
          return find(false);
        },
        async single() {
          return find(true);
        },
      };

      function find(requireOne) {
        const rows = (tables[table] || []).filter((row) =>
          filters.every(([column, value]) => row[column] === value)
        );
        if (requireOne && rows.length !== 1) {
          return { data: null, error: { message: "not found" } };
        }
        return { data: rows[0] || null, error: null };
      }

      return api;
    },
  };
}

test("dispatch authorization loads the event and ignores client contact fields", async () => {
  const database = createAdmin({
    profiles: [tourist, guide, admin],
    incident_reports: [incident],
    guide_assignments: [],
  });

  const allowed = await assertDispatchAuthorized(database, { id: TOURIST_ID }, {
    userId: ADMIN_ID,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
    recipientEmail: "attacker@example.com",
    recipientPhone: "09999999999",
  });
  assert.equal(allowed.allowed, true);

  const missingIncident = await assertDispatchAuthorized(database, { id: TOURIST_ID }, {
    userId: ADMIN_ID,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: OTHER_ID,
    recipientEmail: "attacker@example.com",
  });
  assert.equal(missingIncident.allowed, false);

  const missingAssignment = await assertDispatchAuthorized(database, { id: GUIDE_ID }, {
    userId: TOURIST_ID,
    notificationType: "guide_assignment_request",
    relatedType: "assignment",
    relatedId: ASSIGNMENT_ID,
    recipientPhone: "09170000000",
  });
  assert.equal(missingAssignment.allowed, false);
  assert.match(missingAssignment.reason, /Assignment not found/);
});
