import { NextResponse } from "next/server";
import { severityToPriority } from "@/lib/constants";
import { API_RATE_LIMITS, enforceSharedRateLimit, enforceSharedRateLimitByKey } from "@/lib/apiRateLimit";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validateGuestIncidentReport } from "@/lib/guestIncidentReport";

/**
 * Incident report from a walk-in tourist with no account.
 * Saved by the server (service role) after validation, spam checks and rate limits;
 * administrators are notified the same way as for account reports.
 */
export async function POST(request) {
  const limited = await enforceSharedRateLimit(request, { name: "guest-incident", ...API_RATE_LIMITS.guestIncident });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const check = validateGuestIncidentReport(body);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.spam ? 422 : 400 });
  }
  const report = check.value;

  const contactLimited = await enforceSharedRateLimitByKey(report.phone || report.email, {
    name: "guest-incident-contact",
    ...API_RATE_LIMITS.guestIncidentContact,
  });
  if (contactLimited) return contactLimited;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Reporting is temporarily unavailable. Please call the hotlines." }, { status: 503 });
  }

  try {
    const { data: generatedRef } = await admin.rpc("generate_incident_reference");
    const referenceNumber = generatedRef || `INC-${Date.now()}`;

    const insertPayload = {
      reference_number: referenceNumber,
      reporter_id: null,
      is_guest: true,
      guest_name: report.name,
      guest_phone: report.phone,
      guest_email: report.email,
      category: report.category,
      description: report.description,
      location: report.location,
      severity: report.severity,
      status: "Submitted",
    };
    if (report.latitude != null && report.longitude != null) {
      insertPayload.latitude = report.latitude;
      insertPayload.longitude = report.longitude;
    }

    const { data: incident, error: insertError } = await admin
      .from("incident_reports")
      .insert(insertPayload)
      .select("id, reference_number, category, location, severity, status")
      .single();

    if (insertError) {
      const notMigrated = insertError.code === "42703" || insertError.code === "PGRST204" || insertError.code === "23502";
      console.error("[GuestIncident] Insert failed:", insertError.message);
      return NextResponse.json(
        {
          error: notMigrated
            ? "Guest reporting is not set up yet. Please call the hotlines or sign in to report."
            : "We could not save your report. Please try again or call the hotlines.",
        },
        { status: notMigrated ? 503 : 500 }
      );
    }

    await admin.from("incident_history").insert({
      incident_id: incident.id,
      changed_by: null,
      action: "created",
      new_status: "Submitted",
      notes: `Report submitted by guest ${report.name}`,
    });

    // Notify administrators; a failed notice does not lose the saved report.
    const warnings = [];
    const { data: admins } = await admin.from("profiles").select("id").eq("user_type", "admin");
    const priority = severityToPriority(incident.severity);
    const channels = priority === "CRITICAL" || priority === "HIGH" ? ["web", "email", "sms"] : ["web", "email"];
    const contact = [report.phone, report.email].filter(Boolean).join(" / ");
    const results = await Promise.all(
      (admins || []).map((recipient) =>
        dispatchNotificationServer({
          userId: recipient.id,
          title: `${incident.severity} Guest Incident Report: ${incident.reference_number}`,
          message: `New ${incident.category} report at ${incident.location} from guest ${report.name} (${contact}). No account — contact them directly for follow-up.`,
          notificationType: "incident_submitted",
          priority,
          relatedType: "incident",
          relatedId: incident.id,
          eventKey: `incident-submitted:${incident.id}:admin:${recipient.id}`,
          channels,
        }).catch((err) => ({ errors: [err.message] }))
      )
    );
    results.forEach((r) => {
      if (r?.errors?.length) warnings.push(...r.errors);
    });
    if (!admins?.length) warnings.push("No administrator accounts were found to notify.");
    if (warnings.length) console.error("[GuestIncident] Notification issues:", { incidentId: incident.id, warnings });

    return NextResponse.json({ success: true, referenceNumber: incident.reference_number });
  } catch (err) {
    console.error("[GuestIncident]", err);
    return NextResponse.json({ error: "We could not save your report. Please try again or call the hotlines." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
