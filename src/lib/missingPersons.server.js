import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { MISSING_STATUS_LABELS, missingStatusMessage } from "@/lib/missingPersons";

export const CASE_COLUMNS =
  "incident_id, reported_by, tagged_user_id, person_name, person_description, last_seen_location, last_seen_latitude, last_seen_longitude, last_seen_at, search_status, status_note, status_updated_at, created_at, updated_at";

export function isMissingCasesNotSetUp(error) {
  return ["42P01", "PGRST205", "42703", "PGRST204"].includes(error?.code);
}

export async function loadCallerProfile(admin, userId) {
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, phone, user_type, is_active")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

/** Active guides (via active assignments in active groups) for a tourist. */
export async function loadGuideIdsForTourist(admin, touristId) {
  if (!touristId) return [];
  const { data } = await admin
    .from("guide_assignments")
    .select("guide_id, tour_group:tour_groups(status)")
    .eq("tourist_id", touristId)
    .eq("status", "active");
  return [...new Set((data || []).filter((r) => r.tour_group?.status === "active").map((r) => r.guide_id))];
}

/** Tourists who share an active tour group with this user (as tourist or as guide). */
export async function loadGroupTourists(admin, userId, role) {
  let groupIds = [];
  if (role === "guide") {
    const { data } = await admin.from("tour_groups").select("id").eq("guide_id", userId).eq("status", "active");
    groupIds = (data || []).map((g) => g.id);
  } else {
    const { data } = await admin
      .from("guide_assignments")
      .select("tour_group_id, tour_group:tour_groups(status)")
      .eq("tourist_id", userId)
      .eq("status", "active");
    groupIds = (data || []).filter((r) => r.tour_group_id && r.tour_group?.status === "active").map((r) => r.tour_group_id);
  }
  if (!groupIds.length) return [];
  const { data } = await admin
    .from("guide_assignments")
    .select("tourist_id, tourist:profiles!guide_assignments_tourist_id_fkey(full_name), tour_group:tour_groups(name)")
    .in("tour_group_id", groupIds)
    .eq("status", "active");
  const seen = new Map();
  for (const row of data || []) {
    if (row.tourist_id === userId || seen.has(row.tourist_id)) continue;
    seen.set(row.tourist_id, { id: row.tourist_id, name: row.tourist?.full_name || "Tourist", group: row.tour_group?.name || null });
  }
  return [...seen.values()];
}

async function adminIds(admin) {
  const { data } = await admin.from("profiles").select("id").eq("user_type", "admin");
  return (data || []).map((a) => a.id);
}

async function send(recipients, notice, { urgent = false } = {}) {
  const results = await Promise.all(
    recipients.map(({ id, channels }) =>
      dispatchNotificationServer({
        ...notice,
        userId: id,
        channels,
        eventKey: `${notice.eventKey}:${id}`,
        urgentSmsToProfilePhone: urgent,
      }).catch((err) => ({
        errors: [err.message],
      }))
    )
  );
  return results.flatMap((r) => r?.errors || []);
}

/** New case: admins and the person's guides at once (Critical); the tagged tourist is asked to confirm. */
export async function notifyNewMissingCase(admin, { caseRow, reporter, taggedPerson }) {
  const who = caseRow.person_name;
  const by = reporter?.full_name ? ` Reported by ${reporter.full_name}${reporter.phone ? ` (${reporter.phone})` : ""}.` : "";
  const when = caseRow.last_seen_at
    ? ` at ${new Date(caseRow.last_seen_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}`
    : "";
  const message = `${who} was reported missing. Last seen at ${caseRow.last_seen_location}${when}.${caseRow.person_description ? ` ${caseRow.person_description}.` : ""}${by}`;
  const guideIds = await loadGuideIdsForTourist(admin, caseRow.tagged_user_id);
  const staff = [
    ...(await adminIds(admin)).map((id) => ({ id, channels: ["web", "sms", "email"] })),
    ...guideIds.filter((id) => id !== reporter?.id).map((id) => ({ id, channels: ["web", "sms"] })),
  ];
  const warnings = await send(staff, {
    title: `Missing tourist: ${who}`,
    message,
    notificationType: "missing_person_reported",
    priority: "CRITICAL",
    relatedType: "missing_person",
    relatedId: caseRow.incident_id,
    eventKey: `missing:${caseRow.incident_id}:reported`,
  }, { urgent: true });

  if (taggedPerson?.id && taggedPerson.id !== reporter?.id) {
    warnings.push(
      ...(await send([{ id: taggedPerson.id, channels: ["web", "sms"] }], {
        title: "You were reported missing",
        message: `Someone reported you missing near ${caseRow.last_seen_location}. If you are safe, open CONNECT-DAET and tap "I'm safe". If you need help, call 911.`,
        notificationType: "missing_person_tagged",
        priority: "CRITICAL",
        relatedType: "missing_person",
        relatedId: caseRow.incident_id,
        eventKey: `missing:${caseRow.incident_id}:tagged`,
      }, { urgent: true }))
    );
  }
  return warnings;
}

/** Status change: tell the reporter, the tagged person, their guides (and admins when the tourist confirmed). */
export async function notifyMissingStatus(admin, { caseRow, status, note, changedBy, includeAdmins = false }) {
  const guideIds = await loadGuideIdsForTourist(admin, caseRow.tagged_user_id);
  const ids = new Set([caseRow.reported_by, caseRow.tagged_user_id, ...guideIds]);
  if (includeAdmins) for (const id of await adminIds(admin)) ids.add(id);
  ids.delete(changedBy);
  ids.delete(null);
  ids.delete(undefined);
  return send(
    [...ids].map((id) => ({ id, channels: ["web", "sms"] })),
    {
      title: `${MISSING_STATUS_LABELS[status] || "Update"}: ${caseRow.person_name}`,
      message: missingStatusMessage(status, caseRow.person_name, note),
      notificationType: `missing_person_${status}`,
      priority: status === "searching" ? "CRITICAL" : "HIGH",
      relatedType: "missing_person",
      relatedId: caseRow.incident_id,
      eventKey: `missing:${caseRow.incident_id}:${status}:${Date.now()}`,
    }
  );
}
