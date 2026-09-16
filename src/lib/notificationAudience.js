/** Office-wide notification audience — which roles receive broadcast SMS/email/in-app */

export const DEFAULT_NOTIFICATION_AUDIENCE = {
  tourists: true,
  guides: true,
  admins: false,
};

export function normalizeNotificationAudience(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_NOTIFICATION_AUDIENCE };
  }
  return {
    tourists: Boolean(raw.tourists),
    guides: Boolean(raw.guides),
    admins: Boolean(raw.admins),
  };
}

export function audienceToUserTypes(audience) {
  const normalized = normalizeNotificationAudience(audience);
  const types = [];
  if (normalized.tourists) types.push("tourist");
  if (normalized.guides) types.push("guide");
  if (normalized.admins) types.push("admin");
  return types;
}

export function isProfileInAudience(profile, audience) {
  const normalized = normalizeNotificationAudience(audience);
  const role = profile?.user_type;
  if (role === "tourist") return normalized.tourists;
  if (role === "guide") return normalized.guides;
  if (role === "admin") return normalized.admins;
  return false;
}

export const AUDIENCE_ROLE_OPTIONS = [
  { key: "tourists", label: "Tourists", description: "All registered tourists — crisis emails go to every profile with an email when Email is enabled on the broadcast." },
  { key: "guides", label: "Tourism Guides", description: "Assigned guides monitoring tour groups." },
  { key: "admins", label: "Administrators", description: "Tourism office staff with Command Center access." },
];
