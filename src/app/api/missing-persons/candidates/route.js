import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { loadCallerProfile, loadGroupTourists } from "@/lib/missingPersons.server";

/**
 * People a reporter can tag as missing. Names only — never phone numbers or locations.
 * Guides: tourists in their active groups. Tourists: their group-mates, plus registered tourists
 * found by name (3+ letters). Administrators: any registered tourist by name.
 */
export async function GET(request) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimitByKey(auth.user.id, { name: "missing-candidates", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  const caller = await loadCallerProfile(admin, auth.user.id);
  if (!caller?.is_active) return NextResponse.json({ error: "Account not active." }, { status: 403 });

  const query = String(request.nextUrl.searchParams.get("q") || "").replace(/[%_,()]/g, " ").trim().slice(0, 60);
  const role = caller.user_type;

  const group = role === "admin" ? [] : await loadGroupTourists(admin, caller.id, role);
  const lower = query.toLowerCase();
  const fromGroup = group.filter((p) => !lower || p.name.toLowerCase().includes(lower)).map((p) => ({ ...p, inYourGroup: true }));

  let found = [];
  const minLength = role === "admin" ? 2 : 3;
  if (role !== "guide" && query.length >= minLength) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("user_type", "tourist")
      .eq("is_active", true)
      .ilike("full_name", `%${query}%`)
      .neq("id", caller.id)
      .order("full_name")
      .limit(8);
    const groupIds = new Set(fromGroup.map((p) => p.id));
    found = (data || []).filter((p) => !groupIds.has(p.id)).map((p) => ({ id: p.id, name: p.full_name || "Tourist", group: null, inYourGroup: false }));
  }

  return NextResponse.json({ people: [...fromGroup, ...found].slice(0, 20) });
}
