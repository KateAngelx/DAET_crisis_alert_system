/** Crisis alert update history and the required "All Clear" message. */

export const ALL_CLEAR_MIN_LENGTH = 15;
export const ALL_CLEAR_MAX_LENGTH = 500;

/** A starting point the admin edits before resolving. */
export function suggestAllClearMessage(alert) {
  const title = String(alert?.title || "The alert").trim();
  const location = String(alert?.location || "the area").trim();
  return `All clear: ${title} at ${location} is over. It is safe to return to normal activities. Follow any remaining instructions from local authorities.`;
}

/** @returns {string|null} an error message, or null when the text is usable. */
export function validateAllClearMessage(text) {
  const value = String(text ?? "").trim();
  if (value.length < ALL_CLEAR_MIN_LENGTH) {
    return `Write an All Clear message for tourists (at least ${ALL_CLEAR_MIN_LENGTH} characters).`;
  }
  if (value.length > ALL_CLEAR_MAX_LENGTH) {
    return `Keep the All Clear message under ${ALL_CLEAR_MAX_LENGTH} characters.`;
  }
  return null;
}

const FIELD_LABELS = {
  severity: "Severity",
  title: "Title",
  location: "Location",
  type: "Category",
  message: "Details",
};

/** Plain-language list of what changed between two history entries. */
export function describeAlertChanges(entry, previous) {
  if (!entry || !previous) return [];
  const changes = [];
  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    const before = String(previous[field] ?? "").trim();
    const after = String(entry[field] ?? "").trim();
    if (before === after) continue;
    changes.push(field === "message" ? `${label} updated` : `${label}: ${before || "—"} → ${after || "—"}`);
  }
  return changes;
}

const KIND_LABELS = {
  created: "Alert issued",
  updated: "Update",
  resolved: "All Clear",
  reopened: "Alert reopened",
};

/**
 * Turn history rows (any order) into a newest-first timeline with change summaries.
 * Each item: { id, kind, label, at, severity, message, allClear, changes }.
 */
export function buildAlertTimeline(rows = []) {
  const ordered = [...rows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const items = ordered.map((row, index) => ({
    id: row.id || `${row.kind}-${index}`,
    kind: row.kind,
    label: KIND_LABELS[row.kind] || "Update",
    at: row.created_at,
    severity: row.severity,
    message: row.kind === "updated" || row.kind === "created" ? row.message : null,
    allClear: row.kind === "resolved" ? row.all_clear_message || null : null,
    changes: row.kind === "updated" ? describeAlertChanges(row, ordered[index - 1]) : [],
  }));
  return items.reverse();
}
