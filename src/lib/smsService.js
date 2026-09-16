import { agentDebugLog } from "@/lib/agentDebugLog.server";
import { formatPhoneForIProgApi, normalizePhilippinePhone } from "@/lib/phoneUtils";
import { isIProgSenderNameError } from "@/lib/iprogSmsErrors";
import { truncateForSms, getSmsMaxLength } from "@/lib/smsMessageFormat";

export { formatPhoneForIProgApi, normalizePhilippinePhone } from "@/lib/phoneUtils";

const DEFAULT_IPROG_URL = "https://sms.iprogtech.com/api/v1/sms_messages";

function getSmsConfig() {
  const parsedProvider = parseInt(process.env.SMS_PROVIDER ?? "0", 10);
  return {
    url: process.env.SMS_API_URL || DEFAULT_IPROG_URL,
    token: process.env.IPROG_SMS_API_TOKEN || process.env.SMS_API_KEY || "",
    /** iProg default is 0 — avoid cycling 2/0/1 which charges credits per attempt */
    provider: Number.isFinite(parsedProvider) ? parsedProvider : 0,
    allowQueryFallback: process.env.SMS_IPROG_QUERY_FALLBACK === "true",
  };
}

function normalizeIProgMessage(message) {
  if (Array.isArray(message)) return message.map(String).join(" ");
  if (message == null) return "";
  return String(message);
}

function parseIProgSendResponse(data, httpOk) {
  if (!httpOk) {
    return { ok: false, error: normalizeIProgMessage(data?.message) || "SMS HTTP request failed" };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Empty SMS API response" };
  }
  if (data.status === "error" || data.status === 500 || data.status === "failed") {
    return { ok: false, error: normalizeIProgMessage(data.message) || "SMS provider returned an error" };
  }

  const messageId = data.message_id || (typeof data.message_ids === "string" ? data.message_ids.split(",")[0]?.trim() : null);
  const statusOk = data.status === 200 || data.status === "success";

  if (statusOk && messageId) {
    return { ok: true, messageId, apiMessage: data.message || null };
  }

  return {
    ok: false,
    error: normalizeIProgMessage(data.message) || `Unexpected iProg response (status=${String(data.status)})`,
    rawStatus: data.status,
  };
}

async function postIProgJson({ url, token, phone_number, message, sms_provider }) {
  const jsonResponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      api_token: token,
      phone_number,
      message,
      sms_provider,
    }),
  });

  const jsonData = await jsonResponse.json().catch(async () => ({
    message: await jsonResponse.text().catch(() => "Unknown error"),
  }));

  const parsed = parseIProgSendResponse(jsonData, jsonResponse.ok);
  return {
    ...parsed,
    mode: "json",
    httpStatus: jsonResponse.status,
    raw: jsonData,
  };
}

async function postIProgQuery({ url, token, phone_number, message, sms_provider }) {
  const params = new URLSearchParams({
    api_token: token,
    phone_number,
    message,
    sms_provider: String(sms_provider),
  });
  const queryResponse = await fetch(`${url}?${params.toString()}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  const queryData = await queryResponse.json().catch(async () => ({
    message: await queryResponse.text().catch(() => "Unknown error"),
  }));

  const parsed = parseIProgSendResponse(queryData, queryResponse.ok);
  return {
    ...parsed,
    mode: "query",
    httpStatus: queryResponse.status,
    raw: queryData,
  };
}

function getIProgApiBase(url) {
  return url.replace(/\/sms_messages\/?$/, "");
}

/** iProg network lookup — confirms Globe/TM vs Smart/TNT for the stored number */
export async function detectIProgPhoneNetwork(rawPhone) {
  const { url, token } = getSmsConfig();
  const localPhone = normalizePhilippinePhone(rawPhone);
  if (!token || !localPhone) {
    return { ok: false, error: "Missing token or invalid phone" };
  }

  try {
    const res = await fetch(`${getIProgApiBase(url)}/phone_numbers/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ api_token: token, phone_number: localPhone }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok && data?.status !== "error",
      network: data?.data?.network || null,
      isSmartTnt: Boolean(data?.data?.is_smart_tnt),
      raw: data,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function fetchIProgMessageStatus(messageId) {
  const { url, token } = getSmsConfig();
  if (!token || !messageId) return { ok: false, error: "Missing token or message_id" };

  const statusUrl = `${getIProgApiBase(url)}/sms_messages/status?api_token=${encodeURIComponent(token)}&message_id=${encodeURIComponent(messageId)}`;

  try {
    const res = await fetch(statusUrl, { method: "GET", headers: { Accept: "application/json" } });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok && data?.status !== "error",
      messageStatus: data?.message_status || null,
      raw: data,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function isPermanentSmsError(errorMessage) {
  const msg = String(errorMessage || "").toLowerCase();
  return (
    msg.includes("invalid phone") ||
    msg.includes("invalid token") ||
    msg.includes("validation") ||
    msg.includes("phishing") ||
    msg.includes("insufficient") ||
    msg.includes("not configured") ||
    isIProgSenderNameError(errorMessage)
  );
}

export async function sendSms({ to, message }) {
  const { url, token, provider, allowQueryFallback } = getSmsConfig();
  const tokenConfigured = Boolean(token);

  agentDebugLog({
    sessionId: "197cec",
    location: "smsService.js:sendSms:entry",
    message: "sendSms called",
    hypothesisId: "A",
    runId: "sms-fix-v1",
    data: { tokenConfigured, provider, allowQueryFallback, rawToPrefix: String(to || "").slice(0, 4) },
  });

  if (!token) {
    console.warn("[SmsService] SMS not configured. Set IPROG_SMS_API_TOKEN.");
    return { success: false, error: "SMS service not configured", skipped: true };
  }

  const localPhone = normalizePhilippinePhone(to);
  const intlPhone = formatPhoneForIProgApi(to);
  if (!localPhone) {
    agentDebugLog({
      sessionId: "197cec",
      location: "smsService.js:sendSms:invalidPhone",
      message: "phone normalization failed",
      hypothesisId: "D",
      runId: "sms-fix-v1",
      data: { rawLength: String(to || "").length },
    });
    return { success: false, error: `Invalid Philippine phone number: ${to}`, permanent: true };
  }

  const rawLength = String(message ?? "").length;
  const smsMessage = truncateForSms(message);
  let apiAttempts = 0;

  const networkInfo = await detectIProgPhoneNetwork(localPhone);

  try {
    /** iProg JSON docs use 09XXXXXXXXX; try local first, then 639… if needed */
    const phoneFormats = [...new Set([localPhone, intlPhone].filter(Boolean))];
    let result = null;
    let usedPhoneFormat = phoneFormats[0];

    for (const phone_number of phoneFormats) {
      result = await postIProgJson({
        url,
        token,
        phone_number,
        message: smsMessage,
        sms_provider: provider,
      });
      apiAttempts += 1;
      usedPhoneFormat = phone_number;
      if (result.ok) break;
      const err = String(result.error || "").toLowerCase();
      if (!err.includes("invalid phone") && !err.includes("invalid format")) {
        break;
      }
    }

    if (result && !result.ok && allowQueryFallback) {
      result = await postIProgQuery({
        url,
        token,
        phone_number: usedPhoneFormat,
        message: smsMessage,
        sms_provider: provider,
      });
      apiAttempts += 1;
    }

    agentDebugLog({
      sessionId: "197cec",
      location: "smsService.js:sendSms:response",
      message: "iProg API response",
      hypothesisId: "G-globe",
      runId: "sms-globe-v1",
      data: {
        provider,
        mode: result?.mode,
        httpStatus: result?.httpStatus,
        apiStatus: result?.raw?.status,
        ok: result?.ok,
        messageId: result?.messageId || null,
        apiAttempts,
        rawLength,
        sentLength: smsMessage.length,
        maxLength: getSmsMaxLength(),
        phoneFormat: usedPhoneFormat?.startsWith("0") ? "09xxxxxxxxxx" : "63xxxxxxxxxx",
        detectedNetwork: networkInfo.network || null,
        isSmartTnt: networkInfo.isSmartTnt,
        errorMsg: result?.ok ? null : result?.error || null,
      },
    });

    if (result?.ok) {
      return {
        success: true,
        messageId: result.messageId,
        provider,
        mode: result.mode,
        apiMessage: result.apiMessage,
        normalizedPhone: localPhone,
        detectedNetwork: networkInfo.network || null,
        billed: true,
      };
    }

    return {
      success: false,
      error: result?.error || "Unknown SMS error",
      permanent: isPermanentSmsError(result?.error),
      errorCode: isIProgSenderNameError(result?.error) ? "IPROG_SENDER_NAME" : undefined,
      apiAttempts,
      billed: false,
      detectedNetwork: networkInfo.network || null,
    };
  } catch (err) {
    agentDebugLog({
      sessionId: "197cec",
      location: "smsService.js:sendSms:exception",
      message: "sendSms fetch threw",
      hypothesisId: "C",
      runId: "sms-fix-v1",
      data: { provider, error: err.message, apiAttempts },
    });
    return { success: false, error: err.message, apiAttempts };
  }
}

/** Non-secret diagnostics for admin test endpoint */
export function getSmsDiagnostics() {
  const { url, token, provider, allowQueryFallback } = getSmsConfig();
  return {
    tokenConfigured: Boolean(token),
    tokenLength: token ? token.length : 0,
    apiUrl: url,
    provider,
    allowQueryFallback,
    envKeysChecked: ["IPROG_SMS_API_TOKEN", "SMS_API_KEY"],
  };
}
