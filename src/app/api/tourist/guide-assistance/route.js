import { NextResponse } from "next/server";
import { requireTourist } from "@/lib/touristAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";

const ALLOWED_ASSISTANCE_TYPES = new Set([
  "Help finding a tourist guide",
  "Tourism information or directions",
  "Assistance at a tourist destination",
  "Other tourism-related assistance",
]);

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }
    const { data: settings, error } = await admin
      .from("system_settings")
      .select("tourist_guide_assistance_enabled, tourist_guide_assistance_intro, tourist_guide_assistance_availability")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json(
      {
        success: true,
        assistance: {
          enabled: settings?.tourist_guide_assistance_enabled === true,
          introductoryInformation: settings?.tourist_guide_assistance_intro || "",
          availabilityMessage: settings?.tourist_guide_assistance_availability || "",
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load tourist guide assistance settings." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireTourist(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "tourist-guide-assistance",
      ...API_RATE_LIMITS.guideAssistanceRequest,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    const assistanceType = typeof body?.assistanceType === "string" ? body.assistanceType.trim() : "";
    const location = typeof body?.location === "string" ? body.location.trim() : "";
    const details = body?.details == null
      ? ""
      : typeof body.details === "string"
        ? body.details.trim()
        : null;
    const touristCount = body?.touristCount;
    const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";
    const preferredAt = body?.preferredAt === undefined || body?.preferredAt === null || body.preferredAt === ""
      ? null
      : body.preferredAt;

    if (!ALLOWED_ASSISTANCE_TYPES.has(assistanceType)) {
      return NextResponse.json({ error: "Choose a valid type of assistance." }, { status: 400 });
    }
    if (!location || location.length > 500) {
      return NextResponse.json({ error: "Provide a location or destination (up to 500 characters)." }, { status: 400 });
    }
    if (details === null || details.length > 5000) {
      return NextResponse.json({ error: "Additional details must be 5,000 characters or fewer." }, { status: 400 });
    }
    if (!Number.isInteger(touristCount) || touristCount < 1 || touristCount > 100) {
      return NextResponse.json({ error: "Number of tourists must be between 1 and 100." }, { status: 400 });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return NextResponse.json({ error: "Please retry submitting the request." }, { status: 400 });
    }
    let preferredDate = null;
    if (preferredAt !== null) {
      if (typeof preferredAt !== "string" || Number.isNaN(Date.parse(preferredAt))) {
        return NextResponse.json({ error: "Enter a valid preferred date and time." }, { status: 400 });
      }
      preferredDate = new Date(preferredAt).toISOString();
    }

    const { data: settings, error: settingsError } = await auth.admin
      .from("system_settings")
      .select("tourist_guide_assistance_enabled")
      .eq("id", "default")
      .maybeSingle();
    if (settingsError) {
      return NextResponse.json(
        { error: "Unable to verify Tourist Guide Assistance availability." },
        { status: 503 }
      );
    }
    if (!settings?.tourist_guide_assistance_enabled) {
      return NextResponse.json(
        { error: "Tourist Guide Assistance requests are currently unavailable." },
        { status: 403 }
      );
    }

    const { data: assistanceRequest, error: insertError } = await auth.admin
      .from("tourist_guide_assistance_requests")
      .insert({
        tourist_id: auth.user.id,
        idempotency_key: idempotencyKey,
        assistance_type: assistanceType,
        location,
        preferred_at: preferredDate,
        tourist_count: touristCount,
        details: details || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingRequest, error: existingError } = await auth.admin
          .from("tourist_guide_assistance_requests")
          .select("*")
          .eq("tourist_id", auth.user.id)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existingRequest) {
          return NextResponse.json(
            { success: true, request: existingRequest },
            { status: 200, headers: { "Cache-Control": "no-store" } }
          );
        }
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, request: assistanceRequest },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to submit Tourist Guide Assistance request." },
      { status: 500 }
    );
  }
}
