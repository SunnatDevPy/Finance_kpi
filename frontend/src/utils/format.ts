let formatLocale = "uz-UZ";

export function setFormatLocale(locale: "uz" | "ru") {
  formatLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
}

export function formatMoney(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const suffix = formatLocale.startsWith("ru") ? " сум" : " so'm";
  return new Intl.NumberFormat(formatLocale).format(num) + suffix;
}

export function formatCompactMoney(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
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

/**
 * Normalizes a possibly-decimal amount (e.g. "1500000.00" from the API)
 * into a clean whole-number digit string (e.g. "1500000") suitable for
 * the space-formatted money inputs, which don't support fractional so'm.
 */
export function toWholeAmountDigits(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "";
  return String(Math.round(num));
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(formatLocale);
}

/** Berilgan sananing hafta kuni nomini (masalan, "Payshanba") joriy tilda qaytaradi. */
export function formatWeekday(value: string, style: "long" | "short" = "long"): string {
  const weekday = new Date(value).toLocaleDateString(formatLocale, { weekday: style });
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

/** Sana + hafta kunini birga qaytaradi, masalan "06.07.2026, Payshanba". */
export function formatDateWithWeekday(value: string, style: "long" | "short" = "long"): string {
  return `${formatDate(value)}, ${formatWeekday(value, style)}`;
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
    country: "",
    city: "",
    activity_type: "",
    status: "faol" as const,
    notes: "",
  };
}
