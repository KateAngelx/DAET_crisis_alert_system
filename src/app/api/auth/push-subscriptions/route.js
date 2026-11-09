import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { getWebPushStatus } from "@/lib/webPush.server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PUSH_ENDPOINT_HOSTS = [
  "fcm.googleapis.com",
  "web.push.apple.com",
  "push.services.mozilla.com",
  "notify.windows.com",
];

async function authorize(request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !user) return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { error: NextResponse.json({ error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required" }, { status: 500 }) };
  }
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, user_type, is_active, notification_channels")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return { error: NextResponse.json({ error: "Unable to verify your account." }, { status: 503 }) };
  if (!profile || profile.is_active !== true) return { error: NextResponse.json({ error: "Active account required." }, { status: 403 }) };
  return { admin, user, profile };
}

function isAllowedPushEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && (!url.port || url.port === "443")
      && PUSH_ENDPOINT_HOSTS.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export async function GET(request) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const endpoint = new URL(request.url).searchParams.get("endpoint");
    if (endpoint && !isAllowedPushEndpoint(endpoint)) {
      return NextResponse.json({ error: "Push subscription endpoint is invalid." }, { status: 400 });
    }

    let deviceEnabled = false;
    if (endpoint) {
      const { data: subscription, error: subscriptionError } = await auth.admin
        .from("web_push_subscriptions")
        .select("enabled")
        .eq("user_id", auth.user.id)
        .eq("endpoint", endpoint)
        .maybeSingle();
      if (subscriptionError) throw subscriptionError;
      deviceEnabled = subscription?.enabled === true;
    }

    const pushStatus = getWebPushStatus();
    return NextResponse.json({
      success: true,
      publicKey: pushStatus.publicKey,
      configured: pushStatus.configured,
      configurationError: pushStatus.configurationError,
      enabled: Boolean(auth.profile.notification_channels?.push),
      deviceEnabled,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load push settings." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "web-push-subscriptions",
      limit: 12,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    if (body?.action === "disable") {
      const { error } = await auth.admin.rpc("set_web_push_enabled", {
        p_user_id: auth.user.id,
        p_enabled: false,
      });
      if (error) throw error;
      return NextResponse.json({ success: true, enabled: false });
    }

    const subscription = body?.subscription;
    const endpoint = subscription?.endpoint;
    const previousEndpoint = body?.previousEndpoint;
    const p256dh = subscription?.keys?.p256dh;
    const authKey = subscription?.keys?.auth;
    if (
      body?.action !== "subscribe"
      || typeof endpoint !== "string"
      || endpoint.length > 2048
      || !isAllowedPushEndpoint(endpoint)
      || typeof p256dh !== "string"
      || p256dh.length < 20
      || p256dh.length > 200
      || typeof authKey !== "string"
      || authKey.length < 8
      || authKey.length > 100
      || (previousEndpoint != null && (typeof previousEndpoint !== "string" || !isAllowedPushEndpoint(previousEndpoint)))
    ) {
      return NextResponse.json({ error: "A valid browser push subscription is required." }, { status: 400 });
    }

    const expirationTimestamp = subscription.expirationTime == null ? null : Number(subscription.expirationTime);
    if (
      expirationTimestamp != null
      && (!Number.isFinite(expirationTimestamp) || Math.abs(expirationTimestamp) > 8640000000000000)
    ) {
      return NextResponse.json({ error: "Subscription expiration time is invalid." }, { status: 400 });
    }
    const expirationTime = expirationTimestamp == null ? null : new Date(expirationTimestamp).toISOString();

    if (previousEndpoint && previousEndpoint !== endpoint) {
      const { error: removeError } = await auth.admin
        .from("web_push_subscriptions")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("endpoint", previousEndpoint);
      if (removeError) throw removeError;
    }

    const { error } = await auth.admin.rpc("register_web_push_subscription", {
      p_user_id: auth.user.id,
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: authKey,
      p_expiration_time: expirationTime,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, enabled: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to update push preferences." }, { status: 500 });
  }
}
