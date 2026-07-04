import { Badge } from "@/components/ui/badge";
import { useI18n } from "../context/I18nContext";
import { cn } from "@/lib/utils";

interface BadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  faol: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300",
  nofaol: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: BadgeProps) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold", STATUS_STYLES[status] ?? "")}
    >
      {t(`status.${status}`)}
    </Badge>
  );
}
