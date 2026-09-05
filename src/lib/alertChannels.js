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
