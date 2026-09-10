import { buildHtmlBody } from "@/lib/emailService";

export function buildPasswordResetEmail({ resetLink, recipientName }) {
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";
  const subject = "CONNECT-DAET — Reset your password";

  const body = `${greeting}

We received a request to reset your CONNECT-DAET account password.

Open this link to choose a new password (link expires in 1 hour):
${resetLink}

If you did not request this, you can ignore this email. Your password will not change.

— Daet LGU Crisis Alert System`;

  const html = buildHtmlBody(
    `${greeting}<br><br>
We received a request to reset your <strong>CONNECT-DAET</strong> account password.<br><br>
<a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Reset Password</a><br><br>
Or copy this link into your browser:<br>
<span style="word-break:break-all;color:#2563eb;">${resetLink}</span><br><br>
This link expires in <strong>1 hour</strong>. If you did not request a reset, you can safely ignore this email.`,
    { title: "Password Reset Request" }
  );

  return { subject, body, html };
}
