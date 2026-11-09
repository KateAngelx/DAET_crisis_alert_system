import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function dispatch(userId, title, message, reportId, notificationType, channels) {
  if (!userId) return { errors: ["Notification recipient is unavailable."] };
  return dispatchNotificationServer({
    userId,
    title,
    message,
    notificationType,
    priority: "CRITICAL",
    relatedType: "guide_emergency",
    relatedId: reportId,
    channels,
    criticalEmergency: true,
  });
}

export async function notifyGuideEmergencySubmitted(report, guide) {
  const admin = getSupabaseAdmin();
  if (!admin) return [{ errors: ["Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required"] }];

  const { data: admins, error } = await admin
    .from("profiles")
    .select("id")
    .eq("user_type", "admin")
    .eq("is_active", true);
  if (error) return [{ errors: [error.message] }];

  const message = `${report.reference_number}: ${report.emergency_type} reported at ${report.location}. Open the Crisis Command Center for details.`;
  const adminResults = await Promise.all((admins || []).map((profile) =>
    dispatch(
      profile.id,
      `Guide Emergency Report ${report.reference_number}`,
      message,
      report.id,
      "guide_emergency_reported",
      ["web", "email", "sms"]
    )
  ));
  const guideResult = await dispatch(
    guide.id,
    `Emergency Report Received: ${report.reference_number}`,
    `Your emergency report was received at ${report.submitted_at}. Reference: ${report.reference_number}.`,
    report.id,
    "guide_emergency_confirmation",
    ["web", "email"]
  );
  if (!admins?.length) {
    return [...adminResults, { errors: ["No active administrators were available for emergency notification."] }, guideResult];
  }
  return [...adminResults, guideResult];
}

export async function notifyGuideEmergencyStatus(report, guideId) {
  return [
    await dispatch(
      guideId,
      `Emergency Report Update: ${report.reference_number}`,
      `The status of your emergency report is now ${report.status}.`,
      report.id,
      "guide_emergency_status",
      ["web", "email"]
    ),
  ];
}

export function getGuideEmergencyNotificationWarnings(results) {
  return (results || [])
    .flatMap((result) => result?.errors || [])
    .filter(Boolean);
}
