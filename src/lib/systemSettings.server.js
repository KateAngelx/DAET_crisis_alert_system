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
    rewards_enabled: true,
    registration_points_enabled: true,
    registration_points_value: 10,
    profile_completion_points_enabled: true,
    profile_completion_points_value: 10,
    alert_reading_points_enabled: true,
    alert_reading_points_value: 5,
    road_viewing_points_enabled: true,
    road_viewing_points_value: 5,
    hazard_viewing_points_enabled: true,
    hazard_viewing_points_value: 5,
    crisis_feedback_points_enabled: true,
    crisis_feedback_points_min_value: 1,
    crisis_feedback_points_value: 5,
    crisis_feedback_points_max_value: 100,
    crisis_feedback_daily_submission_cap: 1,
    incident_report_points_enabled: false,
    incident_report_points_value: 5,
    tourist_guide_completion_points_enabled: true,
    tourist_guide_assistance_enabled: false,
    tourist_guide_assistance_intro: "",
    tourist_guide_assistance_availability: "",
    updated_at: null,
    updated_by: null,
  };
}

export async function getSystemSettings(adminClient) {
  const client = adminClient || getSupabaseAdmin();
  if (!client) return getDefaultSystemSettings();

  const { data, error } = await client
    .from("system_settings")
    .select("id, notification_audience, public_visibility, rewards_enabled, registration_points_enabled, registration_points_value, profile_completion_points_enabled, profile_completion_points_value, alert_reading_points_enabled, alert_reading_points_value, road_viewing_points_enabled, road_viewing_points_value, hazard_viewing_points_enabled, hazard_viewing_points_value, crisis_feedback_points_enabled, crisis_feedback_points_min_value, crisis_feedback_points_value, crisis_feedback_points_max_value, crisis_feedback_daily_submission_cap, incident_report_points_enabled, incident_report_points_value, tourist_guide_completion_points_enabled, tourist_guide_assistance_enabled, tourist_guide_assistance_intro, tourist_guide_assistance_availability, updated_at, updated_by")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    const fallback = await client
      .from("system_settings")
      .select("id, notification_audience, rewards_enabled, registration_points_enabled, registration_points_value, profile_completion_points_enabled, profile_completion_points_value, alert_reading_points_enabled, alert_reading_points_value, road_viewing_points_enabled, road_viewing_points_value, hazard_viewing_points_enabled, hazard_viewing_points_value, crisis_feedback_points_enabled, crisis_feedback_points_min_value, crisis_feedback_points_value, crisis_feedback_points_max_value, crisis_feedback_daily_submission_cap, incident_report_points_enabled, incident_report_points_value, updated_at, updated_by")
      .eq("id", SETTINGS_ID)
      .maybeSingle();
    if (fallback.error || !fallback.data) return getDefaultSystemSettings();
    return {
      ...fallback.data,
      notification_audience: normalizeNotificationAudience(fallback.data.notification_audience),
      public_visibility: { ...DEFAULT_PUBLIC_VISIBILITY },
      rewards_enabled: fallback.data.rewards_enabled ?? true,
      registration_points_enabled: fallback.data.registration_points_enabled ?? true,
      registration_points_value: fallback.data.registration_points_value ?? 10,
      profile_completion_points_enabled: fallback.data.profile_completion_points_enabled ?? true,
      profile_completion_points_value: fallback.data.profile_completion_points_value ?? 10,
      alert_reading_points_enabled: fallback.data.alert_reading_points_enabled ?? true,
      alert_reading_points_value: fallback.data.alert_reading_points_value ?? 5,
      road_viewing_points_enabled: fallback.data.road_viewing_points_enabled ?? true,
      road_viewing_points_value: fallback.data.road_viewing_points_value ?? 5,
      hazard_viewing_points_enabled: fallback.data.hazard_viewing_points_enabled ?? true,
      hazard_viewing_points_value: fallback.data.hazard_viewing_points_value ?? 5,
      crisis_feedback_points_enabled: fallback.data.crisis_feedback_points_enabled ?? true,
      crisis_feedback_points_min_value: fallback.data.crisis_feedback_points_min_value ?? 1,
      crisis_feedback_points_value: fallback.data.crisis_feedback_points_value ?? 5,
      crisis_feedback_points_max_value: fallback.data.crisis_feedback_points_max_value ?? 100,
      crisis_feedback_daily_submission_cap: fallback.data.crisis_feedback_daily_submission_cap ?? 1,
      incident_report_points_enabled: fallback.data.incident_report_points_enabled ?? false,
      incident_report_points_value: fallback.data.incident_report_points_value ?? 5,
      tourist_guide_completion_points_enabled: false,
      tourist_guide_assistance_enabled: false,
      tourist_guide_assistance_intro: "",
      tourist_guide_assistance_availability: "",
    };
  }

  if (!data) return getDefaultSystemSettings();

  return {
    ...data,
    notification_audience: normalizeNotificationAudience(data.notification_audience),
    public_visibility: normalizePublicVisibility(data.public_visibility),
    rewards_enabled: data.rewards_enabled ?? true,
    registration_points_enabled: data.registration_points_enabled ?? true,
    registration_points_value: data.registration_points_value ?? 10,
    profile_completion_points_enabled: data.profile_completion_points_enabled ?? true,
    profile_completion_points_value: data.profile_completion_points_value ?? 10,
    alert_reading_points_enabled: data.alert_reading_points_enabled ?? true,
    alert_reading_points_value: data.alert_reading_points_value ?? 5,
    road_viewing_points_enabled: data.road_viewing_points_enabled ?? true,
    road_viewing_points_value: data.road_viewing_points_value ?? 5,
    hazard_viewing_points_enabled: data.hazard_viewing_points_enabled ?? true,
    hazard_viewing_points_value: data.hazard_viewing_points_value ?? 5,
    crisis_feedback_points_enabled: data.crisis_feedback_points_enabled ?? true,
    crisis_feedback_points_min_value: data.crisis_feedback_points_min_value ?? 1,
    crisis_feedback_points_value: data.crisis_feedback_points_value ?? 5,
    crisis_feedback_points_max_value: data.crisis_feedback_points_max_value ?? 100,
    crisis_feedback_daily_submission_cap: data.crisis_feedback_daily_submission_cap ?? 1,
    incident_report_points_enabled: data.incident_report_points_enabled ?? false,
    incident_report_points_value: data.incident_report_points_value ?? 5,
    tourist_guide_completion_points_enabled: data.tourist_guide_completion_points_enabled ?? true,
    tourist_guide_assistance_enabled: data.tourist_guide_assistance_enabled ?? false,
    tourist_guide_assistance_intro: data.tourist_guide_assistance_intro ?? "",
    tourist_guide_assistance_availability: data.tourist_guide_assistance_availability ?? "",
  };
}

export async function updateSystemSettings(adminClient, {
  notification_audience,
  public_visibility,
  rewards_enabled,
  registration_points_enabled,
  registration_points_value,
  profile_completion_points_enabled,
  profile_completion_points_value,
  alert_reading_points_enabled,
  alert_reading_points_value,
  road_viewing_points_enabled,
  road_viewing_points_value,
  hazard_viewing_points_enabled,
  hazard_viewing_points_value,
  crisis_feedback_points_enabled,
  crisis_feedback_points_min_value,
  crisis_feedback_points_value,
  crisis_feedback_points_max_value,
  crisis_feedback_daily_submission_cap,
  incident_report_points_enabled,
  incident_report_points_value,
  tourist_guide_completion_points_enabled,
  tourist_guide_assistance_enabled,
  tourist_guide_assistance_intro,
  tourist_guide_assistance_availability,
  updatedBy,
}) {
  const client = adminClient || getSupabaseAdmin();
  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required");
  }

  const updatedAt = new Date().toISOString();
  const payload = {
    updated_at: updatedAt,
    updated_by: updatedBy || null,
  };
  if (notification_audience) {
    payload.notification_audience = normalizeNotificationAudience(notification_audience);
  }
  if (public_visibility) {
    payload.public_visibility = normalizePublicVisibility(public_visibility);
  }
  if (rewards_enabled !== undefined) payload.rewards_enabled = rewards_enabled;
  if (registration_points_enabled !== undefined) {
    payload.registration_points_enabled = registration_points_enabled;
  }
  if (registration_points_value !== undefined) {
    payload.registration_points_value = registration_points_value;
  }
  if (profile_completion_points_enabled !== undefined) {
    payload.profile_completion_points_enabled = profile_completion_points_enabled;
  }
  if (profile_completion_points_value !== undefined) {
    payload.profile_completion_points_value = profile_completion_points_value;
  }
  if (alert_reading_points_enabled !== undefined) {
    payload.alert_reading_points_enabled = alert_reading_points_enabled;
  }
  if (alert_reading_points_value !== undefined) {
    payload.alert_reading_points_value = alert_reading_points_value;
  }
  if (road_viewing_points_enabled !== undefined) {
    payload.road_viewing_points_enabled = road_viewing_points_enabled;
  }
  if (road_viewing_points_value !== undefined) {
    payload.road_viewing_points_value = road_viewing_points_value;
  }
  if (hazard_viewing_points_enabled !== undefined) {
    payload.hazard_viewing_points_enabled = hazard_viewing_points_enabled;
  }
  if (hazard_viewing_points_value !== undefined) {
    payload.hazard_viewing_points_value = hazard_viewing_points_value;
  }
  if (crisis_feedback_points_enabled !== undefined) {
    payload.crisis_feedback_points_enabled = crisis_feedback_points_enabled;
  }
  if (crisis_feedback_points_min_value !== undefined) {
    payload.crisis_feedback_points_min_value = crisis_feedback_points_min_value;
  }
  if (crisis_feedback_points_value !== undefined) {
    payload.crisis_feedback_points_value = crisis_feedback_points_value;
  }
  if (crisis_feedback_points_max_value !== undefined) {
    payload.crisis_feedback_points_max_value = crisis_feedback_points_max_value;
  }
  if (crisis_feedback_daily_submission_cap !== undefined) {
    payload.crisis_feedback_daily_submission_cap = crisis_feedback_daily_submission_cap;
  }
  if (incident_report_points_enabled !== undefined) {
    payload.incident_report_points_enabled = incident_report_points_enabled;
  }
  if (incident_report_points_value !== undefined) {
    payload.incident_report_points_value = incident_report_points_value;
  }
  if (tourist_guide_completion_points_enabled !== undefined) {
    payload.tourist_guide_completion_points_enabled = tourist_guide_completion_points_enabled;
  }
  if (tourist_guide_assistance_enabled !== undefined) {
    payload.tourist_guide_assistance_enabled = tourist_guide_assistance_enabled;
  }
  if (tourist_guide_assistance_intro !== undefined) {
    payload.tourist_guide_assistance_intro = tourist_guide_assistance_intro?.trim() || null;
  }
  if (tourist_guide_assistance_availability !== undefined) {
    payload.tourist_guide_assistance_availability = tourist_guide_assistance_availability?.trim() || null;
  }

  const row = { id: SETTINGS_ID, ...payload };
  const { error } = await client
    .from("system_settings")
    .upsert(row, { onConflict: "id" });
  if (error) {
    const missingColumn = /public_visibility/i.test(error.message || "");
    if (missingColumn && public_visibility) {
      throw new Error("Public visibility is not in the database yet. Run migration 022_public_visibility.sql, then save again.");
    }
    throw error;
  }

  const settings = await getSystemSettings(client);
  if (
    Date.parse(settings.updated_at) !== Date.parse(updatedAt) ||
    settings.updated_by !== (updatedBy || null)
  ) {
    throw new Error("Settings update could not be verified. Reload the page and try again.");
  }
  return settings;
}
