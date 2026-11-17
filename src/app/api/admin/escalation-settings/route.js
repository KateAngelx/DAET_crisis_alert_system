import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { validateEscalationSettings } from "@/lib/escalation";
import { getEscalationSettings, isEscalationNotSetUp, saveEscalationSettings } from "@/lib/escalation.server";

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { settings, error } = await getEscalationSettings(auth.admin);
  if (error) {
    return NextResponse.json({ available: !isEscalationNotSetUp(error), error: "Could not load escalation settings." }, { status: isEscalationNotSetUp(error) ? 200 : 500 });
  }
  return NextResponse.json({ available: true, settings });
}

export async function PUT(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const check = validateEscalationSettings(await request.json().catch(() => null));
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  const { error } = await saveEscalationSettings(auth.admin, check.value, auth.user.id);
  if (error) {
    return NextResponse.json(
      { error: isEscalationNotSetUp(error) ? "Escalation is not set up yet (apply migration 055)." : "Could not save." },
      { status: isEscalationNotSetUp(error) ? 503 : 500 }
    );
  }
  return NextResponse.json({ success: true, settings: check.value });
}
