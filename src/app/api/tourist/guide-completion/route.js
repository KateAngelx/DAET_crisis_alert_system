import { NextResponse } from "next/server";
import { requireTourist } from "@/lib/touristAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { getSystemSettings } from "@/lib/systemSettings.server";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  const auth = await requireTourist(request);
  if (auth.error) return auth.error;

  const limited = enforceRateLimitByKey(auth.user.id, {
    name: "tourist-guide-completion-read",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const [completionResult, balanceResult, transactionResult, settings] = await Promise.all([
    auth.admin
      .from("tourist_guide_completions")
      .select("completed_at")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    auth.admin
      .from("tourist_points")
      .select("points_balance")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    auth.admin
      .from("point_transactions")
      .select("points_delta, created_at")
      .eq("user_id", auth.user.id)
      .eq("transaction_type", "earned")
      .eq("reason", "tourist_guide_completion")
      .maybeSingle(),
    getSystemSettings(auth.admin),
  ]);

  const queryError = completionResult.error || balanceResult.error || transactionResult.error;
  if (queryError) {
    return NextResponse.json({ error: "Unable to load guide completion status." }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({
    completed: Boolean(completionResult.data || transactionResult.data),
    completedAt: completionResult.data?.completed_at || transactionResult.data?.created_at || null,
    rewardEnabled: settings.rewards_enabled === true
      && settings.tourist_guide_completion_points_enabled === true,
    rewardAwarded: Boolean(transactionResult.data),
    pointsAwarded: transactionResult.data?.points_delta ?? 0,
    balance: balanceResult.data?.points_balance ?? 0,
  }, { headers: NO_STORE });
}

export async function POST(request) {
  const auth = await requireTourist(request);
  if (auth.error) return auth.error;

  const limited = enforceRateLimitByKey(auth.user.id, {
    name: "tourist-guide-completion-submit",
    limit: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { data, error } = await auth.admin.rpc("complete_tourist_guide", {
    p_user_id: auth.user.id,
  });
  if (error) {
    return NextResponse.json(
      { error: error.message || "Unable to complete the guide." },
      { status: 500, headers: NO_STORE }
    );
  }

  return NextResponse.json({
    success: true,
    completed: true,
    status: data?.status || "completed",
    completedAt: data?.completedAt || null,
    rewardAwarded: data?.rewardAwarded === true,
    pointsAwarded: data?.pointsAwarded ?? 0,
    balance: data?.balance ?? 0,
  }, { headers: NO_STORE });
}