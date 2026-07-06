import type { IncomeCategory } from "../types";

export const INCOME_CATEGORIES: IncomeCategory[] = [
  "sale",
  "service",
  "investment",
  "loan",
  "grant",
  "refund",
  "other",
];

export function incomeCategoryLabel(t: (key: string) => string, category: string): string {
  return t(`finance.incomeCategories.${category}`);
}
