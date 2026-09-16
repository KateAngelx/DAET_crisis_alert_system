/** Default timezone for Daet tourism office dashboards */
export const DASHBOARD_TIMEZONE = "Asia/Manila";

/** Admin dashboard time ranges (all bucketed from DB timestamps in Asia/Manila) */
export const DASHBOARD_PERIODS = {
  "7d": { granularity: "day", count: 7, label: "Last 7 days", chartTitle: "7 Days", kpiShort: "7d" },
  "30d": { granularity: "day", count: 30, label: "Last 30 days", chartTitle: "30 Days", kpiShort: "30d" },
  "12m": { granularity: "month", count: 12, label: "Last 12 months", chartTitle: "12 Months", kpiShort: "12 mo" },
  "5y": { granularity: "year", count: 5, label: "Last 5 years", chartTitle: "5 Years", kpiShort: "5 yr" },
};

export function normalizeDashboardPeriod(period) {
  return DASHBOARD_PERIODS[period] ? period : "7d";
}

export function getDashboardPeriodConfig(period) {
  return DASHBOARD_PERIODS[normalizeDashboardPeriod(period)];
}

/** YYYY-MM-DD for a timestamp in the given IANA timezone */
export function toDayKey(value, timeZone = DASHBOARD_TIMEZONE) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** YYYY-MM in timezone */
export function toMonthKey(value, timeZone = DASHBOARD_TIMEZONE) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return year && month ? `${year}-${month}` : null;
}

/** YYYY in timezone */
export function toYearKey(value, timeZone = DASHBOARD_TIMEZONE) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric" }).format(d);
}

/** Build daily buckets for the last N days (inclusive, ending today in timezone). */
export function getLastNDays(days = 7, timeZone = DASHBOARD_TIMEZONE) {
  const result = [];
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weekday = new Intl.DateTimeFormat(undefined, { timeZone, weekday: "short" });
  const short = new Intl.DateTimeFormat(undefined, { timeZone, month: "short", day: "numeric" });
  const dayNum = new Intl.DateTimeFormat(undefined, { timeZone, day: "numeric" });

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = formatter.format(d);
    result.push({
      key,
      label: days > 14 ? dayNum.format(d) : weekday.format(d),
      short: short.format(d),
    });
  }
  return result;
}

export function getLastNMonths(months = 12, timeZone = DASHBOARD_TIMEZONE) {
  const result = [];
  const monthFmt = new Intl.DateTimeFormat(undefined, { timeZone, month: "short" });
  const shortFmt = new Intl.DateTimeFormat(undefined, { timeZone, month: "short", year: "numeric" });

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    d.setMonth(d.getMonth() - i);
    const key = toMonthKey(d, timeZone);
    if (!key) continue;
    result.push({
      key,
      label: monthFmt.format(d),
      short: shortFmt.format(d),
    });
  }
  return result;
}

export function getLastNYears(years = 5, timeZone = DASHBOARD_TIMEZONE) {
  const result = [];
  for (let i = years - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setMonth(6, 1);
    d.setHours(12, 0, 0, 0);
    d.setFullYear(d.getFullYear() - i);
    const key = toYearKey(d, timeZone);
    if (!key) continue;
    result.push({
      key,
      label: key,
      short: key,
    });
  }
  return result;
}

export function getTimeBuckets(period, timeZone = DASHBOARD_TIMEZONE) {
  const config = getDashboardPeriodConfig(period);
  if (config.granularity === "month") return getLastNMonths(config.count, timeZone);
  if (config.granularity === "year") return getLastNYears(config.count, timeZone);
  return getLastNDays(config.count, timeZone);
}

export function bucketKeyForDate(value, granularity, timeZone = DASHBOARD_TIMEZONE) {
  if (granularity === "month") return toMonthKey(value, timeZone);
  if (granularity === "year") return toYearKey(value, timeZone);
  return toDayKey(value, timeZone);
}

/** UTC ms at end of a calendar day (23:59:59.999) in the given timezone */
export function endOfDayMs(dayKey, timeZone = DASHBOARD_TIMEZONE) {
  const [year, month, day] = dayKey.split("-").map(Number);
  let low = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 24 * 60 * 60 * 1000;
  let high = Date.UTC(year, month - 1, day, 23, 59, 59, 999) + 24 * 60 * 60 * 1000;

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    const midKey = toDayKey(new Date(mid).toISOString(), timeZone);
    if (midKey === dayKey) low = mid;
    else if (midKey < dayKey) low = mid;
    else high = mid;
  }

  for (let offset = 0; offset <= 24 * 60 * 60 * 1000; offset += 60 * 1000) {
    const candidate = low + offset;
    if (toDayKey(new Date(candidate).toISOString(), timeZone) === dayKey) {
      for (let end = candidate; end < candidate + 24 * 60 * 60 * 1000; end += 1000) {
        if (toDayKey(new Date(end).toISOString(), timeZone) !== dayKey) {
          return end - 1;
        }
      }
    }
  }

  return Date.UTC(year, month - 1, day, 23, 59, 59, 999);
}

/** ISO timestamp at start of day N days ago in timezone (for DB range filters). */
export function startOfDayIso(daysAgo = 0, timeZone = DASHBOARD_TIMEZONE) {
  const buckets = getLastNDays(daysAgo + 1, timeZone);
  const targetKey = buckets[0]?.key;
  if (!targetKey) return new Date().toISOString();

  const [year, month, day] = targetKey.split("-").map(Number);
  for (let hour = 0; hour < 48; hour += 1) {
    const candidate = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
    if (toDayKey(new Date(candidate).toISOString(), timeZone) === targetKey) {
      return new Date(candidate).toISOString();
    }
  }

  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

/** Count items per day using a date field, bucketed in timezone. */
export function bucketCountByDay(items, dateField, days = 7, timeZone = DASHBOARD_TIMEZONE) {
  if (days === 30) return bucketCountByPeriod(items, dateField, "30d", timeZone);
  if (days === 7) return bucketCountByPeriod(items, dateField, "7d", timeZone);
  return bucketCountByPeriod(items, dateField, "7d", timeZone, days);
}

/** Count items into period buckets (7d, 30d, 12m, 5y). */
export function bucketCountByPeriod(
  items,
  dateField,
  period = "7d",
  timeZone = DASHBOARD_TIMEZONE,
  dayOverride
) {
  const config = getDashboardPeriodConfig(period);
  const buckets =
    dayOverride && config.granularity === "day"
      ? getLastNDays(dayOverride, timeZone)
      : getTimeBuckets(period, timeZone);
  const counts = Object.fromEntries(buckets.map((b) => [b.key, 0]));

  for (const item of items) {
    const key = bucketKeyForDate(item[dateField], config.granularity, timeZone);
    if (key && key in counts) counts[key] += 1;
  }

  return buckets.map((b) => ({
    ...b,
    value: counts[b.key],
  }));
}

/** ISO timestamp at start of the selected period (for DB gte filters). */
export function rangeStartIso(period = "7d", timeZone = DASHBOARD_TIMEZONE) {
  const config = getDashboardPeriodConfig(period);
  const buckets = getTimeBuckets(period, timeZone);
  const first = buckets[0]?.key;
  if (!first) return new Date().toISOString();

  if (config.granularity === "day") {
    return startOfDayIso(config.count - 1, timeZone);
  }

  if (config.granularity === "month") {
    const [year, month] = first.split("-").map(Number);
    for (let hour = 0; hour < 48; hour += 1) {
      const candidate = Date.UTC(year, month - 1, 1, hour, 0, 0, 0);
      if (toMonthKey(new Date(candidate).toISOString(), timeZone) === first) {
        return new Date(candidate).toISOString();
      }
    }
  }

  if (config.granularity === "year") {
    const year = Number(first);
    for (let hour = 0; hour < 48; hour += 1) {
      const candidate = Date.UTC(year, 0, 1, hour, 0, 0, 0);
      if (toYearKey(new Date(candidate).toISOString(), timeZone) === first) {
        return new Date(candidate).toISOString();
      }
    }
  }

  return new Date().toISOString();
}

export function endOfPeriodMs(bucketKey, granularity, timeZone = DASHBOARD_TIMEZONE) {
  if (granularity === "day") return endOfDayMs(bucketKey, timeZone);

  if (granularity === "month") {
    const [year, month] = bucketKey.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return endOfDayMs(
      `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
      timeZone
    );
  }

  if (granularity === "year") {
    return endOfDayMs(`${bucketKey}-12-31`, timeZone);
  }

  return Date.now();
}

/** @deprecated use bucketCountByDay */
export function countByDay(items, dateField, days = 7) {
  return bucketCountByDay(items, dateField, days);
}

export function sumSeriesValues(points) {
  return (points || []).reduce((acc, p) => acc + (p.value || 0), 0);
}

const CLOSED_INCIDENT_STATUSES = ["Resolved", "Closed", "Rejected"];

/** Open incident backlog at end of each period bucket (day / month / year). */
export function openIncidentBacklogSeries(
  incidents,
  period = "7d",
  timeZone = DASHBOARD_TIMEZONE,
  closureMap = null
) {
  const config = getDashboardPeriodConfig(period);
  const buckets = getTimeBuckets(period, timeZone);

  return buckets.map((bucket) => {
    const endMs = endOfPeriodMs(bucket.key, config.granularity, timeZone);
    const value = incidents.filter((inc) => {
      const createdMs = new Date(inc.created_at).getTime();
      if (Number.isNaN(createdMs) || createdMs > endMs) return false;
      if (closureMap) {
        const closedMs = closureMap.get(inc.id);
        return closedMs == null || closedMs > endMs;
      }
      if (!CLOSED_INCIDENT_STATUSES.includes(inc.status)) return true;
      const updatedMs = new Date(inc.updated_at || inc.created_at).getTime();
      return !Number.isNaN(updatedMs) && updatedMs > endMs;
    }).length;

    return { ...bucket, value };
  });
}

/** @deprecated */
export function openIncidentBacklogByDay(incidents, days = 7, timeZone = DASHBOARD_TIMEZONE) {
  const period = days === 30 ? "30d" : "7d";
  return openIncidentBacklogSeries(incidents, period, timeZone);
}
