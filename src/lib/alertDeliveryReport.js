/** Per-alert delivery report: who was reached, who opened, who replied, and who to remind. */

const SENT = new Set(["sent", "delivered"]);
const FAILED = new Set(["failed", "cancelled"]);
export const RESEND_COOLDOWN_MS = 10 * 60 * 1000;

/** Delivery keys look like `<userId>-crisis-alert:<alertId>:created-sms`. */
export function originalDeliveryKeyPattern(alertId) {
  return `%crisis-alert:${alertId}:created-%`;
}
export function resendDeliveryKeyPattern(alertId) {
  return `%crisis-alert:${alertId}:resend:%`;
}
export function resendDeliveryKey(userId, alertId, stamp) {
  return `${userId}-crisis-alert:${alertId}:resend:${stamp}-sms`;
}

/** The best status when a channel has several rows (a sent row wins over a failed retry). */
function bestStatus(statuses) {
  if (!statuses.length) return null;
  if (statuses.some((s) => SENT.has(s))) return statuses.includes("delivered") ? "delivered" : "sent";
  if (statuses.some((s) => !FAILED.has(s))) return "pending";
  return "failed";
}

/**
 * Build one row per recipient.
 * @param {object} input
 * @param {Array} input.notifications in-app notices: { user_id, is_read, dismissed_at }
 * @param {Array} input.deliveries  SMS/email rows: { user_id, channel, status, last_error, idempotency_key }
 * @param {Array} input.checkins    replies: { user_id, status }
 * @param {Array} input.profiles    { id, full_name, user_type, phone }
 */
export function buildRecipientRows({ notifications = [], deliveries = [], checkins = [], profiles = [] }) {
  const byId = new Map();
  const row = (userId) => {
    if (!byId.has(userId)) {
      byId.set(userId, { userId, inApp: false, opened: false, dismissed: false, sms: [], email: [], resent: [], smsError: null, reply: null });
    }
    return byId.get(userId);
  };
  for (const n of notifications) {
    const r = row(n.user_id);
    r.inApp = true;
    r.opened = r.opened || Boolean(n.is_read);
    r.dismissed = r.dismissed || Boolean(n.dismissed_at);
  }
  for (const d of deliveries) {
    if (!d.user_id) continue;
    const r = row(d.user_id);
    const isResend = String(d.idempotency_key || "").includes(":resend:");
    if (isResend) r.resent.push(d.status);
    else if (d.channel === "sms") {
      r.sms.push(d.status);
      if (FAILED.has(d.status) && d.last_error) r.smsError = d.last_error;
    } else if (d.channel === "email") r.email.push(d.status);
  }
  for (const c of checkins) row(c.user_id).reply = c.status;

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  return [...byId.values()].map((r) => {
    const p = profileById.get(r.userId) || {};
    const sms = bestStatus(r.sms);
    const email = bestStatus(r.email);
    const resent = bestStatus(r.resent);
    const contacted = r.opened || Boolean(r.reply) || SENT.has(sms) || SENT.has(email) || SENT.has(resent);
    return {
      userId: r.userId,
      name: p.full_name || "User",
      role: p.user_type || "tourist",
      hasPhone: Boolean(p.phone),
      inApp: r.inApp,
      opened: r.opened || r.dismissed || Boolean(r.reply),
      sms,
      smsError: sms === "failed" ? r.smsError : null,
      email,
      resent,
      reply: r.reply,
      noConfirmedContact: !contacted,
    };
  });
}

/** Totals for the report header. */
export function summarizeRecipients(rows) {
  const count = (fn) => rows.filter(fn).length;
  return {
    recipients: rows.length,
    tourists: count((r) => r.role === "tourist"),
    opened: count((r) => r.opened),
    replied: count((r) => Boolean(r.reply)),
    smsSent: count((r) => SENT.has(r.sms)),
    smsFailed: count((r) => r.sms === "failed"),
    smsPending: count((r) => r.sms === "pending"),
    emailSent: count((r) => SENT.has(r.email)),
    reminded: count((r) => Boolean(r.resent)),
    noConfirmedContact: count((r) => r.noConfirmedContact),
  };
}

/**
 * Tourists who still need a reminder: for a check-in alert, anyone who has not replied;
 * otherwise anyone who has not opened (or dismissed) the notice.
 */
export function pickNonResponders(rows, { checkinRequested = false } = {}) {
  return rows.filter((r) => r.role === "tourist" && (checkinRequested ? !r.reply : !r.opened));
}

/** Milliseconds until another reminder may be sent (0 = allowed now). */
export function resendWaitMs(lastResendAt, nowMs = Date.now()) {
  if (!lastResendAt) return 0;
  const last = Date.parse(lastResendAt);
  if (!Number.isFinite(last)) return 0;
  return Math.max(0, last + RESEND_COOLDOWN_MS - nowMs);
}
