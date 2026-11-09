const DEFAULT_CHANNEL_FLAGS = { email: true, sms: true, app: true };

export function channelsToDb(channels) {
  if (Array.isArray(channels)) {
    return channels.length > 0 ? channels : ['web'];
  }

  if (channels && typeof channels === 'object') {
    const enabled = Object.entries(channels)
      .filter(([, isEnabled]) => Boolean(isEnabled))
      .map(([key]) => (key === 'app' ? 'web' : key));

    return enabled.length > 0 ? enabled : ['web'];
  }

  return ['web'];
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

  return { ...DEFAULT_CHANNEL_FLAGS };
}

export function normalizeAlert(alert) {
  if (!alert) return alert;
  return { ...alert, channels: channelsFromDb(alert.channels) };
}

/** Persist office channel switches, including the case where every switch is off. */
export function channelFlagsToDb(channels) {
  const flags = channelsFromDb(channels ?? DEFAULT_CHANNEL_FLAGS);
  return { email: flags.email, sms: flags.sms, app: flags.app };
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
