import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSmsDiagnostics, normalizePhilippinePhone, sendSms } from "@/lib/smsService";

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

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
        error: "IPROG_SMS_API_TOKEN is not set on the server. Add it in Vercel env vars and redeploy.",
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
      "CONNECT-DAET test SMS. If you received this, iProg SMS is working.",
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        step: "iprog",
        error: result.error,
        diagnostics,
        normalizedPhone: normalized,
        skipped: Boolean(result.skipped),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    provider: result.provider,
    mode: result.mode,
    normalizedPhone: normalized,
    diagnostics,
  });
}
