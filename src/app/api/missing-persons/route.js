import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { isMissingPersonCategory, validateMissingPerson } from "@/lib/missingPersons";
import {
  CASE_COLUMNS,
  isMissingCasesNotSetUp,
  loadCallerProfile,
  loadGuideIdsForTourist,
  notifyNewMissingCase,
} from "@/lib/missingPersons.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET ?mine=1 — open cases where the signed-in person is the one reported missing.
 * GET (administrators) — open cases first, then the last 30 days, with contacts and photos.
 */
export async function GET(request) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  if (request.nextUrl.searchParams.get("mine") === "1") {
    const { data, error } = await admin
      .from("missing_person_cases")
      .select("incident_id, last_seen_location, created_at, reporter:profiles!missing_person_cases_reported_by_fkey(full_name)")
      .eq("tagged_user_id", auth.user.id)
      .eq("search_status", "searching")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ cases: [], available: !isMissingCasesNotSetUp(error) });
    return NextResponse.json({
      available: true,
      cases: (data || []).map((c) => ({
        incidentId: c.incident_id,
        lastSeenLocation: c.last_seen_location,
        reportedAt: c.created_at,
        reportedBy: c.reporter?.full_name || null,
      })),
    });
  }

  const caller = await loadCallerProfile(admin, auth.user.id);
  if (caller?.user_type !== "admin" || !caller.is_active) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("missing_person_cases")
    .select(`*,
      reporter:profiles!missing_person_cases_reported_by_fkey(full_name, phone, user_type),
      tagged:profiles!missing_person_cases_tagged_user_id_fkey(full_name, phone),
      incident:incident_reports(reference_number, attachments:incident_attachments(file_url, file_type))`)
    .or(`search_status.eq.searching,created_at.gte.${since}`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json(
      { available: !isMissingCasesNotSetUp(error), cases: [], error: isMissingCasesNotSetUp(error) ? null : "Could not load cases." },
      { status: isMissingCasesNotSetUp(error) ? 200 : 500 }
    );
  }

  const cases = await Promise.all(
    (data || []).map(async (c) => {
      const guideIds = await loadGuideIdsForTourist(admin, c.tagged_user_id);
      let guides = [];
      if (guideIds.length) {
        const { data: g } = await admin.from("profiles").select("full_name, phone").in("id", guideIds);
        guides = (g || []).map((p) => ({ name: p.full_name, phone: p.phone }));
      }
      const photo = (c.incident?.attachments || []).find((a) => String(a.file_type || "").startsWith("image/"));
      return {
        ...c,
        reference: c.incident?.reference_number || null,
        photoUrl: photo?.file_url || null,
        guides,
        incident: undefined,
      };
    })
  );
  // Open cases first.
  cases.sort((a, b) => (a.search_status === "searching" ? 0 : 1) - (b.search_status === "searching" ? 0 : 1));
  return NextResponse.json({ available: true, cases });
}

/** Add the missing-person details to a "Missing Person" report the caller just filed. */
export async function POST(request) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimitByKey(auth.user.id, { name: "missing-report", limit: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!UUID.test(body?.incidentId || "")) return NextResponse.json({ error: "A valid report is required." }, { status: 400 });
  const check = validateMissingPerson(body);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const value = check.value;
  if (value.taggedUserId && !UUID.test(value.taggedUserId)) {
    return NextResponse.json({ error: "Invalid tagged person." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const { data: incident } = await admin
    .from("incident_reports")
    .select("id, reporter_id, category")
    .eq("id", body.incidentId)
    .maybeSingle();
  if (!incident || incident.reporter_id !== auth.user.id) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }
  if (!isMissingPersonCategory(incident.category)) {
    return NextResponse.json({ error: "This report is not a missing-person report." }, { status: 400 });
  }

  let taggedPerson = null;
  if (value.taggedUserId) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, phone, user_type, is_active")
      .eq("id", value.taggedUserId)
      .maybeSingle();
    if (!data || data.user_type !== "tourist" || !data.is_active) {
      return NextResponse.json({ error: "Only registered tourists can be tagged." }, { status: 400 });
    }
    taggedPerson = data;
  }

  const { data: caseRow, error } = await admin
    .from("missing_person_cases")
    .insert({
      incident_id: incident.id,
      reported_by: auth.user.id,
      tagged_user_id: taggedPerson?.id || null,
      person_name: taggedPerson?.full_name || value.personName,
      person_description: value.personDescription,
      last_seen_location: value.lastSeenLocation,
      last_seen_latitude: value.latitude,
      last_seen_longitude: value.longitude,
      last_seen_at: value.lastSeenAt,
    })
    .select(CASE_COLUMNS)
    .single();
  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json(
      {
        error: isMissingCasesNotSetUp(error)
          ? "Missing-person details are not set up yet. Your report was still sent."
          : conflict
            ? "Details were already added to this report."
            : "Could not save the missing-person details. Your report was still sent.",
      },
      { status: isMissingCasesNotSetUp(error) ? 503 : conflict ? 409 : 500 }
    );
  }

  // The report itself follows the search.
  await admin.from("incident_reports").update({ severity: "Critical" }).eq("id", incident.id);

  const reporter = await loadCallerProfile(admin, auth.user.id);
  const warnings = await notifyNewMissingCase(admin, { caseRow, reporter, taggedPerson });
  if (warnings.length) console.error("[MissingPersons] Some notices failed:", warnings);
  return NextResponse.json({ success: true, case: caseRow, notificationWarnings: warnings.length ? ["Some staff notices could not be sent."] : [] });
}
