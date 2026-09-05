const EMAIL_API_URL = process.env.EMAIL_API_URL;
const EMAIL_API_KEY = process.env.EMAIL_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'CONNECT-DAET <noreply@connect-daet.local>';

export async function sendEmail({ to, subject, body }) {
  if (!EMAIL_API_URL || !EMAIL_API_KEY) {
    console.warn('[EmailService] Email not configured. Set EMAIL_API_URL and EMAIL_API_KEY.');
    return { success: false, error: 'Email service not configured', skipped: true };
  }

  try {
    const response = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#2563eb;">CONNECT-DAET</h2>
          <p>${body.replace(/\n/g, '<br>')}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="color:#9ca3af;font-size:12px;">This is an automated message from the CONNECT-DAET Tourism Crisis Communication & Emergency Alert System.</p>
        </div>`,
        text: body,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
