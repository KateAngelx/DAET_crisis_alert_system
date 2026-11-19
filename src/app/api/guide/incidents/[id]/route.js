import { NextResponse } from "next/server";
import { requireGuide } from "@/lib/guideAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { canAccessOwnIncident } from "@/lib/ownIncidentAccess.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request, { params }) {
  try {
    const auth = await requireGuide(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "guide-incident-detail",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await params;
    if (!UUID.test(id || "")) {
      return NextResponse.json({ error: "Invalid report." }, { status: 400 });
    }

    const { data: incident, error } = await auth.admin
      .from("incident_reports")
      .select(`
        *,
        reporter:profiles!incident_reports_reporter_id_fkey(id, full_name, phone, email, nationality),
        assignee:profiles!incident_reports_assigned_to_fkey(id, full_name, phone),
        attachments:incident_attachments(*)
      `)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!incident) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const allowed = canAccessOwnIncident(auth.user.id, incident);
    if (!allowed) {
      return NextResponse.json({ error: "You do not have access to this report." }, { status: 403 });
    }

    const { data: history, error: historyError } = await auth.admin
      .from("incident_history")
      .select("*, changer:profiles!incident_history_changed_by_fkey(full_name)")
      .eq("incident_id", id)
      .order("created_at", { ascending: false });
    if (historyError) throw historyError;

    return NextResponse.json(
      { success: true, incident, history: history || [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load this report." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}