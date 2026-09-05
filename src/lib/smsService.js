import { agentDebugLog } from "@/lib/agentDebugLog.server";

const DEFAULT_IPROG_URL = "https://sms.iprogtech.com/api/v1/sms_messages";

function getSmsConfig() {
  return {
    url: process.env.SMS_API_URL || DEFAULT_IPROG_URL,
    token: process.env.IPROG_SMS_API_TOKEN || process.env.SMS_API_KEY || "",
    provider: parseInt(process.env.SMS_PROVIDER || "2", 10) || 2,
  };
}

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

async function callIProg({ url, token, phone_number, message, sms_provider }) {
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

  const jsonOk =
    jsonResponse.ok &&
    jsonData?.status !== "error" &&
    (jsonData?.status === undefined ||
      jsonData?.status === 200 ||
      jsonData?.status === "success");

  if (jsonOk) {
    return { ok: true, data: jsonData, mode: "json", httpStatus: jsonResponse.status };
  }

  // Fallback: query-string POST (documented alternate format)
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

  const queryOk =
    queryResponse.ok &&
    queryData?.status !== "error" &&
    (queryData?.status === undefined ||
      queryData?.status === 200 ||
      queryData?.status === "success");

  return {
    ok: queryOk,
    data: queryOk ? queryData : jsonData,
    mode: queryOk ? "query" : "json",
    httpStatus: queryOk ? queryResponse.status : jsonResponse.status,
    jsonError: jsonOk ? null : jsonData?.message || jsonData?.error,
    queryError: queryOk ? null : queryData?.message || queryData?.error,
  };
}

export async function sendSms({ to, message }) {
  const { url, token, provider } = getSmsConfig();
  const tokenConfigured = Boolean(token);

  agentDebugLog({
    location: "smsService.js:sendSms:entry",
    message: "sendSms called",
    hypothesisId: "A",
    data: { tokenConfigured, provider, rawToPrefix: String(to || "").slice(0, 4) },
  });

  if (!token) {
    console.warn("[SmsService] SMS not configured. Set IPROG_SMS_API_TOKEN.");
    return { success: false, error: "SMS service not configured", skipped: true };
  }

  const phone_number = normalizePhilippinePhone(to);
  if (!phone_number) {
    agentDebugLog({
      location: "smsService.js:sendSms:invalidPhone",
      message: "phone normalization failed",
      hypothesisId: "D",
      data: { rawLength: String(to || "").length },
    });
    return { success: false, error: `Invalid Philippine phone number: ${to}` };
  }

  const smsMessage = String(message).substring(0, 160);
  const providersToTry = [provider, 0, 1, 2].filter(
    (value, index, arr) => arr.indexOf(value) === index
  );

  let lastError = "Unknown SMS error";

  for (const sms_provider of providersToTry) {
    try {
      const result = await callIProg({
        url,
        token,
        phone_number,
        message: smsMessage,
        sms_provider,
      });

      agentDebugLog({
        location: "smsService.js:sendSms:response",
        message: "iProg API response",
        hypothesisId: "C",
        data: {
          provider: sms_provider,
          mode: result.mode,
          httpStatus: result.httpStatus,
          apiStatus: result.data?.status,
          ok: result.ok,
          messageId: result.data?.message_id || null,
          errorMsg: result.ok
            ? null
            : result.data?.message || result.jsonError || result.queryError || null,
        },
      });

      if (result.ok) {
        return {
          success: true,
          messageId: result.data?.message_id || null,
          provider: sms_provider,
          mode: result.mode,
        };
      }

      lastError =
        result.data?.message ||
        result.jsonError ||
        result.queryError ||
        JSON.stringify(result.data);
    } catch (err) {
      lastError = err.message;
      agentDebugLog({
        location: "smsService.js:sendSms:exception",
        message: "sendSms fetch threw",
        hypothesisId: "C",
        data: { provider: sms_provider, error: err.message },
      });
    }
  }

  return { success: false, error: lastError };
}

/** Non-secret diagnostics for admin test endpoint */
export function getSmsDiagnostics() {
  const { url, token, provider } = getSmsConfig();
  return {
    tokenConfigured: Boolean(token),
    tokenLength: token ? token.length : 0,
    apiUrl: url,
    provider,
    envKeysChecked: ["IPROG_SMS_API_TOKEN", "SMS_API_KEY"],
  };
}
