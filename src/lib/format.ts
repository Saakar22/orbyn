const DAY_MS = 86_400_000;

export function formatDate(value: Date | string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", opts).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return formatDate(value, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Whole days from now until `value` (negative when in the past). */
export function daysUntil(value: Date | string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(value);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

/** yyyy-mm-dd for a date input, `days` from today. */
export function dateInputFromToday(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

export function describeDue(value: Date | string) {
  const days = daysUntil(value);
  if (days === 0) return "Due today";
  if (days > 0) return `Due in ${days} day${days === 1 ? "" : "s"}`;
  return `${-days} day${days === -1 ? "" : "s"} overdue`;
}
