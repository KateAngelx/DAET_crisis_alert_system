/** Human-readable "Edited …" / "Published …" labels for admin and public records. */

export function formatEditedAtLabel(timestamp, { prefix = "Edited" } = {}) {
  const ts = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(ts)) return null;
  return `${prefix} ${new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

/** Prefer edit time when it is meaningfully after publish/create. */
export function formatRecordTimestamps({ created_at, published_at, updated_at, resolved_at } = {}) {
  const published = published_at || created_at;
  const edited = updated_at && published && Date.parse(updated_at) > Date.parse(published) + 60_000
    ? formatEditedAtLabel(updated_at)
    : null;
  const publishedLabel = published ? formatEditedAtLabel(published, { prefix: "Published" }) : null;
  const resolvedLabel = resolved_at ? formatEditedAtLabel(resolved_at, { prefix: "Resolved" }) : null;
  return { edited, published: publishedLabel, resolved: resolvedLabel };
}