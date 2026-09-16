import { formatIProgSmsErrorForAdmin } from "@/lib/iprogSmsErrors";

export function summarizeSmsDeliveryResults(deliveryResults = []) {
  const sms = deliveryResults.filter((r) => r.channel === "sms");
  const sent = sms.filter((r) => r.status === "sent").length;
  const failed = sms.filter((r) => r.status === "failed" || r.status === "retrying").length;
  const failedRow = sms.find((r) => r.error || r.status === "failed");
  const firstError = failedRow?.error || null;
  const errText = Array.isArray(firstError) ? firstError.join(" ") : firstError;
  const detectedNetwork = failedRow?.detectedNetwork || sms.find((r) => r.detectedNetwork)?.detectedNetwork || null;
  let adminMessage = formatIProgSmsErrorForAdmin(errText);
  if (detectedNetwork && failed > 0) {
    adminMessage = `${adminMessage || errText || "SMS failed."} (iProg network detect: ${detectedNetwork}.)`;
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
