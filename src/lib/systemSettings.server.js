import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  DEFAULT_NOTIFICATION_AUDIENCE,
  normalizeNotificationAudience,
} from "@/lib/notificationAudience";
import {
  DEFAULT_PUBLIC_VISIBILITY,
  normalizePublicVisibility,
} from "@/lib/publicVisibility";

const SETTINGS_ID = "default";

export function getDefaultSystemSettings() {
  return {
    id: SETTINGS_ID,
    notification_audience: { ...DEFAULT_NOTIFICATION_AUDIENCE },
    public_visibility: { ...DEFAULT_PUBLIC_VISIBILITY },
    updated_at: null,
    updated_by: null,
  };
}

export async function getSystemSettings(adminClient) {
  const client = adminClient || getSupabaseAdmin();
  if (!client) return getDefaultSystemSettings();

  const { data, error } = await client
    .from("system_settings")
    .select("id, notification_audience, public_visibility, updated_at, updated_by")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    const fallback = await client
      .from("system_settings")
      .select("id, notification_audience, updated_at, updated_by")
      .eq("id", SETTINGS_ID)
      .maybeSingle();
    if (fallback.error || !fallback.data) return getDefaultSystemSettings();
    return {
      ...fallback.data,
      notification_audience: normalizeNotificationAudience(fallback.data.notification_audience),
      public_visibility: { ...DEFAULT_PUBLIC_VISIBILITY },
    };
  }

  if (!data) return getDefaultSystemSettings();

  return {
    ...data,
    notification_audience: normalizeNotificationAudience(data.notification_audience),
    public_visibility: normalizePublicVisibility(data.public_visibility),
  };
}

export async function updateSystemSettings(adminClient, { notification_audience, public_visibility, updatedBy }) {
  const client = adminClient || getSupabaseAdmin();
  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
  }

  const payload = {
    updated_at: new Date().toISOString(),
    updated_by: updatedBy || null,
  };
  if (notification_audience) {
    payload.notification_audience = normalizeNotificationAudience(notification_audience);
  }
  if (public_visibility) {
    payload.public_visibility = normalizePublicVisibility(public_visibility);
  }

  const row = { id: SETTINGS_ID, ...payload };
  const withVisibility = "id, notification_audience, public_visibility, updated_at, updated_by";
  const withoutVisibility = "id, notification_audience, updated_at, updated_by";

  const { data, error } = await client
    .from("system_settings")
    .upsert(row, { onConflict: "id" })
    .select(withVisibility)
    .single();

  if (error && !public_visibility) {
    const retry = await client
      .from("system_settings")
      .upsert(row, { onConflict: "id" })
      .select(withoutVisibility)
      .single();
    if (retry.error) throw retry.error;
    return {
      ...retry.data,
      notification_audience: normalizeNotificationAudience(retry.data.notification_audience),
      public_visibility: { ...DEFAULT_PUBLIC_VISIBILITY },
    };
  }

  if (error) {
    const missingColumn = /public_visibility/i.test(error.message || "");
    if (missingColumn) {
      throw new Error("Public visibility is not in the database yet. Run migration 022_public_visibility.sql, then save again.");
    }
    throw error;
  }

  return {
    ...data,
    notification_audience: normalizeNotificationAudience(data.notification_audience),
    public_visibility: normalizePublicVisibility(data.public_visibility),
  };
}
