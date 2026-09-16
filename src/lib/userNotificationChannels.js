/** Per-user notification channel preferences (distinct from crisis alert broadcast channels) */

import {
  DEFAULT_NOTIFICATION_AUDIENCE,
  isProfileInAudience,
} from "@/lib/notificationAudience";
import { isSmsSuspended } from "@/lib/userActivity";

export const DEFAULT_USER_NOTIFICATION_CHANNELS = {
  email: true,
  sms: true,
  app: true,
};

export function channelsFromProfile(profile) {
  const raw = profile?.notification_channels;
  let channels;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    channels = {
      email: Boolean(raw.email),
      sms: Boolean(raw.sms),
      app: Boolean(raw.app ?? raw.web ?? true),
    };
  } else {
    channels = { ...DEFAULT_USER_NOTIFICATION_CHANNELS };
  }

  if (isSmsSuspended(profile)) {
    channels.sms = false;
  }

  return channels;
}

export function isChannelsConfigured(profile) {
  return Boolean(profile?.notification_channels_configured);
}

/** Intersect office alert channels with user preferences */
export function getEffectiveAlertChannels(alertChannels, userChannels) {
  return {
    email: Boolean(alertChannels?.email && userChannels.email),
    sms: Boolean(alertChannels?.sms && userChannels.sms),
    app: Boolean(alertChannels?.app && userChannels.app),
  };
}

/**
 * Tourism office emergency broadcasts (crisis alerts, area hazards).
 * Email goes to every audience member with a profile email when the alert includes email.
 * SMS and in-app still respect user communication preferences.
 */
export function getBroadcastAlertChannels(alertChannels, userChannels) {
  return {
    email: Boolean(alertChannels?.email),
    sms: Boolean(alertChannels?.sms && userChannels.sms),
    app: Boolean(alertChannels?.app && userChannels.app),
  };
}

export function hasProfileEmail(profile) {
  return Boolean(String(profile?.email || "").trim());
}

/** Area hazards / direct dispatch — user prefs only (no alert-level channel flags) */
export function getEffectiveUserChannels(userChannels, requested = ["web", "email", "sms"]) {
  return {
    email: requested.includes("email") && userChannels.email,
    sms: requested.includes("sms") && userChannels.sms,
    app: (requested.includes("web") || requested.includes("app")) && userChannels.app,
  };
}

/** Single-user dispatch — respects office audience settings + user channel prefs */
export function getDispatchChannelsForProfile(
  profile,
  requestedChannels = [],
  audience = DEFAULT_NOTIFICATION_AUDIENCE
) {
  if (!isProfileInAudience(profile, audience)) {
    return { email: false, sms: false, app: false };
  }
  return getEffectiveUserChannels(channelsFromProfile(profile), requestedChannels);
}
