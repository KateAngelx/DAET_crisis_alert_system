import { getAreaHazardNotificationLink } from "@/lib/travelLinks";

/** Destination for a private notification, based on the signed-in role. */
export function getNotificationHref(notification, role = "tourist") {
  if (!notification?.related_type) return null;
  const relatedId = notification.related_id;

  if (notification.related_type === "dangerous_location") {
    const prefix = role === "guide" ? "/guide" : "";
    return getAreaHazardNotificationLink(notification, { prefix }) || `${prefix}/routes`;
  }

  if (notification.related_type === "alert") {
    if (role === "admin") return "/crisis/command";
    if (role === "guide") return "/guide/crisis";
    return "/crisis";
  }

  if (notification.related_type === "route_advisory") {
    if (role === "guide") return "/guide/routes";
    return "/crisis/roads";
  }

  if (notification.related_type === "incident") {
    if (role === "admin") return "/admin/incidents";
    if (role === "guide") return relatedId ? `/guide/reports/${relatedId}` : "/guide/reports";
    return relatedId ? `/crisis/reports/${relatedId}` : "/crisis/reports";
  }

  if (notification.related_type === "tourist_guide_assistance") {
    if (role === "admin") return "/admin/guide-assistance";
    if (role === "guide") return "/guide/assistance";
    return "/profile";
  }

  if (notification.related_type === "guide_emergency") {
    if (role === "admin") return "/crisis/command";
    if (role === "guide") return "/guide";
    return null;
  }

  if (notification.related_type === "assignment") {
    return role === "guide" ? "/guide/groups" : "/profile";
  }

  if (notification.related_type === "tour_group") {
    return role === "guide" && relatedId ? `/guide/groups/${relatedId}` : "/guide/groups";
  }

  if (notification.related_type === "crisis_feedback") {
    return role === "admin" ? "/admin/crisis-feedback" : "/crisis/feedback";
  }

  return null;
}

export function getNotificationInboxHref(role) {
  return role === "guide" ? "/guide/notifications" : "/notifications";
}
