import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangleIcon, BellIcon } from "lucide-react";
import { api } from "../api/client";
import { useI18n } from "../context/I18nContext";
import type { OverdueDebt } from "../types";
import { formatDateWithWeekday, formatMoney } from "../utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HEADER_TOOLBAR_BTN } from "./header-toolbar";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 3 * 60 * 1000;

export function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [overdueItems, setOverdueItems] = useState<OverdueDebt[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    api.notifications
      .overdueDebts()
      .then(setOverdueItems)
      .catch(() => setOverdueItems([]));
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const totalCount = overdueItems.length;

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className={cn(HEADER_TOOLBAR_BTN, "relative")}
        onClick={() => setOpen((value) => !value)}
        aria-label={t("notifications.title")}
      >
        <BellIcon className="size-4" />
        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border/70 bg-popover shadow-xl"
          >
            <div className="max-h-[28rem] overflow-y-auto">
              {overdueItems.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 border-b border-border/60 bg-red-50/60 px-4 py-3 dark:bg-red-950/20">
                    <AlertTriangleIcon className="size-3.5 text-red-600 dark:text-red-400" />
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      {t("notifications.overdueDebts")}
                    </p>
                  </div>
                  <ul className="space-y-2 p-3">
                    {overdueItems.map((item) => (
                      <li
                        key={item.contract_id}
                        className="rounded-lg border border-border/70 bg-card p-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.company_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateWithWeekday(item.end_date, "short")} ·{" "}
                              {item.days_overdue} {t("notifications.daysOverdue")}
                            </p>
                          </div>
                          <Badge variant="destructive">#{item.contract_id}</Badge>
                        </div>
                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                          {t("common.debt")}: {formatMoney(item.debt_amount)}
                        </p>
                        <Link
                          to={`/clients/${item.client_id}`}
                          className="link-surface mt-2 text-xs font-medium text-brand-600 dark:text-brand-400"
                          onClick={() => setOpen(false)}
                        >
                          {t("notifications.viewClient")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("notifications.none")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
