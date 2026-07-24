import { DEFAULT_COUNTRY } from "@/data/geoRegions";
import { JS_DAY_TO_WEEKDAY_KEY, type WeekdayKey, parseISODate } from "@/lib/dateRange";

let formatLocale = "uz-UZ";
let weekdayResolver: ((key: WeekdayKey) => string) | null = null;

export function setFormatLocale(locale: "uz" | "ru") {
  formatLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
}

/** I18n orqali hafta kunlari (Payshanba, shanba, …) — brauzer Mon/Sat o'rniga. */
export function setWeekdayResolver(resolver: (key: WeekdayKey) => string) {
  weekdayResolver = resolver;
}

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMoney(value: string | number): string {
  return formatAmount(value);
}

/** Raqamni formatlaydi, valyuta qo'shimchasiz (jadval ko'rinishlari uchun). */
export function formatAmount(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat(formatLocale).format(num);
}

export function formatCompactMoney(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} mlrd`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} mln`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)} ming`;
  return new Intl.NumberFormat(formatLocale).format(num);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function toNumber(value: string | number): number {
  return typeof value === "string" ? parseFloat(value) : value;
}

const CHART_MONTH_SHORT = [
  "Yan",
  "Fev",
  "Mar",
  "Apr",
  "May",
  "Iyn",
  "Iyl",
  "Avg",
  "Sen",
  "Okt",
  "Noy",
  "Dek",
] as const;

/** Chart X-axis: YYYY-MM → short month name (chronological order via dataKey=month). */
export function formatChartMonthTick(monthKey: string): string {
  const parts = monthKey.split("-");
  if (parts.length < 2) return monthKey;
  const month = Number(parts[1]);
  if (!Number.isFinite(month) || month < 1 || month > 12) return monthKey;
  return CHART_MONTH_SHORT[month - 1];
}

/** Year or year range for chart header from sorted month keys. */
export function chartMonthsYearLabel(monthKeys: string[]): string {
  const years = [...new Set(monthKeys.map((key) => key.slice(0, 4)))].sort();
  if (years.length === 0) return "";
  if (years.length === 1) return years[0];
  return `${years[0]} — ${years[years.length - 1]}`;
}

export function sortByMonthKey<T extends { month: string }>(points: T[]): T[] {
  return [...points].sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Normalizes a possibly-decimal amount (e.g. "1500000.00" from the API)
 * into a clean whole-number digit string (e.g. "1500000") suitable for
 * the space-formatted money inputs, which don't support fractional amounts.
 */
export function toWholeAmountDigits(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "";
  return String(Math.round(num));
}

/** DD.MM.YYYY — brauzer formatiga bog'liq emas */
export function formatDate(value: string): string {
  const date = parseISODate(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/** Hafta kuni: i18n (Payshanba) yoki brauzer fallback */
export function formatWeekday(value: string, _style: "long" | "short" = "long"): string {
  const date = parseISODate(value);
  const key = JS_DAY_TO_WEEKDAY_KEY[date.getDay()];
  if (weekdayResolver) {
    return capitalizeWord(weekdayResolver(key));
  }
  const weekday = date.toLocaleDateString(formatLocale, { weekday: "long" });
  return capitalizeWord(weekday);
}

/** Masalan: "13.07.2026, Payshanba" */
export function formatDateWithWeekday(value: string, _style: "long" | "short" = "long"): string {
  return `${formatDate(value)}, ${formatWeekday(value)}`;
}

/** Masalan: "13.07.2026, Payshanba 12:55" */
export function formatDateTimeWithWeekday(value: string): string {
  const date = parseISODate(value);
  const time = date.toLocaleTimeString(formatLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(value)}, ${formatWeekday(value)} ${time}`;
}

export function statusLabel(status: string, t?: (k: string) => string): string {
  if (t) return t(`status.${status}`);
  return status === "faol" ? "Faol" : "Nofaol";
}

export function statusClass(status: string): string {
  return status === "faol"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-100 text-slate-600";
}

export function emptyClientForm() {
  return {
    company_name: "",
    contact_person: "",
    phone: "",
    website: "",
    country: DEFAULT_COUNTRY,
    city: "",
    activity_type: "",
    status: "faol" as const,
    notes: "",
  };
}
