import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMonthYear, MONTH_KEYS, type MonthKey } from "@/lib/dateRange";

export type CalendarNavMode = "days" | "month-year";

interface CalendarMonthNavProps {
  viewMonth: Date;
  onViewMonthChange: (date: Date) => void;
  mode: CalendarNavMode;
  onModeChange: (mode: CalendarNavMode) => void;
  getMonthName: (key: MonthKey) => string;
  prevMonthLabel: string;
  nextMonthLabel: string;
  prevYearLabel: string;
  nextYearLabel: string;
  pickMonthYearLabel: string;
}

function navBtnClass() {
  return "flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
}

export function CalendarMonthNav({
  viewMonth,
  onViewMonthChange,
  mode,
  onModeChange,
  getMonthName,
  prevMonthLabel,
  nextMonthLabel,
  prevYearLabel,
  nextYearLabel,
  pickMonthYearLabel,
}: CalendarMonthNavProps) {
  const [pickerYear, setPickerYear] = useState(() => viewMonth.getFullYear());

  useEffect(() => {
    if (mode === "month-year") {
      setPickerYear(viewMonth.getFullYear());
    }
  }, [mode, viewMonth]);

  const monthYearLabel = formatMonthYear(viewMonth, getMonthName);

  const shiftMonth = (delta: number) => {
    onViewMonthChange(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1),
    );
  };

  const shiftYear = (delta: number) => {
    setPickerYear((year) => year + delta);
  };

  const handleSelectMonth = (monthIndex: number) => {
    onViewMonthChange(new Date(pickerYear, monthIndex, 1));
    onModeChange("days");
  };

  if (mode === "month-year") {
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftYear(-1)}
            className={navBtnClass()}
            aria-label={prevYearLabel}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <p className="text-sm font-semibold tabular-nums text-foreground">{pickerYear}</p>
          <button
            type="button"
            onClick={() => shiftYear(1)}
            className={navBtnClass()}
            aria-label={nextYearLabel}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {MONTH_KEYS.map((key, monthIndex) => {
            const isActive =
              pickerYear === viewMonth.getFullYear() && monthIndex === viewMonth.getMonth();

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectMonth(monthIndex)}
                className={cn(
                  "rounded-lg px-2 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {getMonthName(key)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-1">
      <button
        type="button"
        onClick={() => shiftMonth(-1)}
        className={navBtnClass()}
        aria-label={prevMonthLabel}
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      <button
        type="button"
        onClick={() => onModeChange("month-year")}
        className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        aria-label={pickMonthYearLabel}
      >
        {monthYearLabel}
      </button>

      <button
        type="button"
        onClick={() => shiftMonth(1)}
        className={navBtnClass()}
        aria-label={nextMonthLabel}
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}

/** Kunlar ↔ oy/yil tanlash o'rtasidagi silliq almashish. */
export function CalendarBodySwitch({
  mode,
  children,
}: {
  mode: CalendarNavMode;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {mode === "days" ? (
        <motion.div
          key="days"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
