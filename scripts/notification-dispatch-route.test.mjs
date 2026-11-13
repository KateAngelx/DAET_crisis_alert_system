import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/notifications/dispatch/route.js";
import { dispatchNotificationServer } from "../src/lib/notificationDispatch.server.js";
import { publicNotificationChannels } from "../src/lib/notificationPublicDispatch.js";

const INCIDENT_ID = "11111111-1111-4111-8111-111111111111";
const ASSIGNMENT_ID = "22222222-2222-4222-8222-222222222222";
const TOURIST_ID = "33333333-3333-4333-8333-333333333333";
const GUIDE_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const OTHER_ID = "66666666-6666-4666-8666-666666666666";
const GROUP_ID = "77777777-7777-4777-8777-777777777777";

const SERVER_ONLY_TYPES = [
  "points_awarded",
  "tour_group_end_reminder",
  "crisis_feedback_moderation",
  "tourist_guide_assistance_assigned",
  "tourist_guide_assistance_accepted",
  "tourist_guide_assistance_declined",
  "tourist_guide_assistance_completed",
  "tourist_guide_assistance_cancelled",
  "guide_emergency_reported",
  "guide_emergency_confirmation",
  "guide_emergency_status",
  "crisis_alert",
  "general",
];

const tourist = { id: TOURIST_ID, user_type: "tourist", full_name: "Ana Cruz", email: "profile-ana@example.com", phone: "09170000000", notification_channels: { email: true, sms: true, app: true, push: false } };
const guide = { id: GUIDE_ID, user_type: "guide", full_name: "Jose Reyes", email: "profile-jose@example.com", phone: "09171111111", notification_channels: { email: true, sms: true, app: true, push: false } };
const admin = { id: ADMIN_ID, user_type: "admin", full_name: "Tourism Office", email: "profile-admin@example.com", phone: "09172222222", notification_channels: { email: true, sms: true, app: false, push: false } };
const otherTourist = { id: OTHER_ID, user_type: "tourist", full_name: "Other Tourist" };

const incident = {
  id: INCIDENT_ID,
  reporter_id: TOURIST_ID,
  assigned_to: GUIDE_ID,
  reference_number: "INC-100",
  category: "Medical Emergency",
  location: "Daet",
  severity: "Medium",
  status: "Under Review",
};

const pendingAssignment = {
  id: ASSIGNMENT_ID,
  guide_id: GUIDE_ID,
  tourist_id: TOURIST_ID,
  status: "pending",
  tour_group_id: GROUP_ID,
};

const tourGroup = {
  id: GROUP_ID,
  name: "Bagasbas Day Tour",
  starting_location: "Daet Plaza",
  destination: "Bagasbas Beach",
};

function createAdmin(seed = {}, options = {}) {
  const tables = {
    profiles: seed.profiles || [tourist, guide, admin],
    incident_reports: seed.incident_reports || [incident],
    guide_assignments: seed.guide_assignments || [pendingAssignment],
    tour_groups: seed.tour_groups || [tourGroup],
    notifications: [],
    notification_deliveries: [],
  };

  function matching(table, filters) {
    return tables[table].filter((row) => filters.every(([column, value]) => row[column] === value));
  }

  function insertRows(table, records) {
    if (table === "notifications") {
      const row = { id: `notice-${tables.notifications.length + 1}`, ...records[0] };
      const duplicate = row.event_key && tables.notifications.some((item) => item.user_id === row.user_id && item.event_key === row.event_key);
      if (duplicate) return { data: null, error: { code: "23505", message: "duplicate notification" } };
      tables.notifications.push(row);
      return { data: row, error: null };
    }
    if (table === "notification_deliveries") {
      const duplicate = records.some((row) => tables.notification_deliveries.some((item) => item.idempotency_key === row.idempotency_key));
      if (duplicate) return { data: null, error: { code: "23505", message: "duplicate delivery" } };
      const stored = records.map((row, index) => ({
        id: `delivery-${tables.notification_deliveries.length + index + 1}`,
        ...row,
      }));
      tables.notification_deliveries.push(...stored);
      return { data: stored, error: null };
    }
    return { data: null, error: { message: `unsupported insert into ${table}` } };
  }

  return {
    tables,
    auth: {
      admin: {
        async getUserById(id) {
          return { data: { user: (seed.authUsers || {})[id] || null }, error: null };
        },
      },
    },
    from(table) {
      const filters = [];
      const api = {
        select() { return api; },
        eq(column, value) {
          filters.push([column, value]);
          return api;
        },
        in(column, values) {
          if (options.queryError) return Promise.resolve({ data: null, error: { message: "lookup failed" } });
          const data = tables[table].filter((row) => values.includes(row[column]));
          return Promise.resolve({ data, error: null });
        },
        async maybeSingle() {
          if (options.lookupError === table) return { data: null, error: { message: "lookup failed" } };
          return { data: matching(table, filters)[0] || null, error: null };
        },
        async single() {
          const found = matching(table, filters);
          if (found.length !== 1) return { data: null, error: { message: "not found" } };
          return { data: found[0], error: null };
        },
        insert(payload) {
          const records = Array.isArray(payload) ? payload : [payload];
          const query = {
            select() { return query; },
            single: async () => insertRows(table, records),
            then(resolve, reject) {
              return Promise.resolve(insertRows(table, records)).then(resolve, reject);
            },
          };
          return query;
        },
      };
      return api;
    },
  };
}

function requestFor(callerId, body) {
  return new Request("http://localhost/api/notifications/dispatch", {
    method: "POST",
    headers: {
      authorization: `Bearer test-${callerId}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title: "HACKED TITLE",
      message: "Send this to someone else",
      priority: "CRITICAL",
      channels: ["web", "email", "sms"],
      recipientEmail: "attacker@example.com",
      recipientPhone: "09999999999",
      ...body,
    }),
  });
}

function post(callerId, body, admin, sender) {
  return POST(requestFor(callerId, body), {
    getUser: async () => ({ user: { id: callerId } }),
    getSupabaseAdmin: () => admin,
    dispatchNotificationServer: sender,
    enforceLimit: () => null,
  });
}

test("public event channels stay fixed for each of the seven types", () => {
  assert.deepEqual(publicNotificationChannels("incident_submitted", { severity: "Medium" }), ["web", "email"]);
  assert.deepEqual(publicNotificationChannels("incident_submitted", { severity: "Critical" }), ["web", "email", "sms"]);
  assert.deepEqual(publicNotificationChannels("incident_status", incident), ["web", "email"]);
  assert.deepEqual(publicNotificationChannels("incident_assigned", incident), ["web", "email", "sms"]);
  assert.deepEqual(publicNotificationChannels("guide_assignment_request"), ["web", "email"]);
  assert.deepEqual(publicNotificationChannels("guide_assignment_accepted"), ["web", "email"]);
  assert.deepEqual(publicNotificationChannels("guide_assignment_declined"), ["web"]);
  assert.deepEqual(publicNotificationChannels("guide_assignment"), ["web", "email"]);
  assert.equal(publicNotificationChannels("points_awarded"), null);
});

test("an unauthorized incident notification returns 403 and does not send", async () => {
  const sent = [];
  const response = await post(TOURIST_ID, {
    userId: OTHER_ID,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
  }, createAdmin(), async (payload) => {
    sent.push(payload);
    return { errors: [], web: { id: "should-not-send" } };
  });
  assert.equal(response.status, 403);
  assert.equal(sent.length, 0);
});

test("a missing incident or assignment is rejected before sending", async () => {
  const sent = [];
  const sender = async (payload) => {
    sent.push(payload);
    return { errors: [], web: { id: "nope" } };
  };
  const missingIncident = await post(TOURIST_ID, {
    userId: ADMIN_ID,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: OTHER_ID,
  }, createAdmin({ incident_reports: [] }), sender);
  const missingAssignment = await post(GUIDE_ID, {
    userId: TOURIST_ID,
    notificationType: "guide_assignment_request",
    relatedType: "assignment",
    relatedId: OTHER_ID,
  }, createAdmin({ guide_assignments: [] }), sender);
  assert.equal(missingIncident.status, 403);
  assert.equal(missingAssignment.status, 403);
  assert.equal(sent.length, 0);
});

test("a valid event uses the server title, message, priority, and channels", async () => {
  const sent = [];
  const response = await post(TOURIST_ID, {
    userId: ADMIN_ID,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
  }, createAdmin(), async (payload) => {
    sent.push(payload);
    return { errors: [], web: { id: "notice-1" } };
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].title, "Medium Incident Report: INC-100");
  assert.match(sent[0].message, /Medical Emergency/);
  assert.equal(sent[0].message.includes("Send this to someone else"), false);
  assert.equal(sent[0].priority, "NORMAL");
  assert.deepEqual(sent[0].channels, ["web", "email"]);
  assert.equal(sent[0].eventKey, `incident-submitted:${INCIDENT_ID}:admin:${ADMIN_ID}`);
  assert.equal(sent[0].recipientEmail, undefined);
  assert.equal(sent[0].recipientPhone, undefined);
});

test("all seven public events authorize the correct party and channels", async () => {
  const activeAssignment = { ...pendingAssignment, status: "active" };
  const declinedAssignment = { ...pendingAssignment, status: "declined" };
  const cases = [
    {
      callerId: TOURIST_ID,
      userId: ADMIN_ID,
      notificationType: "incident_submitted",
      relatedType: "incident",
      relatedId: INCIDENT_ID,
      title: "Medium Incident Report: INC-100",
      channels: ["web", "email"],
    },
    {
      callerId: ADMIN_ID,
      userId: TOURIST_ID,
      notificationType: "incident_status",
      relatedType: "incident",
      relatedId: INCIDENT_ID,
      title: "Report INC-100 Updated",
      channels: ["web", "email"],
    },
    {
      callerId: ADMIN_ID,
      userId: GUIDE_ID,
      notificationType: "incident_assigned",
      relatedType: "incident",
      relatedId: INCIDENT_ID,
      title: "Incident Assigned: INC-100",
      channels: ["web", "email", "sms"],
    },
    {
      callerId: GUIDE_ID,
      userId: TOURIST_ID,
      notificationType: "guide_assignment_request",
      relatedType: "assignment",
      relatedId: ASSIGNMENT_ID,
      title: "Guide Assignment Request",
      channels: ["web", "email"],
      admin: createAdmin(),
    },
    {
      callerId: TOURIST_ID,
      userId: GUIDE_ID,
      notificationType: "guide_assignment_accepted",
      relatedType: "assignment",
      relatedId: ASSIGNMENT_ID,
      title: "Tourist Accepted Assignment",
      channels: ["web", "email"],
      admin: createAdmin({ guide_assignments: [activeAssignment] }),
    },
    {
      callerId: TOURIST_ID,
      userId: GUIDE_ID,
      notificationType: "guide_assignment_declined",
      relatedType: "assignment",
      relatedId: ASSIGNMENT_ID,
      title: "Assignment Request Declined",
      channels: ["web"],
      admin: createAdmin({ guide_assignments: [declinedAssignment] }),
    },
    {
      callerId: TOURIST_ID,
      userId: GUIDE_ID,
      notificationType: "guide_assignment",
      relatedType: "assignment",
      relatedId: ASSIGNMENT_ID,
      title: "New Tourist Assignment",
      channels: ["web", "email"],
      admin: createAdmin({ guide_assignments: [activeAssignment] }),
    },
    {
      callerId: TOURIST_ID,
      userId: TOURIST_ID,
      notificationType: "guide_assignment",
      relatedType: "assignment",
      relatedId: ASSIGNMENT_ID,
      title: "Tourism Guide Assigned",
      channels: ["web", "email"],
      admin: createAdmin({ guide_assignments: [activeAssignment] }),
    },
  ];

  for (const item of cases) {
    const sent = [];
    const response = await post(item.callerId, item, item.admin || createAdmin(), async (payload) => {
      sent.push(payload);
      return { errors: [], web: { id: item.notificationType } };
    });
    assert.equal(response.status, 200, item.notificationType);
    assert.equal(sent.length, 1, item.notificationType);
    assert.equal(sent[0].title, item.title, item.notificationType);
    assert.deepEqual(sent[0].channels, item.channels, item.notificationType);
    assert.equal(sent[0].channels.includes("sms") && item.notificationType === "guide_assignment", false);
  }
});

test("server-only notification types are rejected by the public route", async () => {
  const sent = [];
  const sender = async (payload) => {
    sent.push(payload);
    return { errors: [], web: { id: "nope" } };
  };
  for (const notificationType of SERVER_ONLY_TYPES) {
    const response = await post(ADMIN_ID, {
      userId: TOURIST_ID,
      notificationType,
      relatedType: "incident",
      relatedId: INCIDENT_ID,
    }, createAdmin(), sender);
    assert.equal(response.status, 403, notificationType);
  }
  assert.equal(sent.length, 0);
});

test("a database lookup error and a missing caller profile do not send", async () => {
  const sent = [];
  const sender = async (payload) => {
    sent.push(payload);
    return { errors: [], web: { id: "nope" } };
  };
  const lookup = await post(TOURIST_ID, {
    userId: ADMIN_ID,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
  }, createAdmin({}, { lookupError: "incident_reports" }), sender);
  const missingCaller = await post(OTHER_ID, {
    userId: ADMIN_ID,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
  }, createAdmin({ profiles: [admin] }), sender);
  const incomplete = await post(TOURIST_ID, {
    userId: ADMIN_ID,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
  }, createAdmin({
    incident_reports: [{ ...incident, reference_number: "" }],
  }), sender);
  assert.equal(lookup.status, 403);
  assert.equal(missingCaller.status, 403);
  assert.equal(incomplete.status, 403);
  assert.equal(sent.length, 0);
});

test("repeated and simultaneous requests queue one email and one SMS", async () => {
  const processed = [];
  const authUsers = {
    [ADMIN_ID]: {
      id: ADMIN_ID,
      email: "verified-admin@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      phone: "+639172222222",
      phone_confirmed_at: "2026-01-01T00:00:00Z",
    },
  };
  const database = createAdmin({
    authUsers,
    incident_reports: [{ ...incident, severity: "Critical", status: "Submitted" }],
  });
  const send = (callerId, body) => POST(requestFor(callerId, body), {
    getUser: async () => ({ user: { id: callerId } }),
    getSupabaseAdmin: () => database,
    enforceLimit: () => null,
    processDeliveries: async (batch) => {
      processed.push(batch);
      return { processed: batch.deliveryIds.length, results: [] };
    },
  });
  const body = {
    userId: ADMIN_ID,
    notificationType: "incident_submitted",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
  };
  const [first, second] = await Promise.all([
    send(TOURIST_ID, body),
    send(TOURIST_ID, body),
  ]);
  const third = await send(TOURIST_ID, body);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 200);
  const email = database.tables.notification_deliveries.filter((row) => row.channel === "email");
  const sms = database.tables.notification_deliveries.filter((row) => row.channel === "sms");
  assert.equal(email.length, 1);
  assert.equal(sms.length, 1);
  assert.equal(email[0].recipient, "verified-admin@example.com");
  assert.equal(email[0].recipient.includes("profile-admin"), false);
  assert.equal(email[0].recipient.includes("attacker"), false);
  assert.equal(sms[0].recipient, "+639172222222");
  assert.equal(email[0].subject, "Critical Incident Report: INC-100");
  assert.equal(processed.length, 1);
});

test("an unconfirmed Auth contact is not replaced with the profile address", async () => {
  const database = createAdmin({
    authUsers: {
      [GUIDE_ID]: {
        id: GUIDE_ID,
        email: "pending-guide@example.com",
        email_confirmed_at: null,
        phone: "+639171111111",
        phone_confirmed_at: null,
      },
    },
  });
  const response = await POST(requestFor(ADMIN_ID, {
    userId: GUIDE_ID,
    notificationType: "incident_assigned",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
  }), {
    getUser: async () => ({ user: { id: ADMIN_ID } }),
    getSupabaseAdmin: () => database,
    enforceLimit: () => null,
    processDeliveries: async () => ({ processed: 0, results: [] }),
  });
  assert.equal(response.status, 200);
  assert.equal(database.tables.notification_deliveries.length, 0);
  assert.equal(database.tables.notifications.length, 1);
  assert.match(database.tables.notifications[0].message, /assigned to respond/);
});

test("the sender itself blocks a second delivery when the in-app preference is off", async () => {
  const quietAdmin = {
    ...admin,
    notification_channels: { email: true, sms: true, app: false, push: false },
  };
  const database = createAdmin({
    profiles: [tourist, guide, quietAdmin],
    authUsers: {
      [ADMIN_ID]: {
        id: ADMIN_ID,
        email: "verified-admin@example.com",
        email_confirmed_at: "2026-01-01T00:00:00Z",
        phone: null,
        phone_confirmed_at: null,
      },
    },
    incident_reports: [{ ...incident, severity: "High", status: "Submitted" }],
  });
  const payload = {
    userId: ADMIN_ID,
    title: "High Incident Report: INC-100",
    message: "New Medical Emergency report at Daet. Status: Submitted. Immediate review required for High severity reports.",
    notificationType: "incident_submitted",
    priority: "HIGH",
    relatedType: "incident",
    relatedId: INCIDENT_ID,
    eventKey: `incident-submitted:${INCIDENT_ID}:admin:${ADMIN_ID}`,
    channels: ["web", "email", "sms"],
    adminClient: database,
    processDeliveries: async () => ({ processed: 0, results: [] }),
  };
  const [first, second] = await Promise.all([
    dispatchNotificationServer(payload),
    dispatchNotificationServer(payload),
  ]);
  assert.equal(first.errors.length + second.errors.length, 0);
  assert.equal(database.tables.notification_deliveries.filter((row) => row.channel === "email").length, 1);
  assert.equal(database.tables.notification_deliveries.filter((row) => row.channel === "sms").length, 0);
});
