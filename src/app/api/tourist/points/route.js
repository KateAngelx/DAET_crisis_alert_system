import { NextResponse } from "next/server";
import { requireTourist } from "@/lib/touristAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

async function loadRows(admin, table, columns, ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { data, error } = await admin.from(table).select(columns).in("id", uniqueIds);
  if (error) throw error;
  return data || [];
}

function indexById(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

export async function GET(request) {
  const auth = await requireTourist(request);
  if (auth.error) return auth.error;

  const limited = enforceRateLimitByKey(auth.user.id, {
    name: "tourist-points-history",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || DEFAULT_PAGE_SIZE);
  if (!Number.isInteger(page) || page < 1 || page > 10000) {
    return NextResponse.json({ error: "Invalid points history page." }, { status: 400 });
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return NextResponse.json({ error: "Invalid points history page size." }, { status: 400 });
  }

  try {
    const start = (page - 1) * pageSize;
    const [balanceResult, transactionResult] = await Promise.all([
      auth.admin
        .from("tourist_points")
        .select("points_balance")
        .eq("user_id", auth.user.id)
        .maybeSingle(),
      auth.admin
        .from("point_transactions")
        .select("id, transaction_type, points_delta, balance_after, reason, activity_completion_id, reward_redemption_id, crisis_alert_id, route_advisory_id, crisis_feedback_submission_id, incident_report_id, created_at", { count: "exact" })
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + pageSize - 1),
    ]);

    if (balanceResult.error) throw balanceResult.error;
    if (transactionResult.error) throw transactionResult.error;

    const transactions = transactionResult.data || [];
    const [activities, redemptions, feedback, incidents, alerts, advisories] = await Promise.all([
      loadRows(auth.admin, "activity_completions", "id, user_id, status, activity_id", transactions.map((item) => item.activity_completion_id)),
      loadRows(auth.admin, "reward_redemptions", "id, status, reward_name_snapshot", transactions.map((item) => item.reward_redemption_id)),
      loadRows(auth.admin, "crisis_feedback_submissions", "id, user_id, submission_type, status, reward_status", transactions.map((item) => item.crisis_feedback_submission_id)),
      loadRows(auth.admin, "incident_reports", "id, reporter_id, reference_number, category, status", transactions.map((item) => item.incident_report_id)),
      loadRows(auth.admin, "crisis_alerts", "id, title", transactions.map((item) => item.crisis_alert_id)),
      loadRows(auth.admin, "route_advisories", "id, title, hazard_type, advisory_kind", transactions.map((item) => item.route_advisory_id)),
    ]);
    const userActivities = activities.filter((activity) => activity.user_id === auth.user.id);
    const userFeedback = feedback.filter((submission) => submission.user_id === auth.user.id);
    const userIncidents = incidents.filter((incident) => incident.reporter_id === auth.user.id);
    const safetyActivities = await loadRows(
      auth.admin,
      "safety_activities",
      "id, title",
      userActivities.map((activity) => activity.activity_id)
    );

    const activitiesById = indexById(userActivities);
    const safetyActivitiesById = indexById(safetyActivities);
    const redemptionsById = indexById(redemptions);
    const feedbackById = indexById(userFeedback);
    const incidentsById = indexById(userIncidents);
    const alertsById = indexById(alerts);
    const advisoriesById = indexById(advisories);

    return NextResponse.json(
      {
        balance: balanceResult.data?.points_balance ?? 0,
        count: transactionResult.count || 0,
        transactions: transactions.map((transaction) => {
          const activity = activitiesById.get(transaction.activity_completion_id);
          return {
            ...transaction,
            activity: activity
              ? { ...activity, title: safetyActivitiesById.get(activity.activity_id)?.title || null }
              : null,
            redemption: redemptionsById.get(transaction.reward_redemption_id) || null,
            feedback: feedbackById.get(transaction.crisis_feedback_submission_id) || null,
            incident: incidentsById.get(transaction.incident_report_id) || null,
            alert: alertsById.get(transaction.crisis_alert_id) || null,
            advisory: advisoriesById.get(transaction.route_advisory_id) || null,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load points history." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}