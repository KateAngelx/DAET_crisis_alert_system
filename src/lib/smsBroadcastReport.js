/** Short admin-facing summary of who got crisis SMS vs who was skipped */

export function formatSmsPerRecipientSummary(rows = []) {
  if (!rows.length) return "";

  const parts = rows.map((r) => {
    const who = r.name ? `${r.name}` : "Tourist";
    const phone = r.phoneMasked ? ` ${r.phoneMasked}` : "";
    if (!r.queued) {
      if (r.skipReason === "sms_pref_off") {
        return `${who}${phone}: SMS off in Profile (enable SMS to receive texts on alerts)`;
      }
      if (r.skipReason === "sms_suspended") {
        return `${who}${phone}: SMS suspended (sign in & re-enable SMS)`;
      }
      if (r.skipReason === "no_phone" || r.skipReason === "invalid_phone") {
        return `${who}: missing/invalid phone on profile`;
      }
      return `${who}${phone}: SMS not queued`;
    }
    if (r.status === "sent" && r.messageId) {
      return `${who}${phone}: SMS sent (${r.network || r.detectedNetwork || "network"})`;
    }
    if (r.status === "failed" || r.error) {
      return `${who}${phone}: SMS failed — iProg sees ${r.detectedNetwork || r.network || "?"} (fix phone or register sender name)`;
    }
    return `${who}${phone}: SMS pending`;
  });

  return ` Tourist SMS: ${parts.join("; ")}.`;
}
