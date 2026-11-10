import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { formatSemaphoreSmsErrorForAdmin } from "@/lib/semaphoreSmsErrors";
import { getSmsDiagnostics, normalizePhilippinePhone, sendSms } from "@/lib/smsService";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const limited = enforceRateLimitByKey(auth.user.id, {
    name: "admin-sms-test",
    ...API_RATE_LIMITS.adminSmsTest,
  });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const { data: profile } = await auth.admin
    .from("profiles")
    .select("phone, full_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  const phone = body.phone || profile?.phone;
  const normalized = normalizePhilippinePhone(phone);
  const diagnostics = getSmsDiagnostics();

  if (!diagnostics.tokenConfigured) {
    return NextResponse.json(
      {
        success: false,
        step: "config",
        error: "No SMS provider is configured. Set SEMAPHORE_API_KEY or IPROG_SMS_API_TOKEN in the server environment and redeploy.",
        diagnostics,
        profilePhone: phone ? "set" : "missing",
        normalizedPhone: normalized,
      },
      { status: 503 }
    );
  }

  if (!normalized) {
    return NextResponse.json(
      {
        success: false,
        step: "phone",
        error: "No valid Philippine mobile number. Set phone on your profile (09XXXXXXXXX) or pass { phone } in the request body.",
        diagnostics,
        profilePhone: phone || null,
      },
      { status: 400 }
    );
  }

  const result = await sendSms({
    to: normalized,
    message:
      body.message ||
    "CONNECT-DAET test SMS. If you received this, an SMS provider is working.",
  });

  if (!result.success) {
    const adminHint = formatSemaphoreSmsErrorForAdmin(result.error);
    return NextResponse.json(
      {
        success: false,
        step: "sms",
        error: result.error,
        adminHint,
        errorCode: result.errorCode,
        apiAttempts: result.apiAttempts,
        billed: Boolean(result.billed),
        diagnostics,
        normalizedPhone: normalized,
        detectedNetwork: result.detectedNetwork || null,
        skipped: Boolean(result.skipped),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    provider: result.provider,
    fallbackFrom: result.fallbackFrom || null,
    mode: result.mode,
    apiMessage: result.apiMessage,
    normalizedPhone: normalized,
    detectedNetwork: result.detectedNetwork || null,
    apiPhone: normalized ? `63${normalized.slice(1)}` : null,
    deliveryStatus: result.deliveryStatus || null,
    diagnostics,
    note: `${result.provider} accepted the message. Check its status in that provider's dashboard; queued messages may still fail during delivery.`,
  });
}
