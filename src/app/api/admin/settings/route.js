import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSystemSettings, updateSystemSettings } from "@/lib/systemSettings.server";

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const settings = await getSystemSettings(auth.admin);
  return NextResponse.json({ success: true, settings });
}

export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));

  const hasRewardsSettings =
    body.rewards_enabled !== undefined ||
    body.registration_points_enabled !== undefined ||
    body.registration_points_value !== undefined ||
    body.profile_completion_points_enabled !== undefined ||
    body.profile_completion_points_value !== undefined ||
    body.alert_reading_points_enabled !== undefined ||
    body.alert_reading_points_value !== undefined ||
    body.road_viewing_points_enabled !== undefined ||
    body.road_viewing_points_value !== undefined ||
    body.hazard_viewing_points_enabled !== undefined ||
    body.hazard_viewing_points_value !== undefined ||
    body.crisis_feedback_points_enabled !== undefined ||
    body.crisis_feedback_points_min_value !== undefined ||
    body.crisis_feedback_points_value !== undefined ||
    body.crisis_feedback_points_max_value !== undefined ||
    body.crisis_feedback_daily_submission_cap !== undefined ||
    body.incident_report_points_enabled !== undefined ||
    body.incident_report_points_value !== undefined ||
    body.tourist_guide_completion_points_enabled !== undefined ||
    body.tourist_guide_assistance_enabled !== undefined ||
    body.tourist_guide_assistance_intro !== undefined ||
    body.tourist_guide_assistance_availability !== undefined;

  if (!body.notification_audience && !body.public_visibility && !hasRewardsSettings) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (
    (body.rewards_enabled !== undefined && typeof body.rewards_enabled !== "boolean") ||
    (body.registration_points_enabled !== undefined &&
      typeof body.registration_points_enabled !== "boolean") ||
    (body.profile_completion_points_enabled !== undefined &&
      typeof body.profile_completion_points_enabled !== "boolean") ||
    (body.alert_reading_points_enabled !== undefined &&
      typeof body.alert_reading_points_enabled !== "boolean") ||
    (body.road_viewing_points_enabled !== undefined &&
      typeof body.road_viewing_points_enabled !== "boolean") ||
    (body.hazard_viewing_points_enabled !== undefined &&
      typeof body.hazard_viewing_points_enabled !== "boolean") ||
    (body.crisis_feedback_points_enabled !== undefined &&
      typeof body.crisis_feedback_points_enabled !== "boolean") ||
    (body.incident_report_points_enabled !== undefined &&
      typeof body.incident_report_points_enabled !== "boolean") ||
    (body.tourist_guide_completion_points_enabled !== undefined &&
      typeof body.tourist_guide_completion_points_enabled !== "boolean") ||
    (body.tourist_guide_assistance_enabled !== undefined &&
      typeof body.tourist_guide_assistance_enabled !== "boolean")
  ) {
    return NextResponse.json({ error: "Enablement settings must be boolean." }, { status: 400 });
  }

  for (const [field, label, maxLength] of [
    ["tourist_guide_assistance_intro", "Introductory information", 2000],
    ["tourist_guide_assistance_availability", "Service availability message", 500],
  ]) {
    if (
      body[field] !== undefined &&
      (typeof body[field] !== "string" || body[field].length > maxLength)
    ) {
      return NextResponse.json(
        { error: `${label} must be text no longer than ${maxLength} characters.` },
        { status: 400 }
      );
    }
  }

  if (
    body.registration_points_value !== undefined &&
    (!Number.isInteger(body.registration_points_value) ||
      body.registration_points_value < 0 ||
      body.registration_points_value > 1000000)
  ) {
    return NextResponse.json(
      { error: "Registration points must be a whole number from 0 to 1,000,000." },
      { status: 400 }
    );
  }

  if (
    body.profile_completion_points_value !== undefined &&
    (!Number.isInteger(body.profile_completion_points_value) ||
      body.profile_completion_points_value < 0 ||
      body.profile_completion_points_value > 1000000)
  ) {
    return NextResponse.json(
      { error: "Profile completion points must be a whole number from 0 to 1,000,000." },
      { status: 400 }
    );
  }

  if (
    body.alert_reading_points_value !== undefined &&
    (!Number.isInteger(body.alert_reading_points_value) ||
      body.alert_reading_points_value < 0 ||
      body.alert_reading_points_value > 1000000)
  ) {
    return NextResponse.json(
      { error: "Alert reading points must be a whole number from 0 to 1,000,000." },
      { status: 400 }
    );
  }

  for (const [field, label] of [
    ["road_viewing_points_value", "Road viewing points"],
    ["hazard_viewing_points_value", "Hazard viewing points"],
    ["crisis_feedback_points_min_value", "Crisis feedback minimum points"],
    ["crisis_feedback_points_value", "Crisis feedback points"],
    ["crisis_feedback_points_max_value", "Crisis feedback maximum points"],
    ["crisis_feedback_daily_submission_cap", "Crisis feedback daily submission cap"],
    ["incident_report_points_value", "Incident report points"],
  ]) {
    if (
      body[field] !== undefined &&
      (!Number.isInteger(body[field]) || body[field] < 0 || body[field] > 1000000)
    ) {
      return NextResponse.json(
        { error: `${label} must be a whole number from 0 to 1,000,000.` },
        { status: 400 }
      );
    }
  }

  const feedbackSettingFields = [
    "crisis_feedback_points_min_value",
    "crisis_feedback_points_value",
    "crisis_feedback_points_max_value",
    "crisis_feedback_daily_submission_cap",
  ];
  if (feedbackSettingFields.some((field) => body[field] !== undefined)) {
    let currentSettings;
    try {
      currentSettings = await getSystemSettings(auth.admin);
    } catch (err) {
      return NextResponse.json({ error: err.message || "Unable to validate reward settings." }, { status: 500 });
    }

    const minimum = body.crisis_feedback_points_min_value !== undefined
      ? body.crisis_feedback_points_min_value
      : currentSettings.crisis_feedback_points_min_value;
    const defaultPoints = body.crisis_feedback_points_value !== undefined
      ? body.crisis_feedback_points_value
      : currentSettings.crisis_feedback_points_value;
    const maximum = body.crisis_feedback_points_max_value !== undefined
      ? body.crisis_feedback_points_max_value
      : currentSettings.crisis_feedback_points_max_value;
    const dailyCap = body.crisis_feedback_daily_submission_cap !== undefined
      ? body.crisis_feedback_daily_submission_cap
      : currentSettings.crisis_feedback_daily_submission_cap;

    if (
      !Number.isSafeInteger(minimum) || minimum < 1 || minimum > 1000000 ||
      !Number.isSafeInteger(defaultPoints) || defaultPoints < 1 || defaultPoints > 1000000 ||
      !Number.isSafeInteger(maximum) || maximum < 1 || maximum > 1000000 ||
      !Number.isSafeInteger(dailyCap) || dailyCap < 1 || dailyCap > 1000000
    ) {
      return NextResponse.json(
        { error: "Crisis feedback point limits and daily cap must be whole numbers from 1 to 1,000,000." },
        { status: 400 }
      );
    }
    if (minimum > defaultPoints || defaultPoints > maximum || minimum > maximum) {
      return NextResponse.json(
        { error: "Crisis feedback settings must satisfy minimum ≤ default ≤ maximum." },
        { status: 400 }
      );
    }
  }

  if (
    body.incident_report_points_enabled !== undefined ||
    body.incident_report_points_value !== undefined
  ) {
    let currentSettings;
    try {
      currentSettings = await getSystemSettings(auth.admin);
    } catch (err) {
      return NextResponse.json({ error: err.message || "Unable to validate incident reward settings." }, { status: 500 });
    }

    const enabled = body.incident_report_points_enabled !== undefined
      ? body.incident_report_points_enabled
      : currentSettings.incident_report_points_enabled;
    const points = body.incident_report_points_value !== undefined
      ? body.incident_report_points_value
      : currentSettings.incident_report_points_value;

    if (
      enabled &&
      (!Number.isSafeInteger(points) || points < 1 || points > 1000000)
    ) {
      return NextResponse.json(
        { error: "Incident report points must be from 1 to 1,000,000 while incident reporting rewards are enabled." },
        { status: 400 }
      );
    }
  }

  try {
    const settings = await updateSystemSettings(auth.admin, {
      notification_audience: body.notification_audience,
      public_visibility: body.public_visibility,
      rewards_enabled: body.rewards_enabled,
      registration_points_enabled: body.registration_points_enabled,
      registration_points_value: body.registration_points_value,
      profile_completion_points_enabled: body.profile_completion_points_enabled,
      profile_completion_points_value: body.profile_completion_points_value,
      alert_reading_points_enabled: body.alert_reading_points_enabled,
      alert_reading_points_value: body.alert_reading_points_value,
      road_viewing_points_enabled: body.road_viewing_points_enabled,
      road_viewing_points_value: body.road_viewing_points_value,
      hazard_viewing_points_enabled: body.hazard_viewing_points_enabled,
      hazard_viewing_points_value: body.hazard_viewing_points_value,
      crisis_feedback_points_enabled: body.crisis_feedback_points_enabled,
      crisis_feedback_points_min_value: body.crisis_feedback_points_min_value,
      crisis_feedback_points_value: body.crisis_feedback_points_value,
      crisis_feedback_points_max_value: body.crisis_feedback_points_max_value,
      crisis_feedback_daily_submission_cap: body.crisis_feedback_daily_submission_cap,
      incident_report_points_enabled: body.incident_report_points_enabled,
      incident_report_points_value: body.incident_report_points_value,
      tourist_guide_completion_points_enabled: body.tourist_guide_completion_points_enabled,
      tourist_guide_assistance_enabled: body.tourist_guide_assistance_enabled,
      tourist_guide_assistance_intro: body.tourist_guide_assistance_intro,
      tourist_guide_assistance_availability: body.tourist_guide_assistance_availability,
      updatedBy: auth.user.id,
    });
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to save settings" }, { status: 500 });
  }
}
