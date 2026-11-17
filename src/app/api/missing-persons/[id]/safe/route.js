import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { INCIDENT_STATUS_FOR_MISSING } from "@/lib/missingPersons";
import { CASE_COLUMNS, notifyMissingStatus } from "@/lib/missingPersons.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOTE = "Confirmed safe by the tourist in the app.";

/** The person reported missing taps "I'm safe". */
export async function POST(request, { params }) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!UUID.test(id || "")) return NextResponse.json({ error: "Invalid case." }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const { data: caseRow, error } = await admin
    .from("missing_person_cases")
    .update({
      search_status: "found_safe",
      status_note: NOTE,
      status_updated_at: new Date().toISOString(),
      status_updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("incident_id", id)
    .eq("tagged_user_id", auth.user.id)
    .eq("search_status", "searching")
    .select(CASE_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update." }, { status: 500 });
  if (!caseRow) return NextResponse.json({ error: "No open missing report for you." }, { status: 404 });

  await admin
    .from("incident_reports")
    .update({ status: INCIDENT_STATUS_FOR_MISSING.found_safe, admin_notes: NOTE })
    .eq("id", id);

  const warnings = await notifyMissingStatus(admin, {
    caseRow,
    status: "found_safe",
    note: NOTE,
    changedBy: auth.user.id,
    includeAdmins: true,
  });
  if (warnings.length) console.error("[MissingPersons] Some safe notices failed:", warnings);
  return NextResponse.json({ success: true });
}
