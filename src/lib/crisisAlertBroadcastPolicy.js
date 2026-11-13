import { createHash } from "node:crypto";

const CONTENT_FIELDS = ["title", "message", "type", "severity", "location"];

export function crisisAlertContentFingerprint(alert) {
  const content = {};
  for (const field of CONTENT_FIELDS) {
    content[field] = alert?.[field] ?? null;
  }
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export function crisisAlertEventKey(alert, eventType) {
  const id = alert?.id || "unknown";
  if (eventType === "created") return `crisis-alert:${id}:created`;
  const fingerprint = crisisAlertContentFingerprint(alert);
  if (eventType === "resolved") return `crisis-alert:${id}:resolved:${fingerprint}`;
  return `crisis-alert:${id}:updated:${fingerprint}`;
}

export function normalizeCrisisAlertStatus(status) {
  return String(status || "").trim().toLowerCase();
}

export function crisisAlertEventStatusError(status, eventType) {
  const normalized = normalizeCrisisAlertStatus(status);
  if (eventType === "resolved") {
    return normalized === "resolved"
      ? null
      : "A resolved notice can only be sent after the alert is resolved.";
  }
  if (eventType === "created" || eventType === "updated") {
    return normalized === "active"
      ? null
      : "Created and updated notices can only be sent for an active alert.";
  }
  return "A valid event type is required.";
}

export function deliveryIdempotencyKey(userId, eventKey, channel) {
  return `${userId}-${eventKey}-${channel}`;
}

export function isUniqueViolation(error) {
  return error?.code === "23505";
}

/**
 * Decide which rows are still needed for one recipient.
 * An existing in-app notice does not block a missing email or SMS row.
 */
export function planCrisisRecipientNotification({
  userId,
  eventKey,
  alreadyNotified,
  sendInApp,
  sendEmail,
  sendSms,
  existingDeliveryKeys,
}) {
  const emailKey = deliveryIdempotencyKey(userId, eventKey, "email");
  const smsKey = deliveryIdempotencyKey(userId, eventKey, "sms");
  const queueEmail = Boolean(sendEmail) && !existingDeliveryKeys.has(emailKey);
  const queueSms = Boolean(sendSms) && !existingDeliveryKeys.has(smsKey);
  const insertNotification = Boolean(sendInApp) && !alreadyNotified;
  return {
    insertNotification,
    queueEmail,
    queueSms,
    emailKey,
    smsKey,
    skip: !insertNotification && !queueEmail && !queueSms,
  };
}
