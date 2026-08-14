import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Modal } from "./Modal";
import { Pagination } from "./Pagination";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCellCompany,
  TableCellDate,
  TableCellMoney,
  TableCellMuted,
  TableHead,
  TableHeader,
  TableRow,
} from "./PremiumDataTable";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "../context/I18nContext";
import type { FinanceLedgerItem } from "../types";
import { incomeCategoryLabel } from "../utils/incomeCategory";
import { formatDateWithWeekday, formatMoney, toNumber } from "../utils/format";

const PAGE_SIZE = 10;
const FETCH_LIMIT = 200;

interface MonthlyRevenueModalProps {
  open: boolean;
  onClose: () => void;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
}

function compareLedgerDateDesc(a: FinanceLedgerItem, b: FinanceLedgerItem) {
  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;
  return b.id - a.id;
}

export function MonthlyRevenueModal({
  open,
  onClose,
  periodStart,
  periodEnd,
  periodLabel,
}: MonthlyRevenueModalProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<FinanceLedgerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setPage(1);
    setPageSize(PAGE_SIZE);

    Promise.all([
      api.finance.ledger({
        type: "payment",
        date_from: periodStart,
        date_to: periodEnd,
        skip: 0,
        limit: FETCH_LIMIT,
        sort_by: "date",
        sort_order: "desc",
      }),
      api.finance.ledger({
        type: "income",
        date_from: periodStart,
        date_to: periodEnd,
        skip: 0,
        limit: FETCH_LIMIT,
        sort_by: "date",
        sort_order: "desc",
      }),
    ])
      .then(([payments, incomes]) => {
        if (cancelled) return;
        setItems([...payments.items, ...incomes.items].sort(compareLedgerDateDesc));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("common.error"));
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, periodStart, periodEnd, t]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [items],
  );

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return (
    <Modal
      title={`${t("dashboard.monthlyRevenue")} · ${periodLabel}`}
      open={open}
      onClose={onClose}
      extraWide
      initialFocus={false}
    >
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("dashboard.monthlyRevenueDetailsDesc")}</p>
          <PremiumDataTable
            loading={loading}
            empty={!loading && items.length === 0}
            emptyMessage={t("dashboard.monthlyRevenueEmpty")}
            skeletonRows={5}
            skeletonCols={5}
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("dashboard.monthlyRevenueFrom")}</TableHead>
                <TableHead>{t("dashboard.monthlyRevenueType")}</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
                <TableHead>{t("common.note")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((item, index) => {
                const fromName =
                  item.type === "payment"
                    ? item.company_name || item.title
                    : item.title || t("finance.typeIncome");
                const typeLabel =
                  item.type === "payment"
                    ? t("finance.typePayment")
                    : item.category
                      ? incomeCategoryLabel(t, item.category)
                      : t("finance.typeIncome");

                return (
                  <MotionTableRow key={`${item.type}-${item.id}`} {...rowEnter(index)}>
                    <TableCellDate>{formatDateWithWeekday(item.date)}</TableCellDate>
                    <TableCellCompany
                      name={fromName}
                      to={item.client_id ? `/clients/${item.client_id}` : undefined}
                    />
                    <TableCellMuted>
                      <Badge
                        variant="outline"
                        className={
                          item.type === "payment"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        }
                      >
                        {typeLabel}
                      </Badge>
                    </TableCellMuted>
                    <TableCellMoney tone={toNumber(item.amount) >= 0 ? "positive" : "negative"}>
                      {formatMoney(item.amount)}
                    </TableCellMoney>
                    <TableCellMuted className="max-w-[220px] truncate">
                      {item.note?.trim() || "—"}
                    </TableCellMuted>
                  </MotionTableRow>
                );
              })}
            </TableBody>
          </PremiumDataTable>

          {!loading && items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="text-sm font-medium text-foreground">
                {t("common.total")}: {formatMoney(totalAmount)}
              </p>
              {items.length > pageSize && (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={items.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  embedded
                />
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
