const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Rule 3 for every role: the first thing on a page answers "Am I safe?".
 * One bar, one colour, one sentence, and a tap opens the alerts that matter.
 * `alerts` = the store's list; only active public alerts count.
 */
export function getSafetyStatus(alerts = [], { loading = false, error = null, loaded = true } = {}) {
  if (error && !alerts.length) {
    return { tone: "error", text: "Could not check alerts. Tap to try again.", href: "/crisis" };
  }
  if ((loading || !loaded) && !alerts.length) {
    return { tone: "loading", text: "Checking alerts in Daet...", href: "/crisis" };
  }
  const active = alerts.filter((alert) => alert.status === "Active" && alert.is_public !== false);
  const critical = active.filter((alert) => alert.severity === "Critical");
  const high = active.filter((alert) => alert.severity === "High");

  if (critical.length) {
    return {
      tone: "critical",
      text: `${plural(critical.length, "critical alert")} in Daet now. Tap to see what to do.`,
      href: critical.length === 1 ? `/crisis?alert=${critical[0].id}` : "/crisis",
    };
  }
  if (high.length) {
    return {
      tone: "high",
      text: `${plural(high.length, "high alert")} in Daet. Take care in the named areas.`,
      href: high.length === 1 ? `/crisis?alert=${high[0].id}` : "/crisis",
    };
  }
  if (active.length) {
    return {
      tone: "low",
      text: `No critical alerts. ${plural(active.length, "minor alert")} to be aware of.`,
      href: "/crisis",
    };
  }
  return { tone: "safe", text: "No active alerts in Daet right now.", href: "/crisis" };
}
