import { createClient } from "@supabase/supabase-js";
import { consumeRateLimit } from "@/lib/rateLimit.server";
import { resolvePublicDispatch } from "@/lib/notificationDispatchAuth.server";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DISPATCH_LIMIT = { limit: 40, windowMs: 60_000 };
const OVERRIDE_KEYS = ["getUser", "getSupabaseAdmin", "resolvePublicDispatch", "dispatchNotificationServer", "processDeliveries", "enforceLimit"];

function json(body, status, headers) {
  return Response.json(body, { status, headers });
}

function overridesFrom(second) {
  if (!second || typeof second !== "object") return {};
  const picked = {};
  for (const key of OVERRIDE_KEYS) {
    if (typeof second[key] === "function") picked[key] = second[key];
  }
  return picked;
}

function rateLimited(userId) {
  const result = consumeRateLimit(`rl:dispatch:${userId}`, DISPATCH_LIMIT.limit, DISPATCH_LIMIT.windowMs);
  if (result.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return json(
    { error: "Too many requests. Please try again later." },
    429,
    { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
  );
}

async function readUser(request, deps) {
  if (deps.getUser) return deps.getUser(request);

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: json({ error: "Unauthorized" }, 401) };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabaseUser.auth.getUser(token);
  if (error || !user) return { error: json({ error: "Invalid session" }, 401) };
  return { user };
}

export async function POST(request, second) {
  const deps = {
    getSupabaseAdmin,
    resolvePublicDispatch,
    dispatchNotificationServer,
    ...overridesFrom(second),
  };

  try {
    const session = await readUser(request, deps);
    if (session.error) return session.error;

    const limited = deps.enforceLimit ? deps.enforceLimit(session.user.id) : rateLimited(session.user.id);
    if (limited) return limited;

    const admin = deps.getSupabaseAdmin();
    if (!admin) return json({ error: "Server misconfigured" }, 500);

    const body = await request.json().catch(() => ({}));
    const { userId, notificationType, relatedType, relatedId } = body;
    if (!userId || !notificationType) {
      return json({ error: "userId and notificationType are required" }, 400);
    }

    const authz = await deps.resolvePublicDispatch(admin, session.user, {
      userId,
      notificationType,
      relatedType,
      relatedId,
    });

    if (!authz.allowed) {
      return json({ error: authz.reason || "Forbidden" }, 403);
    }

    const event = authz.dispatch;
    const results = await deps.dispatchNotificationServer({
      userId: event.userId,
      title: event.title,
      message: event.message,
      notificationType: event.notificationType,
      priority: event.priority,
      relatedType: event.relatedType,
      relatedId: event.relatedId,
      eventKey: event.eventKey,
      channels: event.channels,
      adminClient: admin,
      processDeliveries: deps.processDeliveries,
    });

    if (results.errors.length && !results.web && !results.duplicate) {
      return json({ error: results.errors.join("; ") }, 500);
    }

    return json({ success: true, results }, 200);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
