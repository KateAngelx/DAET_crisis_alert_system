const SMS_API_URL = process.env.SMS_API_URL;
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'CONNECT-DAET';

export async function sendSms({ to, message }) {
  if (!SMS_API_URL || !SMS_API_KEY) {
    console.warn('[SmsService] SMS not configured. Set SMS_API_URL and SMS_API_KEY.');
    return { success: false, error: 'SMS service not configured', skipped: true };
  }

  try {
    const response = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SMS_API_KEY}`,
      },
      body: JSON.stringify({
        to,
        from: SMS_SENDER_ID,
        message: message.substring(0, 160),
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
