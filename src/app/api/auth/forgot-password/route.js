import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail, getEmailDiagnostics } from "@/lib/emailService";
import { buildPasswordResetEmail } from "@/lib/passwordResetEmail";
import { getSiteUrl } from "@/lib/siteUrl";

const GENERIC_SUCCESS = {
  success: true,
  message:
    "If an account exists for that email, you will receive a password reset link from CONNECT-DAET shortly.",
};

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

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
    const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "password-reset",
        hypothesisId: "H1-H2",
        location: "api/auth/forgot-password:generateLink",
        message: "Password reset link generation",
        data: {
          emailDomain: email.split("@")[1] || null,
          redirectTo,
          hasActionLink: Boolean(linkData?.properties?.action_link),
          linkError: linkError?.message || null,
          emailProvider: emailDiagnostics.provider,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (linkError) {
      const notFound =
        /user not found|no user|not registered/i.test(linkError.message || "") ||
        linkError.status === 404;
      if (notFound) {
        return NextResponse.json(GENERIC_SUCCESS);
      }
      throw linkError;
    }

    const resetLink = linkData?.properties?.action_link;
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

    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "password-reset",
        hypothesisId: "H3",
        location: "api/auth/forgot-password:sendEmail",
        message: "Password reset email send result",
        data: {
          success: sendResult.success,
          provider: sendResult.provider || null,
          error: sendResult.error || null,
          hasMessageId: Boolean(sendResult.messageId),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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
