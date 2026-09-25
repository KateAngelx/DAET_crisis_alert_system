import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail, getEmailDiagnostics } from "@/lib/emailService";
import { buildPasswordResetEmail } from "@/lib/passwordResetEmail";
import { getSiteUrl } from "@/lib/siteUrl";
import { resolvePasswordResetLink } from "@/lib/passwordResetLink";
import { API_RATE_LIMITS, enforceRateLimit } from "@/lib/apiRateLimit";

const GENERIC_SUCCESS = {
  success: true,
  message:
    "If an account exists for that email, you will receive a password reset link from CONNECT-DAET shortly.",
};

export async function POST(request) {
  const limited = enforceRateLimit(request, { name: "forgot-password", ...API_RATE_LIMITS.forgotPassword });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 254);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const emailLimited = enforceRateLimit(request, {
      name: "forgot-password-email",
      limit: 3,
      windowMs: 60 * 60_000,
      keyPart: email,
    });
    if (emailLimited) return emailLimited;

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
    }

    const emailDiagnostics = getEmailDiagnostics();
    if (emailDiagnostics.provider === "none") {
      return NextResponse.json(
        {
          error:
            "Email is not configured on this server. Contact the administrator to enable password reset emails.",
          diagnostics: emailDiagnostics,
        },
        { status: 503 }
      );
    }

    const siteUrl = getSiteUrl(request);
    const redirectTo = `${siteUrl}/reset-password`;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    const linkResolution = resolvePasswordResetLink({ siteUrl, linkData, request });

    if (linkError) {
      const notFound =
        /user not found|no user|not registered/i.test(linkError.message || "") ||
        linkError.status === 404;
      if (notFound) {
        return NextResponse.json(GENERIC_SUCCESS);
      }
      throw linkError;
    }

    const resetLink = linkResolution.resetLink;
    if (!resetLink) {
      return NextResponse.json({ error: "Could not create reset link." }, { status: 500 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("email", email)
      .maybeSingle();

    const mail = buildPasswordResetEmail({
      resetLink,
      recipientName: profile?.full_name || null,
    });

    const sendResult = await sendEmail({
      to: email,
      subject: mail.subject,
      body: mail.body,
      html: mail.html,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          error:
            sendResult.error ||
            "Could not send reset email. Check email configuration and try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...GENERIC_SUCCESS,
      emailSent: true,
      provider: sendResult.provider,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Could not process password reset request." },
      { status: 500 }
    );
  }
}
