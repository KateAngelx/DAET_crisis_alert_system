/** Per-user notification channel preferences (distinct from crisis alert broadcast channels) */

export const DEFAULT_USER_NOTIFICATION_CHANNELS = {
  email: true,
  sms: true,
  app: true,
};

export function channelsFromProfile(profile) {
  const raw = profile?.notification_channels;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return {
      email: Boolean(raw.email),
      sms: Boolean(raw.sms),
      app: Boolean(raw.app ?? raw.web ?? true),
    };
  }
  return { ...DEFAULT_USER_NOTIFICATION_CHANNELS };
}

export function isChannelsConfigured(profile) {
  return Boolean(profile?.notification_channels_configured);
}

/** Tourists and guides receive broadcast SMS/email; admins do not */
export function isExternalAlertRecipient(profile) {
  const role = profile?.user_type;
  return role === "tourist" || role === "guide";
}

/** Intersect LGU alert channels with user preferences */
export function getEffectiveAlertChannels(alertChannels, userChannels) {
  return {
    email: Boolean(alertChannels?.email && userChannels.email),
    sms: Boolean(alertChannels?.sms && userChannels.sms),
    app: Boolean(alertChannels?.app && userChannels.app),
  };
}

/** Area hazards / direct dispatch — user prefs only (no alert-level channel flags) */
export function getEffectiveUserChannels(userChannels, requested = ["web", "email", "sms"]) {
  return {
    email: requested.includes("email") && userChannels.email,
    sms: requested.includes("sms") && userChannels.sms,
    app: (requested.includes("web") || requested.includes("app")) && userChannels.app,
  };
}

export function shouldQueueEmail(profile, alertHasEmail = true) {
  if (!isExternalAlertRecipient(profile)) return false;
  return alertHasEmail && channelsFromProfile(profile).email;
}

export function shouldQueueSms(profile, alertHasSms = true) {
  if (!isExternalAlertRecipient(profile)) return false;
  return alertHasSms && channelsFromProfile(profile).sms;
}

export function shouldCreateInAppNotification(profile, alertHasApp = true) {
  if (!isExternalAlertRecipient(profile)) return false;
  return alertHasApp && channelsFromProfile(profile).app;
}

/** Single-user dispatch (incidents, assignments) — admins never get SMS/email */
export function getDispatchChannelsForProfile(profile, requestedChannels = []) {
  const userChannels = channelsFromProfile(profile);
  const isAdmin = profile?.user_type === "admin";

  if (isAdmin) {
    return {
      email: false,
      sms: false,
      app: requestedChannels.includes("web") || requestedChannels.includes("app"),
    };
  }

  return getEffectiveUserChannels(userChannels, requestedChannels);
}
