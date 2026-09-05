export const DANGER_TYPES = [
  "Flooding",
  "Landslide",
  "Road Closure",
  "Crime/Security",
  "Weather Hazard",
  "Construction",
  "Accident",
  "Other",
];

export const DANGER_SEVERITIES = ["Caution", "Dangerous", "Critical"];

export function getDangerSeverityStyles(severity) {
  const map = {
    Critical: {
      border: "border-red-600",
      badge: "bg-red-600 text-white",
      text: "text-red-700",
      bg: "bg-red-50",
      icon: "bg-red-600 text-white",
      label: "Dangerous Location",
    },
    Dangerous: {
      border: "border-red-600",
      badge: "bg-red-600 text-white",
      text: "text-red-700",
      bg: "bg-red-50",
      icon: "bg-red-600 text-white",
      label: "Unsafe Route",
    },
    Caution: {
      border: "border-orange-500",
      badge: "bg-orange-500 text-white",
      text: "text-orange-700",
      bg: "bg-orange-50",
      icon: "bg-orange-500 text-white",
      label: "Potential Risk",
    },
  };
  return map[severity] || map.Caution;
}

export function dangerSeverityToPriority(severity) {
  const map = { Caution: "HIGH", Dangerous: "CRITICAL", Critical: "CRITICAL" };
  return map[severity] || "HIGH";
}

export function formatWarningTimeRange(warning) {
  const start = warning.warning_starts_at
    ? new Date(warning.warning_starts_at).toLocaleString()
    : null;
  const end = warning.warning_ends_at
    ? new Date(warning.warning_ends_at).toLocaleString()
    : null;
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  return "Active now";
}

export function formatRouteUpdatedAt(warning) {
  const ts = warning?.updated_at || warning?.created_at;
  if (!ts) return null;

  const date = new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;

  return `Last updated ${date.toLocaleString()}`;
}

export function formatRouteExpiry(warning) {
  if (!warning?.warning_ends_at) {
    return {
      text: "No end time set — check with LGU before you travel.",
      tone: "neutral",
    };
  }

  const end = new Date(warning.warning_ends_at);
  if (Number.isNaN(end.getTime())) {
    return { text: null, tone: "neutral" };
  }

  if (end.getTime() < Date.now()) {
    return {
      text: `This advisory expired on ${end.toLocaleString()}. Confirm the latest status with LGU before traveling.`,
      tone: "expired",
    };
  }

  return {
    text: `Expected to clear by ${end.toLocaleString()}.`,
    tone: "active",
  };
}

export function matchesRouteTerms(warning, terms = []) {
  if (!warning || !terms.length) return false;
  const haystack = [
    warning.dangerous_location,
    warning.destination,
    warning.current_location,
    warning.alternative_route,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return terms.some((term) => {
    const t = term.toLowerCase().trim();
    if (!t) return false;
    return haystack.includes(t) || t.includes(haystack.trim());
  });
}
