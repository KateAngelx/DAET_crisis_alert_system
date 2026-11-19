/** `datetime-local` value for the browser's local time zone (use as min/max on inputs). */
export function nowLocalDateTimeInput(now = new Date()) {
  const d = new Date(now);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Later of two YYYY-MM-DD strings (lexicographic compare works for ISO dates). */
export function laterPhilippineDate(a, b) {
  if (!a) return b || "";
  if (!b) return a;
  return a >= b ? a : b;
}

/** `min` for datetime-local: now onward, or the current saved value if it is already in the past. */
export function minDateTimeLocalNoBackdate(currentValue) {
  const now = nowLocalDateTimeInput();
  if (!currentValue || currentValue >= now) return now;
  return currentValue;
}