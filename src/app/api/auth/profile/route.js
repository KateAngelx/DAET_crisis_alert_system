import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { normalizePhilippinePhone } from "@/lib/phoneUtils";

const NATIONALITIES = new Set(["Filipino", "Foreigner"]);

export async function PATCH(request) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }
  if (Object.keys(body).some((field) => !["full_name", "phone", "nationality"].includes(field))) {
    return NextResponse.json({ error: "The request contains unsupported fields." }, { status: 400 });
  }

  const phone = normalizePhilippinePhone(body.phone);
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid Philippine mobile number (09XXXXXXXXX)." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Profile updates are temporarily unavailable." }, { status: 503 });
  }

  const { data: existing, error: profileError } = await admin
    .from("profiles")
    .select("user_type")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[Profile] Could not verify profile role:", profileError.message);
    return NextResponse.json({ error: "Could not verify your profile." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (existing.user_type === "tourist") {
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const nationality = body.nationality;
    if (!fullName || fullName.length > 100) {
      return NextResponse.json({ error: "Enter your name (up to 100 characters)." }, { status: 400 });
    }
    if (!NATIONALITIES.has(nationality)) {
      return NextResponse.json({ error: "Select a valid nationality." }, { status: 400 });
    }

    const { data, error } = await admin.rpc("update_tourist_profile_with_completion_award", {
      p_user_id: auth.user.id,
      p_full_name: fullName,
      p_phone: phone,
      p_nationality: nationality,
    });

    if (error) {
      console.error("[Profile] Tourist profile update failed:", error.message);
      return NextResponse.json({ error: "Could not update your profile." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: data.profile,
      profileCompletionReward: data.profileCompletionReward || null,
    });
  }

  const { data, error } = await admin
    .from("profiles")
    .update({ full_name: body.full_name, phone, nationality: body.nationality })
    .eq("id", auth.user.id)
    .select()
    .single();

  if (error) {
    console.error("[Profile] Profile update failed:", error.message);
    return NextResponse.json({ error: "Could not update your profile." }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data, profileCompletionReward: null });
}
