import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangleIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  FileUpIcon,
  PencilIcon,
  PlusIcon,
  ScaleIcon,
  Trash2Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { api } from "../api/client";
import { CancelIcon, DeleteIconBtn, LoadingIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { DateRangePicker } from "../components/DateRangePicker";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { StaggerContainer, StaggerItem } from "../components/Stagger";
import { StatCard } from "../components/StatCard";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCellActions,
  TableCellDate,
  TableCellMoney,
  TableCellMuted,
  TableCellPrimary,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { useI18n } from "../context/I18nContext";
import { useListLoading } from "../hooks/useListLoading";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
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
import { Badge } from "@/components/ui/badge";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelDatePicker } from "@/components/ui/date-picker";
import {
  FloatingLabelInput,
  FloatingLabelMoneyInput,
  FloatingLabelTextarea,
} from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpenseCategory, FinanceEntryType, FinanceImportResult, FinanceLedgerItem, IncomeCategory } from "../types";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "../utils/expenseCategory";
import { INCOME_CATEGORIES, incomeCategoryLabel } from "../utils/incomeCategory";
import { formatDateWithWeekday, formatMoney } from "../utils/format";

type EntryKind = "income" | "expense";

interface EntryForm {
  kind: EntryKind;
  category: string;
  title: string;
  amount: string;
  date: string;
  note: string;
}

function emptyForm(kind: EntryKind = "income"): EntryForm {
  return {
    kind,
    category: kind === "income" ? "sale" : "other",
    title: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  };
}

function typeBadgeClass(type: FinanceEntryType): string {
  if (type === "income") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (type === "expense") return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
}

export function FinancePage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [items, setItems] = useState<FinanceLedgerItem[]>([]);
  const [entryType, setEntryType] = useState<FinanceEntryType | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [totalIncome, setTotalIncome] = useState("0");
  const [totalExpense, setTotalExpense] = useState("0");
  const [netBalance, setNetBalance] = useState("0");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();
  const { submitting, guard } = useSubmitGuard();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceLedgerItem | null>(null);
  const [form, setForm] = useState<EntryForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<{ kind: EntryKind; id: number } | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<FinanceImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = (silent = true) => {
    start(silent);
    api.finance
      .ledger({
        type: entryType === "all" ? undefined : entryType,
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalIncome(data.total_income);
        setTotalExpense(data.total_expense);
        setNetBalance(data.net_balance);
      })
      .catch((e) => setError(e.message))
      .finally(() => finish());
  };

  useEffect(() => {
    setPage(1);
  }, [entryType, dateFrom, dateTo, search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryType, dateFrom, dateTo, search, page, pageSize]);

  const openCreate = (kind: EntryKind) => {
    setEditing(null);
    setForm(emptyForm(kind));
    setModalOpen(true);
  };

  const openEdit = (item: FinanceLedgerItem) => {
    if (item.type === "payment") return;
    setEditing(item);
    setForm({
      kind: item.type,
      category: item.category ?? "other",
      title: item.title,
      amount: String(Math.round(Math.abs(Number(item.amount)))),
      date: item.date,
      note: item.note ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.date) {
      setError(t("clients.selectDateError"));
      return;
    }
    try {
      if (form.kind === "income") {
        const payload = {
          category: form.category as IncomeCategory,
          title: form.title.trim(),
          amount: Number.parseFloat(form.amount),
          income_date: form.date,
          note: form.note.trim() || undefined,
        };
        if (editing) {
          await api.incomes.update(editing.id, payload);
        } else {
          await api.incomes.create(payload);
        }
      } else {
        const payload = {
          category: form.category as ExpenseCategory,
          title: form.title.trim(),
          amount: Number.parseFloat(form.amount),
          expense_date: form.date,
          note: form.note.trim() || undefined,
        };
        if (editing) {
          await api.expenses.update(editing.id, payload);
        } else {
          await api.expenses.create(payload);
        }
      }
      setModalOpen(false);
      load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { kind, id } = deleteTarget;
    setDeleteTarget(null);
    try {
      if (kind === "income") {
        await api.incomes.delete(id);
      } else {
        await api.expenses.delete(id);
      }
      load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportError("");
    setImportResult(null);
    setImportModalOpen(true);
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    if (importResult && (importResult.created_income > 0 || importResult.created_expense > 0)) {
      load(true);
    }
  };

  const handleDownloadTemplate = () => api.finance.downloadImportTemplate();

  const handleImportUpload = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportError("");
    try {
      const result = await api.finance.import(importFile);
      setImportResult(result);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setImportBusy(false);
    }
  };

  const categoryOptions = form.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categoryLabel = (category: string) =>
    form.kind === "income" ? incomeCategoryLabel(t, category) : expenseCategoryLabel(t, category);

  return (
    <PageShell>
      <PageHeader title={t("finance.title")} subtitle={t("finance.subtitle")}>
        <div className="flex flex-wrap items-center gap-2">
          <MotionButton type="button" variant="outline" onClick={openImportModal} {...motionTap}>
            <FileUpIcon data-icon="inline-start" />
            {t("finance.importFromExcel")}
          </MotionButton>
          <MotionButton type="button" onClick={() => openCreate("income")} {...motionTap}>
            <PlusIcon data-icon="inline-start" />
            {t("finance.addIncome")}
          </MotionButton>
        </div>
      </PageHeader>

      <PageError message={error} />

      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StaggerItem>
          <StatCard
            title={t("finance.totalIncome")}
            value={formatMoney(totalIncome)}
            accent="green"
            icon={ArrowUpCircleIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("finance.totalExpense")}
            value={formatMoney(totalExpense)}
            accent="red"
            icon={ArrowDownCircleIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("finance.netBalance")}
            value={formatMoney(netBalance)}
            accent={Number(netBalance) >= 0 ? "blue" : "amber"}
            icon={ScaleIcon}
          />
        </StaggerItem>
      </StaggerContainer>

      <div className="filter-bar">
        <Input
          className="max-w-sm flex-1"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={entryType}
          onValueChange={(value) => value && setEntryType(value as FinanceEntryType | "all")}
          className="w-full sm:w-56"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("finance.allTypes")}</SelectItem>
            <SelectItem value="income">{t("finance.typeIncome")}</SelectItem>
            <SelectItem value="expense">{t("finance.typeExpense")}</SelectItem>
            <SelectItem value="payment">{t("finance.typePayment")}</SelectItem>
          </SelectContent>
        </Select>
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
            <CardTitle>{t("finance.listTitle")}</CardTitle>
            <CardDescription>
              {total} {t("finance.records")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && items.length === 0}
            emptyMessage={t("finance.notFound")}
            skeletonCols={7}
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
                <TableHead>{t("finance.typeIncome")}</TableHead>
                <TableHead>{t("expenses.titleField")}</TableHead>
                <TableHead>{t("finance.category")}</TableHead>
                <TableHead>{t("common.amount")}</TableHead>
                <TableHead>{t("common.note")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <MotionTableRow key={`${item.type}-${item.id}`} {...rowEnter(index)}>
                  <TableCellDate>{formatDateWithWeekday(item.date)}</TableCellDate>
                  <TableCellMuted>
                    <Badge variant="outline" className={typeBadgeClass(item.type)}>
                      {item.type === "income" && t("finance.typeIncome")}
                      {item.type === "expense" && t("finance.typeExpense")}
                      {item.type === "payment" && t("finance.typePayment")}
                    </Badge>
                  </TableCellMuted>
                  <TableCellPrimary>{item.title}</TableCellPrimary>
                  <TableCellMuted>
                    {item.type === "income" && item.category
                      ? incomeCategoryLabel(t, item.category)
                      : item.type === "expense" && item.category
                        ? expenseCategoryLabel(t, item.category)
                        : "—"}
                  </TableCellMuted>
                  <TableCellMoney tone={Number(item.amount) >= 0 ? "positive" : "negative"}>
                    {formatMoney(item.amount)}
                  </TableCellMoney>
                  <TableCellMuted className="max-w-xs">{item.note}</TableCellMuted>
                  <TableCellActions>
                    {item.type === "payment" ? (
                      <MotionButton
                        variant="ghost"
                        size="sm"
                        onClick={() => item.client_id && navigate(`/clients/${item.client_id}`)}
                        disabled={!item.client_id}
                        {...motionTap}
                      >
                        <ExternalLinkIcon data-icon="inline-start" />
                        {t("finance.viewClient")}
                      </MotionButton>
                    ) : (
                      <>
                        <MotionButton
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          {...motionTap}
                        >
                          <PencilIcon data-icon="inline-start" />
                          {t("common.edit")}
                        </MotionButton>
                        <MotionButton
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ kind: item.type as EntryKind, id: item.id })}
                          {...motionTap}
                        >
                          <Trash2Icon data-icon="inline-start" />
                          {t("common.delete")}
                        </MotionButton>
                      </>
                    )}
                  </TableCellActions>
                </MotionTableRow>
              ))}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

      <Modal
        title={
          editing
            ? form.kind === "income"
              ? t("finance.editIncomeTitle")
              : t("expenses.editTitle")
            : t("finance.createIncomeTitle")
        }
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!editing && (
            <div className="segmented-control w-fit">
              <MotionButton
                type="button"
                size="sm"
                variant={form.kind === "income" ? "default" : "ghost"}
                className="h-8 px-3.5"
                onClick={() => setForm(emptyForm("income"))}
                {...motionTap}
              >
                <ArrowUpCircleIcon data-icon="inline-start" />
                {t("finance.typeIncome")}
              </MotionButton>
              <MotionButton
                type="button"
                size="sm"
                variant={form.kind === "expense" ? "default" : "ghost"}
                className="h-8 px-3.5"
                onClick={() => setForm(emptyForm("expense"))}
                {...motionTap}
              >
                <ArrowDownCircleIcon data-icon="inline-start" />
                {t("finance.typeExpense")}
              </MotionButton>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>{t("finance.category")}</Label>
            <Select
              value={form.category}
              onValueChange={(value) => value && setForm({ ...form, category: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <FloatingLabelInput
            id="finance-title"
            label={t("finance.titleField")}
            placeholder={t("finance.titlePlaceholder")}
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FloatingLabelMoneyInput
              id="finance-amount"
              label={t("finance.amount")}
              required
              value={form.amount}
              onValueChange={(digits) => setForm({ ...form, amount: digits })}
            />
            <FloatingLabelDatePicker
              id="finance-date"
              label={t("finance.date")}
              required
              value={form.date}
              onChange={(value) => setForm({ ...form, date: value })}
            />
          </div>
          <FloatingLabelTextarea
            id="finance-note"
            label={t("finance.note")}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <MotionButton type="button" variant="outline" onClick={() => setModalOpen(false)} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" disabled={submitting} {...motionTap}>
              {submitting ? <LoadingIconBtn /> : <SaveIconBtn />}
              {submitting ? t("common.saving") : t("common.save")}
            </MotionButton>
          </div>
        </form>
      </Modal>

      <Modal title={t("finance.importFromExcel")} open={importModalOpen} onClose={closeImportModal}>
        <div className="flex flex-col gap-4">
          {!importResult ? (
            <>
              <p className="text-sm text-muted-foreground">{t("finance.importDesc")}</p>

              <MotionButton type="button" variant="outline" onClick={handleDownloadTemplate} {...motionTap}>
                <DownloadIcon data-icon="inline-start" />
                {t("finance.downloadTemplate")}
              </MotionButton>

              <label
                htmlFor="finance-import-file"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <UploadCloudIcon className="size-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {importFile ? importFile.name : t("finance.chooseFile")}
                </span>
                <span className="text-xs text-muted-foreground">{t("finance.xlsxOnly")}</span>
                <input
                  id="finance-import-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xlsm"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {importError && <p className="text-sm text-destructive">{importError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <MotionButton type="button" variant="outline" onClick={closeImportModal} {...motionTap}>
                  <CancelIcon />
                  {t("common.cancel")}
                </MotionButton>
                <MotionButton
                  type="button"
                  disabled={!importFile || importBusy}
                  onClick={handleImportUpload}
                  {...motionTap}
                >
                  <FileUpIcon data-icon="inline-start" />
                  {importBusy ? t("export.downloading") : t("finance.uploadFile")}
                </MotionButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/30">
                <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  {t("finance.importCreated")
                    .replace("{income}", String(importResult.created_income))
                    .replace("{expense}", String(importResult.created_expense))}
                </p>
              </div>

              {importResult.errors.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-red-200/60 bg-red-50/50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="size-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      {t("finance.importErrors").replace("{count}", String(importResult.errors.length))}
                    </p>
                  </div>
                  <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-red-800/90 dark:text-red-300/90">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          <AlertTriangleIcon data-icon="inline-start" />
                          {t("common.rank")} {err.row}
                        </Badge>
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <MotionButton type="button" variant="outline" onClick={() => setImportResult(null)} {...motionTap}>
                  <UploadCloudIcon data-icon="inline-start" />
                  {t("finance.importAnother")}
                </MotionButton>
                <MotionButton type="button" onClick={closeImportModal} {...motionTap}>
                  {t("common.close")}
                </MotionButton>
              </div>
            </>
          )}
        </div>
      </Modal>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === "income"
                ? t("finance.deleteIncomeTitle")
                : t("finance.deleteExpenseTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "income"
                ? t("finance.deleteIncomeDesc")
                : t("finance.deleteExpenseDesc")}
            </AlertDialogDescription>
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
