import { NOTIFICATION_CHANNELS, severityToPriority } from "@/lib/constants";
import { processNotificationDeliveries } from "@/lib/notificationQueue.server";
import { channelsForBroadcast, isCriticalSeverity } from "@/lib/userNotificationChannels";
import { normalizePhilippinePhone } from "@/lib/phoneUtils";
import { isSmsSuspended } from "@/lib/userActivity";
import { formatCrisisAlertSms } from "@/lib/smsMessageFormat";
import {
  buildRecipientRows,
  originalDeliveryKeyPattern,
  pickNonResponders,
  resendDeliveryKey,
  resendDeliveryKeyPattern,
  resendWaitMs,
  summarizeRecipients,
} from "@/lib/alertDeliveryReport";

const CHUNK = 200;

export async function loadAlertForReport(admin, alertId) {
  return admin
    .from("crisis_alerts")
    .select("id, title, type, severity, location, message, status, checkin_requested, channels, published_at, created_at")
    .eq("id", alertId)
    .maybeSingle();
}

async function inChunks(ids, fn) {
  const out = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data } = await fn(ids.slice(i, i + CHUNK));
    out.push(...(data || []));
  }
  return out;
}

/** Everything needed for the report (no message bodies, phone numbers or emails leave the server). */
export async function buildAlertDeliveryReport(admin, alert) {
  const [{ data: notifications }, { data: deliveries }, { data: resends }, checkinsResult] = await Promise.all([
    admin
      .from("notifications")
      .select("user_id, is_read, dismissed_at")
      .eq("related_type", "alert")
      .eq("related_id", alert.id)
      .eq("notification_type", "crisis_alert"),
    admin
      .from("notification_deliveries")
      .select("user_id, channel, status, last_error, idempotency_key")
      .like("idempotency_key", originalDeliveryKeyPattern(alert.id)),
    admin
      .from("notification_deliveries")
      .select("user_id, channel, status, last_error, idempotency_key, created_at")
      .like("idempotency_key", resendDeliveryKeyPattern(alert.id))
      .order("created_at", { ascending: false }),
    alert.checkin_requested
      ? admin.from("crisis_alert_checkins").select("user_id, status").eq("alert_id", alert.id)
      : Promise.resolve({ data: [] }),
  ]);

  const userIds = [
    ...new Set([...(notifications || []), ...(deliveries || []), ...(resends || [])].map((r) => r.user_id).filter(Boolean)),
  ];
  const profiles = await inChunks(userIds, (ids) =>
    admin.from("profiles").select("id, full_name, user_type, phone").in("id", ids)
  );

  const rows = buildRecipientRows({
    notifications: notifications || [],
    deliveries: [...(deliveries || []), ...(resends || [])],
    checkins: checkinsResult.data || [],
    profiles,
  });
  const nonResponders = pickNonResponders(rows, { checkinRequested: alert.checkin_requested });
  const lastResendAt = resends?.[0]?.created_at || null;

  return {
    summary: summarizeRecipients(rows),
    rows: rows
      .sort((a, b) => Number(a.opened) - Number(b.opened) || a.name.localeCompare(b.name))
      .map(({ hasPhone, ...r }) => ({ ...r, hasPhone })),
    nonResponders: nonResponders.length,
    nonRespondersWithPhone: nonResponders.filter((r) => r.hasPhone).length,
    lastResendAt,
    resendAvailableInMs: resendWaitMs(lastResendAt),
  };
}

/**
 * Text a reminder to tourists who have not opened (or, for check-in alerts, not answered) the alert.
 * Uses the phone in Profile, like the original broadcast. Critical alerts ignore SMS opt-outs.
 */
export async function resendAlertToNonResponders(admin, alert) {
  const report = await buildAlertDeliveryReport(admin, alert);
  if (report.resendAvailableInMs > 0) {
    return { ok: false, error: `A reminder was sent recently. Try again in ${Math.ceil(report.resendAvailableInMs / 60000)} min.` };
  }
  const targets = pickNonResponders(report.rows, { checkinRequested: alert.checkin_requested });
  if (!targets.length) return { ok: true, queued: 0, skipped: 0, message: "Everyone has already responded." };

  const profiles = await inChunks(targets.map((t) => t.userId), (ids) =>
    admin.from("profiles").select("id, phone, notification_channels, sms_suspended_at, last_seen_at, is_active").in("id", ids)
  );
  const critical = isCriticalSeverity(alert.severity);
  const stamp = Date.now();
  const body = `REMINDER: ${formatCrisisAlertSms(alert)}`;
  const records = [];
  let skipped = 0;
  for (const p of profiles) {
    const phone = normalizePhilippinePhone(p.phone);
    const allowed = channelsForBroadcast(p, alert.severity).sms && (critical || !isSmsSuspended(p));
    if (!p.is_active || !phone || !allowed) {
      skipped += 1;
      continue;
    }
    records.push({
      notification_id: null,
      user_id: p.id,
      channel: NOTIFICATION_CHANNELS.SMS,
      status: "pending",
      recipient: phone,
      subject: `Reminder: ${alert.title}`,
      body,
      priority: severityToPriority(alert.severity),
      idempotency_key: resendDeliveryKey(p.id, alert.id, stamp),
    });
  }
  if (!records.length) return { ok: true, queued: 0, skipped, message: "No one left to remind has an SMS number on file." };

  const { data: inserted, error } = await admin.from("notification_deliveries").insert(records).select("id");
  if (error) return { ok: false, error: "Could not queue the reminders." };
  await processNotificationDeliveries({ deliveryIds: (inserted || []).map((d) => d.id) });
  return { ok: true, queued: records.length, skipped };
}
