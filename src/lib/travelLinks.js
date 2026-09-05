/** Deep links for area hazard warnings (dangerous_location_warnings IDs). */
export function buildAreaHazardTravelLink(hazardId, { prefix = "" } = {}) {
  if (!hazardId) return `${prefix}/routes`;
  return `${prefix}/routes?hazard=${hazardId}`;
}

export function isAreaHazardNotification(notification) {
  return (
    notification?.notification_type === "dangerous_location" ||
    notification?.related_type === "dangerous_location"
  );
}

export function getAreaHazardNotificationLink(notification, { prefix = "" } = {}) {
  if (!isAreaHazardNotification(notification)) return null;
  return buildAreaHazardTravelLink(notification.related_id, { prefix });
}
