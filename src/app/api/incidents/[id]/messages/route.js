import { NextResponse, after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { chatNoticePreview, cleanChatMessage, isChatReadOnly, CHAT_ROLE_LABELS } from "@/lib/incidentChat";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function notSetUp(error) {
  return ["42P01", "PGRST205", "42883", "PGRST202"].includes(error?.code);
}

async function checkAccess(admin, incidentId, userId) {
  const { data, error } = await admin.rpc("can_access_incident_chat", { p_incident_id: incidentId, p_user: userId });
  if (error) return { ok: false, notSetUp: notSetUp(error), error };
  return { ok: data === true };
}

/** Everyone in the thread except the sender: reporter, assigned guide, guides involved, admins. */
async function chatRecipients(admin, incident, senderId) {
  const ids = new Set([incident.reporter_id, incident.assigned_to]);
  const { data: admins } = await admin.from("profiles").select("id").eq("user_type", "admin").eq("is_active", true);
  for (const a of admins || []) ids.add(a.id);

  const tourists = [incident.reporter_id];
  const { data: missing } = await admin
    .from("missing_person_cases")
    .select("tagged_user_id")
    .eq("incident_id", incident.id)
    .maybeSingle();
  if (missing?.tagged_user_id) tourists.push(missing.tagged_user_id);
  const { data: guides } = await admin
    .from("guide_assignments")
    .select("guide_id")
    .in("tourist_id", tourists.filter(Boolean))
    .eq("status", "active");
  for (const g of guides || []) ids.add(g.guide_id);

  ids.delete(senderId);
  ids.delete(null);
  ids.delete(undefined);
  return [...ids];
}

/** The thread for one report (oldest first), if the caller takes part in it. */
export async function GET(request, { params }) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!UUID.test(id || "")) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const access = await checkAccess(admin, id, auth.user.id);
  if (access.notSetUp) return NextResponse.json({ available: false, messages: [] });
  if (!access.ok) return NextResponse.json({ error: "You are not part of this report's chat." }, { status: 403 });

  const [{ data: incident }, { data: rows, error }] = await Promise.all([
    admin.from("incident_reports").select("status").eq("id", id).maybeSingle(),
    admin
      .from("incident_messages")
      .select("id, sender_id, sender_role, body, created_at, sender:profiles!incident_messages_sender_id_fkey(full_name)")
      .eq("incident_id", id)
      .order("created_at", { ascending: true })
      .limit(300),
  ]);
  if (error) return NextResponse.json({ available: !notSetUp(error), messages: [] });

  return NextResponse.json({
    available: true,
    readOnly: isChatReadOnly(incident?.status),
    me: auth.user.id,
    messages: (rows || []).map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      sender_role: m.sender_role,
      sender_name: m.sender?.full_name || CHAT_ROLE_LABELS[m.sender_role] || "User",
      body: m.body,
      created_at: m.created_at,
    })),
  });
}

/** Send a message; the other people in the thread get an in-app notice. */
export async function POST(request, { params }) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimitByKey(auth.user.id, { name: "incident-chat", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  if (!UUID.test(id || "")) return NextResponse.json({ error: "Invalid report." }, { status: 400 });

  const body = cleanChatMessage((await request.json().catch(() => null))?.body);
  if (!body) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  const access = await checkAccess(admin, id, auth.user.id);
  if (access.notSetUp) return NextResponse.json({ error: "Chat is not set up yet." }, { status: 503 });
  if (!access.ok) return NextResponse.json({ error: "You are not part of this report's chat." }, { status: 403 });

  const [{ data: incident }, { data: sender }] = await Promise.all([
    admin.from("incident_reports").select("id, reporter_id, assigned_to, status, reference_number, category").eq("id", id).maybeSingle(),
    admin.from("profiles").select("full_name, user_type").eq("id", auth.user.id).maybeSingle(),
  ]);
  if (!incident) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  if (isChatReadOnly(incident.status)) {
    return NextResponse.json({ error: "This report is closed, so the chat is read-only." }, { status: 409 });
  }
  const role = ["tourist", "guide", "admin"].includes(sender?.user_type) ? sender.user_type : "tourist";

  const { data: message, error } = await admin
    .from("incident_messages")
    .insert({ incident_id: id, sender_id: auth.user.id, sender_role: role, body })
    .select("id, sender_id, sender_role, body, created_at")
    .single();
  if (error) return NextResponse.json({ error: "Could not send the message." }, { status: 500 });

  const name = sender?.full_name || CHAT_ROLE_LABELS[role];
  const label = incident.reference_number || incident.category || "your report";
  // Reply right away; notify the others after the response is sent (keeps sending fast).
  after(async () => {
    const recipients = await chatRecipients(admin, incident, auth.user.id);
    await Promise.all(
    recipients.map((userId) =>
      dispatchNotificationServer({
        userId,
        title: `New message on ${label}`,
        message: `${name} (${CHAT_ROLE_LABELS[role]}): ${chatNoticePreview(body)}`,
        notificationType: "incident_message",
        priority: "NORMAL",
        relatedType: "incident",
        relatedId: id,
        eventKey: `incident-message:${message.id}:${userId}`,
        channels: ["web"],
      }).catch(() => null)
    )
    );
  });

  return NextResponse.json({ success: true, message: { ...message, sender_name: name } });
}
