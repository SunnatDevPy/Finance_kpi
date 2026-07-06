import { ShieldCheckIcon, UserCogIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "../context/I18nContext";
import type { UserRole } from "../types";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<UserRole, string> = {
  admin:
    "border-violet-300/60 bg-violet-500/15 text-violet-800 shadow-sm dark:border-violet-500/40 dark:bg-violet-500/20 dark:text-violet-200",
  menejer:
    "border-sky-300/60 bg-sky-500/12 text-sky-900 shadow-sm dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-200",
};

export function RoleBadge({ role }: { role: UserRole }) {
  const { t } = useI18n();
  const Icon = role === "admin" ? ShieldCheckIcon : UserCogIcon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        ROLE_STYLES[role],
      )}
    >
      <Icon className="size-3 shrink-0" />
      {t(`roles.${role}`)}
    </Badge>
  );
}

export function ActiveStatusBadge({ active }: { active: boolean }) {
  const { t } = useI18n();

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        active
          ? "border-emerald-300/70 bg-emerald-500/12 text-emerald-800 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
          : "border-rose-300/70 bg-rose-500/12 text-rose-800 shadow-sm dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200",
      )}
    >
      <span
        className={cn(
          "mr-1.5 inline-block size-1.5 rounded-full",
          active ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.75)]",
        )}
        aria-hidden
      />
      {active ? t("status.active") : t("status.inactive")}
    </Badge>
  );
}
