import { dangerSeverityToPriority } from "@/lib/dangerousLocationUtils";
import { areaAdvisoryToWarning } from "@/lib/areaAdvisoryAdapter";
import { NOTIFICATION_CHANNELS } from "@/lib/constants";
import { processNotificationDeliveries } from "@/lib/notificationQueue.server";
import {
  channelsFromProfile,
  getEffectiveUserChannels,
  isExternalAlertRecipient,
} from "@/lib/userNotificationChannels";

async function loadAreaHazard(admin, warningId) {
  const { data: advisory } = await admin
    .from("route_advisories")
    .select("*")
    .eq("id", warningId)
    .eq("advisory_kind", "area")
    .maybeSingle();

  if (advisory) return areaAdvisoryToWarning(advisory);

  const { data: legacy, error } = await admin
    .from("dangerous_location_warnings")
    .select("*")
    .eq("id", warningId)
    .maybeSingle();

  if (error || !legacy) return null;
  return legacy;
}

export async function broadcastDangerousLocationToTourists(admin, warningId) {
  const results = { notified: 0, skipped: 0, emailQueued: 0, smsQueued: 0, errors: [] };

  const warning = await loadAreaHazard(admin, warningId);

  if (!warning) {
    results.errors.push("Area hazard not found");
    return results;
  }

  if (warning.status !== "Active") {
    results.errors.push("Warning is not active");
    return results;
  }

  const priority = dangerSeverityToPriority(warning.severity);
  const title = `${warning.severity === "Caution" ? "Route Caution" : "Area Hazard"}: ${warning.dangerous_location}`;
  const message = `${warning.danger_type} reported at ${warning.dangerous_location}. Use alternative route: ${warning.alternative_route} → ${warning.destination}. ${warning.safety_instructions || ""}`.trim();

  const { data: existing, error: existingError } = await admin
    .from("notifications")
    .select("user_id")
    .eq("related_type", "dangerous_location")
    .eq("related_id", warningId);

  if (existingError) {
    results.errors.push(existingError.message);
    return results;
  }

  const alreadyNotified = new Set((existing || []).map((row) => row.user_id));

  const { data: recipients, error: recipientError } = await admin
    .from("profiles")
    .select("id, email, phone, user_type, notification_channels")
    .in("user_type", ["tourist", "guide"])
    .eq("is_active", true);

  if (recipientError) {
    results.errors.push(recipientError.message);
    return results;
  }

  const toNotify = (recipients || []).filter(
    (profile) => !alreadyNotified.has(profile.id) && isExternalAlertRecipient(profile)
  );
  results.skipped = (recipients || []).length - toNotify.length;

  if (toNotify.length === 0) return results;

  const deliveryRecords = [];

  for (const profile of toNotify) {
    const effective = getEffectiveUserChannels(channelsFromProfile(profile));

    if (!effective.email && !effective.sms && !effective.app) {
      results.skipped += 1;
      continue;
    }

    let notificationId = null;

    if (effective.app) {
      const { data: notification, error: notifError } = await admin
        .from("notifications")
        .insert({
          user_id: profile.id,
          title,
          message,
          notification_type: "dangerous_location",
          priority,
          related_type: "dangerous_location",
          related_id: warningId,
        })
        .select("id")
        .single();

      if (notifError) {
        results.errors.push(notifError.message);
        continue;
      }

      notificationId = notification.id;
      results.notified += 1;
    }

    if (effective.email && profile.email) {
      deliveryRecords.push({
        notification_id: notificationId,
        user_id: profile.id,
        channel: NOTIFICATION_CHANNELS.EMAIL,
        status: "pending",
        recipient: profile.email,
        subject: title,
        body: message,
        priority,
        idempotency_key: `${profile.id}-dangerous_location-${warningId}-email`,
      });
    }

    if (effective.sms && profile.phone) {
      deliveryRecords.push({
        notification_id: notificationId,
        user_id: profile.id,
        channel: NOTIFICATION_CHANNELS.SMS,
        status: "pending",
        recipient: profile.phone,
        subject: title,
        body: message,
        priority,
        idempotency_key: `${profile.id}-dangerous_location-${warningId}-sms`,
      });
    }
  }

  if (deliveryRecords.length === 0) return results;

  const { data: deliveries, error: deliveryError } = await admin
    .from("notification_deliveries")
    .insert(deliveryRecords)
    .select();

  if (deliveryError) {
    results.errors.push(`Delivery queue failed: ${deliveryError.message}`);
    return results;
  }

  results.emailQueued = (deliveries || []).filter((d) => d.channel === "email").length;
  results.smsQueued = (deliveries || []).filter((d) => d.channel === "sms").length;

  await processNotificationDeliveries({ deliveryIds: (deliveries || []).map((d) => d.id) });

  return results;
}
