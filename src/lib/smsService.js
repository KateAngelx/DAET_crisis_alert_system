import { agentDebugLog } from "@/lib/agentDebugLog.server";
import { formatPhoneForSemaphoreApi, normalizePhilippinePhone } from "@/lib/phoneUtils";
import { isSemaphoreSenderNameError } from "@/lib/semaphoreSmsErrors";
import { truncateForSms, getSmsMaxLength } from "@/lib/smsMessageFormat";

export { formatPhoneForSemaphoreApi, normalizePhilippinePhone } from "@/lib/phoneUtils";

const DEFAULT_SEMAPHORE_URL = "https://api.semaphore.co/api/v4/messages";
const DEFAULT_IPROG_URL = "https://www.iprogsms.com/api/v1/sms_messages";
const SMS_REQUEST_TIMEOUT_MS = 15000;
const SMS_PROVIDERS = ["semaphore", "iprog"];

function getSmsConfig() {
  const configuredPrimary = (process.env.SMS_PRIMARY_PROVIDER || "semaphore").trim().toLowerCase();
  return {
    primaryProvider: configuredPrimary,
    configurationError: SMS_PROVIDERS.includes(configuredPrimary)
      ? null
      : `Invalid SMS_PRIMARY_PROVIDER "${configuredPrimary}". Use "semaphore" or "iprog".`,
    semaphore: {
      url: process.env.SEMAPHORE_API_URL || DEFAULT_SEMAPHORE_URL,
      apiKey: process.env.SEMAPHORE_API_KEY || "",
      senderName: process.env.SEMAPHORE_SENDER_NAME || "",
    },
    iprog: {
      url: process.env.IPROG_SMS_API_URL || process.env.SMS_API_URL || DEFAULT_IPROG_URL,
      apiToken: process.env.IPROG_SMS_API_TOKEN || "",
    },
  };
}

function getProviderError(data) {
  if (Array.isArray(data)) data = data[0];
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";
  const errors = data.errors;
  if (Array.isArray(errors)) {
    return errors.map((error) => (typeof error === "string" ? error : error?.message)).filter(Boolean).join("; ");
  }
  if (errors && typeof errors === "object") return Object.values(errors).flat().join("; ");
  return String(data.error || data.message || "");
}

async function postSemaphoreMessage({ url, apiKey, senderName, number, message }) {
  const body = new URLSearchParams({ apikey: apiKey, number, message });
  if (senderName) body.set("sendername", senderName);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS),
  });
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }

  const item = Array.isArray(data) ? data[0] : data;
  const messageId = item?.message_id;
  if (!response.ok || !messageId) {
    return {
      ok: false,
      error: getProviderError(data) || `Semaphore request failed (HTTP ${response.status})`,
      httpStatus: response.status,
    };
  }

  return {
    ok: true,
    messageId: String(messageId),
    apiMessage: item.message || null,
    deliveryStatus: item.status || null,
    network: item.network || null,
    httpStatus: response.status,
  };
}

async function postIprogMessage({ url, apiToken, number, message }) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ api_token: apiToken, phone_number: number, message }),
    signal: AbortSignal.timeout(SMS_REQUEST_TIMEOUT_MS),
  });
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }

  const messageId = data?.message_id;
  if (!response.ok || !messageId) {
    return {
      ok: false,
      error: getProviderError(data) || `iProg request failed (HTTP ${response.status})`,
      httpStatus: response.status,
    };
  }

  return {
    ok: true,
    messageId: String(messageId),
    apiMessage: data.message || null,
    deliveryStatus: data.message_status || null,
    httpStatus: response.status,
  };
}

export function isPermanentSmsError(errorMessage) {
  const msg = String(errorMessage || "").toLowerCase();
  return (
    msg.includes("invalid phone") ||
    msg.includes("invalid number") ||
    msg.includes("invalid api") ||
    msg.includes("invalid key") ||
    msg.includes("unauthorized") ||
    msg.includes("validation") ||
    msg.includes("phishing") ||
    msg.includes("insufficient") ||
    msg.includes("not configured") ||
    isSemaphoreSenderNameError(errorMessage)
  );
}

export async function sendSms({ to, message }) {
  const config = getSmsConfig();
  const { semaphore, iprog, primaryProvider, configurationError } = config;
  const providers = primaryProvider === "iprog" ? ["iprog", "semaphore"] : SMS_PROVIDERS;
  const configuredProviders = providers.filter((provider) =>
    provider === "semaphore" ? Boolean(semaphore.apiKey) : Boolean(iprog.apiToken)
  );

  agentDebugLog({
    sessionId: "197cec",
    location: "smsService.js:sendSms:entry",
    message: "sendSms called",
    hypothesisId: "A",
    runId: "sms-provider-failover-v1",
    data: {
      primaryProvider,
      configuredProviders,
      rawToPrefix: String(to || "").slice(0, 4),
    },
  });

  if (configurationError) {
    console.error(`[SmsService] ${configurationError}`);
    return { success: false, error: configurationError, permanent: true };
  }

  if (!configuredProviders.length) {
    console.warn("[SmsService] SMS not configured. Set SEMAPHORE_API_KEY or IPROG_SMS_API_TOKEN.");
    return { success: false, error: "SMS service not configured", skipped: true };
  }

  const localPhone = normalizePhilippinePhone(to);
  const apiPhone = formatPhoneForSemaphoreApi(to);
  if (!localPhone || !apiPhone) {
    return { success: false, error: `Invalid Philippine phone number: ${to}`, permanent: true };
  }

  const rawLength = String(message ?? "").length;
  const smsMessage = truncateForSms(message);
  const attempts = [];

  for (const provider of configuredProviders) {
    try {
      const result =
        provider === "semaphore"
          ? await postSemaphoreMessage({
              ...semaphore,
              number: apiPhone,
              message: smsMessage,
            })
          : await postIprogMessage({
              ...iprog,
              number: apiPhone,
              message: smsMessage,
            });

      attempts.push({ provider, ...result });
      agentDebugLog({
        sessionId: "197cec",
        location: "smsService.js:sendSms:response",
        message: "SMS provider response",
        hypothesisId: "G-semaphore",
        runId: "sms-provider-failover-v1",
        data: {
          provider,
          httpStatus: result.httpStatus,
          ok: result.ok,
          messageId: result.messageId || null,
          rawLength,
          sentLength: smsMessage.length,
          maxLength: getSmsMaxLength(),
          apiStatus: result.deliveryStatus || null,
          network: result.network || null,
          errorMsg: result.ok ? null : result.error || null,
        },
      });

      if (result.ok) {
        return {
          success: true,
          messageId: result.messageId,
          provider,
          fallbackFrom: attempts.length > 1 ? attempts[0].provider : undefined,
          mode: provider === "semaphore" ? "form" : "json",
          apiMessage: result.apiMessage,
          normalizedPhone: localPhone,
          detectedNetwork: result.network || null,
          deliveryStatus: result.deliveryStatus || null,
          apiAttempts: attempts.length,
          billed: true,
        };
      }
    } catch (err) {
      const error = `${provider} request failed (${err.name || "network error"})`;
      attempts.push({ provider, ok: false, error });
      agentDebugLog({
        sessionId: "197cec",
        location: "smsService.js:sendSms:exception",
        message: "SMS provider request failed",
        hypothesisId: "C",
        runId: "sms-provider-failover-v1",
        data: { provider, errorName: err.name || "Error" },
      });
    }
  }

  const error = attempts.map(({ provider, error }) => `${provider}: ${error || "request failed"}`).join("; ");
  const allPermanent = attempts.every(({ error }) => isPermanentSmsError(error));
  const semaphoreError = attempts.find(({ provider }) => provider === "semaphore")?.error;
  return {
    success: false,
    error: error || "All configured SMS providers failed",
    permanent: allPermanent,
    errorCode: isSemaphoreSenderNameError(semaphoreError) ? "SEMAPHORE_SENDER_NAME" : undefined,
    apiAttempts: attempts.length,
    billed: false,
  };
}

/** Non-secret diagnostics for admin test endpoint */
export function getSmsDiagnostics() {
  const { semaphore, iprog, primaryProvider, configurationError } = getSmsConfig();
  return {
    provider: primaryProvider,
    primaryProvider,
    providerOrder: primaryProvider === "iprog" ? ["iprog", "semaphore"] : SMS_PROVIDERS,
    tokenConfigured: Boolean(semaphore.apiKey || iprog.apiToken),
    providersConfigured: {
      semaphore: Boolean(semaphore.apiKey),
      iprog: Boolean(iprog.apiToken),
    },
    senderNameConfigured: Boolean(semaphore.senderName),
    apiUrls: {
      semaphore: semaphore.url,
      iprog: iprog.url,
    },
    configurationError,
    envKeysChecked: ["SMS_PRIMARY_PROVIDER", "SEMAPHORE_API_KEY", "SEMAPHORE_SENDER_NAME", "IPROG_SMS_API_TOKEN"],
  };
}
