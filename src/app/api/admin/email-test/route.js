import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getEmailDiagnostics, sendEmail } from "@/lib/emailService";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  return NextResponse.json({ diagnostics: getEmailDiagnostics() });
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const limited = enforceRateLimitByKey(auth.user.id, {
    name: "admin-email-test",
    ...API_RATE_LIMITS.adminSmsTest,
  });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const { data: profile } = await auth.admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  const to = body.email || profile?.email;
  const diagnostics = getEmailDiagnostics();

  if (diagnostics.provider === "none") {
    const missing = diagnostics.missingEnvVars?.length
      ? ` Missing: ${diagnostics.missingEnvVars.join(", ")}.`
      : "";
    return NextResponse.json(
      {
        success: false,
        step: "config",
        error: `Email is not configured on the server.${missing} Add SMTP vars in Vercel and redeploy.`,
        diagnostics,
      },
      { status: 503 }
    );
  }

  if (!to?.trim()) {
    return NextResponse.json(
      {
        success: false,
        step: "email",
        error: "No email address. Set email on your profile or pass { email } in the request body.",
        diagnostics,
      },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    to,
    subject: body.subject || "CONNECT-DAET — Email test",
    body:
      body.message ||
      `Hello${profile?.full_name ? ` ${profile.full_name}` : ""},\n\nThis is a test email from CONNECT-DAET. If you received this, email notifications are working.\n\n— Daet Tourism Crisis Alert System`,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        step: "send",
        error: result.error,
        diagnostics,
        skipped: Boolean(result.skipped),
        provider: result.provider,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    provider: result.provider,
    to,
    diagnostics,
  });
}
