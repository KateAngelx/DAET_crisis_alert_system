import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { listOwnIncidents } from "@/lib/ownIncidentAccess.server";

export async function GET(request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    if (!auth.ok) return auth.response;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "my-incident-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
    }

    const incidents = await listOwnIncidents(admin, auth.user.id);
    return NextResponse.json(
      { success: true, incidents },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load your reports." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}