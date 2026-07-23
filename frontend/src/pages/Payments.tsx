import { useEffect, useState } from "react";
import { ArchiveIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { api } from "../api/client";
import { ExportButtons } from "../components/ExportButtons";
import { BulkActionBar } from "../components/BulkActionBar";
import { CancelIcon, DeleteIconBtn, LoadingIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { DateRangePicker } from "../components/DateRangePicker";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { Pagination } from "../components/Pagination";
import { TableColumnPicker } from "../components/TableColumnPicker";
import { useListLoading } from "../hooks/useListLoading";
import { usePickerColumns } from "../hooks/usePickerColumns";
import { usePersistedState } from "../hooks/usePersistedState";
import { useRowSelection } from "../hooks/useRowSelection";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
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
import { useAuth } from "../context/AuthContext";
import { PageHeader, PageShell } from "../components/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelDatePicker } from "@/components/ui/date-picker";
import { FloatingLabelInput, FloatingLabelMoneyInput } from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, Contract, PaymentListItem } from "../types";
import { formatDateWithWeekday, formatMoney, toNumber } from "../utils/format";

const PAYMENT_OPTIONAL_COLUMNS = [
  { id: "contract", labelKey: "common.contract", defaultVisible: true },
  { id: "amount", labelKey: "common.amount", defaultVisible: true },
  { id: "note", labelKey: "common.note", defaultVisible: true },
] as const;

type PaymentOptionalColumn = (typeof PAYMENT_OPTIONAL_COLUMNS)[number]["id"];

export function PaymentsPage() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const { isVisible, setColumnVisible, visibleCount, items: columnPickerItems } =
    usePickerColumns("wtma.payments.tableColumns", PAYMENT_OPTIONAL_COLUMNS, t);
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [dateFrom, setDateFrom] = usePersistedState("wtma.payments.dateFrom", "");
  const [dateTo, setDateTo] = usePersistedState("wtma.payments.dateTo", "");
  const [search, setSearch] = usePersistedState("wtma.payments.search", "");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [bulkArchiveConfirm, setBulkArchiveConfirm] = useState(false);
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const { submitting: deleting, guard: guardDelete } = useSubmitGuard();
  const selection = useRowSelection(payments.map((p) => p.id));

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientContracts, setClientContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [payForm, setPayForm] = useState({
    client_id: "",
    contract_id: "",
    amount: "",
    paid_at: "",
    note: "",
  });
  const { submitting: paySubmitting, guard: guardPay } = useSubmitGuard();

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
        setTotalAmount(toNumber(data.total_amount));
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

  const handleDelete = guardDelete(async () => {
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
  });

  const handleBulkArchive = async () => {
    const ids = selection.selectedIds;
    if (ids.length === 0) return;
    setBulkArchiving(true);
    setError("");
    try {
      await Promise.all(ids.map((id) => api.payments.delete(id)));
      setBulkArchiveConfirm(false);
      selection.clear();
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBulkArchiving(false);
    }
  };

  const openPayModal = () => {
    setPayForm({ client_id: "", contract_id: "", amount: "", paid_at: "", note: "" });
    setClientContracts([]);
    setError("");
    setPayModalOpen(true);
    if (clients.length === 0) {
      api.clients
        .list({ limit: 200 })
        .then((data) => setClients(data.items))
        .catch(() => setClients([]));
    }
  };

  const closePayModal = () => {
    setPayModalOpen(false);
  };

  const handleClientChange = (clientId: string) => {
    setPayForm((prev) => ({ ...prev, client_id: clientId, contract_id: "" }));
    setClientContracts([]);
    if (!clientId) return;
    setContractsLoading(true);
    api.contracts
      .list({ clientId: parseInt(clientId, 10), limit: 200 })
      .then((data) => setClientContracts(data.items))
      .catch(() => setClientContracts([]))
      .finally(() => setContractsLoading(false));
  };

  const handleAddPayment = guardPay(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const keepOpen = submitter?.dataset.keepOpen === "true";
    setError("");
    if (!payForm.contract_id) {
      setError(t("contracts.selectClientError"));
      return;
    }
    if (!payForm.paid_at) {
      setError(t("clients.selectDateError"));
      return;
    }
    try {
      await api.payments.create({
        contract_id: parseInt(payForm.contract_id, 10),
        amount: parseFloat(payForm.amount),
        paid_at: payForm.paid_at,
        note: payForm.note || undefined,
      });
      if (keepOpen) {
        setPayForm((prev) => ({ ...prev, amount: "", note: "" }));
      } else {
        setPayModalOpen(false);
      }
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  return (
    <PageShell>
      <PageHeader title={t("payments.title")} subtitle={t("payments.subtitle")}>
        <ExportButtons
          resource="payments"
          dateFrom={dateFrom}
          dateTo={dateTo}
          ids={selection.count > 0 ? selection.selectedIds : undefined}
        />
        <MotionButton onClick={openPayModal} {...motionTap}>
          <PlusIcon data-icon="inline-start" />
          {t("clients.addPayment")}
        </MotionButton>
      </PageHeader>

      <PageError message={error} />

      <Card className="content-card">
        <CardHeader className="pb-3">
          <CardTitle>{t("payments.listTitle")}</CardTitle>
          <CardDescription>
            {total} {t("payments.records")} · {t("payments.total")}:{" "}
            <strong className="font-semibold text-foreground">{formatMoney(totalAmount)}</strong>
          </CardDescription>
        </CardHeader>
        <div className="table-card-toolbar">
          <Input
            className="w-full min-w-[12rem] flex-1 sm:max-w-xs"
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
          <TableColumnPicker
            columns={columnPickerItems}
            isVisible={(id: PaymentOptionalColumn) => isVisible(id)}
            onVisibleChange={setColumnVisible}
            className="sm:ml-auto"
          />
        </div>
        <BulkActionBar count={selection.count} onClear={selection.clear}>
          {isAdmin && (
            <MotionButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBulkArchiveConfirm(true)}
              {...motionTap}
            >
              <ArchiveIcon data-icon="inline-start" />
              {t("common.archive")}
            </MotionButton>
          )}
        </BulkActionBar>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && payments.length === 0}
            emptyMessage={t("payments.notFound")}
            skeletonCols={4 + visibleCount}
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
                <TableHead className="w-10">
                  <Checkbox
                    checked={selection.allPageSelected}
                    indeterminate={selection.somePageSelected}
                    onCheckedChange={() => selection.toggleAllOnPage()}
                    aria-label={t("common.selectAll")}
                  />
                </TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("payments.client")}</TableHead>
                {isVisible("contract") && <TableHead>{t("common.contract")}</TableHead>}
                {isVisible("amount") && <TableHead>{t("common.amount")}</TableHead>}
                {isVisible("note") && <TableHead>{t("common.note")}</TableHead>}
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => (
                <MotionTableRow key={payment.id} {...rowEnter(index)}>
                  <TableCell>
                    <Checkbox
                      checked={selection.isSelected(payment.id)}
                      onCheckedChange={() => selection.toggle(payment.id)}
                      aria-label={t("common.selectRow")}
                    />
                  </TableCell>
                  <TableCellDate>{formatDateWithWeekday(payment.paid_at)}</TableCellDate>
                  <TableCellCompany
                    to={`/clients/${payment.client_id}`}
                    name={payment.company_name}
                  />
                  {isVisible("contract") && (
                    <TableCellMuted>
                      {payment.contract_number ? `№${payment.contract_number}` : `#${payment.contract_id}`}
                    </TableCellMuted>
                  )}
                  {isVisible("amount") && (
                    <TableCellMoney tone={toNumber(payment.amount) < 0 ? "negative" : "positive"}>
                      {formatMoney(payment.amount)}
                    </TableCellMoney>
                  )}
                  {isVisible("note") && (
                    <TableCellMuted>{payment.note}</TableCellMuted>
                  )}
                  <TableCellActions>
                    <div className="action-toolbar">
                      {isAdmin && (
                      <MotionButton
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteId(payment.id)}
                        title={t("common.delete")}
                        {...motionTap}
                      >
                        <Trash2Icon className="size-3.5" />
                      </MotionButton>
                      )}
                    </div>
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
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? <LoadingIconBtn /> : <DeleteIconBtn />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkArchiveConfirm}
        onOpenChange={(open) => !open && setBulkArchiveConfirm(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.bulkArchiveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.bulkArchiveDesc").replace("{count}", String(selection.count))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkArchiving}>
              <CancelIcon />
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={bulkArchiving} onClick={handleBulkArchive}>
              {bulkArchiving ? <LoadingIconBtn /> : <ArchiveIcon />}
              {t("common.archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Modal title={t("clients.addPayment")} open={payModalOpen} onClose={closePayModal}>
        <form onSubmit={handleAddPayment} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-client">{t("contracts.selectClientLabel")} *</Label>
            <Select value={payForm.client_id} onValueChange={(v) => v && handleClientChange(v)}>
              <SelectTrigger id="pay-client" className="h-12 w-full">
                <SelectValue placeholder={t("contracts.selectClient")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-contract">{t("common.contract")} *</Label>
            <Select
              value={payForm.contract_id}
              onValueChange={(v) => v && setPayForm((prev) => ({ ...prev, contract_id: v }))}
              disabled={!payForm.client_id || contractsLoading}
            >
              <SelectTrigger id="pay-contract" className="h-12 w-full">
                <SelectValue
                  placeholder={
                    contractsLoading
                      ? t("common.loading")
                      : !payForm.client_id
                        ? t("contracts.selectClient")
                        : t("common.contract")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {clientContracts.map((contract) => (
                    <SelectItem key={contract.id} value={String(contract.id)}>
                      {contract.contract_number ? `№${contract.contract_number} — ` : ""}
                      {formatMoney(contract.debt_amount)} {t("common.debt").toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FloatingLabelDatePicker
              id="pay-date"
              label={t("common.date")}
              required
              value={payForm.paid_at}
              onChange={(value) => setPayForm((prev) => ({ ...prev, paid_at: value }))}
            />
            <FloatingLabelMoneyInput
              id="pay-amount"
              label={t("common.amount")}
              required
              value={payForm.amount}
              onValueChange={(digits) => setPayForm((prev) => ({ ...prev, amount: digits }))}
            />
          </div>
          <FloatingLabelInput
            id="pay-note"
            label={t("common.note")}
            value={payForm.note}
            onChange={(e) => setPayForm((prev) => ({ ...prev, note: e.target.value }))}
          />

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <MotionButton type="button" variant="outline" onClick={closePayModal} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton
              type="submit"
              variant="outline"
              data-keep-open="true"
              disabled={paySubmitting}
              {...motionTap}
            >
              {paySubmitting ? <LoadingIconBtn /> : <PlusIcon data-icon="inline-start" />}
              {t("clients.saveAndAddAnother")}
            </MotionButton>
            <MotionButton type="submit" disabled={paySubmitting} {...motionTap}>
              {paySubmitting ? <LoadingIconBtn /> : <SaveIconBtn />}
              {paySubmitting ? t("common.saving") : t("common.save")}
            </MotionButton>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
