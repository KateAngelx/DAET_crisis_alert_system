import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function requireCronSecret(request) {
  const secret = process.env.CRON_SECRET || process.env.NOTIFICATION_INTERNAL_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 }),
    };
  }
  const header = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (header !== secret) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true };
}

/** Deactivate route advisories and area hazards past warning_ends_at */
export async function POST(request) {
  const gate = requireCronSecret(request);
  if (!gate.ok) return gate.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const now = new Date().toISOString();

  const { data: expiredRoutes, error: routeError } = await admin
    .from("route_advisories")
    .update({ status: "Inactive" })
    .eq("status", "Active")
    .not("warning_ends_at", "is", null)
    .lt("warning_ends_at", now)
    .select("id");

  if (routeError) {
    return NextResponse.json({ error: routeError.message }, { status: 500 });
  }

  const { data: expiredLegacy, error: legacyError } = await admin
    .from("dangerous_location_warnings")
    .update({ status: "Inactive" })
    .eq("status", "Active")
    .not("warning_ends_at", "is", null)
    .lt("warning_ends_at", now)
    .select("id");

  if (legacyError) {
    return NextResponse.json({ error: legacyError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    expiredRouteAdvisories: expiredRoutes?.length || 0,
    expiredLegacyWarnings: expiredLegacy?.length || 0,
  });
}

export async function GET(request) {
  return POST(request);
}
