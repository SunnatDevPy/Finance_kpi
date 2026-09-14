import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarIcon, CheckIcon, ChevronDownIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloatingPosition } from "@/hooks/useFloatingPosition";
import { useI18n } from "@/context/I18nContext";
import { MONTH_KEYS, type MonthKey } from "@/lib/dateRange";
import { cn } from "@/lib/utils";

interface FinanceMonthSelectProps {
  value: number[];
  onChange: (months: number[]) => void;
  disabled?: boolean;
  className?: string;
}

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function FinanceMonthSelect({
  value,
  onChange,
  disabled = false,
  className,
}: FinanceMonthSelectProps) {
  const { t } = useI18n();
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Normalize initial value
  const normalizedValue = useMemo(() => {
    if (!value || value.length === 0) return ALL_MONTHS;
    return [...value].sort((a, b) => a - b);
  }, [value]);

  // Draft selection while popover is open
  const [draftMonths, setDraftMonths] = useState<number[]>(normalizedValue);

  useEffect(() => {
    if (open) {
      setDraftMonths(normalizedValue);
    }
  }, [open, normalizedValue]);

  const coords = useFloatingPosition({
    triggerRef: containerRef,
    popoverRef,
    isOpen: open,
    targetWidth: 350,
    estimatedHeight: 330,
    viewportPadding: 12,
    offset: 6,
  });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const getMonthName = (m: number): string => {
    const key = MONTH_KEYS[m - 1] as MonthKey;
    return t(`dateRange.months.${key}`);
  };

  const getMonthShort = (m: number): string => {
    return t(`finance.turnover.monthShort.${m}`);
  };

  const toggleMonth = (m: number) => {
    setDraftMonths((prev) => {
      if (prev.includes(m)) {
        return prev.filter((item) => item !== m);
      }
      return [...prev, m].sort((a, b) => a - b);
    });
  };

  const selectQuarter = (q: number) => {
    const qMonths = [q * 3 - 2, q * 3 - 1, q * 3];
    setDraftMonths(qMonths);
  };

  const selectAll = () => {
    setDraftMonths(ALL_MONTHS);
  };

  const clearAll = () => {
    setDraftMonths([]);
  };

  const handleConfirm = () => {
    if (draftMonths.length === 0) return;
    onChange(draftMonths);
    setOpen(false);
  };

  const handleCancel = () => {
    setDraftMonths(normalizedValue);
    setOpen(false);
  };

  // Label to show on the trigger button
  const triggerLabel = useMemo(() => {
    if (normalizedValue.length === 12) {
      return t("finance.turnover.allMonths");
    }
    if (normalizedValue.length === 0) {
      return t("finance.turnover.selectMonths");
    }
    if (normalizedValue.length === 1) {
      return getMonthName(normalizedValue[0]);
    }

    // Check if contiguous range
    const isContiguous =
      normalizedValue[normalizedValue.length - 1] - normalizedValue[0] ===
      normalizedValue.length - 1;

    if (isContiguous) {
      return `${getMonthShort(normalizedValue[0])} – ${getMonthShort(
        normalizedValue[normalizedValue.length - 1],
      )} (${normalizedValue.length} oy)`;
    }

    if (normalizedValue.length <= 3) {
      return normalizedValue.map((m) => getMonthShort(m)).join(", ");
    }

    return `${normalizedValue.length} ${t("finance.turnover.monthsSelectedSuffix")}`;
  }, [normalizedValue, t]);

  const isAllSelected = draftMonths.length === 12;

  const dropdown = typeof document !== "undefined" && createPortal(
    <AnimatePresence>
      {open && coords && (
        <motion.div
          ref={popoverRef}
          role="dialog"
          aria-label={t("finance.turnover.selectMonths")}
          initial={{ opacity: 0, y: coords.placement === "bottom" ? -6 : 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: coords.placement === "bottom" ? -4 : 4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 9999,
          }}
          className="overflow-hidden rounded-2xl border border-border/80 bg-popover p-3.5 text-popover-foreground shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="size-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {t("finance.turnover.selectMonths")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={selectAll}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                  isAllSelected
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t("finance.turnover.allMonths")}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={t("finance.turnover.clear")}
              >
                <RotateCcwIcon className="size-3" />
              </button>
            </div>
          </div>

          {/* Quick presets (quarters) */}
          <div className="mt-2.5 flex items-center justify-between gap-1.5">
            {[1, 2, 3, 4].map((q) => {
              const qMonths = [q * 3 - 2, q * 3 - 1, q * 3];
              const isQActive =
                draftMonths.length === 3 &&
                qMonths.every((m) => draftMonths.includes(m));
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => selectQuarter(q)}
                  className={cn(
                    "flex-1 rounded-lg border py-1 text-center text-[10.5px] font-medium tracking-tight transition-colors",
                    isQActive
                      ? "border-primary/50 bg-primary/10 text-primary font-semibold shadow-2xs"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t("finance.turnover.quarterShort").replace("{q}", String(q))}
                </button>
              );
            })}
          </div>

          {/* 12 Months Grid */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {ALL_MONTHS.map((monthNum) => {
              const isSelected = draftMonths.includes(monthNum);
              return (
                <motion.button
                  key={monthNum}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => toggleMonth(monthNum)}
                  className={cn(
                    "relative flex items-center justify-between rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition-all",
                    isSelected
                      ? "border-primary/50 bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "border-border/60 bg-background/60 text-foreground hover:border-border hover:bg-muted/70",
                  )}
                >
                  <span className="truncate">{getMonthName(monthNum)}</span>
                  {isSelected ? (
                    <CheckIcon className="size-3.5 shrink-0 text-primary-foreground" />
                  ) : (
                    <span className="text-[10px] tabular-nums text-muted-foreground/60">
                      {String(monthNum).padStart(2, "0")}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Footer with summary and Confirm button */}
          <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-3">
            <span className="text-xs text-muted-foreground">
              {t("finance.turnover.selectedMonthsCount").replace(
                "{count}",
                String(draftMonths.length),
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {t("finance.turnover.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={draftMonths.length === 0}
                onClick={handleConfirm}
                className="h-8 gap-1 rounded-lg px-3.5 text-xs font-semibold shadow-xs"
              >
                <CheckIcon className="size-3.5" />
                {t("finance.turnover.confirm")}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background/80 px-3 py-2 text-xs sm:text-sm font-medium shadow-2xs transition-all hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 sm:w-60",
          open && "ring-2 ring-ring/40 border-primary/40",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-foreground">{triggerLabel}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {normalizedValue.length > 0 && normalizedValue.length < 12 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {normalizedValue.length}
            </span>
          )}
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </div>
      </button>
      {dropdown}
    </div>
  );
}
