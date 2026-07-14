import { TrendingDownIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

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
  /** Berilsa, karta bosiladigan qilinadi va shu yo'lga o'tkazadi. */
  to?: string;
}

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
  to,
}: StatCardProps) {
  const th = themes[accent];
  const isUp = change != null && change >= 0;
  const chipClass = change == null ? "" : isUp ? th.chipUp : th.chipDown;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl",
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
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed tracking-tight text-muted-foreground">
          {title}
        </p>
        {Icon && (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105",
              th.iconWrap,
            )}
          >
            <Icon className="size-5" />
          </div>
        )}
      </div>

      {/* Asosiy qiymat — katta, ikonka ostidagi joyda */}
      <p className="mt-5 text-[1.85rem] font-bold leading-none tracking-tight text-foreground sm:text-[2rem]">
        {numericValue != null && formatValue ? (
          <AnimatedNumber value={numericValue} format={formatValue} />
        ) : (
          value
        )}
      </p>

      {/* Qo'shimcha matn / o'sish foizi */}
      {(change != null || subtitle) && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
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
