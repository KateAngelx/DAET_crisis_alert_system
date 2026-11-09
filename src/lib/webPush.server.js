import * as webPushNamespace from "web-push";
import { getNotificationHref } from "@/lib/notificationLinks";

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

function getWebPushEnv() {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.WEB_PUSH_SUBJECT || "",
  };
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
  const { publicKey, privateKey, subject } = getWebPushEnv();
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Web Push is not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and WEB_PUSH_SUBJECT.");
  }
  webPushApi().setVapidDetails(subject, publicKey, privateKey);
}

export async function sendWebPushToSubscriptions(admin, userId, notification, { userType } = {}) {
  const result = { sent: 0, failed: 0, skipped: false, errors: [] };
  try {
    configureWebPush();
  } catch (error) {
    return { ...result, skipped: true, errors: [error.message] };
  }

  const { data: subscriptions, error } = await admin
    .from("web_push_subscriptions")
    .select("id, endpoint, p256dh, auth, expiration_time")
    .eq("user_id", userId)
    .eq("enabled", true);
  if (error) return { ...result, errors: [error.message] };
  if (!subscriptions?.length) return { ...result, skipped: true };

  const payload = notificationPayload(notification, userType);
  const deliveries = await Promise.allSettled(subscriptions.map(async (row) => {
    const subscription = {
      endpoint: row.endpoint,
      expirationTime: row.expiration_time ? new Date(row.expiration_time).getTime() : null,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    const options = {
      TTL: notification.priority === "CRITICAL" ? 86400 : 3600,
      urgency: notification.priority === "CRITICAL" || notification.priority === "HIGH" ? "high" : "normal",
      contentEncoding: "aes128gcm",
    };

    try {
      await webPushApi().sendNotification(subscription, payload, options);
      return { id: row.id, sent: true };
    } catch (pushError) {
      if (pushError.statusCode === 404 || pushError.statusCode === 410) {
        const { error: disableError } = await admin
          .from("web_push_subscriptions")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("id", row.id);
        if (disableError) throw new Error(`Expired subscription cleanup failed: ${disableError.message}`);
        return { id: row.id, expired: true };
      }
      throw new Error(pushError.message || "Web Push delivery failed");
    }
  }));

  for (const delivery of deliveries) {
    if (delivery.status === "fulfilled" && delivery.value.sent) result.sent += 1;
    else if (delivery.status === "fulfilled" && delivery.value.expired) result.expired = (result.expired || 0) + 1;
    else if (delivery.status === "rejected") {
      result.failed += 1;
      result.errors.push(delivery.reason?.message || "Web Push delivery failed");
    }
  }
  if (deliveries.some((delivery) => delivery.status === "fulfilled" && delivery.value.expired)) {
    const { count, error: countError } = await admin
      .from("web_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("enabled", true);
    if (countError) result.errors.push(`Could not check remaining push subscriptions: ${countError.message}`);
    else if (!count) {
      const { error: preferenceError } = await admin.rpc("set_web_push_enabled", {
        p_user_id: userId,
        p_enabled: false,
      });
      if (preferenceError) result.errors.push(`Could not disable expired push preference: ${preferenceError.message}`);
    }
  }
  return result;
}

export function getWebPushPublicKey() {
  return getWebPushEnv().publicKey || null;
}

export function getWebPushStatus() {
  const { publicKey } = getWebPushEnv();
  try {
    configureWebPush();
    return { configured: true, publicKey, configurationError: null };
  } catch (error) {
    const configurationError = /failed to load/i.test(error.message || "")
      ? "The push library failed to load on the server."
      : publicKey
        ? "The server push keys could not be used."
        : null;
    return { configured: false, publicKey: null, configurationError };
  }
}

export function isWebPushConfigured() {
  return getWebPushStatus().configured;
}
