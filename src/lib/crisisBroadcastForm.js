/** Office channel toggles on the crisis broadcast form (in-app; push follows app for subscribers). */
export const FULL_BROADCAST_CHANNELS = { email: true, sms: true, app: true };

export function applyAlertSeverityToForm(prev, severity, isReadingPointsEligible) {
  const next = {
    ...prev,
    severity,
    rewards_eligible:
      prev.rewards_eligible && (isReadingPointsEligible ? isReadingPointsEligible({ ...prev, severity }) : true),
  };
  if (severity === "Critical") {
    next.channels = { ...FULL_BROADCAST_CHANNELS };
  }
  return next;
}

export function broadcastChannelsForAlert(alert) {
  const base = alert?.channels || { ...FULL_BROADCAST_CHANNELS };
  if (alert?.severity === "Critical") return { ...FULL_BROADCAST_CHANNELS };
  return base;
}

/** Channels stored on publish/update (Critical always saves all office channels). */
export function channelsForSave(severity, channels) {
  if (severity === "Critical") return { ...FULL_BROADCAST_CHANNELS };
  return channels || { ...FULL_BROADCAST_CHANNELS };
}