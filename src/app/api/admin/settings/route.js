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

  if (!body.notification_audience) {
    return NextResponse.json({ error: "notification_audience is required" }, { status: 400 });
  }

  try {
    const settings = await updateSystemSettings(auth.admin, {
      notification_audience: body.notification_audience,
      updatedBy: auth.user.id,
    });
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to save settings" }, { status: 500 });
  }
}
