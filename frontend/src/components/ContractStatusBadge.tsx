import { Badge } from "@/components/ui/badge";
import { useI18n } from "../context/I18nContext";
import { usePreferences } from "../context/PreferencesContext";
import type { ContractWorkflowStatus } from "@/data/contractWorkflow";
import { cn } from "@/lib/utils";

export type ContractStatusKind = "active" | "expiring" | "expired";

export function getContractStatus(endDate: string, notifyDays: number): ContractStatusKind {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);

  if (daysLeft < 0) return "expired";
  if (daysLeft <= notifyDays) return "expiring";
  return "active";
}

const EXPIRY_STYLES: Record<ContractStatusKind, string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300",
  expiring:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300",
  expired:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300",
};

/** Muddat bo'yicha eski badge (bildirishnomalar uchun) */
export function ContractExpiryBadge({ endDate }: { endDate: string }) {
  const { t } = useI18n();
  const { notifyDays } = usePreferences();
  const status = getContractStatus(endDate, notifyDays);

  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-semibold", EXPIRY_STYLES[status])}>
      {t(`contractStatus.${status}`)}
    </Badge>
  );
}

/** Shartnoma ish jarayoni holati — 4 ta workflow status */
export function ContractStatusBadge({ status }: { status: ContractWorkflowStatus }) {
  const { t } = useI18n();

  return (
    <span className={cn("contract-workflow-badge", `contract-workflow-badge--${status}`)}>
      {t(`contractWorkflowStatus.${status}`)}
    </span>
  );
}
