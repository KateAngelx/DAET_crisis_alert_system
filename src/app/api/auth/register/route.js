import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { API_RATE_LIMITS, enforceRateLimit } from "@/lib/apiRateLimit";
import { normalizePhilippinePhone } from "@/lib/phoneUtils";
import { processNotificationDeliveries } from "@/lib/notificationQueue.server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_SUBJECT = "Welcome to CONNECT-DAET - Registration Successful";

function getRegistrationMessages(name) {
  return {
    email: `Hello ${name},

Welcome to CONNECT-DAET!

We are pleased to inform you that your account has been successfully registered in the CONNECT-DAET system.

You can now access the platform to view tourism information, receive emergency alerts, and use the available system features.

Thank you for joining CONNECT-DAET.

Best regards,
CONNECT-DAET Team`,
    sms: `Welcome to CONNECT-DAET, ${name}! Your account has been successfully registered. You can now access CONNECT-DAET to receive tourism updates and important emergency alerts. Thank you for joining us!`,
  };
}

async function enqueueAndSend(admin, delivery) {
  try {
    const { data, error } = await admin
      .from("notification_deliveries")
      .insert(delivery)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing, error: lookupError } = await admin
          .from("notification_deliveries")
          .select("status")
          .eq("idempotency_key", delivery.idempotency_key)
          .maybeSingle();
        if (!lookupError && existing) return { status: existing.status };
      }

      console.error(`[Registration] Could not enqueue ${delivery.channel} confirmation:`, error.message);
      return { status: "failed" };
    }

    const processed = await processNotificationDeliveries({ deliveryIds: [data.id] });
    const result = processed.results.find((item) => item.id === data.id);
    return { status: result?.status || "pending" };
  } catch (error) {
    console.error(`[Registration] Could not process ${delivery.channel} confirmation:`, error.message);
    return { status: "pending" };
  }
}

export async function POST(request) {
  const limited = enforceRateLimit(request, {
    name: "register",
    ...API_RATE_LIMITS.register,
  });
  if (limited) return limited;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid registration request." }, { status: 400 });
  }

  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const rawPhone = String(body?.phone || "").trim();
  const nationality = String(body?.nationality || "Filipino");

  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Enter your name (up to 100 characters)." }, { status: 400 });
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
  }
  if (!/^[\d\s()+-]+$/.test(rawPhone)) {
    return NextResponse.json(
      { error: "Enter a valid Philippine mobile number (09XXXXXXXXX)." },
      { status: 400 }
    );
  }
  const phone = normalizePhilippinePhone(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid Philippine mobile number (09XXXXXXXXX)." },
      { status: 400 }
    );
  }
  if (!["Filipino", "Foreigner"].includes(nationality)) {
    return NextResponse.json({ error: "Select a valid nationality." }, { status: 400 });
  }

  const emailLimited = enforceRateLimit(request, {
    name: "register-email",
    limit: 3,
    windowMs: 60 * 60_000,
    keyPart: email,
  });
  if (emailLimited) return emailLimited;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = getSupabaseAdmin();
  if (!supabaseUrl || !anonKey || !admin) {
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 });
  }

  let data;
  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const signup = await authClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, phone, nationality } },
    });
    data = signup.data;

    if (signup.error) {
      const alreadyRegistered = /already registered|already exists/i.test(signup.error.message || "");
      return NextResponse.json(
        {
          error: alreadyRegistered
            ? "An account with this email already exists. Please sign in."
            : signup.error.message,
        },
        { status: alreadyRegistered ? 409 : 400 }
      );
    }

    const user = data?.user;
    if (!user || (!data.session && !user.identities?.length)) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("[Registration] Signup request failed:", error.message);
    return NextResponse.json({ error: "Could not complete registration. Please try again." }, { status: 500 });
  }

  let registrationReward = null;
  const { data: registrationTransaction, error: rewardLookupError } = await admin
    .from("point_transactions")
    .select("id, points_delta")
    .eq("user_id", data.user.id)
    .eq("transaction_type", "earned")
    .eq("reason", "registration")
    .maybeSingle();

  if (rewardLookupError) {
    console.error("[Registration] Could not verify registration points:", rewardLookupError.message);
  } else if (registrationTransaction && Number(registrationTransaction.points_delta) > 0) {
    registrationReward = {
      id: registrationTransaction.id,
      points: Number(registrationTransaction.points_delta),
    };
  }

  let profileCompletionReward = null;
  const { data: profileCompletionTransaction, error: profileCompletionLookupError } = await admin
    .from("point_transactions")
    .select("id, points_delta")
    .eq("user_id", data.user.id)
    .eq("transaction_type", "earned")
    .eq("reason", "profile_completion")
    .maybeSingle();

  if (profileCompletionLookupError) {
    console.error("[Registration] Could not verify profile completion points:", profileCompletionLookupError.message);
  } else if (profileCompletionTransaction && Number(profileCompletionTransaction.points_delta) > 0) {
    profileCompletionReward = {
      id: profileCompletionTransaction.id,
      points: Number(profileCompletionTransaction.points_delta),
    };
  }

  const messages = getRegistrationMessages(name);
  const notifications = await Promise.all([
    enqueueAndSend(admin, {
      user_id: data.user.id,
      channel: "email",
      status: "pending",
      recipient: email,
      subject: EMAIL_SUBJECT,
      body: messages.email,
      priority: "NORMAL",
      idempotency_key: `registration-confirmation:${data.user.id}:email`,
    }),
    enqueueAndSend(admin, {
      user_id: data.user.id,
      channel: "sms",
      status: "pending",
      recipient: phone,
      subject: EMAIL_SUBJECT,
      body: messages.sms,
      priority: "NORMAL",
      idempotency_key: `registration-confirmation:${data.user.id}:sms`,
    }),
  ]);

  return NextResponse.json({
    success: true,
    needsConfirmation: !data.session,
    session: data.session,
    registrationReward,
    profileCompletionReward,
    notifications: {
      email: notifications[0],
      sms: notifications[1],
    },
  });
}
