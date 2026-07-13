import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarIcon } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { CalendarBodySwitch, CalendarMonthNav, type CalendarNavMode } from "@/components/CalendarMonthNav";
import { cn } from "@/lib/utils";
import { floatedLabel, labelPeer } from "@/components/ui/floating-label-input";
import {
  getMonthGrid,
  isSameDay,
  parseISODate,
  toISODate,
  type MonthKey,
} from "@/lib/dateRange";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

interface FloatingLabelDatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  className?: string;
  containerClassName?: string;
  min?: string;
  max?: string;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function FloatingLabelDatePicker({
  label,
  value,
  onChange,
  id,
  required,
  className,
  containerClassName,
  min,
  max,
}: FloatingLabelDatePickerProps) {
  const { t, locale } = useI18n();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value ? parseISODate(value) : new Date()));
  const [navMode, setNavMode] = useState<CalendarNavMode>("days");

  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
  const getMonthName = (key: MonthKey) => t(`dateRange.months.${key}`);
  const displayDate = value
    ? new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(
        parseISODate(value),
      )
    : "";
  const displayWeekday = value
    ? new Intl.DateTimeFormat(dateLocale, { weekday: "long" }).format(parseISODate(value))
    : "";
  const displayLabel = displayDate;


  useEffect(() => {
    if (open) {
      setViewMonth(startOfMonth(value ? parseISODate(value) : new Date()));
      setNavMode("days");
    }
  }, [open, value]);

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
      const width = Math.min(288, window.innerWidth - 32);
      const left = Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - width - 16));
      const top = Math.min(rect.bottom + 8, window.innerHeight - 24);
      setCoords({ top, left, width });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const selectedDate = value ? parseISODate(value) : null;
  const minDate = min ? parseISODate(min) : null;
  const maxDate = max ? parseISODate(max) : null;
  const days = getMonthGrid(viewMonth);

  const handleDayClick = (day: Date) => {
    if (minDate && day < minDate) return;
    if (maxDate && day > maxDate) return;
    onChange(toISODate(day));
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    onChange(toISODate(today));
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative pt-3", containerClassName)}>
      <button
        type="button"
        id={inputId}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "peer flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 pb-2.5 pt-5 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
          className,
        )}
      >
        <span className={cn("flex min-w-0 items-baseline gap-1.5", !displayLabel && "text-transparent")}>
          <span className="truncate">{displayLabel || "—"}</span>
          {displayWeekday && (
            <span className="shrink-0 truncate text-xs font-normal capitalize text-muted-foreground">
              {displayWeekday}
            </span>
          )}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <label htmlFor={inputId} className={cn(labelPeer, floatedLabel)}>
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </label>

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
              className="overflow-hidden rounded-2xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-2xl backdrop-blur-xl"
              role="dialog"
              aria-label={label}
            >
              <CalendarMonthNav
                viewMonth={viewMonth}
                onViewMonthChange={setViewMonth}
                mode={navMode}
                onModeChange={setNavMode}
                getMonthName={getMonthName}
                prevMonthLabel={t("dateRange.prevMonth")}
                nextMonthLabel={t("dateRange.nextMonth")}
                prevYearLabel={t("dateRange.prevYear")}
                nextYearLabel={t("dateRange.nextYear")}
                pickMonthYearLabel={t("dateRange.pickMonthYear")}
              />

              <CalendarBodySwitch mode={navMode}>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAY_KEYS.map((key) => (
                  <div key={key} className="py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(`dateRange.weekdays.${key}`)}
                  </div>
                ))}
                {days.map((day) => {
                  const inMonth = day.getMonth() === viewMonth.getMonth();
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const disabled = (minDate && day < minDate) || (maxDate && day > maxDate);

                  return (
                    <button
                      key={toISODate(day)}
                      type="button"
                      disabled={Boolean(disabled)}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "relative flex size-9 items-center justify-center rounded-lg text-sm transition-colors",
                        !inMonth && "text-muted-foreground/40",
                        inMonth && "text-foreground",
                        isSelected && "bg-primary font-semibold text-primary-foreground shadow-sm",
                        isToday && !isSelected && "ring-1 ring-primary/40",
                        inMonth && !isSelected && !disabled && "hover:bg-muted",
                        disabled && "cursor-not-allowed opacity-30",
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
              </CalendarBodySwitch>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("dateRange.clear")}
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  {t("dateRange.today")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
