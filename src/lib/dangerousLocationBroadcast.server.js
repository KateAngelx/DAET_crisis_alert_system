import { channelsFromDb } from "@/lib/alertChannels";
import { dangerSeverityToPriority } from "@/lib/dangerousLocationUtils";
import { areaAdvisoryToWarning } from "@/lib/areaAdvisoryAdapter";
import { NOTIFICATION_CHANNELS } from "@/lib/constants";
import { processNotificationDeliveries } from "@/lib/notificationQueue.server";
import {
  channelsFromProfile,
  getBroadcastAlertChannels,
  hasProfileEmail,
} from "@/lib/userNotificationChannels";
import { audienceToUserTypes, isProfileInAudience } from "@/lib/notificationAudience";
import { getSystemSettings } from "@/lib/systemSettings.server";
import { formatAreaHazardSms } from "@/lib/smsMessageFormat";
import { normalizePhilippinePhone } from "@/lib/phoneUtils";
import { sendWebPushToSubscriptions } from "@/lib/webPush.server";

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

export async function broadcastDangerousLocationToTourists(
  admin,
  warningId,
  eventType = "created",
  channelOverride
) {
  const results = { notified: 0, skipped: 0, emailQueued: 0, smsQueued: 0, pushSent: 0, errors: [] };

  const warning = await loadAreaHazard(admin, warningId);

  if (!warning) {
    results.errors.push("Area hazard not found");
    return results;
  }

  const isCleared = eventType === "cleared";
  const isUpdate = eventType === "updated";

  if (!isCleared && warning.status !== "Active") {
    results.errors.push("Warning is not active");
    return results;
  }

  const priority = dangerSeverityToPriority(warning.severity);
  const eventKey = isCleared
    ? `area-hazard:${warning.id}:cleared:${warning.updated_at}`
    : isUpdate
      ? `area-hazard:${warning.id}:updated:${warning.updated_at}`
      : `area-hazard:${warning.id}:created`;
  const title = isCleared
    ? `Cleared: ${warning.dangerous_location}`
    : `${warning.severity === "Caution" ? "Route Caution" : "Area Hazard"}${isUpdate ? " Updated" : ""}: ${warning.dangerous_location}`;
  const message = isCleared
    ? `This area hazard is cleared. ${warning.dangerous_location} is no longer an active hazard.`
    : `${warning.danger_type} reported at ${warning.dangerous_location}. Use alternative route: ${warning.alternative_route} → ${warning.destination}. ${warning.safety_instructions || ""}`.trim();
  const smsBody = formatAreaHazardSms(warning, { cleared: isCleared });
  const notificationType = isCleared
    ? "dangerous_location_cleared"
    : isUpdate
      ? "dangerous_location_updated"
      : "dangerous_location";
  const hazardChannelFlags = channelsFromDb(channelOverride ?? warning.channels);

  const settings = await getSystemSettings(admin);
  const audience = settings.notification_audience;
  const audienceTypes = audienceToUserTypes(audience);

  if (audienceTypes.length === 0) {
    results.errors.push("No notification audience enabled in Admin Settings");
    return results;
  }

  let existingQuery = admin
    .from("notifications")
    .select("user_id")
    .eq("related_type", "dangerous_location")
    .eq("related_id", warningId);
  if (isUpdate || isCleared) existingQuery = existingQuery.eq("event_key", eventKey);
  const { data: existing, error: existingError } = await existingQuery;

  if (existingError) {
    results.errors.push(existingError.message);
    return results;
  }

  const alreadyNotified = new Set((existing || []).map((row) => row.user_id));

  const { data: recipients, error: recipientError } = await admin
    .from("profiles")
    .select("id, email, phone, user_type, notification_channels, sms_suspended_at, inactive_notice_sent_at")
    .in("user_type", audienceTypes)
    .eq("is_active", true);

  if (recipientError) {
    results.errors.push(recipientError.message);
    return results;
  }

  const toNotify = (recipients || []).filter(
    (profile) =>
      !alreadyNotified.has(profile.id) && isProfileInAudience(profile, audience)
  );
  results.skipped = (recipients || []).length - toNotify.length;

  if (toNotify.length === 0) return results;

  const deliveryRecords = [];

  for (const profile of toNotify) {
    const userChannels = channelsFromProfile(profile);
    const effective = getBroadcastAlertChannels(hazardChannelFlags, userChannels);
    const sendEmail = effective.email && hasProfileEmail(profile);

    if (!sendEmail && !effective.sms && !effective.app && !effective.push) {
      results.skipped += 1;
      continue;
    }

    let notificationId = null;

    if (effective.app || effective.push) {
      const { data: notification, error: notifError } = await admin
        .from("notifications")
        .insert({
          user_id: profile.id,
          title,
          message,
          notification_type: notificationType,
          priority,
          related_type: "dangerous_location",
          related_id: warningId,
          event_key: eventKey,
        })
        .select("id")
        .single();

      if (notifError) {
        if (notifError.code === "23505") {
          results.skipped += 1;
          continue;
        }
        results.errors.push(notifError.message);
        continue;
      }

      notificationId = notification.id;
      results.notified += 1;
    }

    if (effective.push && notificationId) {
      const pushResult = await sendWebPushToSubscriptions(
        admin,
        profile.id,
        {
          id: notificationId,
          title,
          message,
          priority,
          related_type: "dangerous_location",
          related_id: warningId,
        },
        { userType: profile.user_type }
      );
      results.pushSent += pushResult.sent || 0;
      results.errors.push(...(pushResult.errors || []));
    }

    if (sendEmail) {
      deliveryRecords.push({
        notification_id: notificationId,
        user_id: profile.id,
        channel: NOTIFICATION_CHANNELS.EMAIL,
        status: "pending",
        recipient: profile.email,
        subject: title,
        body: message,
        priority,
        idempotency_key: `${profile.id}-${eventKey}-email`,
      });
    }

    const normalizedPhone = normalizePhilippinePhone(profile.phone);
    if (effective.sms && normalizedPhone) {
      deliveryRecords.push({
        notification_id: notificationId,
        user_id: profile.id,
        channel: NOTIFICATION_CHANNELS.SMS,
        status: "pending",
        recipient: normalizedPhone,
        subject: title,
        body: smsBody,
        priority,
        idempotency_key: `${profile.id}-${eventKey}-sms`,
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
