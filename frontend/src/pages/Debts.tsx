import { useEffect, useState } from "react";
import { AlertTriangleIcon, TrendingUpIcon, UsersIcon, XCircleIcon } from "lucide-react";
import { api } from "../api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { BulkActionBar } from "../components/BulkActionBar";
import { ExportButtons } from "../components/ExportButtons";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { TableColumnPicker } from "../components/TableColumnPicker";
import { useRowSelection } from "../hooks/useRowSelection";
import { usePickerColumns } from "../hooks/usePickerColumns";
import { usePersistedState } from "../hooks/usePersistedState";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
  TableCellCompany,
  TableCellDate,
  TableCellMoney,
  TableCellMuted,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { StaggerContainer, StaggerItem } from "../components/Stagger";
import { StatCard } from "../components/StatCard";
import { useI18n } from "../context/I18nContext";
import { useListLoading } from "../hooks/useListLoading";
import type { DebtsSummary } from "../types";
import { formatDateWithWeekday, formatMoney, toNumber } from "../utils/format";

const DEBT_OPTIONAL_COLUMNS = [
  { id: "contractNumber", labelKey: "contracts.contractNumber", defaultVisible: true },
  { id: "period", labelKey: "contracts.period", defaultVisible: true },
  { id: "total", labelKey: "common.total", defaultVisible: true },
  { id: "paid", labelKey: "common.paid", defaultVisible: true },
  { id: "debt", labelKey: "common.debt", defaultVisible: true },
] as const;

type DebtOptionalColumn = (typeof DEBT_OPTIONAL_COLUMNS)[number]["id"];

export function DebtsPage() {
  const { t } = useI18n();
  const { isVisible, setColumnVisible, visibleCount, items: columnPickerItems } =
    usePickerColumns("wtma.debts.tableColumns", DEBT_OPTIONAL_COLUMNS, t);
  const [data, setData] = useState<DebtsSummary | null>(null);
  const [search, setSearch] = usePersistedState("wtma.debts.search", "");
  const { loading, start, finish } = useListLoading();
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      start(true);
      api.debts
        .list(search || undefined)
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => finish());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const rows = (data?.clients ?? []).flatMap((clientEntry) =>
    clientEntry.contracts.map((contract) => ({
      ...contract,
      client_id: clientEntry.client_id,
      company_name: clientEntry.company_name,
    })),
  );

  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const selection = useRowSelection(pagedRows.map((row) => row.contract_id));

  return (
    <PageShell>
      <PageHeader title={t("debts.title")} subtitle={t("debts.subtitle")}>
        <ExportButtons resource="debts" />
      </PageHeader>

      <PageError message={error} />

      <StaggerContainer className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            title={t("debts.totalDebt")}
            value={formatMoney(data?.total_debt ?? 0)}
            accent="red"
            icon={AlertTriangleIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("debts.totalOverpaid")}
            value={formatMoney(data?.total_overpaid ?? 0)}
            accent="green"
            icon={TrendingUpIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("debts.cancelledAmount")}
            value={formatMoney(data?.cancelled_amount ?? 0)}
            accent="amber"
            icon={XCircleIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("debts.debtorCount")}
            value={String(data?.debtor_count ?? 0)}
            accent="amber"
            icon={UsersIcon}
          />
        </StaggerItem>
      </StaggerContainer>

      <Card className="content-card">
        <CardHeader className="pb-3">
          <CardTitle>{t("debts.listTitle")}</CardTitle>
          <CardDescription>{t("debts.listDesc")}</CardDescription>
        </CardHeader>
        <div className="table-card-toolbar">
          <Input
            className="w-full min-w-[12rem] flex-1 sm:max-w-xs"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <TableColumnPicker
            columns={columnPickerItems}
            isVisible={(id: DebtOptionalColumn) => isVisible(id)}
            onVisibleChange={setColumnVisible}
            className="sm:ml-auto"
          />
        </div>
        <BulkActionBar
          count={selection.count}
          onClear={selection.clear}
          onExport={(format) => api.export.download("contracts", format, { ids: selection.selectedIds })}
        />
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && rows.length === 0}
            emptyMessage={t("debts.notFound")}
            skeletonCols={2 + visibleCount}
            footer={
              <Pagination
                embedded
                page={page}
                pageSize={pageSize}
                total={rows.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selection.allPageSelected}
                    indeterminate={selection.somePageSelected}
                    onCheckedChange={() => selection.toggleAllOnPage()}
                    aria-label={t("common.selectAll")}
                  />
                </TableHead>
                <TableHead>{t("contracts.client")}</TableHead>
                {isVisible("contractNumber") && (
                  <TableHead>{t("contracts.contractNumber")}</TableHead>
                )}
                {isVisible("period") && <TableHead>{t("contracts.period")}</TableHead>}
                {isVisible("total") && <TableHead>{t("common.total")}</TableHead>}
                {isVisible("paid") && <TableHead>{t("common.paid")}</TableHead>}
                {isVisible("debt") && <TableHead>{t("common.debt")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((row, index) => {
                const debt = toNumber(row.debt_amount);
                return (
                  <MotionTableRow key={row.contract_id} {...rowEnter(index)}>
                    <TableCell>
                      <Checkbox
                        checked={selection.isSelected(row.contract_id)}
                        onCheckedChange={() => selection.toggle(row.contract_id)}
                        aria-label={t("common.selectRow")}
                      />
                    </TableCell>
                    <TableCellCompany to={`/clients/${row.client_id}`} name={row.company_name} />
                    {isVisible("contractNumber") && (
                      <TableCellMuted>
                        {row.contract_number ? `№${row.contract_number}` : "—"}
                      </TableCellMuted>
                    )}
                    {isVisible("period") && (
                    <TableCellDate>
                      {formatDateWithWeekday(row.start_date, "short")} — {formatDateWithWeekday(row.end_date, "short")}
                    </TableCellDate>
                    )}
                    {isVisible("total") && (
                    <TableCellMoney tone="neutral">{formatMoney(row.total_amount)}</TableCellMoney>
                    )}
                    {isVisible("paid") && (
                    <TableCellMoney tone="positive">{formatMoney(row.paid_amount)}</TableCellMoney>
                    )}
                    {isVisible("debt") && (
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
                    )}
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
