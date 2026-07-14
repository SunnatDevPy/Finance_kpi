export const CONTRACT_WORKFLOW_STATUSES = [
  "yangi",
  "davom_etmoqda",
  "tugadi",
  "toxtatildi",
] as const;

export type ContractWorkflowStatus = (typeof CONTRACT_WORKFLOW_STATUSES)[number];

export const DEFAULT_CONTRACT_WORKFLOW_STATUS: ContractWorkflowStatus = "yangi";

/**
 * Sheets-uslubidagi butun qator rangi — statusga qarab yumshoq (pastel) fon.
 * `!` (important) prefiksi jadval zebra-striping (`nth-child(even)`) va hover
 * klasslaridan ustun turishi uchun kerak.
 */
const CONTRACT_ROW_TINT: Record<ContractWorkflowStatus, string> = {
  yangi: "!bg-amber-50/70 hover:!bg-amber-100/70 dark:!bg-amber-950/20 dark:hover:!bg-amber-950/35",
  davom_etmoqda: "!bg-emerald-50/70 hover:!bg-emerald-100/70 dark:!bg-emerald-950/20 dark:hover:!bg-emerald-950/35",
  tugadi: "!bg-sky-50/70 hover:!bg-sky-100/70 dark:!bg-sky-950/20 dark:hover:!bg-sky-950/35",
  toxtatildi: "!bg-red-50/70 hover:!bg-red-100/70 dark:!bg-red-950/20 dark:hover:!bg-red-950/35",
};

export function contractRowTint(
  status: ContractWorkflowStatus,
  isCancelled?: boolean,
): string {
  return isCancelled ? CONTRACT_ROW_TINT.toxtatildi : CONTRACT_ROW_TINT[status];
}
