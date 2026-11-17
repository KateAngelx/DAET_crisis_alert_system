import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import {
  buildAlertDeliveryReport,
  loadAlertForReport,
  resendAlertToNonResponders,
} from "@/lib/alertDeliveryReport.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadAlert(auth, params) {
  const { id } = await params;
  if (!UUID.test(id || "")) return { response: NextResponse.json({ error: "Invalid alert." }, { status: 400 }) };
  const { data: alert, error } = await loadAlertForReport(auth.admin, id);
  if (error || !alert) return { response: NextResponse.json({ error: "Alert not found." }, { status: 404 }) };
  return { alert };
}

/** Who this alert reached: opened, SMS/email status, replies, and who has no confirmed contact. */
export async function GET(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { alert, response } = await loadAlert(auth, params);
  if (response) return response;
  const report = await buildAlertDeliveryReport(auth.admin, alert);
  return NextResponse.json({ alert: { id: alert.id, status: alert.status, checkin_requested: alert.checkin_requested }, ...report });
}

/** Text a reminder to tourists who have not opened (or answered) the alert. */
export async function POST(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const limited = enforceRateLimitByKey(auth.user.id, { name: "alert-resend", limit: 10, windowMs: 60 * 60_000 });
  if (limited) return limited;
  const { alert, response } = await loadAlert(auth, params);
  if (response) return response;
  if (alert.status !== "Active") {
    return NextResponse.json({ error: "Reminders can only be sent for active alerts." }, { status: 409 });
  }
  const result = await resendAlertToNonResponders(auth.admin, alert);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 });
  return NextResponse.json(result);
}
