import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { INCIDENT_STATUS_FOR_MISSING, MISSING_STATUSES } from "@/lib/missingPersons";
import { CASE_COLUMNS, loadGuideIdsForTourist, notifyMissingStatus } from "@/lib/missingPersons.server";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Administrators update the search: Searching, Found safe, Found injured or Closed. */
export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!UUID.test(id || "")) return NextResponse.json({ error: "Invalid case." }, { status: 400 });

  const body = await request.json().catch(() => null);

  // "Acknowledge": the office has seen the report and is responding. Stops escalation.
  if (body?.acknowledge === true) {
    const now = new Date().toISOString();
    const { data: acked, error: ackError } = await auth.admin
      .from("missing_person_cases")
      .update({ acknowledged_at: now, acknowledged_by: auth.user.id, updated_at: now })
      .eq("incident_id", id)
      .is("acknowledged_at", null)
      .select(CASE_COLUMNS)
      .maybeSingle();
    if (ackError) {
      const notSetUp = ["42703", "PGRST204"].includes(ackError.code);
      return NextResponse.json({ error: notSetUp ? "Apply migration 055 to use Acknowledge." : "Could not acknowledge." }, { status: notSetUp ? 503 : 500 });
    }
    if (!acked) return NextResponse.json({ success: true, alreadyAcknowledged: true });
    await auth.admin.from("incident_reports").update({ status: "Responding" }).eq("id", id).eq("status", "Submitted");
    const guideIds = await loadGuideIdsForTourist(auth.admin, acked.tagged_user_id);
    const notify = [...new Set([acked.reported_by, ...guideIds])].filter((uid) => uid && uid !== auth.user.id);
    await Promise.all(
      notify.map((userId) =>
        dispatchNotificationServer({
          userId,
          title: `The Tourism Office is responding: ${acked.person_name}`,
          message: `The Daet Tourism Office has seen the missing-person report for ${acked.person_name} and is responding. Use the report's Messages to share any updates.`,
          notificationType: "missing_person_acknowledged",
          priority: "HIGH",
          relatedType: "missing_person",
          relatedId: id,
          eventKey: `missing:${id}:acknowledged:${userId}`,
          channels: ["web"],
        }).catch(() => null)
      )
    );
    return NextResponse.json({ success: true });
  }

  const status = String(body?.status || "");
  if (!MISSING_STATUSES.includes(status)) return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  const note = String(body?.note ?? "").replace(/\s+/g, " ").trim().slice(0, 500) || null;

  const { data: caseRow, error } = await auth.admin
    .from("missing_person_cases")
    .update({
      search_status: status,
      status_note: note,
      status_updated_at: new Date().toISOString(),
      status_updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("incident_id", id)
    .select(CASE_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update the case." }, { status: 500 });
  if (!caseRow) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  await auth.admin
    .from("incident_reports")
    .update({ status: INCIDENT_STATUS_FOR_MISSING[status], ...(note ? { admin_notes: note } : {}) })
    .eq("id", id);

  // Changing the status also counts as acting on the report (stops escalation). Ignored before migration 055.
  await auth.admin.from("missing_person_cases").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: auth.user.id }).eq("incident_id", id).is("acknowledged_at", null);

  const warnings = await notifyMissingStatus(auth.admin, { caseRow, status, note, changedBy: auth.user.id });
  if (warnings.length) console.error("[MissingPersons] Some status notices failed:", warnings);
  return NextResponse.json({ success: true, case: caseRow });
}
