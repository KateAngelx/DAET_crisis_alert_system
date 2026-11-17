/** Chat on incident reports: shared rules for the server and the chat panel. */

export const CHAT_MESSAGE_MAX = 2000;
export const CHAT_CLOSED_STATUSES = ["Closed", "Rejected"];

export const CHAT_ROLE_LABELS = {
  tourist: "Tourist",
  guide: "Guide",
  admin: "Tourism Office",
};

/** Tidy a message: trim, collapse runs of blank lines, cap the length. */
export function cleanChatMessage(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, CHAT_MESSAGE_MAX);
}

export function isChatReadOnly(status) {
  return CHAT_CLOSED_STATUSES.includes(status);
}

/** Short preview for the notice sent to other participants. */
export function chatNoticePreview(body, max = 120) {
  const flat = String(body || "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Group consecutive messages from the same sender within 5 minutes (for display). */
export function groupChatMessages(messages = []) {
  const groups = [];
  for (const message of messages) {
    const last = groups[groups.length - 1];
    const close = last && last.senderId === message.sender_id
      && Date.parse(message.created_at) - Date.parse(last.messages[last.messages.length - 1].created_at) <= 5 * 60 * 1000;
    if (close) last.messages.push(message);
    else groups.push({ senderId: message.sender_id, senderName: message.sender_name, senderRole: message.sender_role, messages: [message] });
  }
  return groups;
}
