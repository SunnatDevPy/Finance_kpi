export type DateRangePreset = "today" | "yesterday" | "week" | "month" | "year";

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getPresetRange(preset: DateRangePreset): { from: string; to: string } {
  const today = startOfDay(new Date());
  const to = toISODate(today);

  if (preset === "today") {
    return { from: to, to };
  }

  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const iso = toISODate(yesterday);
    return { from: iso, to: iso };
  }

  const from = new Date(today);
  if (preset === "week") from.setDate(from.getDate() - 6);
  if (preset === "month") from.setDate(from.getDate() - 29);
  if (preset === "year") from.setDate(from.getDate() - 364);

  return { from: toISODate(from), to };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBetween(date: Date, from: Date, to: Date): boolean {
  const time = date.getTime();
  return time >= from.getTime() && time <= to.getTime();
}

export function getMonthGrid(viewMonth: Date): Date[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function formatRangeLabel(
  from: string,
  to: string,
  locale: string,
  separator: string,
): string {
  if (!from && !to) return "";
  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (from && to) {
    return `${fmt.format(parseISODate(from))}${separator}${fmt.format(parseISODate(to))}`;
  }
  if (from) return fmt.format(parseISODate(from));
  return fmt.format(parseISODate(to));
}

/** JS `getDay()` indeksi → i18n kaliti (0 = yakshanba). */
const JS_DAY_TO_WEEKDAY_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function formatDateWithWeekday(
  iso: string,
  getWeekdayName: (key: (typeof JS_DAY_TO_WEEKDAY_KEY)[number]) => string,
): string {
  const date = parseISODate(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const weekdayKey = JS_DAY_TO_WEEKDAY_KEY[date.getDay()];
  return `${day}.${month}.${year} ${getWeekdayName(weekdayKey)}`;
}

export function formatRangeLabelWithWeekday(
  from: string,
  to: string,
  getWeekdayName: (key: (typeof JS_DAY_TO_WEEKDAY_KEY)[number]) => string,
  separator = " — ",
): string {
  if (!from && !to) return "";
  if (from && to) {
    return `${formatDateWithWeekday(from, getWeekdayName)}${separator}${formatDateWithWeekday(to, getWeekdayName)}`;
  }
  if (from) return formatDateWithWeekday(from, getWeekdayName);
  return formatDateWithWeekday(to, getWeekdayName);
}
