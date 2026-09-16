/** iProg SMS error classification for admin messaging */

export const IPROG_SENDER_NAME_URL = "https://www.iprogsms.com/sender-names/new";

export function isIProgSenderNameError(errorMessage) {
  const msg = String(errorMessage || "").toLowerCase();
  return (
    msg.includes("sender name") ||
    msg.includes("shared sender") ||
    (msg.includes("smart") && msg.includes("tnt"))
  );
}

export function formatIProgSmsErrorForAdmin(errorMessage) {
  if (!errorMessage) return null;
  if (isIProgSenderNameError(errorMessage)) {
    return (
      "iProg rejected the SMS (often due to shared sender name — Smart/TNT block this; Globe/TM may still fail until a sender name is approved). " +
      `Register at ${IPROG_SENDER_NAME_URL}. Compare the tourist profile phone with the SIM; credits are not used until iProg returns a message_id.`
    );
  }
  return errorMessage;
}
