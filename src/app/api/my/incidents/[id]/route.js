import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { loadOwnIncidentDetail } from "@/lib/ownIncidentAccess.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request, { params }) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    if (!auth.ok) return auth.response;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "my-incident-detail",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await params;
    if (!UUID.test(id || "")) {
      return NextResponse.json({ error: "Invalid report." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
    }

    const { incident, history, forbidden } = await loadOwnIncidentDetail(admin, auth.user.id, id);
    if (forbidden) {
      return NextResponse.json({ error: "You do not have access to this report." }, { status: 403 });
    }
    if (!incident) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, incident, history },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load this report." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}