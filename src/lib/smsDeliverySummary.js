import { formatSemaphoreSmsErrorForAdmin } from "@/lib/semaphoreSmsErrors";

export function summarizeSmsDeliveryResults(deliveryResults = []) {
  const sms = deliveryResults.filter((r) => r.channel === "sms");
  const sent = sms.filter((r) => r.status === "sent").length;
  const failed = sms.filter((r) => r.status === "failed" || r.status === "retrying").length;
  const failedRow = sms.find((r) => r.error || r.status === "failed");
  const firstError = failedRow?.error || null;
  const errText = Array.isArray(firstError) ? firstError.join(" ") : firstError;
  const detectedNetwork = failedRow?.detectedNetwork || sms.find((r) => r.detectedNetwork)?.detectedNetwork || null;
  let adminMessage = formatSemaphoreSmsErrorForAdmin(errText);
  if (detectedNetwork && failed > 0) {
    adminMessage = `${adminMessage || errText || "SMS failed."} (Semaphore reports ${detectedNetwork}.)`;
  }
  return {
    attempted: sms.length,
    sent,
    failed,
    firstError: errText,
    detectedNetwork,
    adminMessage,
  };
}
