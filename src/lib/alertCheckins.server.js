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
  const audience = await countAlertAudienceByRole(admin, alertId);
  return audience.tourist.reached;
}

/** Tourists and guides who received the in-app crisis notice (admins excluded). */
export async function countAlertAudienceByRole(admin, alertId) {
  const { data } = await admin
    .from("notifications")
    .select("user_id, is_read, dismissed_at, user:profiles!inner(user_type)")
    .eq("related_type", "alert")
    .eq("related_id", alertId)
    .eq("notification_type", "crisis_alert")
    .in("user.user_type", ["tourist", "guide"]);

  const tourist = { reached: 0, opened: 0 };
  const guide = { reached: 0, opened: 0 };
  const touristIds = new Set();
  const guideIds = new Set();
  const touristOpened = new Set();
  const guideOpened = new Set();

  for (const row of data || []) {
    const role = row.user?.user_type;
    const engaged = Boolean(row.is_read || row.dismissed_at);
    if (role === "tourist") {
      touristIds.add(row.user_id);
      if (engaged) touristOpened.add(row.user_id);
    } else if (role === "guide") {
      guideIds.add(row.user_id);
      if (engaged) guideOpened.add(row.user_id);
    }
  }

  tourist.reached = touristIds.size;
  tourist.opened = touristOpened.size;
  guide.reached = guideIds.size;
  guide.opened = guideOpened.size;

  return { tourist, guide };
}

/** Summary and the people who need action, for the Command Center. */
export async function loadCheckinOverview(admin, alertId) {
  const { data: rows, error } = await admin
    .from("crisis_alert_checkins")
    .select(`${CHECKIN_COLUMNS}, person:profiles!crisis_alert_checkins_user_id_fkey(full_name, phone), reporter:profiles!crisis_alert_checkins_reported_by_fkey(full_name)`)
    .eq("alert_id", alertId)
    .order("updated_at", { ascending: false });
  if (error) return { error };
  const audience = await countAlertAudienceByRole(admin, alertId).catch(() => ({
    tourist: { reached: 0, opened: 0 },
    guide: { reached: 0, opened: 0 },
  }));
  const reached = audience.tourist.reached;
  const mapPerson = (r) => ({
    userId: r.user_id,
    name: r.person?.full_name || "Tourist",
    phone: r.person?.phone || null,
    status: r.status,
    note: r.note,
    source: r.source,
    reportedBy: r.source === "guide" ? r.reporter?.full_name || "Guide" : null,
    updatedAt: r.updated_at,
    handledAt: r.handled_at,
  });

  const byStatus = { safe: [], evacuated: [], need_help: [], missing: [] };
  for (const row of rows || []) {
    if (byStatus[row.status]) byStatus[row.status].push(mapPerson(row));
  }

  const urgent = [...byStatus.need_help, ...byStatus.missing].filter(
    (p) => URGENT_CHECKIN_STATUSES.includes(p.status) && !p.handledAt
  );

  return {
    summary: summarizeCheckins(rows || [], reached),
    byStatus,
    urgent,
    reached,
    audience,
    error: null,
  };
}
