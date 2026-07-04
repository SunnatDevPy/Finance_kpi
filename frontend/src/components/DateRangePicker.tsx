import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRangeIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Button, MotionButton, motionTap } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatRangeLabelWithWeekday,
  getMonthGrid,
  getPresetRange,
  isBetween,
  isSameDay,
  parseISODate,
  toISODate,
  type DateRangePreset,
} from "@/lib/dateRange";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  onClear?: () => void;
  className?: string;
  /** Qorong'u banner/hero fonida ishlatish uchun */
  onDark?: boolean;
}

const PRESETS: DateRangePreset[] = ["today", "yesterday", "week", "month", "year"];

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function DateRangePicker({ from, to, onChange, onClear, className, onDark = false }: DateRangePickerProps) {
  const { t, locale } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
  const monthLabel = new Intl.DateTimeFormat(dateLocale, {
    month: "long",
    year: "numeric",
  }).format(viewMonth);

  const getWeekdayName = (key: (typeof WEEKDAY_KEYS)[number] | "sun") =>
    t(`dateRange.weekdayFull.${key}`);

  const displayLabel = useMemo(() => {
    if (!from && !to) return "";
    return formatRangeLabelWithWeekday(from, to, getWeekdayName, " — ");
  }, [from, to, locale, t]);

  useEffect(() => {
    if (open) {
      setDraftFrom(from);
      setDraftTo(to);
      setViewMonth(startOfMonth(from ? parseISODate(from) : new Date()));
    }
  }, [open, from, to]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(popoverRef.current && popoverRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = containerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const dropdownWidth = window.innerWidth >= 640 ? 448 : Math.min(window.innerWidth - 32, 352);
      const left = Math.min(
        Math.max(16, rect.left),
        Math.max(16, window.innerWidth - dropdownWidth - 16),
      );
      const top = Math.min(rect.bottom + 8, window.innerHeight - 24);
      setCoords({ top, left, width: dropdownWidth });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const draftFromDate = draftFrom ? parseISODate(draftFrom) : null;
  const draftToDate = draftTo ? parseISODate(draftTo) : null;
  const rangeEnd = draftToDate ?? (draftFromDate && hoverDate ? hoverDate : null);

  const applyRange = (nextFrom: string, nextTo: string) => {
    onChange(nextFrom, nextTo);
    setOpen(false);
  };

  const handleDayClick = (day: Date) => {
    const iso = toISODate(day);
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(iso);
      setDraftTo("");
      return;
    }
    const start = parseISODate(draftFrom);
    if (day < start) {
      setDraftTo(draftFrom);
      setDraftFrom(iso);
    } else {
      setDraftTo(iso);
    }
  };

  const handlePreset = (preset: DateRangePreset) => {
    const range = getPresetRange(preset);
    setDraftFrom(range.from);
    setDraftTo(range.to);
    applyRange(range.from, range.to);
  };

  const handleApply = () => {
    if (draftFrom && draftTo) applyRange(draftFrom, draftTo);
    else if (draftFrom) applyRange(draftFrom, draftFrom);
  };

  const handleClear = () => {
    setDraftFrom("");
    setDraftTo("");
    onChange("", "");
    onClear?.();
    setOpen(false);
  };

  const days = getMonthGrid(viewMonth);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "group flex h-10 min-w-[280px] items-center overflow-hidden rounded-xl border shadow-sm backdrop-blur-sm transition-all duration-200 sm:min-w-[320px]",
          onDark
            ? "border-white/20 bg-white/10 hover:border-white/40 hover:bg-white/22 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)]"
            : "border-border/70 bg-background/80 hover:border-primary/30 hover:bg-muted/60 hover:shadow-md",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 px-3 text-left text-sm font-normal transition-colors",
            onDark
              ? "text-white/75 group-hover:text-white"
              : "text-foreground",
            !displayLabel && (onDark ? "text-white/50 group-hover:text-white/80" : "text-muted-foreground"),
          )}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <CalendarRangeIcon
            className={cn(
              "size-4 shrink-0 transition-colors",
              onDark ? "text-white/55 group-hover:text-white" : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          <span className="truncate">{displayLabel || t("dateRange.placeholder")}</span>
        </button>
        {(from || to) && (
          <button
            type="button"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center border-l transition-colors",
              onDark
                ? "border-white/15 text-white/55 group-hover:border-white/30 group-hover:text-white"
                : "border-border/50 text-muted-foreground group-hover:text-foreground",
            )}
            onClick={handleClear}
            aria-label={t("dateRange.clear")}
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }}
              className="overflow-hidden rounded-2xl border border-border/60 bg-popover text-popover-foreground shadow-2xl backdrop-blur-xl"
              role="dialog"
              aria-label={t("dateRange.title")}
            >
            <div className="flex flex-col sm:flex-row">
              {/* Presets */}
              <div className="border-b border-border/50 bg-muted/30 p-2 sm:w-36 sm:border-b-0 sm:border-r">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("dateRange.presets")}
                </p>
                <div className="flex flex-row gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePreset(preset)}
                      className="shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:w-full"
                    >
                      {t(`dateRange.${preset}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div className="flex-1 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewMonth((m) => addMonths(m, -1))}
                    className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={t("dateRange.prevMonth")}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </button>
                  <p className="text-sm font-semibold capitalize text-foreground">{monthLabel}</p>
                  <button
                    type="button"
                    onClick={() => setViewMonth((m) => addMonths(m, 1))}
                    className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={t("dateRange.nextMonth")}
                  >
                    <ChevronRightIcon className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {WEEKDAY_KEYS.map((key) => (
                    <div
                      key={key}
                      className="py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {t(`dateRange.weekdays.${key}`)}
                    </div>
                  ))}
                  {days.map((day) => {
                    const inMonth = day.getMonth() === viewMonth.getMonth();
                    const isStart = draftFromDate && isSameDay(day, draftFromDate);
                    const isEnd = draftToDate && isSameDay(day, draftToDate);
                    const inRange =
                      draftFromDate &&
                      rangeEnd &&
                      isBetween(day, draftFromDate, rangeEnd) &&
                      !isStart &&
                      !isEnd;
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={toISODate(day)}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        onMouseEnter={() => draftFrom && !draftTo && setHoverDate(day)}
                        onMouseLeave={() => setHoverDate(null)}
                        className={cn(
                          "relative flex size-9 items-center justify-center rounded-lg text-sm transition-colors",
                          !inMonth && "text-muted-foreground/40",
                          inMonth && "text-foreground",
                          inRange && "bg-primary/10 text-foreground",
                          (isStart || isEnd) &&
                            "bg-primary font-semibold text-primary-foreground shadow-sm",
                          isToday && !isStart && !isEnd && "ring-1 ring-primary/40",
                          inMonth && !isStart && !isEnd && "hover:bg-muted",
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                  <p className="min-w-0 truncate text-xs text-muted-foreground">
                    {draftFrom && draftTo
                      ? formatRangeLabelWithWeekday(draftFrom, draftTo, getWeekdayName, " — ")
                      : draftFrom
                        ? t("dateRange.selectEnd")
                        : t("dateRange.selectStart")}
                  </p>
                  <div className="flex shrink-0 gap-1.5">
                    <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                      {t("dateRange.clear")}
                    </Button>
                    <MotionButton
                      type="button"
                      size="sm"
                      disabled={!draftFrom}
                      onClick={handleApply}
                      {...motionTap}
                    >
                      {t("dateRange.apply")}
                    </MotionButton>
                  </div>
                </div>
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}
