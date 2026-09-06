import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  DEFAULT_NOTIFICATION_AUDIENCE,
  normalizeNotificationAudience,
} from "@/lib/notificationAudience";

const SETTINGS_ID = "default";

export function getDefaultSystemSettings() {
  return {
    id: SETTINGS_ID,
    notification_audience: { ...DEFAULT_NOTIFICATION_AUDIENCE },
    updated_at: null,
    updated_by: null,
  };
}

export async function getSystemSettings(adminClient) {
  const client = adminClient || getSupabaseAdmin();
  if (!client) return getDefaultSystemSettings();

  const { data, error } = await client
    .from("system_settings")
    .select("id, notification_audience, updated_at, updated_by")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error || !data) {
    return getDefaultSystemSettings();
  }

  return {
    ...data,
    notification_audience: normalizeNotificationAudience(data.notification_audience),
  };
}

export async function updateSystemSettings(adminClient, { notification_audience, updatedBy }) {
  const client = adminClient || getSupabaseAdmin();
  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
  }

  const payload = {
    notification_audience: normalizeNotificationAudience(notification_audience),
    updated_at: new Date().toISOString(),
    updated_by: updatedBy || null,
  };

  const { data, error } = await client
    .from("system_settings")
    .upsert({ id: SETTINGS_ID, ...payload }, { onConflict: "id" })
    .select("id, notification_audience, updated_at, updated_by")
    .single();

  if (error) throw error;
  return {
    ...data,
    notification_audience: normalizeNotificationAudience(data.notification_audience),
  };
}
