import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { CHECKIN_STATUS_TEXT, URGENT_CHECKIN_STATUSES, summarizeCheckins } from "@/lib/alertCheckins";

const CHECKIN_COLUMNS = "alert_id, user_id, status, note, source, reported_by, handled_at, handled_by, created_at, updated_at";

export function isCheckinsNotSetUp(error) {
  return ["42P01", "PGRST205", "42703", "PGRST204"].includes(error?.code);
}

export async function loadAlert(admin, alertId) {
  return admin
    .from("crisis_alerts")
    .select("id, title, location, severity, status, checkin_requested")
    .eq("id", alertId)
    .maybeSingle();
}

/** Save the latest answer for one tourist on one alert. A new answer re-opens "handled". */
export async function saveCheckin(admin, { alertId, userId, status, note, source, reportedBy }) {
  const now = new Date().toISOString();
  return admin
    .from("crisis_alert_checkins")
    .upsert(
      {
        alert_id: alertId,
        user_id: userId,
        status,
        note,
        source,
        reported_by: reportedBy,
        handled_at: null,
        handled_by: null,
        updated_at: now,
      },
      { onConflict: "alert_id,user_id" }
    )
    .select(CHECKIN_COLUMNS)
    .single();
}

/** Active guides for a tourist (through active assignments in active tour groups). */
async function loadTouristGuideIds(admin, touristId) {
  const { data } = await admin
    .from("guide_assignments")
    .select("guide_id, tour_group:tour_groups(status)")
    .eq("tourist_id", touristId)
    .eq("status", "active");
  return [...new Set((data || []).filter((r) => r.tour_group?.status === "active").map((r) => r.guide_id))];
}

/**
 * "Needs help" or "missing": tell every administrator at once (in-app, SMS, email),
 * and the tourist's guides when the tourist reported it themself.
 */
export async function notifyUrgentCheckin(admin, { alert, tourist, status, note, reportedByGuide }) {
  if (!URGENT_CHECKIN_STATUSES.includes(status)) return { warnings: [] };
  const name = tourist?.full_name || "A tourist";
  const contact = tourist?.phone ? ` Phone: ${tourist.phone}.` : "";
  const who = reportedByGuide ? " (reported by their guide)" : "";
  const title = `${CHECKIN_STATUS_TEXT[status]}: ${name}`;
  const message = `${name}${who} — ${CHECKIN_STATUS_TEXT[status].toLowerCase()} during "${alert.title}" at ${alert.location || "Daet"}.${contact}${note ? ` Note: ${note}` : ""}`;

  const { data: admins } = await admin.from("profiles").select("id").eq("user_type", "admin");
  const guideIds = reportedByGuide ? [] : await loadTouristGuideIds(admin, tourist.id);
  const recipients = [
    ...(admins || []).map((a) => ({ id: a.id, channels: ["web", "sms", "email"] })),
    ...guideIds.map((id) => ({ id, channels: ["web", "sms"] })),
  ];

  const results = await Promise.all(
    recipients.map((r) =>
      dispatchNotificationServer({
        userId: r.id,
        title,
        message,
        notificationType: "crisis_checkin_urgent",
        priority: "CRITICAL",
        relatedType: "alert",
        relatedId: alert.id,
        // One notice per tourist, alert and status, so repeated taps do not spam staff.
        eventKey: `checkin:${alert.id}:${tourist.id}:${status}:${r.id}`,
        channels: r.channels,
        urgentSmsToProfilePhone: true,
      }).catch((err) => ({ errors: [err.message] }))
    )
  );
  return { warnings: results.flatMap((r) => r?.errors || []) };
}

/** How many tourists were sent this alert (its in-app notices), for "no reply yet". */
export async function countTouristsReached(admin, alertId) {
  const { data } = await admin
    .from("notifications")
    .select("user_id, user:profiles!inner(user_type)")
    .eq("related_type", "alert")
    .eq("related_id", alertId)
    .eq("notification_type", "crisis_alert")
    .eq("user.user_type", "tourist");
  return new Set((data || []).map((r) => r.user_id)).size;
}

/** Summary and the people who need action, for the Command Center. */
export async function loadCheckinOverview(admin, alertId) {
  const { data: rows, error } = await admin
    .from("crisis_alert_checkins")
    .select(`${CHECKIN_COLUMNS}, person:profiles!crisis_alert_checkins_user_id_fkey(full_name, phone), reporter:profiles!crisis_alert_checkins_reported_by_fkey(full_name)`)
    .eq("alert_id", alertId)
    .order("updated_at", { ascending: false });
  if (error) return { error };
  const reached = await countTouristsReached(admin, alertId).catch(() => 0);
  const urgent = (rows || [])
    .filter((r) => URGENT_CHECKIN_STATUSES.includes(r.status))
    .map((r) => ({
      userId: r.user_id,
      name: r.person?.full_name || "Tourist",
      phone: r.person?.phone || null,
      status: r.status,
      note: r.note,
      source: r.source,
      reportedBy: r.source === "guide" ? r.reporter?.full_name || "Guide" : null,
      updatedAt: r.updated_at,
      handledAt: r.handled_at,
    }));
  return { summary: summarizeCheckins(rows || [], reached), urgent, reached, error: null };
}
