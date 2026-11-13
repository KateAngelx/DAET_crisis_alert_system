import { severityToPriority } from "@/lib/constants";

const ASSIGNMENT_CHANNELS = ["web", "email"];
const IN_APP_ONLY = ["web"];

function text(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function incidentReady(incident) {
  return Boolean(
    incident?.id
    && text(incident.reference_number)
    && text(incident.category)
    && text(incident.location)
    && text(incident.severity)
    && text(incident.status)
  );
}

function assignmentReady(assignment) {
  return Boolean(assignment?.id && assignment.guide_id && assignment.tourist_id && text(assignment.status));
}

function personName(people, id, fallback) {
  const match = (people || []).find((person) => person.id === id);
  return text(match?.full_name) || fallback;
}

export function publicNotificationChannels(notificationType, incident) {
  if (notificationType === "incident_submitted" || notificationType === "incident_assigned") {
    const priority = severityToPriority(incident?.severity);
    if (notificationType === "incident_submitted" && priority !== "HIGH" && priority !== "CRITICAL") {
      return ["web", "email"];
    }
    return ["web", "email", "sms"];
  }
  if (notificationType === "incident_status") return ["web", "email"];
  if (notificationType === "guide_assignment_declined") return IN_APP_ONLY;
  if (
    notificationType === "guide_assignment_request"
    || notificationType === "guide_assignment_accepted"
    || notificationType === "guide_assignment"
  ) {
    return ASSIGNMENT_CHANNELS;
  }
  return null;
}

export function publicNotificationEventKey(notificationType, { incident, assignment, recipientId }) {
  switch (notificationType) {
    case "incident_submitted":
      return `incident-submitted:${incident.id}:admin:${recipientId}`;
    case "incident_status":
      return `incident-status:${incident.id}:${incident.status}`;
    case "incident_assigned":
      return `incident-assigned:${incident.id}:${incident.assigned_to}`;
    case "guide_assignment_request":
      return `guide-assignment-request:${assignment.id}`;
    case "guide_assignment_accepted":
      return `guide-assignment-accepted:${assignment.id}`;
    case "guide_assignment_declined":
      return `guide-assignment-declined:${assignment.id}`;
    case "guide_assignment":
      return recipientId === assignment.tourist_id
        ? `guide-assignment:${assignment.id}:tourist`
        : `guide-assignment:${assignment.id}:guide`;
    default:
      return null;
  }
}

export function buildPublicNotificationContent({
  notificationType,
  incident = null,
  assignment = null,
  recipient,
  people = [],
  tourGroup = null,
}) {
  const channels = publicNotificationChannels(notificationType, incident);
  if (!channels || !recipient?.id) return null;

  if (notificationType === "incident_submitted" || notificationType === "incident_status" || notificationType === "incident_assigned") {
    if (!incidentReady(incident)) return null;
    const reference = text(incident.reference_number);
    const eventKey = publicNotificationEventKey(notificationType, {
      incident,
      recipientId: recipient.id,
    });
    if (notificationType === "incident_submitted") {
      return {
        userId: recipient.id,
        notificationType,
        title: `${text(incident.severity)} Incident Report: ${reference}`,
        message: `New ${text(incident.category)} report at ${text(incident.location)}. Status: ${text(incident.status)}. Immediate review required for ${text(incident.severity)} severity reports.`,
        priority: severityToPriority(incident.severity),
        channels,
        eventKey,
        relatedType: "incident",
        relatedId: incident.id,
      };
    }
    if (notificationType === "incident_status") {
      return {
        userId: recipient.id,
        notificationType,
        title: `Report ${reference} Updated`,
        message: `Your incident report status has been updated to: ${text(incident.status)}.`,
        priority: severityToPriority(incident.severity),
        channels,
        eventKey,
        relatedType: "incident",
        relatedId: incident.id,
      };
    }
    if (!incident.assigned_to) return null;
    return {
      userId: recipient.id,
      notificationType,
      title: `Incident Assigned: ${reference}`,
      message: `You have been assigned to respond to a ${text(incident.severity)} ${text(incident.category)} incident at ${text(incident.location)}.`,
      priority: severityToPriority(incident.severity),
      channels,
      eventKey,
      relatedType: "incident",
      relatedId: incident.id,
    };
  }

  if (!assignmentReady(assignment)) return null;
  const guideName = personName(people, assignment.guide_id, "A tourism guide");
  const touristName = personName(people, assignment.tourist_id, "A tourist");
  const groupName = text(tourGroup?.name) || "a tour group";
  const routeLabel = [tourGroup?.starting_location, tourGroup?.destination].filter(Boolean).join(" → ");
  const routeText = routeLabel ? ` (${routeLabel})` : "";
  const eventKey = publicNotificationEventKey(notificationType, {
    assignment,
    recipientId: recipient.id,
  });
  const base = {
    userId: recipient.id,
    notificationType,
    priority: notificationType === "guide_assignment_request" ? "HIGH" : "NORMAL",
    channels,
    eventKey,
    relatedType: "assignment",
    relatedId: assignment.id,
  };

  if (notificationType === "guide_assignment_request") {
    return {
      ...base,
      title: "Guide Assignment Request",
      message: `${guideName} wants to be your tour guide for ${groupName}${routeText}. Open your profile to confirm or decline.`,
    };
  }
  if (notificationType === "guide_assignment_accepted") {
    return {
      ...base,
      title: "Tourist Accepted Assignment",
      message: `${touristName} confirmed your guide assignment for ${groupName}.`,
    };
  }
  if (notificationType === "guide_assignment_declined") {
    return {
      ...base,
      title: "Assignment Request Declined",
      message: `${touristName} declined your guide assignment request for ${groupName}.`,
    };
  }
  if (recipient.id === assignment.tourist_id) {
    return {
      ...base,
      title: "Tourism Guide Assigned",
      message: `Tourism Guide ${guideName} has been assigned to assist you during your visit to Daet.`,
    };
  }
  if (recipient.id === assignment.guide_id) {
    return {
      ...base,
      title: "New Tourist Assignment",
      message: `You have been assigned to monitor tourist ${touristName}. Please review their profile and tour schedule.`,
    };
  }
  return null;
}
