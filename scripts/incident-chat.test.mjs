import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_MESSAGE_MAX,
  chatNoticePreview,
  cleanChatMessage,
  groupChatMessages,
  isChatReadOnly,
} from "@/lib/incidentChat";
import { notificationIconName } from "@/lib/typeIcons";

test("messages are tidied and kept within the limit", () => {
  assert.equal(cleanChatMessage("  Hello  \r\n\r\n\r\n\r\nAre you OK?  "), "Hello\n\nAre you OK?");
  assert.equal(cleanChatMessage("   "), "");
  assert.equal(cleanChatMessage(null), "");
  assert.equal(cleanChatMessage("x".repeat(5000)).length, CHAT_MESSAGE_MAX);
});

test("the chat becomes read-only once a report is Closed or Rejected", () => {
  assert.equal(isChatReadOnly("Closed"), true);
  assert.equal(isChatReadOnly("Rejected"), true);
  for (const status of ["Submitted", "Received", "Under Review", "Assigned", "Responding", "Resolved"]) {
    assert.equal(isChatReadOnly(status), false, status);
  }
});

test("notice previews are one short line", () => {
  assert.equal(chatNoticePreview("We found\nher at the\tlighthouse"), "We found her at the lighthouse");
  assert.equal(chatNoticePreview("y".repeat(300)).length, 120);
});

test("consecutive messages from one sender within 5 minutes are grouped", () => {
  const at = (min) => new Date(Date.UTC(2026, 10, 15, 4, min)).toISOString();
  const groups = groupChatMessages([
    { id: 1, sender_id: "a", sender_name: "Ana", sender_role: "tourist", created_at: at(0) },
    { id: 2, sender_id: "a", sender_name: "Ana", sender_role: "tourist", created_at: at(3) },
    { id: 3, sender_id: "b", sender_name: "Office", sender_role: "admin", created_at: at(4) },
    { id: 4, sender_id: "b", sender_name: "Office", sender_role: "admin", created_at: at(20) },
  ]);
  assert.deepEqual(groups.map((g) => g.messages.map((m) => m.id)), [[1, 2], [3], [4]]);
});

test("message notices get a speech-bubble icon", () => {
  assert.equal(notificationIconName({ notification_type: "incident_message", related_type: "incident" }), "MessageSquare");
});
