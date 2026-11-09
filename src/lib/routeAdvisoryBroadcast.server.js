import { channelsFromDb } from "@/lib/alertChannels";
import { NOTIFICATION_CHANNELS } from "@/lib/constants";
import { processNotificationDeliveries } from "@/lib/notificationQueue.server";
import {
  channelsFromProfile,
  getBroadcastAlertChannels,
  hasProfileEmail,
} from "@/lib/userNotificationChannels";
import { audienceToUserTypes, isProfileInAudience } from "@/lib/notificationAudience";
import { getSystemSettings } from "@/lib/systemSettings.server";
import { formatRouteAdvisorySms } from "@/lib/smsMessageFormat";
import { normalizePhilippinePhone } from "@/lib/phoneUtils";
import { sendWebPushToSubscriptions } from "@/lib/webPush.server";

export async function broadcastRouteAdvisoryToTourists(
  admin,
  advisoryId,
  eventType = "created",
  channelOverride
) {
  const results = { notified: 0, skipped: 0, emailQueued: 0, smsQueued: 0, pushSent: 0, errors: [] };
  const { data: advisory, error: advisoryError } = await admin
    .from("route_advisories")
    .select("*")
    .eq("id", advisoryId)
    .eq("advisory_kind", "route")
    .maybeSingle();

  if (advisoryError || !advisory) {
    results.errors.push(advisoryError?.message || "Route advisory not found");
    return results;
  }

  const isCleared = eventType === "cleared";
  const isUpdate = eventType === "updated";

  if (
    !isCleared
    && (
      advisory.status !== "Active"
      || advisory.is_public !== true
      || !advisory.warning_starts_at
      || new Date(advisory.warning_starts_at).getTime() > Date.now()
      || (advisory.warning_ends_at && new Date(advisory.warning_ends_at).getTime() < Date.now())
    )
  ) {
    results.errors.push("Route advisory is not currently public and active");
    return results;
  }

  const channelFlags = channelsFromDb(channelOverride ?? advisory.channels);
  const place = advisory.affected_location || advisory.to_location || "Daet";
  const eventKey = isCleared
    ? `route-advisory:${advisory.id}:cleared:${advisory.updated_at}`
    : isUpdate
      ? `route-advisory:${advisory.id}:updated:${advisory.updated_at}`
      : `route-advisory:${advisory.id}:created`;
  const title = isCleared
    ? `Cleared: ${advisory.title}`
    : `${isUpdate ? "Route Advisory Updated" : "Route Advisory"}: ${advisory.title}`;
  const message = isCleared
    ? `This road advisory is cleared. ${advisory.title} at ${place} is no longer active.`
    : `${advisory.route_status || "Advisory"} on ${place}. ${advisory.reason || advisory.safety_instructions || ""}`.trim();
  const smsBody = formatRouteAdvisorySms(advisory, { cleared: isCleared });
  const notificationType = isCleared
    ? "route_advisory_cleared"
    : isUpdate
      ? "route_advisory_updated"
      : "route_advisory";
  const priority = advisory.route_status === "Closed" ? "HIGH" : "NORMAL";

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
    .eq("related_type", "route_advisory")
    .eq("related_id", advisoryId);
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

  const deliveryRecords = [];

  for (const profile of recipients || []) {
    if (!isProfileInAudience(profile, audience) || alreadyNotified.has(profile.id)) {
      results.skipped += 1;
      continue;
    }

    const userChannels = channelsFromProfile(profile);
    const effective = getBroadcastAlertChannels(channelFlags, userChannels);
    const sendEmail = effective.email && hasProfileEmail(profile);
    const normalizedPhone = normalizePhilippinePhone(profile.phone);

    if (!sendEmail && !effective.sms && !effective.app && !effective.push) {
      results.skipped += 1;
      continue;
    }

    let notificationId = null;

    if (effective.app || effective.push) {
      const { data: notification, error: insertError } = await admin
        .from("notifications")
        .insert({
          user_id: profile.id,
          title,
          message,
          notification_type: notificationType,
          priority,
          related_type: "route_advisory",
          related_id: advisoryId,
          event_key: eventKey,
        })
        .select("id, title, message, priority, related_type, related_id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          results.skipped += 1;
          continue;
        }
        results.errors.push(insertError.message);
        continue;
      }

      notificationId = notification.id;
      results.notified += 1;

      if (effective.push) {
        const pushResult = await sendWebPushToSubscriptions(admin, profile.id, notification, {
          userType: profile.user_type,
        });
        results.pushSent += pushResult.sent || 0;
        results.errors.push(...(pushResult.errors || []));
      }
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

  results.emailQueued = (deliveries || []).filter((row) => row.channel === "email").length;
  results.smsQueued = (deliveries || []).filter((row) => row.channel === "sms").length;

  await processNotificationDeliveries({ deliveryIds: (deliveries || []).map((row) => row.id) });

  return results;
}
