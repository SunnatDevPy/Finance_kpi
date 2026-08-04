import { TrendingDownIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

type StatCardSize = "compact" | "default" | "large";

interface StatCardProps {
  title: string;
  value: string;
  numericValue?: number;
  formatValue?: (n: number) => string;
  subtitle?: string;
  accent?: "green" | "blue" | "amber" | "red" | "violet" | "cyan";
  change?: number | null;
  changeLabel?: string;
  icon?: LucideIcon;
  size?: StatCardSize;
  /** Berilsa, karta bosiladigan qilinadi va shu yo'lga o'tkazadi. */
  to?: string;
}

const sizeStyles: Record<
  StatCardSize,
  { card: string; title: string; value: string; iconWrap: string; icon: string; meta: string }
> = {
  compact: {
    card: "rounded-xl p-4",
    title: "text-xs",
    value: "mt-3 text-xl font-bold leading-none tracking-tight sm:text-[1.35rem]",
    iconWrap: "size-8 rounded-lg",
    icon: "size-4",
    meta: "mt-2.5 gap-2",
  },
  default: {
    card: "rounded-2xl p-6",
    title: "text-sm",
    value: "mt-5 text-[1.85rem] font-bold leading-none tracking-tight sm:text-[2rem]",
    iconWrap: "size-10 rounded-xl",
    icon: "size-5",
    meta: "mt-4 gap-2.5",
  },
  large: {
    card: "rounded-2xl p-6 sm:p-7",
    title: "text-sm sm:text-[0.95rem]",
    value:
      "mt-4 text-[1.65rem] font-bold leading-none tracking-tight tabular-nums sm:text-[2.15rem] lg:text-[2.35rem]",
    iconWrap: "size-11 rounded-xl",
    icon: "size-5",
    meta: "mt-4 gap-2.5",
  },
};

const themes = {
  green: {
    card: "from-emerald-50/90 via-white to-teal-50/50 border-emerald-200/50 dark:from-emerald-950/50 dark:via-card dark:to-teal-950/30 dark:border-emerald-800/40",
    iconWrap:
      "border-emerald-200/80 bg-emerald-500/10 text-emerald-600 dark:border-emerald-700/50 dark:bg-emerald-400/10 dark:text-emerald-400",
    glow: "stat-card-glow-green",
    chipUp: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300",
    chipDown: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20 dark:text-red-300",
  },
  red: {
    card: "from-rose-50/90 via-white to-red-50/50 border-rose-200/50 dark:from-rose-950/50 dark:via-card dark:to-red-950/30 dark:border-rose-800/40",
    iconWrap:
      "border-rose-200/80 bg-rose-500/10 text-rose-600 dark:border-rose-700/50 dark:bg-rose-400/10 dark:text-rose-400",
    glow: "stat-card-glow-red",
    chipUp: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300",
    chipDown: "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300",
  },
  amber: {
    card: "from-amber-50/90 via-white to-yellow-50/50 border-amber-200/50 dark:from-amber-950/50 dark:via-card dark:to-yellow-950/30 dark:border-amber-800/40",
    iconWrap:
      "border-amber-200/80 bg-amber-500/10 text-amber-600 dark:border-amber-700/50 dark:bg-amber-400/10 dark:text-amber-400",
    glow: "stat-card-glow-amber",
    chipUp: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300",
    chipDown: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20 dark:text-red-300",
  },
  blue: {
    card: "from-blue-50/90 via-white to-indigo-50/50 border-blue-200/50 dark:from-blue-950/50 dark:via-card dark:to-indigo-950/30 dark:border-blue-800/40",
    iconWrap:
      "border-blue-200/80 bg-blue-500/10 text-blue-600 dark:border-blue-700/50 dark:bg-blue-400/10 dark:text-blue-400",
    glow: "stat-card-glow-blue",
    chipUp: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300",
    chipDown: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20 dark:text-red-300",
  },
  violet: {
    card: "from-violet-50/90 via-white to-purple-50/50 border-violet-200/50 dark:from-violet-950/50 dark:via-card dark:to-purple-950/30 dark:border-violet-800/40",
    iconWrap:
      "border-violet-200/80 bg-violet-500/10 text-violet-600 dark:border-violet-700/50 dark:bg-violet-400/10 dark:text-violet-400",
    glow: "stat-card-glow-violet",
    chipUp: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300",
    chipDown: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20 dark:text-red-300",
  },
  cyan: {
    card: "from-cyan-50/90 via-white to-sky-50/50 border-cyan-200/50 dark:from-cyan-950/50 dark:via-card dark:to-sky-950/30 dark:border-cyan-800/40",
    iconWrap:
      "border-cyan-200/80 bg-cyan-500/10 text-cyan-600 dark:border-cyan-700/50 dark:bg-cyan-400/10 dark:text-cyan-400",
    glow: "stat-card-glow-cyan",
    chipUp: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300",
    chipDown: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20 dark:text-red-300",
  },
};

export function StatCard({
  title,
  value,
  numericValue,
  formatValue,
  subtitle,
  accent = "green",
  change,
  changeLabel,
  icon: Icon,
  size = "default",
  to,
}: StatCardProps) {
  const th = themes[accent];
  const sz = sizeStyles[size];
  const isUp = change != null && change >= 0;
  const chipClass = change == null ? "" : isUp ? th.chipUp : th.chipDown;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border bg-gradient-to-br backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl",
        sz.card,
        to && "cursor-pointer",
        th.card,
        th.glow,
      )}
    >
      {to && (
        <Link to={to} className="absolute inset-0 z-10" aria-label={title}>
          <span className="sr-only">{title}</span>
        </Link>
      )}
      {/* Yuqori qator: sarlavha chapda, ikonka o'ng burchakda */}
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "min-w-0 flex-1 font-medium leading-relaxed tracking-tight text-muted-foreground",
            sz.title,
          )}
        >
          {title}
        </p>
        {Icon && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center border transition-transform duration-300 group-hover:scale-105",
              sz.iconWrap,
              th.iconWrap,
            )}
          >
            <Icon className={sz.icon} />
          </div>
        )}
      </div>

      {/* Asosiy qiymat — katta, ikonka ostidagi joyda */}
      <p className={cn("text-foreground", sz.value)}>
        {numericValue != null && formatValue ? (
          <AnimatedNumber value={numericValue} format={formatValue} />
        ) : (
          value
        )}
      </p>

      {/* Qo'shimcha matn / o'sish foizi */}
      {(change != null || subtitle) && (
        <div className={cn("flex flex-wrap items-center", sz.meta)}>
          {change != null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold",
                chipClass,
              )}
            >
              {isUp ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
              {Math.abs(change).toFixed(1)}%
              {changeLabel && <span className="font-normal opacity-80">{changeLabel}</span>}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </motion.div>
  );
}
