import { NextResponse } from "next/server";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { formatTourEndDateTime, getTourGroupEndAt } from "@/lib/tourGroupRoute";

const ONE_HOUR_MS = 60 * 60 * 1000;
const BATCH_SIZE = 500;

function requireCronSecret(request) {
  const secret = process.env.CRON_SECRET || process.env.NOTIFICATION_INTERNAL_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 }),
    };
  }
  const header = request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace("Bearer ", "");
  if (header !== secret) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true };
}

async function getActiveTours(admin) {
  const tours = [];
  for (let offset = 0; ; offset += BATCH_SIZE) {
    const { data, error } = await admin
      .from("tour_groups")
      .select("id, guide_id, name, end_date, end_time, end_reminder_1h_sent_at, end_reminder_due_sent_at, updated_at")
      .eq("status", "active")
      .not("end_date", "is", null)
      .order("end_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(error.message);
    tours.push(...(data || []));
    if (!data || data.length < BATCH_SIZE) return tours;
  }
}

async function sendReminder(admin, tour, kind, endAt) {
  const isDue = kind === "due";
  const title = isDue
    ? `${tour.name} has reached its planned end time`
    : `${tour.name} ends in about one hour`;
  const message = isDue
    ? `The planned end time for ${tour.name} was ${formatTourEndDateTime(tour)}. Please check that the tourists are safe, then mark the group done if appropriate. The tour was not ended automatically.`
    : `${tour.name} is scheduled to end at ${formatTourEndDateTime(tour)}. Please check in with the tourists and update the tour if the schedule has changed.`;
  const eventKey = `tour-end:${tour.id}:${endAt.toISOString()}:${kind}`;
  const result = await dispatchNotificationServer({
    userId: tour.guide_id,
    title,
    message,
    notificationType: "tour_group_end_reminder",
    priority: isDue ? "HIGH" : "NORMAL",
    relatedType: "tour_group",
    relatedId: tour.id,
    eventKey,
    channels: ["web", "email"],
  });

  if (result.errors.length) throw new Error(result.errors.join("; "));

  const sentField = isDue ? "end_reminder_due_sent_at" : "end_reminder_1h_sent_at";
  const { data, error } = await admin
    .from("tour_groups")
    .update({ [sentField]: new Date().toISOString() })
    .eq("id", tour.id)
    .eq("guide_id", tour.guide_id)
    .eq("status", "active")
    .eq("updated_at", tour.updated_at)
    .select("id");

  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

export async function POST(request) {
  const gate = requireCronSecret(request);
  if (!gate.ok) return gate.response;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const now = new Date();
    const nowMs = now.getTime();
    const tours = await getActiveTours(admin);
    let oneHourReminders = 0;
    let dueReminders = 0;
    const errors = [];

    for (const tour of tours) {
      const endAt = getTourGroupEndAt(tour);
      if (!endAt) continue;

      const due = endAt.getTime() <= nowMs;
      const approaching =
        Boolean(tour.end_time) &&
        endAt.getTime() > nowMs &&
        endAt.getTime() <= nowMs + ONE_HOUR_MS;

      if (due && !tour.end_reminder_due_sent_at) {
        try {
          if (await sendReminder(admin, tour, "due", endAt)) dueReminders += 1;
        } catch (error) {
          errors.push(`${tour.id} due reminder: ${error.message}`);
        }
      } else if (approaching && !tour.end_reminder_1h_sent_at) {
        try {
          if (await sendReminder(admin, tour, "one-hour", endAt)) oneHourReminders += 1;
        } catch (error) {
          errors.push(`${tour.id} one-hour reminder: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      checked: tours.length,
      oneHourReminders,
      dueReminders,
      errors,
    }, { status: errors.length ? 500 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to process tour end reminders." }, { status: 500 });
  }
}

export async function GET(request) {
  return POST(request);
}
