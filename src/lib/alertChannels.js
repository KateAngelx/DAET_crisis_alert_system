const NO_CHANNEL_FLAGS = { email: false, sms: false, app: false };

export function channelsToDb(channels) {
  return channelFlagsToDb(channels);
}

export function channelsFromDb(channels) {
  if (Array.isArray(channels)) {
    return {
      email: channels.includes('email'),
      sms: channels.includes('sms'),
      app: channels.includes('app') || channels.includes('web'),
    };
  }

  if (channels && typeof channels === 'object') {
    return {
      email: Boolean(channels.email),
      sms: Boolean(channels.sms),
      app: Boolean(channels.app ?? channels.web),
    };
  }

  return { ...NO_CHANNEL_FLAGS };
}

export function normalizeAlert(alert) {
  if (!alert) return alert;
  return { ...alert, channels: channelsFromDb(alert.channels) };
}

/**
 * Persist office channel switches as the JSON array stored on alerts.
 * An empty array means every switch is off. "web" is the stored in-app value.
 */
export function channelFlagsToDb(channels) {
  const flags = channelsFromDb(channels);
  const stored = [];
  if (flags.email) stored.push("email");
  if (flags.sms) stored.push("sms");
  if (flags.app) stored.push("web");
  return stored;
}

export function channelOverrideFromBody(channels) {
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) return undefined;
  if (!("email" in channels) && !("sms" in channels) && !("app" in channels) && !("web" in channels)) {
    return undefined;
  }
  return {
    email: Boolean(channels.email),
    sms: Boolean(channels.sms),
    app: Boolean(channels.app ?? channels.web),
  };
}

export function isMissingChannelsColumn(error) {
  const message = String(error?.message || error || "");
  return /channels/i.test(message) && /schema cache|does not exist|could not find/i.test(message);
}
