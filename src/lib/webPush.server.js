import * as webPushNamespace from "web-push";
import { getNotificationHref } from "@/lib/notificationLinks";
import { runPushDeliveries, subscriptionsForRecipient } from "@/lib/webPushTargets.mjs";

function webPushApi() {
  const namespace = typeof webPushNamespace.setVapidDetails === "function"
    ? webPushNamespace
    : webPushNamespace.default;
  if (typeof namespace?.setVapidDetails !== "function" || typeof namespace?.sendNotification !== "function") {
    throw new Error("Web Push library failed to load on the server.");
  }
  return {
    setVapidDetails: (...args) => namespace.setVapidDetails(...args),
    sendNotification: (...args) => namespace.sendNotification(...args),
  };
}

function subjectIsUsable(subject) {
  if (!subject || subject.length > 200) return false;
  try {
    const url = new URL(subject);
    return url.protocol === "mailto:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getWebPushEnv() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.WEB_PUSH_SUBJECT || "";
  const missing = [];
  if (!publicKey) missing.push("VAPID_PUBLIC_KEY");
  if (!privateKey) missing.push("VAPID_PRIVATE_KEY");
  if (!subject) missing.push("WEB_PUSH_SUBJECT");
  return { publicKey, privateKey, subject, missing };
}

function configurationErrorFor(env) {
  if (env.missing.length) {
    return `Push notifications are not configured on the server yet. Add ${env.missing.join(", ")} to the server environment, then redeploy.`;
  }
  if (!subjectIsUsable(env.subject)) {
    return "Push notifications are not configured on the server yet. WEB_PUSH_SUBJECT must be a mailto: or https: contact.";
  }
  return null;
}

function getNotificationPath(notification, userType) {
  return getNotificationHref(notification, userType) || "/notifications";
}

function notificationPayload(notification, userType) {
  return JSON.stringify({
    id: notification.id,
    title: notification.title,
    body: notification.message,
    priority: notification.priority,
    url: getNotificationPath(notification, userType),
  });
}

function configureWebPush() {
  const env = getWebPushEnv();
  const configurationError = configurationErrorFor(env);
  if (configurationError) throw new Error(configurationError);
  try {
    webPushApi().setVapidDetails(env.subject, env.publicKey, env.privateKey);
  } catch {
    throw new Error("Push notifications are not configured on the server yet. The server push keys could not be used. Check VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and WEB_PUSH_SUBJECT, then redeploy.");
  }
}

async function disableExpiredSubscriptions(admin, userId, ids) {
  if (!ids.length) return null;
  const updatedAt = new Date().toISOString();
  let { error } = await admin
    .from("web_push_subscriptions")
    .update({ enabled: false, disabled_reason: "expired", updated_at: updatedAt })
    .in("id", ids)
    .eq("user_id", userId);
  if (error && /disabled_reason/i.test(error.message || "")) {
    ({ error } = await admin
      .from("web_push_subscriptions")
      .update({ enabled: false, updated_at: updatedAt })
      .in("id", ids)
      .eq("user_id", userId));
  }
  return error;
}

export async function sendWebPushToSubscriptions(admin, userId, notification, { userType } = {}) {
  const result = { sent: 0, failed: 0, expired: 0, skipped: false, errors: [] };
  try {
    configureWebPush();
  } catch (error) {
    return { ...result, skipped: true, errors: [error.message] };
  }

  const { data: subscriptions, error } = await admin
    .from("web_push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, expiration_time, enabled")
    .eq("user_id", userId)
    .eq("enabled", true);
  if (error) return { ...result, errors: [error.message] };

  const targets = subscriptionsForRecipient(subscriptions, userId);
  if (!targets.length) return { ...result, skipped: true };

  const payload = notificationPayload(notification, userType);
  const { summary } = await runPushDeliveries(targets, async (row) => {
    const subscription = {
      endpoint: row.endpoint,
      expirationTime: row.expiration_time ? new Date(row.expiration_time).getTime() : null,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    await webPushApi().sendNotification(subscription, payload, {
      TTL: notification.priority === "CRITICAL" ? 86400 : 3600,
      urgency: notification.priority === "CRITICAL" || notification.priority === "HIGH" ? "high" : "normal",
      contentEncoding: "aes128gcm",
    });
  });

  result.sent = summary.sent;
  result.failed = summary.failed;
  result.expired = summary.expired;
  result.errors.push(...summary.errors);

  if (summary.expiredIds.length) {
    const disableError = await disableExpiredSubscriptions(admin, userId, summary.expiredIds);
    if (disableError) result.errors.push(`Expired subscription cleanup failed: ${disableError.message}`);

    const { count, error: countError } = await admin
      .from("web_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("enabled", true);
    if (countError) result.errors.push(`Could not check remaining push subscriptions: ${countError.message}`);
    else if (!count) {
      let { error: preferenceError } = await admin.rpc("set_web_push_account_preference", {
        p_user_id: userId,
        p_enabled: false,
      });
      if (preferenceError && /set_web_push_account_preference/i.test(preferenceError.message || "")) {
        ({ error: preferenceError } = await admin.rpc("set_web_push_enabled", {
          p_user_id: userId,
          p_enabled: false,
        }));
      }
      if (preferenceError) result.errors.push(`Could not disable expired push preference: ${preferenceError.message}`);
    }
  }
  return result;
}

export function getWebPushPublicKey() {
  const env = getWebPushEnv();
  return configurationErrorFor(env) ? null : env.publicKey || null;
}

export function getWebPushStatus() {
  const env = getWebPushEnv();
  const preliminary = configurationErrorFor(env);
  if (preliminary) {
    return { configured: false, publicKey: null, configurationError: preliminary, missingEnv: env.missing };
  }
  try {
    configureWebPush();
    return { configured: true, publicKey: env.publicKey, configurationError: null, missingEnv: [] };
  } catch (error) {
    const configurationError = /failed to load/i.test(error.message || "")
      ? "Push notifications are not configured on the server yet. The push library failed to load on the server."
      : error.message || "Push notifications are not configured on the server yet.";
    return { configured: false, publicKey: null, configurationError, missingEnv: [] };
  }
}

export function isWebPushConfigured() {
  return getWebPushStatus().configured;
}
