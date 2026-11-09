import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSystemSettings } from "@/lib/systemSettings.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const incidentReportId = new URL(request.url).searchParams.get("incidentReportId");
  if (!incidentReportId || !UUID_PATTERN.test(incidentReportId)) {
    return NextResponse.json({ error: "A valid incident report ID is required." }, { status: 400 });
  }

  const { data: incident, error: incidentError } = await auth.admin
    .from("incident_reports")
    .select("id, reporter_id")
    .eq("id", incidentReportId)
    .maybeSingle();
  if (incidentError) {
    return NextResponse.json({ error: "Unable to load incident report." }, { status: 500 });
  }
  if (!incident) {
    return NextResponse.json({ error: "Incident report not found." }, { status: 404 });
  }

  const [decisionResult, reporterResult, settings] = await Promise.all([
    auth.admin
      .from("incident_report_reward_decisions")
      .select("incident_report_id, decision, decided_by, decided_at, awarded_by, awarded_at, awarded_points")
      .eq("incident_report_id", incidentReportId)
      .maybeSingle(),
    auth.admin
      .from("profiles")
      .select("id, user_type")
      .eq("id", incident.reporter_id)
      .maybeSingle(),
    getSystemSettings(auth.admin),
  ]);

  if (decisionResult.error) {
    const isMissingTable = decisionResult.error.code === "42P01"
      || /incident_report_reward_decisions/i.test(decisionResult.error.message || "");
    return NextResponse.json(
      {
        error: isMissingTable
          ? "Incident reporting points schema is not available. Apply migration 033 on Supabase."
          : decisionResult.error.message || "Unable to load incident points decision.",
      },
      { status: isMissingTable ? 503 : 500 }
    );
  }
  if (reporterResult.error) {
    return NextResponse.json(
      { error: reporterResult.error.message || "Unable to load incident reporter profile." },
      { status: 500 }
    );
  }

  const decision = decisionResult.data;
  const profileIds = [...new Set([decision?.decided_by, decision?.awarded_by].filter(Boolean))];
  const { data: profiles, error: profilesError } = profileIds.length
    ? await auth.admin.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [], error: null };
  if (profilesError) {
    return NextResponse.json({ error: "Unable to load points decision administrator details." }, { status: 500 });
  }

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const adminName = (id) => (id ? profileMap.get(id)?.full_name || id : null);
  return NextResponse.json({
    decision: {
      incidentReportId,
      decision: decision?.decision || "pending",
      decidedBy: decision?.decided_by || null,
      decidedByName: adminName(decision?.decided_by),
      decidedAt: decision?.decided_at || null,
      awardedBy: decision?.awarded_by || null,
      awardedByName: adminName(decision?.awarded_by),
      awardedAt: decision?.awarded_at || null,
      awardedPoints: decision?.awarded_points ?? null,
    },
    reporterEligible: reporterResult.data?.user_type === "tourist",
    rewardsEnabled: settings.rewards_enabled === true && settings.incident_report_points_enabled === true,
    configuredPoints: Number(settings.incident_report_points_value ?? 0),
  });
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof body.incidentReportId !== "string" ||
      !UUID_PATTERN.test(body.incidentReportId) ||
      !["approved", "declined"].includes(body.decision)) {
    return NextResponse.json({ error: "A valid incident report and points decision are required." }, { status: 400 });
  }

  const { data, error } = await auth.admin.rpc("decide_incident_report_points", {
    p_incident_report_id: body.incidentReportId,
    p_decision: body.decision,
    p_admin_id: auth.user.id,
  });
  if (error) {
    const message = error.code === "23505"
      ? "A points decision has already been recorded for this incident report."
      : error.code === "55000"
        ? "Rewards are disabled globally or for incident reports."
        : error.message || "Unable to record the incident points decision.";
    const status = error.code === "42501"
      ? 403
      : error.code === "P0002"
        ? 404
        : error.code === "42883"
          ? 503
          : error.code === "23505" || error.code === "55000"
            ? 409
            : 400;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ success: true, result: data });
}
