/** Semaphore SMS error classification for admin messaging */

export const SEMAPHORE_ACCOUNT_URL = "https://semaphore.co/account";

export function isSemaphoreSenderNameError(errorMessage) {
  const message = String(errorMessage || "").toLowerCase();
  return message.includes("sendername") || message.includes("sender name");
}

export function formatSemaphoreSmsErrorForAdmin(errorMessage) {
  if (!errorMessage) return null;
  if (isSemaphoreSenderNameError(errorMessage)) {
    return `${errorMessage} Check that your sender name is active in your Semaphore account: ${SEMAPHORE_ACCOUNT_URL}`;
  }
  return errorMessage;
}
