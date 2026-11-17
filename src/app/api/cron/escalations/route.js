import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireCronSecret } from "@/lib/cronAuth.server";
import { runEscalations } from "@/lib/escalation.server";

/** Every 5 minutes: re-alert admins (after N, then 2N minutes) about urgent items nobody has acted on. */
export async function POST(request) {
  const gate = requireCronSecret(request);
  if (!gate.ok) return gate.response;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const result = await runEscalations(admin);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.notSetUp ? "Escalation is not set up yet (apply migration 055)." : result.error },
      { status: result.notSetUp ? 200 : 500 }
    );
  }
  return NextResponse.json(result, { status: result.errors?.length ? 207 : 200 });
}

export async function GET(request) {
  return POST(request);
}
