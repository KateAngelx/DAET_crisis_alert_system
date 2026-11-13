import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { severityToPriority } from "@/lib/constants";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const limited = enforceRateLimitByKey(user.id, {
      name: "incident-submission-notification",
      ...API_RATE_LIMITS.dispatch,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    if (!UUID_PATTERN.test(body.incidentId || "")) {
      return NextResponse.json({ error: "A valid incident ID is required." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
    }

    const { data: incident, error: incidentError } = await admin
      .from("incident_reports")
      .select("id, reporter_id, reference_number, category, description, location, severity, status")
      .eq("id", body.incidentId)
      .maybeSingle();
    if (incidentError) throw incidentError;
    if (!incident) return NextResponse.json({ error: "Incident report not found." }, { status: 404 });
    if (incident.reporter_id !== user.id) {
      return NextResponse.json({ error: "You can only send notifications for your own report." }, { status: 403 });
    }

    const [{ data: admins, error: adminsError }, { data: reporter, error: reporterError }] = await Promise.all([
      admin.from("profiles").select("id").eq("user_type", "admin"),
      admin.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    ]);
    if (adminsError) throw adminsError;
    if (reporterError) throw reporterError;
    if (!reporter) return NextResponse.json({ error: "Report submitter profile not found." }, { status: 404 });

    const priority = severityToPriority(incident.severity);
    const channels = priority === "CRITICAL" || priority === "HIGH"
      ? ["web", "email", "sms"]
      : ["web", "email"];
    const notificationWarnings = [];

    if (!admins?.length) {
      notificationWarnings.push("No administrator accounts were found to notify.");
    } else {
      const adminResults = await Promise.all(
        admins.map((recipient) =>
          dispatchNotificationServer({
            userId: recipient.id,
            title: `${incident.severity} Incident Report: ${incident.reference_number}`,
            message: `New ${incident.category} report at ${incident.location}. Status: ${incident.status}. Immediate review required for ${incident.severity} severity reports.`,
            notificationType: "incident_submitted",
            priority,
            relatedType: "incident",
            relatedId: incident.id,
            eventKey: `incident-submitted:${incident.id}:admin:${recipient.id}`,
            channels,
          })
        )
      );
      adminResults.forEach((result, index) => {
        if (result.errors?.length) {
          notificationWarnings.push(`Administrator notification ${index + 1}: ${result.errors.join("; ")}`);
        }
      });
      const inAppNotificationCount = adminResults.filter((result) => result.web || result.duplicate).length;
      if (inAppNotificationCount < admins.length) {
        notificationWarnings.push(
          `In-app notifications were saved for ${inAppNotificationCount} of ${admins.length} administrators.`
        );
      }

      if (notificationWarnings.length) {
        console.error("[IncidentSubmissionNotifications] Administrator notification results:", {
          incidentId: incident.id,
          adminCount: admins.length,
          inAppNotificationCount,
          warnings: notificationWarnings,
        });
      }
    }

    const reporterResult = await dispatchNotificationServer({
      userId: user.id,
      title: "Incident Report Submitted",
      message: `Your report ${incident.reference_number} has been submitted successfully. We will review it shortly.`,
      notificationType: "incident_submitted",
      priority,
      relatedType: "incident",
      relatedId: incident.id,
      eventKey: `incident-submitted:${incident.id}:reporter`,
      channels: ["web"],
    });
    if (reporterResult.errors?.length) {
      notificationWarnings.push(`Reporter confirmation: ${reporterResult.errors.join("; ")}`);
    }

    if (notificationWarnings.length) {
      console.error("[IncidentSubmissionNotifications] Some notifications failed:", {
        incidentId: incident.id,
        warningCount: notificationWarnings.length,
      });
    }

    return NextResponse.json(
      {
        success: true,
        adminCount: admins?.length || 0,
        notificationWarnings,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[IncidentSubmissionNotifications] Failed:", error);
    return NextResponse.json(
      { error: "Unable to send incident report notifications." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
