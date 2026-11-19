import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { validateVisitDates } from "@/lib/alertTargeting";

/** Save (or clear) the dates a tourist is visiting Daet, used to target alerts. */
export async function PATCH(request) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const start = body.visit_start_date || null;
  const end = body.visit_end_date || null;

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Profile updates are temporarily unavailable." }, { status: 503 });

  const { data: existing, error: loadError } = await admin
    .from("profiles")
    .select("visit_start_date, visit_end_date")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (loadError) {
    const notMigrated = loadError.code === "42703" || loadError.code === "PGRST204";
    return NextResponse.json(
      { error: notMigrated ? "Visit dates are not set up yet." : "Could not load your profile." },
      { status: notMigrated ? 503 : 500 }
    );
  }

  const problem = validateVisitDates(start, end, {
    originalStart: existing?.visit_start_date || null,
    originalEnd: existing?.visit_end_date || null,
  });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const { data, error } = await admin
    .from("profiles")
    .update({ visit_start_date: start, visit_end_date: end })
    .eq("id", auth.user.id)
    .select("visit_start_date, visit_end_date")
    .single();

  if (error) {
    const notMigrated = error.code === "42703" || error.code === "PGRST204";
    return NextResponse.json(
      { error: notMigrated ? "Visit dates are not set up yet." : "Could not save your visit dates." },
      { status: notMigrated ? 503 : 500 }
    );
  }
  return NextResponse.json({ success: true, ...data });
}
