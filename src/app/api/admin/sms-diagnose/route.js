import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { normalizePhilippinePhone } from "@/lib/phoneUtils";
import {
  detectIProgPhoneNetwork,
  getSmsDiagnostics,
  sendSms,
} from "@/lib/smsService";
import { formatIProgSmsErrorForAdmin } from "@/lib/iprogSmsErrors";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";

/** Diagnose a tourist (or any) PH mobile: network detect + optional test send */
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const limited = enforceRateLimitByKey(auth.user.id, {
    name: "admin-sms-diagnose",
    ...API_RATE_LIMITS.adminSmsTest,
  });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const rawPhone = body.phone;
  const userId = body.userId;
  const doSend = Boolean(body.sendTest);

  let phone = rawPhone;
  if (userId) {
    const { data: profile } = await auth.admin
      .from("profiles")
      .select("id, phone, full_name, user_type, notification_channels, sms_suspended_at")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    phone = profile.phone;
    const normalized = normalizePhilippinePhone(phone);
    const network = await detectIProgPhoneNetwork(phone);
    const diagnostics = getSmsDiagnostics();

    let sendResult = null;
    if (doSend && normalized) {
      sendResult = await sendSms({
        to: normalized,
        message: body.message || "CONNECT-DAET SMS diagnostic test.",
      });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        name: profile.full_name,
        userType: profile.user_type,
        phoneRaw: profile.phone,
        phoneNormalized: normalized,
        smsSuspended: Boolean(profile.sms_suspended_at),
        channels: profile.notification_channels,
      },
      network,
      diagnostics,
      send: sendResult
        ? {
            success: sendResult.success,
            messageId: sendResult.messageId,
            error: sendResult.error,
            adminHint: formatIProgSmsErrorForAdmin(sendResult.error),
            billed: sendResult.billed,
            detectedNetwork: sendResult.detectedNetwork,
          }
        : null,
    });
  }

  const normalized = normalizePhilippinePhone(phone);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid or missing phone (09XXXXXXXXX)" }, { status: 400 });
  }

  const network = await detectIProgPhoneNetwork(normalized);
  let sendResult = null;
  if (doSend) {
    sendResult = await sendSms({
      to: normalized,
      message: body.message || "CONNECT-DAET SMS diagnostic test.",
    });
  }

  return NextResponse.json({
    phoneRaw: phone,
    phoneNormalized: normalized,
    network,
    diagnostics: getSmsDiagnostics(),
    send: sendResult
      ? {
          success: sendResult.success,
          messageId: sendResult.messageId,
          error: sendResult.error,
          adminHint: formatIProgSmsErrorForAdmin(sendResult.error),
          billed: sendResult.billed,
          detectedNetwork: sendResult.detectedNetwork,
        }
      : null,
  });
}
