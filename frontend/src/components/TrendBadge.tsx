import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendBadgeProps {
  value: number | null | undefined;
  className?: string;
  size?: "sm" | "md";
  showZero?: boolean;
}

export function TrendBadge({
  value,
  className,
  size = "sm",
  showZero = true,
}: TrendBadgeProps) {
  if (value === null || value === undefined) {
    return null;
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isZero = value === 0;

  if (isZero && !showZero) {
    return null;
  }

  const formatted = `${isPositive ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border font-semibold tabular-nums transition-colors",
        size === "sm" && "px-1.5 py-0.5 text-[10px]",
        size === "md" && "px-2 py-0.5 text-xs",
        isPositive &&
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        isNegative &&
          "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
        isZero &&
          "border-border/60 bg-muted/50 text-muted-foreground",
        className,
      )}
      title={
        isPositive
          ? `O'sish: ${formatted}`
          : isNegative
            ? `Pasayish: ${formatted}`
            : "O'zgarishsiz"
      }
    >
      {isPositive && <ArrowUpIcon className={cn("shrink-0", size === "sm" ? "size-2.5" : "size-3")} />}
      {isNegative && <ArrowDownIcon className={cn("shrink-0", size === "sm" ? "size-2.5" : "size-3")} />}
      {isZero && <MinusIcon className={cn("shrink-0", size === "sm" ? "size-2.5" : "size-3")} />}
      <span>{formatted}</span>
    </span>
  );
}
