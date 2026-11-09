export function subscriptionsForRecipient(rows, userId) {
  const seen = new Set();
  const targets = [];
  for (const row of rows || []) {
    if (!row || row.user_id !== userId || row.enabled !== true) continue;
    if (typeof row.endpoint !== "string" || !row.endpoint || seen.has(row.endpoint)) continue;
    seen.add(row.endpoint);
    targets.push(row);
  }
  return targets;
}

export function summarizePushDeliveries(settled) {
  const summary = { sent: 0, failed: 0, expired: 0, expiredIds: [], errors: [] };
  for (const delivery of settled || []) {
    if (delivery.status === "fulfilled" && delivery.value?.sent) summary.sent += 1;
    else if (delivery.status === "fulfilled" && delivery.value?.expired) {
      summary.expired += 1;
      if (delivery.value.id) summary.expiredIds.push(delivery.value.id);
    } else if (delivery.status === "rejected") {
      summary.failed += 1;
      summary.errors.push(delivery.reason?.message || "Web Push delivery failed");
    }
  }
  return summary;
}

export async function runPushDeliveries(targets, sendOne) {
  const settled = await Promise.allSettled((targets || []).map(async (row) => {
    try {
      await sendOne(row);
      return { id: row.id, endpoint: row.endpoint, sent: true };
    } catch (pushError) {
      if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
        return { id: row.id, endpoint: row.endpoint, expired: true };
      }
      throw new Error(pushError?.message || "Web Push delivery failed");
    }
  }));
  return { settled, summary: summarizePushDeliveries(settled) };
}

export function planSubscriptionReconcile(row, actingUserId) {
  if (!row) return { action: "none", deviceEnabled: false };
  if (row.user_id === actingUserId) {
    if (row.enabled === true) return { action: "keep", deviceEnabled: true };
    if (row.disabled_reason === "account_switch") return { action: "restore", deviceEnabled: true };
    return { action: "leave_disabled", deviceEnabled: false };
  }
  if (row.enabled === true) return { action: "park_other", deviceEnabled: false };
  return { action: "none", deviceEnabled: false };
}
