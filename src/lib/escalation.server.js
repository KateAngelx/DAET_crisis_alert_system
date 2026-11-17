import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import {
  ESCALATION_KIND_LABELS,
  escalationLevelDue,
  escalationMessage,
  normalizeEscalationSettings,
} from "@/lib/escalation";

const SETTINGS_ID = "default";

export function isEscalationNotSetUp(error) {
  return ["42703", "PGRST204", "42P01", "PGRST205"].includes(error?.code);
}

export async function getEscalationSettings(admin) {
  const { data, error } = await admin
    .from("system_settings")
    .select("escalation_enabled, escalation_minutes")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  if (error) return { settings: null, error };
  return { settings: normalizeEscalationSettings(data || {}), error: null };
}

export async function saveEscalationSettings(admin, value, userId) {
  return admin
    .from("system_settings")
    .update({
      escalation_enabled: value.enabled,
      escalation_minutes: value.minutes,
      escalation_contacts: [], // outside contacts are no longer used; clear any saved numbers
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", SETTINGS_ID);
}

/** Every open urgent item that has not reached the last escalation level, in one shape. */
export async function collectOpenUrgentItems(admin) {
  const [checkins, missing, incidents, guideReports] = await Promise.all([
    admin
      .from("crisis_alert_checkins")
      .select("alert_id, user_id, status, note, updated_at, escalation_level, person:profiles!crisis_alert_checkins_user_id_fkey(full_name, phone), alert:crisis_alerts(title, location)")
      .is("handled_at", null)
      .in("status", ["need_help", "missing"])
      .lt("escalation_level", 2),
    admin
      .from("missing_person_cases")
      .select("incident_id, person_name, last_seen_location, created_at, escalation_level, reporter:profiles!missing_person_cases_reported_by_fkey(full_name, phone)")
      .eq("search_status", "searching")
      .is("acknowledged_at", null)
      .lt("escalation_level", 2),
    admin
      .from("incident_reports")
      .select("id, reference_number, category, location, created_at, escalation_level, reporter:profiles!incident_reports_reporter_id_fkey(full_name, phone)")
      .eq("status", "Submitted")
      .eq("severity", "Critical")
      .neq("category", "Missing Person") // covered by the missing-person case
      .lt("escalation_level", 2),
    admin
      .from("guide_emergency_reports")
      .select("id, reference_number, emergency_type, location, submitted_at, escalation_level, guide:profiles!guide_emergency_reports_reporter_id_fkey(full_name, phone)")
      .eq("status", "New")
      .lt("escalation_level", 2),
  ]);

  const errors = [checkins, missing, incidents, guideReports].map((r) => r.error).filter(Boolean);
  const items = [];
  for (const c of checkins.data || []) {
    items.push({
      kind: "checkin",
      key: `${c.alert_id}:${c.user_id}`,
      table: "crisis_alert_checkins",
      match: { alert_id: c.alert_id, user_id: c.user_id },
      startedAt: c.updated_at,
      level: c.escalation_level,
      summary: `${c.person?.full_name || "A tourist"} (${c.status === "missing" ? "missing" : "needs help"}) during "${c.alert?.title || "an alert"}" at ${c.alert?.location || "Daet"}${c.note ? ` — ${c.note}` : ""}`,
      contact: c.person?.phone || null,
    });
  }
  for (const m of missing.data || []) {
    items.push({
      kind: "missing",
      key: m.incident_id,
      table: "missing_person_cases",
      match: { incident_id: m.incident_id },
      startedAt: m.created_at,
      level: m.escalation_level,
      summary: `${m.person_name}, last seen at ${m.last_seen_location}`,
      contact: m.reporter?.phone ? `${m.reporter.full_name || "reporter"} ${m.reporter.phone}` : null,
    });
  }
  for (const i of incidents.data || []) {
    items.push({
      kind: "incident",
      key: i.id,
      table: "incident_reports",
      match: { id: i.id },
      startedAt: i.created_at,
      level: i.escalation_level,
      summary: `${i.category} at ${i.location} (${i.reference_number || "report"})`,
      contact: i.reporter?.phone ? `${i.reporter.full_name || "reporter"} ${i.reporter.phone}` : null,
    });
  }
  for (const g of guideReports.data || []) {
    items.push({
      kind: "guide_emergency",
      key: g.id,
      table: "guide_emergency_reports",
      match: { id: g.id },
      startedAt: g.submitted_at,
      level: g.escalation_level,
      summary: `${g.emergency_type} at ${g.location} (${g.reference_number || "report"})`,
      contact: g.guide?.phone ? `guide ${g.guide.full_name || ""} ${g.guide.phone}`.trim() : null,
    });
  }
  return { items, errors };
}

async function notifyAdmins(admin, item, level, minutes) {
  const { data: admins } = await admin.from("profiles").select("id").eq("user_type", "admin").eq("is_active", true);
  const label = ESCALATION_KIND_LABELS[item.kind] || "Urgent report";
  const results = await Promise.all(
    (admins || []).map((a) =>
      dispatchNotificationServer({
        userId: a.id,
        title: level >= 2 ? `Still unanswered after ${minutes * 2} min: ${label}` : `Still unanswered: ${label}`,
        message: escalationMessage(item, level, minutes),
        notificationType: "urgent_escalation",
        priority: "CRITICAL",
        relatedType: item.kind === "checkin" ? "alert" : item.kind === "guide_emergency" ? "guide_emergency" : item.kind === "missing" ? "missing_person" : "incident",
        relatedId: item.kind === "checkin" ? item.match.alert_id : item.key,
        eventKey: `escalation:${item.kind}:${item.key}:${level}:${a.id}`,
        channels: ["web", "sms"],
        urgentSmsToProfilePhone: true,
      }).catch((err) => ({ errors: [err.message] }))
    )
  );
  return results.flatMap((r) => r?.errors || []);
}

/**
 * Raise every overdue item one or two levels. Each item is claimed with a conditional update
 * (same level as read), so two overlapping runs never send the same step twice.
 */
export async function runEscalations(admin, nowMs = Date.now()) {
  const { settings, error: settingsError } = await getEscalationSettings(admin);
  if (settingsError) return { ok: false, notSetUp: isEscalationNotSetUp(settingsError), error: settingsError.message };
  if (!settings.enabled) return { ok: true, skipped: "Escalation is turned off in Settings.", escalated: 0 };

  const { items, errors } = await collectOpenUrgentItems(admin);
  const summary = { ok: true, checked: items.length, escalated: 0, toAdmins: 0, errors: errors.map((e) => e.message) };

  for (const item of items) {
    const due = escalationLevelDue(item.startedAt, settings.minutes, nowMs);
    if (due <= item.level) continue;

    let claim = admin
      .from(item.table)
      .update({ escalation_level: due, escalated_at: new Date(nowMs).toISOString() })
      .eq("escalation_level", item.level);
    for (const [col, val] of Object.entries(item.match)) claim = claim.eq(col, val);
    const { data: claimed, error: claimError } = await claim.select("escalation_level");
    if (claimError) {
      summary.errors.push(claimError.message);
      continue;
    }
    if (!claimed?.length) continue; // another run already took this step

    summary.escalated += 1;
    summary.errors.push(...(await notifyAdmins(admin, item, due, settings.minutes)));
    summary.toAdmins += 1;
  }
  return summary;
}
