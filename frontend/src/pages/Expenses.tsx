import { useEffect, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon, WalletIcon } from "lucide-react";
import { api } from "../api/client";
import { CancelIcon, DeleteIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { DateRangePicker } from "../components/DateRangePicker";
import { ExportButtons } from "../components/ExportButtons";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
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
import type { Expense, ExpenseCategory } from "../types";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "../utils/expenseCategory";
import { formatDate, formatMoney, toWholeAmountDigits } from "../utils/format";

interface ExpenseForm {
  category: ExpenseCategory;
  title: string;
  amount: string;
  expense_date: string;
  note: string;
}

function emptyForm(): ExpenseForm {
  return {
    category: "other",
    title: "",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    note: "",
  };
}

export function ExpensesPage() {
  const { t } = useI18n();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState<ExpenseCategory | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState("0");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = (silent = true) => {
    start(silent);
    Promise.all([
      api.expenses.list({
        category: category === "all" ? undefined : category,
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      }),
      api.expenses.summary({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    ])
      .then(([listData, summary]) => {
        setExpenses(listData.items);
        setTotal(listData.total);
        setTotalAmount(summary.total_expenses);
      })
      .catch((e) => setError(e.message))
      .finally(() => finish());
  };

  useEffect(() => {
    setPage(1);
  }, [category, dateFrom, dateTo, search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, dateFrom, dateTo, search, page, pageSize]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      category: expense.category,
      title: expense.title,
      amount: toWholeAmountDigits(expense.amount),
      expense_date: expense.expense_date,
      note: expense.note ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.expense_date) {
      setError(t("clients.selectDateError"));
      return;
    }
    const payload = {
      category: form.category,
      title: form.title.trim(),
      amount: Number.parseFloat(form.amount),
      expense_date: form.expense_date,
      note: form.note.trim() || undefined,
    };
    try {
      if (editing) {
        const updated = await api.expenses.update(editing.id, payload);
        setExpenses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        await api.expenses.create(payload);
        load(false);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    const snapshot = expenses;
    setExpenses((prev) => prev.filter((item) => item.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    setDeleteId(null);
    try {
      await api.expenses.delete(id);
    } catch (err) {
      setExpenses(snapshot);
      setTotal((prev) => prev + 1);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <PageShell>
      <PageHeader title={t("expenses.title")} subtitle={t("expenses.subtitle")}>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons resource="expenses" dateFrom={dateFrom} dateTo={dateTo} />
          <MotionButton type="button" onClick={openCreate} {...motionTap}>
            <PlusIcon data-icon="inline-start" />
            {t("expenses.addNew")}
          </MotionButton>
        </div>
      </PageHeader>

      <PageError message={error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title={t("expenses.total")}
          value={formatMoney(totalAmount)}
          accent="red"
          icon={WalletIcon}
        />
      </div>

      <div className="filter-bar">
        <Input
          className="max-w-sm flex-1"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={category}
          onValueChange={(value) => value && setCategory(value as ExpenseCategory | "all")}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("expenses.allCategories")}</SelectItem>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {expenseCategoryLabel(t, cat)}
              </SelectItem>
            ))}
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
            <CardTitle>{t("expenses.listTitle")}</CardTitle>
            <CardDescription>
              {total} {t("expenses.records")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && expenses.length === 0}
            emptyMessage={t("expenses.notFound")}
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
                <TableHead>{t("expenses.category")}</TableHead>
                <TableHead>{t("expenses.titleField")}</TableHead>
                <TableHead>{t("common.amount")}</TableHead>
                <TableHead>{t("common.note")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense, index) => (
                <MotionTableRow key={expense.id} {...rowEnter(index)}>
                  <TableCellDate>{formatDate(expense.expense_date)}</TableCellDate>
                  <TableCellMuted>
                    <Badge variant="outline">{expenseCategoryLabel(t, expense.category)}</Badge>
                  </TableCellMuted>
                  <TableCellPrimary>{expense.title}</TableCellPrimary>
                  <TableCellMoney tone="negative">{formatMoney(expense.amount)}</TableCellMoney>
                  <TableCellMuted className="max-w-xs">{expense.note}</TableCellMuted>
                  <TableCellActions>
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(expense)}
                      {...motionTap}
                    >
                      <PencilIcon data-icon="inline-start" />
                      {t("common.edit")}
                    </MotionButton>
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(expense.id)}
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

      <Modal
        title={editing ? t("expenses.editTitle") : t("expenses.createTitle")}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("expenses.category")}</Label>
            <Select
              value={form.category}
              onValueChange={(value) => value && setForm({ ...form, category: value as ExpenseCategory })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {expenseCategoryLabel(t, cat)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <FloatingLabelInput
            id="title"
            label={t("expenses.titleField")}
            placeholder={t("expenses.titlePlaceholder")}
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FloatingLabelMoneyInput
              id="amount"
              label={t("expenses.amount")}
              required
              value={form.amount}
              onValueChange={(digits) => setForm({ ...form, amount: digits })}
            />
            <FloatingLabelDatePicker
              id="expense_date"
              label={t("expenses.date")}
              required
              value={form.expense_date}
              onChange={(value) => setForm({ ...form, expense_date: value })}
            />
          </div>
          <FloatingLabelTextarea
            id="note"
            label={t("expenses.note")}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <MotionButton type="button" variant="outline" onClick={() => setModalOpen(false)} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" {...motionTap}>
              <SaveIconBtn />
              {t("common.save")}
            </MotionButton>
          </div>
        </form>
      </Modal>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("expenses.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("expenses.deleteDesc")}</AlertDialogDescription>
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
