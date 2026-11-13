import { buildPublicNotificationContent } from "@/lib/notificationPublicDispatch";

const INCIDENT_TYPES = new Set([
  "incident_submitted",
  "incident_status",
  "incident_assigned",
]);

const ASSIGNMENT_TYPES = new Set([
  "guide_assignment_request",
  "guide_assignment_accepted",
  "guide_assignment_declined",
  "guide_assignment",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function deny(reason) {
  return { allowed: false, reason };
}

function allow() {
  return { allowed: true };
}

export function isDispatchUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}

function incidentMatches(incident, relatedId) {
  return Boolean(incident?.id) && incident.id === relatedId;
}

function assignmentMatches(assignment, relatedId) {
  return Boolean(assignment?.id) && assignment.id === relatedId;
}

function authorizeIncidentSubmitted({ caller, recipient, relatedType, relatedId, incident }) {
  if (relatedType !== "incident" || !isDispatchUuid(relatedId)) {
    return deny("Incident notifications require an incident reference");
  }
  if (!incidentMatches(incident, relatedId)) {
    return deny("Incident report not found");
  }
  if (incident.reporter_id !== caller.id) {
    return deny("Only the person who submitted the report can send this notification");
  }
  if (recipient.user_type !== "admin" || recipient.id === caller.id) {
    return deny("Incident submission notices go only to an administrator");
  }
  return allow();
}

function authorizeIncidentStatus({ caller, recipient, relatedType, relatedId, incident }) {
  if (relatedType !== "incident" || !isDispatchUuid(relatedId)) {
    return deny("Incident notifications require an incident reference");
  }
  if (!incidentMatches(incident, relatedId)) {
    return deny("Incident report not found");
  }
  if (!incident.reporter_id || recipient.id !== incident.reporter_id) {
    return deny("Status updates can only be sent to the person who submitted the report");
  }
  const callerIsAdmin = caller.user_type === "admin";
  const callerIsAssignedGuide = caller.user_type === "guide" && incident.assigned_to === caller.id;
  if (!callerIsAdmin && !callerIsAssignedGuide) {
    return deny("Only an administrator or the assigned guide can send a status update");
  }
  return allow();
}

function authorizeIncidentAssigned({ caller, recipient, relatedType, relatedId, incident }) {
  if (relatedType !== "incident" || !isDispatchUuid(relatedId)) {
    return deny("Incident notifications require an incident reference");
  }
  if (!incidentMatches(incident, relatedId)) {
    return deny("Incident report not found");
  }
  if (caller.user_type !== "admin") {
    return deny("Only an administrator can send an assignment notice");
  }
  if (!incident.assigned_to || recipient.id !== incident.assigned_to) {
    return deny("Assignment notices can only be sent to the guide assigned on the report");
  }
  return allow();
}

function authorizeAssignment({ caller, recipient, notificationType, relatedType, relatedId, assignment }) {
  if (relatedType !== "assignment" || !isDispatchUuid(relatedId)) {
    return deny("Assignment notifications require an assignment reference");
  }
  if (!assignmentMatches(assignment, relatedId)) {
    return deny("Assignment not found");
  }

  const guideId = assignment.guide_id;
  const touristId = assignment.tourist_id;

  if (notificationType === "guide_assignment_request") {
    if (caller.user_type !== "guide" || caller.id !== guideId) {
      return deny("Only the inviting guide can send an assignment request");
    }
    if (recipient.id !== touristId || recipient.user_type !== "tourist") {
      return deny("Assignment requests can only be sent to the invited tourist");
    }
    if (assignment.status !== "pending") {
      return deny("Assignment request is not pending");
    }
    return allow();
  }

  if (notificationType === "guide_assignment_accepted" || notificationType === "guide_assignment_declined") {
    if (caller.user_type !== "tourist" || caller.id !== touristId) {
      return deny("Only the invited tourist can send an assignment response");
    }
    if (recipient.id !== guideId || recipient.user_type !== "guide") {
      return deny("Assignment responses can only be sent to the requesting guide");
    }
    const expectedStatus = notificationType === "guide_assignment_accepted" ? "active" : "declined";
    if (assignment.status !== expectedStatus) {
      return deny("Assignment status does not match this notification");
    }
    return allow();
  }

  if (caller.id !== touristId) {
    return deny("Only the assigned tourist can send this assignment notice");
  }
  if (assignment.status !== "active") {
    return deny("Assignment is not active");
  }
  if (recipient.id !== guideId && recipient.id !== touristId) {
    return deny("Assignment notices can only be sent to the guide or tourist on this assignment");
  }
  return allow();
}

export function evaluateNotificationDispatch({
  caller,
  recipient,
  notificationType,
  relatedType = null,
  relatedId = null,
  incident = null,
  assignment = null,
}) {
  if (!caller?.id || !caller?.user_type) {
    return deny("Caller profile not found");
  }
  if (!recipient?.id || !recipient?.user_type || !notificationType) {
    return deny("userId and notificationType are required");
  }

  if (notificationType === "incident_submitted") {
    return authorizeIncidentSubmitted({ caller, recipient, relatedType, relatedId, incident });
  }
  if (notificationType === "incident_status") {
    return authorizeIncidentStatus({ caller, recipient, relatedType, relatedId, incident });
  }
  if (notificationType === "incident_assigned") {
    return authorizeIncidentAssigned({ caller, recipient, relatedType, relatedId, incident });
  }
  if (ASSIGNMENT_TYPES.has(notificationType)) {
    return authorizeAssignment({
      caller,
      recipient,
      notificationType,
      relatedType,
      relatedId,
      assignment,
    });
  }

  return deny("Not authorized to notify this user");
}

export async function assertDispatchAuthorized(admin, caller, payload) {
  const { userId, notificationType, relatedType = null, relatedId = null } = payload || {};
  if (!userId || !notificationType) {
    return deny("userId and notificationType are required");
  }
  if (!caller?.id) {
    return deny("Caller profile not found");
  }

  const { data: callerProfile, error: callerError } = await admin
    .from("profiles")
    .select("id, user_type")
    .eq("id", caller.id)
    .single();

  if (callerError || !callerProfile || callerProfile.id !== caller.id) {
    return deny("Caller profile not found");
  }

  const { data: recipient, error: recipientError } = await admin
    .from("profiles")
    .select("id, user_type")
    .eq("id", userId)
    .single();

  if (recipientError || !recipient) {
    return deny("Recipient not found");
  }

  let incident = null;
  if (INCIDENT_TYPES.has(notificationType)) {
    if (!isDispatchUuid(relatedId)) {
      return deny("Incident notifications require an incident reference");
    }
    const { data, error } = await admin
      .from("incident_reports")
      .select("id, reporter_id, assigned_to, reference_number, category, location, severity, status")
      .eq("id", relatedId)
      .maybeSingle();
    if (error) return deny("Could not verify the incident report");
    incident = data;
  }

  let assignment = null;
  if (ASSIGNMENT_TYPES.has(notificationType)) {
    if (!isDispatchUuid(relatedId)) {
      return deny("Assignment notifications require an assignment reference");
    }
    const { data, error } = await admin
      .from("guide_assignments")
      .select("id, guide_id, tourist_id, status, tour_group_id")
      .eq("id", relatedId)
      .maybeSingle();
    if (error) return deny("Could not verify the assignment");
    assignment = data;
  }

  const decision = evaluateNotificationDispatch({
    caller: callerProfile,
    recipient,
    notificationType,
    relatedType,
    relatedId,
    incident,
    assignment,
  });

  return { ...decision, incident, assignment, recipient, caller: callerProfile };
}

async function loadAssignmentContext(admin, assignment) {
  const { data: people, error: peopleError } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", [assignment.guide_id, assignment.tourist_id]);

  if (peopleError) return { error: "Could not verify the assignment" };

  let tourGroup = null;
  if (assignment.tour_group_id) {
    const { data, error } = await admin
      .from("tour_groups")
      .select("id, name, starting_location, destination")
      .eq("id", assignment.tour_group_id)
      .maybeSingle();
    if (error) return { error: "Could not verify the assignment" };
    tourGroup = data;
  }

  return { people: people || [], tourGroup };
}

export async function resolvePublicDispatch(admin, caller, payload) {
  const authz = await assertDispatchAuthorized(admin, caller, payload);
  if (!authz.allowed) return authz;

  let people = [];
  let tourGroup = null;
  if (authz.assignment) {
    const context = await loadAssignmentContext(admin, authz.assignment);
    if (context.error) return deny(context.error);
    people = context.people;
    tourGroup = context.tourGroup;
  }

  const dispatch = buildPublicNotificationContent({
    notificationType: payload.notificationType,
    incident: authz.incident,
    assignment: authz.assignment,
    recipient: authz.recipient,
    people,
    tourGroup,
  });

  if (!dispatch) return deny("Unsupported or incomplete notification event");
  return { allowed: true, dispatch };
}
