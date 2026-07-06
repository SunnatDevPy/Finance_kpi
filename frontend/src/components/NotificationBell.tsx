import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BellIcon } from "lucide-react";
import { api } from "../api/client";
import { usePreferences } from "../context/PreferencesContext";
import { useI18n } from "../context/I18nContext";
import type { ExpiringContract } from "../types";
import { formatDateWithWeekday, formatMoney } from "../utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HEADER_TOOLBAR_BTN } from "./header-toolbar";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { t } = useI18n();
  const { notifyDays } = usePreferences();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ExpiringContract[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.notifications
      .expiringContracts(notifyDays)
      .then(setItems)
      .catch(() => setItems([]));
  }, [notifyDays]);

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
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {items.length > 9 ? "9+" : items.length}
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
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{t("notifications.expiring")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {notifyDays} {t("notifications.expiringDesc")}
            </p>
          </div>
          <div className="p-3">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("notifications.none")}</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.contract_id}
                  className="rounded-lg border border-border/70 bg-card p-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateWithWeekday(item.end_date, "short")} · {item.days_left} {t("notifications.daysLeft")}
                      </p>
                    </div>
                    <Badge variant={item.days_left <= 7 ? "destructive" : "secondary"}>
                      #{item.contract_id}
                    </Badge>
                  </div>
                  {toNumber(item.debt_amount) > 0 && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {t("common.debt")}: {formatMoney(item.debt_amount)}
                    </p>
                  )}
                  <Link
                    to={`/clients/${item.client_id}`}
                    className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                    onClick={() => setOpen(false)}
                  >
                    {t("notifications.viewClient")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function toNumber(value: string) {
  return Number.parseFloat(value) || 0;
}
