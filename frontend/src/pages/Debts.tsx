import { useEffect, useState } from "react";
import { AlertTriangleIcon, TrendingUpIcon, UsersIcon, XCircleIcon } from "lucide-react";
import { api } from "../api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExportButtons } from "../components/ExportButtons";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
  TableCellCompany,
  TableCellDate,
  TableCellMoney,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { StatCard } from "../components/StatCard";
import { useI18n } from "../context/I18nContext";
import type { DebtsSummary } from "../types";
import { formatDate, formatMoney, toNumber } from "../utils/format";

export function DebtsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<DebtsSummary | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      api.debts
        .list(search || undefined)
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const rows = (data?.clients ?? []).flatMap((clientEntry) =>
    clientEntry.contracts.map((contract) => ({
      ...contract,
      client_id: clientEntry.client_id,
      company_name: clientEntry.company_name,
    })),
  );

  return (
    <PageShell>
      <PageHeader title={t("debts.title")} subtitle={t("debts.subtitle")}>
        <ExportButtons resource="debts" />
      </PageHeader>

      <PageError message={error} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title={t("debts.totalDebt")}
          value={formatMoney(data?.total_debt ?? 0)}
          accent="red"
          icon={AlertTriangleIcon}
        />
        <StatCard
          title={t("debts.totalOverpaid")}
          value={formatMoney(data?.total_overpaid ?? 0)}
          accent="green"
          icon={TrendingUpIcon}
        />
        <StatCard
          title={t("debts.debtorCount")}
          value={String(data?.debtor_count ?? 0)}
          accent="amber"
          icon={UsersIcon}
        />
      </div>

      <div className="filter-bar">
        <Input
          className="max-w-sm flex-1"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("debts.listTitle")}</CardTitle>
          <CardDescription>{t("debts.listDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <PremiumDataTable
            loading={loading}
            empty={!loading && rows.length === 0}
            emptyMessage={t("debts.notFound")}
            skeletonCols={5}
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("contracts.client")}</TableHead>
                <TableHead>{t("contracts.period")}</TableHead>
                <TableHead>{t("common.total")}</TableHead>
                <TableHead>{t("common.paid")}</TableHead>
                <TableHead>{t("common.debt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const debt = toNumber(row.debt_amount);
                return (
                  <MotionTableRow key={row.contract_id} {...rowEnter(index)}>
                    <TableCellCompany to={`/clients/${row.client_id}`} name={row.company_name} />
                    <TableCellDate>
                      {formatDate(row.start_date)} — {formatDate(row.end_date)}
                    </TableCellDate>
                    <TableCellMoney tone="neutral">{formatMoney(row.total_amount)}</TableCellMoney>
                    <TableCellMoney tone="positive">{formatMoney(row.paid_amount)}</TableCellMoney>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TableCellMoney
                          tone={debt < 0 ? "positive" : "negative"}
                          className="p-0"
                        >
                          {formatMoney(Math.abs(debt))}
                        </TableCellMoney>
                        {debt < 0 && (
                          <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
                            {t("clients.overpaid")}
                          </Badge>
                        )}
                        {row.is_cancelled && (
                          <Badge variant="secondary" className="gap-1 text-muted-foreground">
                            <XCircleIcon className="size-3" />
                            {t("clients.cancelled")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </MotionTableRow>
                );
              })}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>
    </PageShell>
  );
}
