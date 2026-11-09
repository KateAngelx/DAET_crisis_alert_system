import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSystemSettings } from "@/lib/systemSettings.server";
import { isProfileInAudience } from "@/lib/notificationAudience";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { sendWebPushToSubscriptions } from "@/lib/webPush.server";

const VALID_TYPES = new Set(["comment", "feedback", "suggestion"]);
const VALID_STATUSES = new Set(["pending", "approved", "rejected", "removed"]);
const VALID_ACTIONS = new Set(["approved", "rejected", "removed", "hidden", "unhidden", "award"]);

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const status = params.get("status");
  const page = Number.parseInt(params.get("page") || "1", 10);
  const pageSize = Number.parseInt(params.get("pageSize") || "25", 10);

  if (type && !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid submission type." }, { status: 400 });
  }
  if (status && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid submission status." }, { status: 400 });
  }
  if (!Number.isInteger(page) || page < 1 || page > 10000 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return NextResponse.json({ error: "Invalid pagination values." }, { status: 400 });
  }

  const start = (page - 1) * pageSize;
  let query = auth.admin
    .from("crisis_feedback_submissions")
    .select("*", { count: "exact" })
    .eq("submitter_category", "registered_tourist")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + pageSize - 1);
  if (type) query = query.eq("submission_type", type);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Crisis feedback is not available yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to load crisis feedback." }, { status: 500 });
  }

  const submissions = data || [];
  const userIds = [...new Set(
    submissions.flatMap((item) => [item.user_id, item.approved_by, item.awarded_by, item.moderated_by])
      .filter(Boolean)
  )];
  const alertIds = [...new Set(submissions.map((item) => item.crisis_alert_id).filter(Boolean))];
  const submissionIds = submissions.map((item) => item.id);
  const [profilesResult, alertsResult, eventsResult] = await Promise.all([
    userIds.length
      ? auth.admin.from("profiles").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    alertIds.length
      ? auth.admin.from("crisis_alerts").select("id, title, location").in("id", alertIds)
      : Promise.resolve({ data: [], error: null }),
    submissionIds.length
      ? auth.admin
          .from("crisis_feedback_moderation_events")
          .select("id, submission_id, actor_id, action, previous_status, new_status, note, points_awarded, created_at")
          .in("submission_id", submissionIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error || alertsResult.error || eventsResult.error) {
    return NextResponse.json({ error: "Unable to load feedback details." }, { status: 500 });
  }

  const profiles = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
  const alerts = new Map((alertsResult.data || []).map((alert) => [alert.id, alert]));
  const eventsBySubmission = new Map();
  for (const event of eventsResult.data || []) {
    const events = eventsBySubmission.get(event.submission_id) || [];
    events.push(event);
    eventsBySubmission.set(event.submission_id, events);
  }

  return NextResponse.json({
    items: submissions.map((item) => ({
      ...item,
      author: item.user_id ? profiles.get(item.user_id) || null : null,
      related_alert: item.crisis_alert_id ? alerts.get(item.crisis_alert_id) || null : null,
      moderation_events: eventsBySubmission.get(item.id) || [],
    })),
    total: count || 0,
    page,
    pageSize,
    rewardSettings: await getSystemSettings(auth.admin).then((settings) => ({
      enabled: settings.rewards_enabled && settings.crisis_feedback_points_enabled,
      minimum: settings.crisis_feedback_points_min_value,
      default: settings.crisis_feedback_points_value,
      maximum: settings.crisis_feedback_points_max_value,
      dailySubmissionCap: settings.crisis_feedback_daily_submission_cap,
    })),
    profiles: Object.fromEntries(profiles),
  });
}

export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
    return NextResponse.json({ error: "Invalid submission ID." }, { status: 400 });
  }
  if (!VALID_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: "Invalid moderation action." }, { status: 400 });
  }
  if (body.action === "award" &&
      (!Number.isSafeInteger(body.points) || body.points < 1 || body.points > 1000000)) {
    return NextResponse.json({ error: "Enter a whole point amount from 1 to 1,000,000." }, { status: 400 });
  }
  if (body.note !== undefined && body.note !== null &&
      (typeof body.note !== "string" || body.note.trim().length > 1000)) {
    return NextResponse.json({ error: "Moderation note must be 1000 characters or fewer." }, { status: 400 });
  }

  const isAward = body.action === "award";
  const { data, error } = isAward
    ? await auth.admin.rpc("award_crisis_feedback_points", {
        p_submission_id: body.id,
        p_admin_id: auth.user.id,
        p_points: body.points,
      })
    : await auth.admin.rpc("moderate_crisis_feedback_submission", {
        p_submission_id: body.id,
        p_action: body.action,
        p_admin_id: auth.user.id,
        p_note: typeof body.note === "string" ? body.note.trim() || null : null,
      });
  if (error) {
    if (error.code === "42883") {
      return NextResponse.json({ error: "Crisis feedback moderation is not available yet." }, { status: 503 });
    }
    const message = error.code === "P0001"
      ? "The daily reward cap has been reached for this tourist (Asia/Manila calendar day)."
      : error.code === "55000" && /disabled/i.test(error.message || "")
        ? "Rewards are disabled globally or for crisis feedback."
        : error.message || "Unable to update submission.";
    const status = error.code === "42501"
      ? 403
      : error.code === "55000" || error.code === "P0001" || error.code === "23505"
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }

  let notificationWarning = null;
  const { data: submission, error: submissionError } = await auth.admin
    .from("crisis_feedback_submissions")
    .select("id, user_id")
    .eq("id", body.id)
    .maybeSingle();
  if (submissionError) {
    notificationWarning = "Feedback was updated, but notification delivery could not be prepared.";
  } else if (submission?.user_id) {
    if (isAward) {
      const { data: recipient, error: recipientError } = await auth.admin
        .from("profiles")
        .select("id, user_type, notification_channels")
        .eq("id", submission.user_id)
        .maybeSingle();
      const settings = await getSystemSettings(auth.admin);
      if (recipientError) {
        notificationWarning = "Points were awarded, but notification preferences could not be checked.";
      } else if (recipient && isProfileInAudience(recipient, settings.notification_audience)) {
        const eventKey = `crisis-feedback-reward:${submission.id}`;
        let { data: notification, error: notificationError } = await auth.admin
          .from("notifications")
          .select("id, title, message, priority, related_type, related_id, event_key")
          .eq("user_id", submission.user_id)
          .eq("notification_type", "crisis_feedback_reward")
          .eq("related_type", "crisis_feedback")
          .eq("related_id", submission.id)
          .maybeSingle();

        if (notificationError) {
          notificationWarning = "Points were awarded, but the reward notification could not be loaded.";
        } else if (recipient.notification_channels?.push) {
          if (!notification) {
            const { data: inserted, error: insertError } = await auth.admin
              .from("notifications")
              .insert({
                user_id: submission.user_id,
                title: "Crisis Feedback Reward",
                message: `You earned ${data.awardedPoints} points for your approved crisis feedback.`,
                notification_type: "crisis_feedback_reward",
                priority: "NORMAL",
                related_type: "crisis_feedback",
                related_id: submission.id,
                event_key: eventKey,
              })
              .select("id, title, message, priority, related_type, related_id, event_key")
              .single();
            notification = inserted;
            if (insertError) notificationWarning = "Points were awarded, but the reward notification could not be saved.";
          } else if (!notification.event_key) {
            const { error: updateError } = await auth.admin
              .from("notifications")
              .update({ event_key: eventKey })
              .eq("id", notification.id);
            if (updateError) notificationWarning = "Points were awarded, but the reward notification could not be prepared for push.";
          }

          if (notification && !notificationWarning) {
            const pushResult = await sendWebPushToSubscriptions(
              auth.admin,
              submission.user_id,
              notification,
              { userType: recipient.user_type }
            );
            if (pushResult.errors.length) notificationWarning = pushResult.errors.join("; ");
          }
        }
      }
    } else {
      const { data: recipient, error: recipientError } = await auth.admin
        .from("profiles")
        .select("id, user_type")
        .eq("id", submission.user_id)
        .maybeSingle();
      const { data: event, error: eventError } = await auth.admin
        .from("crisis_feedback_moderation_events")
        .select("id, action")
        .eq("submission_id", submission.id)
        .eq("actor_id", auth.user.id)
        .eq("action", body.action)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recipientError || eventError) {
        notificationWarning = "Feedback was updated, but its moderation notification could not be prepared.";
      } else if (recipient && event) {
        const actionText = {
          approved: "approved",
          rejected: "rejected",
          removed: "removed",
          hidden: "hidden",
          unhidden: "restored",
        }[body.action] || "updated";
        const dispatch = await dispatchNotificationServer({
          userId: recipient.id,
          title: "Crisis feedback update",
          message: `Your crisis feedback submission was ${actionText} by the Tourism Office.`,
          notificationType: "crisis_feedback_moderation",
          priority: "NORMAL",
          relatedType: "crisis_feedback",
          relatedId: submission.id,
          eventKey: `crisis-feedback-moderation:${event.id}`,
          channels: ["web"],
        });
        if (dispatch.errors.length) notificationWarning = dispatch.errors.join("; ");
      }
    }
  }

  return NextResponse.json({ success: true, result: data, notificationWarning });
}
