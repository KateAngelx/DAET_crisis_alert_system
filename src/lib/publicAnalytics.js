/** Human-readable labels for tracked public paths */
export const PUBLIC_PAGE_LABELS = {
  "/": "Home",
  "/about": "About",
  "/contact": "Contact",
  "/faq": "FAQ",
  "/terms": "Terms",
  "/privacy": "Privacy",
  "/profile": "Profile",
  "/notifications": "Notifications",
  "/routes": "Roads & Travel",
  "/crisis": "Crisis Hub",
  "/crisis/resolved": "Resolved Alerts",
  "/crisis/reports": "My Reports",
  "/crisis/report": "Report Incident",
  "/crisis/dangerous-locations": "Area Hazards",
  "/crisis/routes": "Crisis Routes",
  "/crisis/alerts": "Alerts",
  "/login": "Sign In",
  "/register": "Register",
};

export function getPageLabel(path) {
  if (!path) return "Unknown page";
  if (PUBLIC_PAGE_LABELS[path]) return PUBLIC_PAGE_LABELS[path];
  if (path.startsWith("/routes/")) return "Route Detail";
  if (path.startsWith("/crisis/reports/")) return "Report Detail";
  return path.replace(/^\//, "").replace(/-/g, " ") || "Page";
}

export function startOfDayIso(daysAgo = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export function aggregatePageViews(rows = []) {
  const byPath = new Map();
  for (const row of rows) {
    const key = row.path || "/";
    byPath.set(key, (byPath.get(key) || 0) + 1);
  }
  return [...byPath.entries()]
    .map(([path, count]) => ({ path, label: getPageLabel(path), count }))
    .sort((a, b) => b.count - a.count);
}

export function countUniqueSessions(rows = []) {
  return new Set(rows.map((r) => r.session_id).filter(Boolean)).size;
}
