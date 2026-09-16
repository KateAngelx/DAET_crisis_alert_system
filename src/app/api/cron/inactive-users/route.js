import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { INACTIVE_THRESHOLD_DAYS, isInactiveOverThreshold } from "@/lib/userActivity";
import { sendEmail } from "@/lib/emailService";

const INACTIVE_NOTICE_TITLE = "Account inactive — SMS paused";
const INACTIVE_NOTICE_BODY =
  "You have not signed in to CONNECT-DAET for over 30 days. SMS alerts are paused. Sign in again and re-enable SMS in your profile if you want to receive text messages. You can also delete your account from your profile page if you no longer need the service.";

function requireCronSecret(request) {
  const secret = process.env.CRON_SECRET || process.env.NOTIFICATION_INTERNAL_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 }),
    };
  }
  const header =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace("Bearer ", "");
  if (header !== secret) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true };
}

/** Suspend SMS for accounts inactive 30+ days; notify in-app and by email when configured */
export async function POST(request) {
  const gate = requireCronSecret(request);
  if (!gate.ok) return gate.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, full_name, notification_channels, last_login_at, last_seen_at, created_at, inactive_notice_sent_at, sms_suspended_at")
    .eq("is_active", true)
    .is("inactive_notice_sent_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  let smsSuspended = 0;
  let noticesQueued = 0;
  let emailsSent = 0;
  const errors = [];

  for (const profile of profiles || []) {
    if (!isInactiveOverThreshold(profile, INACTIVE_THRESHOLD_DAYS, nowMs)) continue;

    processed += 1;
    const hadSms = Boolean((profile.notification_channels || {}).sms ?? true);

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        sms_suspended_at: profile.sms_suspended_at || now,
        inactive_notice_sent_at: now,
      })
      .eq("id", profile.id);

    if (updateError) {
      errors.push(`${profile.id}: ${updateError.message}`);
      continue;
    }

    if (hadSms) smsSuspended += 1;

    const { error: noticeError } = await admin.from("notifications").insert({
      user_id: profile.id,
      title: INACTIVE_NOTICE_TITLE,
      message: INACTIVE_NOTICE_BODY,
      notification_type: "account_inactive",
      priority: "NORMAL",
      related_type: "account_inactive",
      related_id: profile.id,
    });

    if (noticeError) {
      errors.push(`${profile.id} notice: ${noticeError.message}`);
    } else {
      noticesQueued += 1;
    }

    if (profile.email) {
      const emailResult = await sendEmail({
        to: profile.email,
        subject: INACTIVE_NOTICE_TITLE,
        body: INACTIVE_NOTICE_BODY,
      });
      if (emailResult.success) {
        emailsSent += 1;
      } else if (!emailResult.skipped) {
        errors.push(`${profile.id} email: ${emailResult.error}`);
      }
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    smsSuspended,
    noticesQueued,
    emailsSent,
    errors,
  });
}

export async function GET(request) {
  return POST(request);
}
