import type { ExpenseCategory } from "../types";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "salary",
  "rent",
  "marketing",
  "utilities",
  "transport",
  "office",
  "tax",
  "bank_fee",
  "other",
];

export function expenseCategoryLabel(t: (key: string) => string, category: string): string {
  return t(`expenses.categories.${category}`);
}
