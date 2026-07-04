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

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(formatLocale);
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
