import { channelsFromDb } from "@/lib/alertChannels";
import { AUDIENCE_ROLE_OPTIONS, normalizeNotificationAudience } from "@/lib/notificationAudience";

function joinLabels(labels) {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function describeBroadcastAudience(audience) {
  const normalized = normalizeNotificationAudience(audience);
  const labels = AUDIENCE_ROLE_OPTIONS
    .filter((option) => normalized[option.key])
    .map((option) => option.label);
  return labels.length ? joinLabels(labels) : "no selected roles";
}

export function describeSelectedChannels(channels) {
  const flags = channelsFromDb(channels);
  const labels = [
    flags.app ? "in-app" : null,
    flags.email ? "email" : null,
    flags.sms ? "SMS" : null,
  ].filter(Boolean);
  return labels.length ? joinLabels(labels) : "no selected channels";
}

export function broadcastConfirmationText(audience, channels) {
  const roles = describeBroadcastAudience(audience);
  if (roles === "no selected roles") {
    return "No recipient roles are included in Admin Settings, so this broadcast will not be delivered.";
  }
  const channelText = describeSelectedChannels(channels);
  return `This sends the crisis alert to ${roles} through the channels you selected: ${channelText}.`;
}

export function resolvedBroadcastConfirmationText(audience, channels) {
  const roles = describeBroadcastAudience(audience);
  const channelText = describeSelectedChannels(channels);
  if (roles === "no selected roles") {
    return "This removes the alert from the public active feed. No recipient roles are included in Admin Settings, so a resolved notice will not be delivered.";
  }
  return `This removes the alert from the public active feed and sends a resolved notice to ${roles} through the channels selected for this alert: ${channelText}. Tourists can still view it under Resolved Alerts.`;
}
