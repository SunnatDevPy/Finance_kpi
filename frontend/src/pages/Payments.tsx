import { useEffect, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { api } from "../api/client";
import { ExportButtons } from "../components/ExportButtons";
import { CancelIcon, DeleteIconBtn } from "../components/ButtonIcons";
import { DateRangePicker } from "../components/DateRangePicker";
import { PageError } from "../components/PageError";
import { Pagination } from "../components/Pagination";
import { useListLoading } from "../hooks/useListLoading";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCellActions,
  TableCellCompany,
  TableCellDate,
  TableCellMoney,
  TableCellMuted,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { useI18n } from "../context/I18nContext";
import { PageHeader, PageShell } from "../components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PaymentListItem } from "../types";
import { formatDateWithWeekday, formatMoney } from "../utils/format";

export function PaymentsPage() {
  const { t } = useI18n();
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const load = (silent = true) => {
    start(silent);
    api.payments
      .list({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
      .then((data) => {
        setPayments(data.items);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => finish());
  };

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
  }, [dateFrom, dateTo, search, page, pageSize]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    const snapshot = payments;
    setPayments((prev) => prev.filter((p) => p.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    setDeleteId(null);
    try {
      await api.payments.delete(id);
    } catch (err) {
      setPayments(snapshot);
      setTotal((prev) => prev + 1);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const totalAmount = payments.reduce((sum, p) => sum + Number.parseFloat(p.amount), 0);

  return (
    <PageShell>
      <PageHeader title={t("payments.title")} subtitle={t("payments.subtitle")}>
        <ExportButtons resource="payments" dateFrom={dateFrom} dateTo={dateTo} />
      </PageHeader>

      <PageError message={error} />

      <div className="filter-bar">
        <Input
          className="max-w-sm flex-1"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />
      </div>

      <Card className="content-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("payments.listTitle")}</CardTitle>
            <CardDescription>
              {total} {t("payments.records")} · {t("payments.total")} ({t("pagination.pageShort")}):{" "}
              <strong className="font-semibold text-foreground">{formatMoney(totalAmount)}</strong>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && payments.length === 0}
            emptyMessage={t("payments.notFound")}
            skeletonCols={6}
            footer={
              <Pagination
                embedded
                page={page}
                pageSize={pageSize}
                total={total}
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
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("payments.client")}</TableHead>
                <TableHead>{t("common.contract")}</TableHead>
                <TableHead>{t("common.amount")}</TableHead>
                <TableHead>{t("common.note")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => (
                <MotionTableRow key={payment.id} {...rowEnter(index)}>
                  <TableCellDate>{formatDateWithWeekday(payment.paid_at)}</TableCellDate>
                  <TableCellCompany
                    to={`/clients/${payment.client_id}`}
                    name={payment.company_name}
                  />
                  <TableCellMuted>#{payment.contract_id}</TableCellMuted>
                  <TableCellMoney tone="positive">
                    {formatMoney(payment.amount)}
                  </TableCellMoney>
                  <TableCellMuted>{payment.note}</TableCellMuted>
                  <TableCellActions>
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(payment.id)}
                      {...motionTap}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      {t("common.delete")}
                    </MotionButton>
                  </TableCellActions>
                </MotionTableRow>
              ))}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("payments.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("payments.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <CancelIcon />
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              <DeleteIconBtn />
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
