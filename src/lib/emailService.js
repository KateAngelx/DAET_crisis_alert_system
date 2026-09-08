import nodemailer from "nodemailer";

const EMAIL_FROM = process.env.EMAIL_FROM || "CONNECT-DAET <noreply@connect-daet.local>";
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_API_URL = process.env.EMAIL_API_URL || "";
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || "";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

function buildHtmlBody(body, { title } = {}) {
  const safeBody = String(body || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#18181b;">
    <div style="border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:20px;">
      <h1 style="margin:0;font-size:20px;color:#2563eb;letter-spacing:0.02em;">CONNECT-DAET</h1>
      <p style="margin:4px 0 0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.08em;">Daet Tourism Crisis Alert System</p>
    </div>
    ${title ? `<h2 style="font-size:16px;margin:0 0 12px;color:#18181b;">${title}</h2>` : ""}
    <div style="font-size:14px;line-height:1.6;">${safeBody}</div>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="color:#a1a1aa;font-size:11px;line-height:1.5;margin:0;">
      Automated message from CONNECT-DAET (Daet LGU). Do not reply to this email.
      Manage alert preferences in your profile after signing in.
    </p>
  </div>`;
}

function resolveProvider() {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) return "smtp";
  if (RESEND_API_KEY) return "resend";
  if (EMAIL_API_URL && EMAIL_API_KEY) return "generic_api";
  return "none";
}

export function getEmailDiagnostics() {
  const provider = resolveProvider();
  return {
    provider,
    fromAddress: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO || null,
    smtpConfigured: Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS),
    smtpHost: SMTP_HOST || null,
    smtpUser: SMTP_USER ? SMTP_USER.replace(/(.{2}).+(@.+)/, "$1***$2") : null,
    resendConfigured: Boolean(RESEND_API_KEY),
    genericApiConfigured: Boolean(EMAIL_API_URL && EMAIL_API_KEY),
    recipientSource: "Each registered user's profile email (profiles.email)",
  };
}

let smtpTransport = null;

function getSmtpTransport() {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return smtpTransport;
}

async function sendViaSmtp({ to, subject, body, html }) {
  const transport = getSmtpTransport();
  const info = await transport.sendMail({
    from: EMAIL_FROM,
    to,
    replyTo: EMAIL_REPLY_TO || undefined,
    subject,
    text: body,
    html: html || buildHtmlBody(body, { title: subject }),
  });
  return { success: true, messageId: info.messageId, provider: "smtp" };
}

async function sendViaResend({ to, subject, body, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      reply_to: EMAIL_REPLY_TO || undefined,
      subject,
      html: html || buildHtmlBody(body, { title: subject }),
      text: body,
    }),
  });

  const data = await response.json().catch(async () => ({
    message: await response.text().catch(() => "Unknown error"),
  }));

  if (!response.ok) {
    return {
      success: false,
      error: data?.message || data?.error?.message || JSON.stringify(data),
      provider: "resend",
    };
  }

  return { success: true, messageId: data?.id, provider: "resend" };
}

async function sendViaGenericApi({ to, subject, body, html }) {
  const response = await fetch(EMAIL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${EMAIL_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html: html || buildHtmlBody(body, { title: subject }),
      text: body,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    return { success: false, error: errText, provider: "generic_api" };
  }

  return { success: true, provider: "generic_api" };
}

/**
 * Send email to a registered user (or any recipient).
 * Provider priority: SMTP (own inbox) → Resend (own domain) → generic API.
 */
export async function sendEmail({ to, subject, body, html }) {
  if (!to?.trim()) {
    return { success: false, error: "Missing recipient email", skipped: true };
  }

  const provider = resolveProvider();
  if (provider === "none") {
    console.warn("[EmailService] Email not configured.");
    return {
      success: false,
      error:
        "Email not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS for your own inbox, or RESEND_API_KEY + EMAIL_FROM for your domain.",
      skipped: true,
    };
  }

  try {
    const payload = {
      to: to.trim(),
      subject: subject || "CONNECT-DAET Notification",
      body: body || "",
      html,
    };

    let result;
    if (provider === "smtp") result = await sendViaSmtp(payload);
    else if (provider === "resend") result = await sendViaResend(payload);
    else result = await sendViaGenericApi(payload);

    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ee1adc" },
      body: JSON.stringify({
        sessionId: "ee1adc",
        location: "emailService.js:sendEmail",
        message: "Email send attempt",
        data: {
          provider: result.provider,
          success: result.success,
          skipped: Boolean(result.skipped),
          hasMessageId: Boolean(result.messageId),
        },
        timestamp: Date.now(),
        runId: "email",
        hypothesisId: "email-delivery",
      }),
    }).catch(() => {});
    // #endregion

    return result;
  } catch (err) {
    return { success: false, error: err.message, provider };
  }
}

export { buildHtmlBody, EMAIL_FROM };
