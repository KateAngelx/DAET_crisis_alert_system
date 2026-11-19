import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function dispatchToUser(userId, title, message, requestId, notificationType, { priority = "NORMAL", channels = ["web", "email"] } = {}) {
  if (!userId) return { errors: ["Notification recipient is unavailable."] };
  return dispatchNotificationServer({
    userId,
    title,
    message,
    notificationType,
    priority,
    relatedType: "tourist_guide_assistance",
    relatedId: requestId,
    channels,
  });
}

async function loadAdminRecipients(admin) {
  const { data: admins, error } = await admin
    .from("profiles")
    .select("id")
    .eq("user_type", "admin")
    .or("is_active.eq.true,is_active.is.null");
  if (error) throw error;
  return admins || [];
}

/** Tell every administrator a tourist submitted a new help request. */
export async function notifyAdminsOfNewGuideAssistanceRequest(request, touristLabel = "A tourist") {
  const admin = getSupabaseAdmin();
  if (!admin) return [{ errors: ["Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required"] }];

  try {
    const admins = await loadAdminRecipients(admin);
    if (!admins.length) return [{ errors: ["No administrator accounts were found to notify."] }];

    const who = String(touristLabel || "A tourist").trim() || "A tourist";
    const message = `${who} requested "${request.assistance_type}" at ${request.location} (${request.tourist_count} tourist${request.tourist_count === 1 ? "" : "s"}). Open Help requests to assign a guide.`;

    return Promise.all(
      admins.map((profile) =>
        dispatchToUser(
          profile.id,
          "New tourist help request",
          message,
          request.id,
          "tourist_guide_assistance_submitted",
          { priority: "HIGH", channels: ["web", "email", "sms"] }
        )
      )
    );
  } catch (error) {
    return [{ errors: [error.message || "Unable to notify administrators."] }];
  }
}

export async function notifyGuideAssistanceAssignment(request, guide) {
  return dispatchToUser(
    guide.id,
    "New help request",
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
    outcome === "Accepted" ? "Help request accepted" : "Help request update",
    outcome === "Accepted"
      ? "Your selected tourist guide accepted the request. The Tourism Office will coordinate the assistance details."
      : "The selected guide declined your request. The Tourism Office has been notified and may select another guide.",
    request.id,
    outcome === "Accepted" ? "tourist_guide_assistance_accepted" : "tourist_guide_assistance_declined"
  );

  let admins = [];
  try {
    admins = await loadAdminRecipients(admin);
  } catch (error) {
    return [touristResult, { errors: [error.message] }];
  }

  const adminResults = await Promise.all(admins.map((profile) =>
    dispatchToUser(
      profile.id,
      outcome === "Accepted"
        ? "Help request accepted"
        : "Help request declined",
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
      "Help request completed",
      "The Tourism Office marked your help request as completed.",
      request.id,
      "tourist_guide_assistance_completed"
    ),
  ];
  if (request.assigned_guide_id) {
    results.push(await dispatchToUser(
      request.assigned_guide_id,
      "Help request completed",
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
      "Help request cancelled",
      "The Tourism Office cancelled your help request.",
      request.id,
      "tourist_guide_assistance_cancelled"
    ),
  ];
  if (request.assigned_guide_id) {
    results.push(await dispatchToUser(
      request.assigned_guide_id,
      "Help request cancelled",
      "The Tourism Office cancelled the help request assigned to you.",
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
