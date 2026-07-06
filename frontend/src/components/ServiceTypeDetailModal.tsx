import { useEffect, useRef, useState } from "react";
import {
  Building2Icon,
  CalendarIcon,
  FileTextIcon,
  RepeatIcon,
  TrendingUpIcon,
  UsersIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { api } from "../api/client";
import {
  ActivateIconBtn,
  DeactivateIconBtn,
  DeleteIconBtn,
} from "../components/ButtonIcons";
import { CompanyAvatar } from "../components/CompanyAvatar";
import { Modal } from "../components/Modal";
import { ActiveStatusBadge } from "../components/UserBadges";
import {
  PremiumDataTable,
  TableBody,
  TableCellMuted,
  TableCellPrimary,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { useI18n } from "../context/I18nContext";
import type { ServiceType, ServiceTypeStats } from "../types";
import { formatDateWithWeekday, formatMoney } from "../utils/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ServiceTypeDetailModalProps {
  item: ServiceType | null;
  open: boolean;
  onClose: () => void;
  onToggleActive: (item: ServiceType) => void;
  onDelete: (id: number) => void;
}

function StatTile({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  accent: "green" | "blue" | "violet" | "cyan";
}) {
  const accents = {
    green: "border-emerald-200/60 bg-emerald-500/5 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300",
    blue: "border-blue-200/60 bg-blue-500/5 text-blue-700 dark:border-blue-500/30 dark:text-blue-300",
    violet: "border-violet-200/60 bg-violet-500/5 text-violet-700 dark:border-violet-500/30 dark:text-violet-300",
    cyan: "border-cyan-200/60 bg-cyan-500/5 text-cyan-700 dark:border-cyan-500/30 dark:text-cyan-300",
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className={cn("flex size-9 items-center justify-center rounded-lg border", accents[accent])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export function ServiceTypeDetailModal({
  item,
  open,
  onClose,
  onToggleActive,
  onDelete,
}: ServiceTypeDetailModalProps) {
  const { t } = useI18n();
  const [stats, setStats] = useState<ServiceTypeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const statsCacheRef = useRef<Map<number, ServiceTypeStats>>(new Map());
  const activeItemIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !item) {
      if (!open) activeItemIdRef.current = null;
      return;
    }

    activeItemIdRef.current = item.id;
    const cached = statsCacheRef.current.get(item.id);
    if (cached) {
      setStats(cached);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    api.serviceTypes
      .stats(item.id)
      .then((data) => {
        if (cancelled || activeItemIdRef.current !== item.id) return;
        statsCacheRef.current.set(item.id, data);
        setStats(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, item?.id]);

  if (!item) return null;

  const displayStats =
    stats && stats.service_type_id === item.id ? stats : null;

  return (
    <Modal title={t("services.detailTitle")} open={open} onClose={onClose} wide>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={item.name} size="md" className="rounded-xl text-sm" />
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{item.name}</h3>
              <div className="mt-1.5">
                <ActiveStatusBadge active={item.is_active} />
              </div>
            </div>
          </div>
          {displayStats?.last_used_at && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="size-3.5" />
              <span>
                {t("services.lastUsed")}: {formatDateWithWeekday(displayStats.last_used_at)}
              </span>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="min-h-[22rem]">
          {displayStats ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatTile
                  title={t("services.totalRevenue")}
                  value={formatMoney(displayStats.total_revenue)}
                  icon={TrendingUpIcon}
                  accent="green"
                />
                <StatTile
                  title={t("services.usageCount")}
                  value={t("services.timesUsed").replace("{count}", String(displayStats.active_usage_count))}
                  icon={RepeatIcon}
                  accent="blue"
                />
                <StatTile
                  title={t("services.contractsCount")}
                  value={String(displayStats.contracts_count)}
                  icon={FileTextIcon}
                  accent="violet"
                />
                <StatTile
                  title={t("services.clientsCount")}
                  value={String(displayStats.clients_count)}
                  icon={UsersIcon}
                  accent="cyan"
                />
              </div>

              {displayStats.cancelled_count > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:text-amber-200">
                  <XCircleIcon className="size-4 shrink-0" />
                  {t("services.cancelledCount")}: {displayStats.cancelled_count}
                </div>
              )}

              <div className="mt-6">
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-foreground">{t("services.topClients")}</h4>
                  <p className="text-xs text-muted-foreground">{t("services.topClientsDesc")}</p>
                </div>
                <PremiumDataTable
                  empty={displayStats.top_clients.length === 0}
                  emptyMessage={t("services.noUsage")}
                  skeletonCols={3}
                >
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("contracts.client")}</TableHead>
                      <TableHead>{t("services.usageCount")}</TableHead>
                      <TableHead className="text-right">{t("services.revenueShort")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayStats.top_clients.map((client) => (
                      <TableRow key={client.client_id}>
                        <TableCellPrimary>
                          <span className="flex items-center gap-2">
                            <Building2Icon className="size-3.5 text-muted-foreground" />
                            {client.company_name}
                          </span>
                        </TableCellPrimary>
                        <TableCellMuted>
                          {t("services.timesUsed").replace("{count}", String(client.usage_count))}
                        </TableCellMuted>
                        <TableCellMuted className="text-right font-medium text-foreground">
                          {formatMoney(client.total_amount)}
                        </TableCellMuted>
                      </TableRow>
                    ))}
                  </TableBody>
                </PremiumDataTable>
              </div>
            </>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[6.5rem] animate-pulse rounded-xl bg-muted/50" />
              ))}
              <div className="col-span-full mt-3 h-32 animate-pulse rounded-xl bg-muted/40" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button type="button" variant="outline" onClick={() => onToggleActive(item)}>
            {item.is_active ? (
              <>
                <DeactivateIconBtn />
                {t("services.deactivate")}
              </>
            ) : (
              <>
                <ActivateIconBtn />
                {t("services.activate")}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onDelete(item.id)}
            disabled={displayStats ? displayStats.usage_count > 0 : item.usage_count > 0}
          >
            <DeleteIconBtn />
            {t("common.delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
