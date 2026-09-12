import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompactMoney } from "@/utils/format";

interface TrendBadgeProps {
  value: number | null | undefined;
  diffAmount?: string | number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  showZero?: boolean;
  prominentArrow?: boolean;
}

export function TrendBadge({
  value,
  diffAmount,
  className,
  size = "sm",
  showZero = true,
  prominentArrow = false,
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

  const formattedPct = `${isPositive ? "+" : ""}${value.toFixed(1)}%`;

  let diffText = "";
  if (diffAmount !== undefined && diffAmount !== null) {
    const diffNum = typeof diffAmount === "number" ? diffAmount : parseFloat(String(diffAmount));
    if (Number.isFinite(diffNum) && diffNum !== 0) {
      const sign = diffNum > 0 ? "+" : "-";
      diffText = ` (${sign}${formatCompactMoney(Math.abs(diffNum))})`;
    }
  }

  const ArrowIcon = prominentArrow
    ? (isPositive ? TrendingUpIcon : isNegative ? TrendingDownIcon : MinusIcon)
    : (isPositive ? ArrowUpRightIcon : isNegative ? ArrowDownRightIcon : MinusIcon);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-semibold tabular-nums transition-colors shadow-2xs",
        size === "sm" && "px-1.5 py-0.5 text-[10px]",
        size === "md" && "px-2 py-0.5 text-xs",
        size === "lg" && "px-2.5 py-1 text-sm",
        isPositive &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/15",
        isNegative &&
          "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 dark:bg-rose-500/15",
        isZero &&
          "border-border/60 bg-muted/50 text-muted-foreground",
        className,
      )}
      title={
        isPositive
          ? `O'sish: ${formattedPct}${diffText}`
          : isNegative
            ? `Pasayish: ${formattedPct}${diffText}`
            : "O'zgarishsiz"
      }
    >
      <ArrowIcon
        className={cn(
          "shrink-0",
          size === "sm" ? "size-3" : size === "md" ? "size-3.5" : "size-4",
          isPositive ? "text-emerald-600 dark:text-emerald-400" : isNegative ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
        )}
      />
      <span>{formattedPct}</span>
      {diffText && <span className="text-[9px] font-medium opacity-85 sm:text-[10px]">{diffText}</span>}
    </span>
  );
}
