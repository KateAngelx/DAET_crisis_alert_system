import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function dispatchToUser(userId, title, message, requestId, notificationType) {
  if (!userId) return { errors: ["Notification recipient is unavailable."] };
  return dispatchNotificationServer({
    userId,
    title,
    message,
    notificationType,
    priority: "NORMAL",
    relatedType: "tourist_guide_assistance",
    relatedId: requestId,
    channels: ["web", "email"],
  });
}

export async function notifyGuideAssistanceAssignment(request, guide) {
  return dispatchToUser(
    guide.id,
    "New Tourist Guide Assistance Request",
    `You have been selected to assist with a tourist request at ${request.location}. Review and accept or decline it in your Guide Portal.`,
    request.id,
    "tourist_guide_assistance_assigned"
  );
}

export async function notifyGuideAssistanceOutcome(request, outcome) {
  const admin = getSupabaseAdmin();
  if (!admin) return [{ errors: ["Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required"] }];

  const touristResult = await dispatchToUser(
    request.tourist_id,
    outcome === "Accepted" ? "Guide Assistance Accepted" : "Guide Assistance Update",
    outcome === "Accepted"
      ? "Your selected tourist guide accepted the request. The Tourism Office will coordinate the assistance details."
      : "The selected guide declined your request. The Tourism Office has been notified and may select another guide.",
    request.id,
    outcome === "Accepted" ? "tourist_guide_assistance_accepted" : "tourist_guide_assistance_declined"
  );

  const { data: admins, error } = await admin
    .from("profiles")
    .select("id")
    .eq("user_type", "admin")
    .eq("is_active", true);
  if (error) return [touristResult, { errors: [error.message] }];

  const adminResults = await Promise.all((admins || []).map((profile) =>
    dispatchToUser(
      profile.id,
      outcome === "Accepted"
        ? "Tourist Guide Assistance Accepted"
        : "Tourist Guide Assistance Declined",
      outcome === "Accepted"
        ? `The guide assigned to request ${request.id} accepted. Coordinate the assistance with the tourist.`
        : `The guide assigned to request ${request.id} declined. Select another active guide or cancel the request.`,
      request.id,
      outcome === "Accepted"
        ? "tourist_guide_assistance_accepted"
        : "tourist_guide_assistance_declined"
    )
  ));
  return [touristResult, ...adminResults];
}

export async function notifyGuideAssistanceCompletion(request) {
  const results = [
    await dispatchToUser(
      request.tourist_id,
      "Tourist Guide Assistance Completed",
      "The Tourism Office marked your Tourist Guide Assistance request as completed.",
      request.id,
      "tourist_guide_assistance_completed"
    ),
  ];
  if (request.assigned_guide_id) {
    results.push(await dispatchToUser(
      request.assigned_guide_id,
      "Tourist Guide Assistance Completed",
      "The Tourism Office marked the assistance request assigned to you as completed.",
      request.id,
      "tourist_guide_assistance_completed"
    ));
  }
  return results;
}

export async function notifyGuideAssistanceCancellation(request) {
  const admin = getSupabaseAdmin();
  if (!admin) return [{ errors: ["Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required"] }];

  const results = [
    await dispatchToUser(
      request.tourist_id,
      "Tourist Guide Assistance Cancelled",
      "Your Tourist Guide Assistance request was cancelled by the Tourism Office.",
      request.id,
      "tourist_guide_assistance_cancelled"
    ),
  ];
  if (request.assigned_guide_id) {
    results.push(await dispatchToUser(
      request.assigned_guide_id,
      "Tourist Guide Assistance Cancelled",
      "The Tourism Office cancelled the Tourist Guide Assistance request assigned to you.",
      request.id,
      "tourist_guide_assistance_cancelled"
    ));
  }
  return results;
}

export function getNotificationWarnings(results) {
  return (results || [])
    .flatMap((result) => result?.errors || [])
    .filter(Boolean);
}
