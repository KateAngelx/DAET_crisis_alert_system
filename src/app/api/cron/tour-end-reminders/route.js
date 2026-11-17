import { NextResponse } from "next/server";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireCronSecret } from "@/lib/cronAuth.server";
import { formatTourEndDateTime, getTourEndReminderKind, getTourGroupEndAt, touristTourReminderText } from "@/lib/tourGroupRoute";

const BATCH_SIZE = 500;

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

/** Tourists in the group (active assignments). */
async function getTourTouristIds(admin, tourId) {
  const { data, error } = await admin
    .from("guide_assignments")
    .select("tourist_id")
    .eq("tour_group_id", tourId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return [...new Set((data || []).map((row) => row.tourist_id))];
}

async function notifyTourTourists(admin, tour, kind, endAt) {
  const errors = [];
  let touristIds = [];
  try {
    touristIds = await getTourTouristIds(admin, tour.id);
  } catch (error) {
    return { sent: 0, errors: [error.message] };
  }
  const { title, message } = touristTourReminderText(tour, kind);
  let sent = 0;
  for (const touristId of touristIds) {
    try {
      const result = await dispatchNotificationServer({
        userId: touristId,
        title,
        message,
        notificationType: "tour_group_end_reminder",
        priority: "NORMAL",
        relatedType: "tour_group",
        relatedId: tour.id,
        eventKey: `tour-end:${tour.id}:${endAt.toISOString()}:${kind}:tourist:${touristId}`,
        channels: ["web"],
      });
      if (result.errors.length) errors.push(...result.errors);
      else sent += 1;
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { sent, errors };
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
    channels: ["web", "email", "sms"],
  });

  if (result.errors.length) throw new Error(result.errors.join("; "));

  // Tell the group's tourists too (in-app and push). A failure here never blocks the guide reminder.
  const touristResult = await notifyTourTourists(admin, tour, kind, endAt);
  if (touristResult.errors.length) {
    console.error(`[TourEndReminders] ${tour.id} tourist notices:`, touristResult.errors.join("; "));
  }

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
      const kind = getTourEndReminderKind(tour, nowMs);
      if (!kind) continue;
      const endAt = getTourGroupEndAt(tour);

      try {
        if (await sendReminder(admin, tour, kind, endAt)) {
          if (kind === "due") dueReminders += 1;
          else oneHourReminders += 1;
        }
      } catch (error) {
        errors.push(`${tour.id} ${kind === "due" ? "due" : "one-hour"} reminder: ${error.message}`);
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
