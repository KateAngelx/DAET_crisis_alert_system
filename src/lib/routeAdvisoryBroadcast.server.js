import { channelsFromProfile } from "@/lib/userNotificationChannels";
import { audienceToUserTypes, isProfileInAudience } from "@/lib/notificationAudience";
import { getSystemSettings } from "@/lib/systemSettings.server";
import { sendWebPushToSubscriptions } from "@/lib/webPush.server";

export async function broadcastRouteAdvisoryToTourists(admin, advisoryId, eventType = "created") {
  const results = { notified: 0, skipped: 0, pushSent: 0, errors: [] };
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
  if (
    advisory.status !== "Active"
    || advisory.is_public !== true
    || !advisory.warning_starts_at
    || new Date(advisory.warning_starts_at).getTime() > Date.now()
    || (advisory.warning_ends_at && new Date(advisory.warning_ends_at).getTime() < Date.now())
  ) {
    results.errors.push("Route advisory is not currently public and active");
    return results;
  }

  const isUpdate = eventType === "updated";
  const eventKey = isUpdate
    ? `route-advisory:${advisory.id}:updated:${advisory.updated_at}`
    : `route-advisory:${advisory.id}:created`;
  const title = `${isUpdate ? "Route Advisory Updated" : "Route Advisory"}: ${advisory.title}`;
  const message = `${advisory.route_status || "Advisory"} on ${advisory.affected_location || advisory.to_location}. ${advisory.reason || advisory.safety_instructions || ""}`.trim();
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
  if (isUpdate) existingQuery = existingQuery.eq("event_key", eventKey);
  const { data: existing, error: existingError } = await existingQuery;
  if (existingError) {
    results.errors.push(existingError.message);
    return results;
  }
  const alreadyNotified = new Set((existing || []).map((row) => row.user_id));

  const { data: recipients, error: recipientError } = await admin
    .from("profiles")
    .select("id, user_type, notification_channels")
    .in("user_type", audienceTypes)
    .eq("is_active", true);
  if (recipientError) {
    results.errors.push(recipientError.message);
    return results;
  }

  for (const profile of recipients || []) {
    if (!isProfileInAudience(profile, audience) || alreadyNotified.has(profile.id)) {
      results.skipped += 1;
      continue;
    }

    const channels = channelsFromProfile(profile);
    if (!channels.app && !channels.push) {
      results.skipped += 1;
      continue;
    }

    const { data: notification, error: insertError } = await admin
      .from("notifications")
      .insert({
        user_id: profile.id,
        title,
        message,
        notification_type: isUpdate ? "route_advisory_updated" : "route_advisory",
        priority: advisory.route_status === "Closed" ? "HIGH" : "NORMAL",
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

    results.notified += 1;
    if (channels.push) {
      const pushResult = await sendWebPushToSubscriptions(admin, profile.id, notification, {
        userType: profile.user_type,
      });
      results.pushSent += pushResult.sent || 0;
      results.errors.push(...(pushResult.errors || []));
    }
  }

  return results;
}
