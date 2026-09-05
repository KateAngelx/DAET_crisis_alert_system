const IPROG_SMS_API_URL =
  process.env.SMS_API_URL || "https://sms.iprogtech.com/api/v1/sms_messages";
const IPROG_SMS_API_TOKEN =
  process.env.IPROG_SMS_API_TOKEN || process.env.SMS_API_KEY;
const SMS_PROVIDER = parseInt(process.env.SMS_PROVIDER || "2", 10) || 2;

/** Normalize to 09XXXXXXXXX — iProg's preferred Philippine mobile format */
export function normalizePhilippinePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("63") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith("0") && digits.length === 11) return digits;
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;

  return null;
}

export async function sendSms({ to, message }) {
  const tokenConfigured = Boolean(IPROG_SMS_API_TOKEN);
  // #region agent log
  fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ee1adc'},body:JSON.stringify({sessionId:'ee1adc',location:'smsService.js:sendSms:entry',message:'sendSms called',data:{tokenConfigured,provider:SMS_PROVIDER,rawToPrefix:String(to||'').slice(0,4)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (!IPROG_SMS_API_TOKEN) {
    console.warn("[SmsService] SMS not configured. Set IPROG_SMS_API_TOKEN.");
    return { success: false, error: "SMS service not configured", skipped: true };
  }

  const phone_number = normalizePhilippinePhone(to);
  if (!phone_number) {
    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ee1adc'},body:JSON.stringify({sessionId:'ee1adc',location:'smsService.js:sendSms:invalidPhone',message:'phone normalization failed',data:{rawLength:String(to||'').length},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return { success: false, error: `Invalid Philippine phone number: ${to}` };
  }

  const payload = {
    api_token: IPROG_SMS_API_TOKEN,
    phone_number,
    message: String(message).substring(0, 160),
    sms_provider: SMS_PROVIDER,
  };

  try {
    const response = await fetch(IPROG_SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(async () => ({
      message: await response.text().catch(() => "Unknown error"),
    }));

    const apiStatus = data?.status;
    const ok =
      response.ok &&
      apiStatus !== "error" &&
      (apiStatus === undefined || apiStatus === 200 || apiStatus === "success");

    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ee1adc'},body:JSON.stringify({sessionId:'ee1adc',location:'smsService.js:sendSms:response',message:'iProg API response',data:{httpOk:response.ok,httpStatus:response.status,apiStatus,ok,messageId:data?.message_id||null,errorMsg:ok?null:(data?.message||data?.error||null)},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!ok) {
      return {
        success: false,
        error: data?.message || data?.error || JSON.stringify(data),
      };
    }

    return { success: true, messageId: data.message_id || null };
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ee1adc'},body:JSON.stringify({sessionId:'ee1adc',location:'smsService.js:sendSms:exception',message:'sendSms fetch threw',data:{error:err.message},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return { success: false, error: err.message };
  }
}
