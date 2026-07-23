import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangleIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FileUpIcon,
  PencilIcon,
  PlusIcon,
  ScaleIcon,
  Trash2Icon,
  TrendingUpIcon,
  UploadCloudIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { CancelIcon, DeleteIconBtn, LoadingIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { DateRangePicker } from "../components/DateRangePicker";
import { ExportButtons } from "../components/ExportButtons";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { TableColumnPicker } from "../components/TableColumnPicker";
import { usePickerColumns } from "../hooks/usePickerColumns";
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
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
import type {
  ExpenseCategory,
  FinanceEntryType,
  FinanceImportResult,
  FinanceLedgerItem,
  FinanceTurnover,
  FinanceTurnoverTrend,
  IncomeCategory,
} from "../types";
import { usePersistedState } from "../hooks/usePersistedState";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "../utils/expenseCategory";
import { INCOME_CATEGORIES, incomeCategoryLabel } from "../utils/incomeCategory";
import {
  formatCompactMoney,
  formatDateWithWeekday,
  formatMoney,
  toNumber,
} from "../utils/format";
import { cn } from "@/lib/utils";

const TURNOVER_YEAR_START = 2020;
const TURNOVER_CHART_YEAR_END = 2026;

function moneyTooltip(value: unknown) {
  return formatMoney(String(value ?? 0));
}

const FINANCE_OPTIONAL_COLUMNS = [
  { id: "type", labelKey: "finance.typeIncome", defaultVisible: true },
  { id: "title", labelKey: "expenses.titleField", defaultVisible: true },
  { id: "category", labelKey: "finance.category", defaultVisible: true },
  { id: "amount", labelKey: "common.amount", defaultVisible: true },
  { id: "note", labelKey: "common.note", defaultVisible: true },
] as const;

type FinanceOptionalColumn = (typeof FINANCE_OPTIONAL_COLUMNS)[number]["id"];

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
  const { isVisible, setColumnVisible, visibleCount, items: columnPickerItems } =
    usePickerColumns("wtma.finance.tableColumns", FINANCE_OPTIONAL_COLUMNS, t);

  const [items, setItems] = useState<FinanceLedgerItem[]>([]);
  const [turnover, setTurnover] = useState<FinanceTurnover | null>(null);
  const [turnoverTrend, setTurnoverTrend] = useState<FinanceTurnoverTrend | null>(null);
  const [turnoverLoading, setTurnoverLoading] = useState(true);
  const [turnoverYear, setTurnoverYear] = usePersistedState(
    "wtma.finance.turnoverYear",
    String(new Date().getFullYear()),
  );
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

  const yearOptions = useMemo(() => {
    const end = Math.max(TURNOVER_CHART_YEAR_END, new Date().getFullYear());
    const years: number[] = [];
    for (let year = end; year >= TURNOVER_YEAR_START; year -= 1) {
      years.push(year);
    }
    return years;
  }, []);

  const turnoverChartConfig = useMemo(
    () =>
      ({
        total_inflow: {
          label: t("finance.turnover.totalInflow"),
          color: "hsl(160 72% 38%)",
        },
        total_expense: {
          label: t("finance.turnover.totalExpense"),
          color: "hsl(0 72% 51%)",
        },
        net_balance: {
          label: t("finance.turnover.netBalance"),
          color: "hsl(217 91% 60%)",
        },
      }) satisfies ChartConfig,
    [t],
  );

  const turnoverChartData = useMemo(
    () =>
      (turnoverTrend?.points ?? []).map((point) => ({
        year: String(point.year),
        total_inflow: toNumber(point.total_inflow),
        total_expense: toNumber(point.total_expense),
        net_balance: toNumber(point.net_balance),
      })),
    [turnoverTrend],
  );

  const selectedYear = Number.parseInt(turnoverYear, 10) || new Date().getFullYear();

  const loadTurnover = (year = selectedYear) => {
    setTurnoverLoading(true);
    Promise.all([
      api.finance.turnover(year),
      api.finance.turnoverTrend(TURNOVER_YEAR_START, TURNOVER_CHART_YEAR_END),
    ])
      .then(([summary, trend]) => {
        setTurnover(summary);
        setTurnoverTrend(trend);
      })
      .catch((e) => setError(e.message))
      .finally(() => setTurnoverLoading(false));
  };

  const applyYearFilter = (year: number) => {
    setDateFrom(`${year}-01-01`);
    setDateTo(`${year}-12-31`);
  };

  const handleYearChange = (yearValue: string) => {
    if (!yearValue) return;
    setTurnoverYear(yearValue);
    const year = Number.parseInt(yearValue, 10);
    applyYearFilter(year);
    loadTurnover(year);
  };

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
    applyYearFilter(selectedYear);
    loadTurnover(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      loadTurnover(selectedYear);
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
      loadTurnover(selectedYear);
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
      loadTurnover(selectedYear);
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
          <ExportButtons resource="expenses" dateFrom={dateFrom} dateTo={dateTo} showLabel={false} />
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

      <Card className="content-card">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">{t("finance.turnover.title")}</CardTitle>
              <CardDescription className="text-xs">{t("finance.turnover.subtitle")}</CardDescription>
            </div>
            <Select value={turnoverYear} onValueChange={handleYearChange} className="w-full sm:w-36">
              <SelectTrigger>
                <SelectValue placeholder={t("finance.turnover.year")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-5">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              {t("finance.turnover.trendTitle")}
            </p>
            {turnoverChartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
            ) : (
              <ChartContainer config={turnoverChartConfig} className="h-[280px] w-full">
                <LineChart data={turnoverChartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={72}
                    tickFormatter={formatCompactMoney}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(value) => moneyTooltip(value)} />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="total_inflow"
                    stroke="var(--color-total_inflow)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_expense"
                    stroke="var(--color-total_expense)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net_balance"
                    stroke="var(--color-net_balance)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {t("finance.turnover.trendDesc")
                .replace("{from}", String(TURNOVER_YEAR_START))
                .replace("{to}", String(TURNOVER_CHART_YEAR_END))}
            </p>
          </div>

          <StaggerContainer
            className={cn(
              "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
              turnoverLoading && "opacity-60",
            )}
          >
            <StaggerItem>
              <StatCard
                title={t("finance.turnover.clientPayments")}
                value={formatMoney(turnover?.client_payments ?? "0")}
                accent="blue"
                icon={WalletIcon}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title={t("finance.turnover.otherIncome")}
                value={formatMoney(turnover?.other_income ?? "0")}
                accent="green"
                icon={ArrowUpCircleIcon}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title={t("finance.turnover.totalInflow")}
                value={formatMoney(turnover?.total_inflow ?? "0")}
                accent="green"
                icon={TrendingUpIcon}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title={t("finance.turnover.totalExpense")}
                value={formatMoney(turnover?.total_expense ?? "0")}
                accent="red"
                icon={ArrowDownCircleIcon}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title={t("finance.turnover.netBalance")}
                value={formatMoney(turnover?.net_balance ?? "0")}
                accent={Number(turnover?.net_balance ?? 0) >= 0 ? "blue" : "amber"}
                icon={ScaleIcon}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                title={t("finance.turnover.contractsVolume")}
                value={formatMoney(turnover?.contracts_volume ?? "0")}
                accent="blue"
                icon={FileTextIcon}
              />
            </StaggerItem>
          </StaggerContainer>
        </CardContent>
      </Card>

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

      <Card className="content-card">
        <CardHeader className="pb-3">
          <CardTitle>{t("finance.listTitle")}</CardTitle>
          <CardDescription>
            {total} {t("finance.records")}
          </CardDescription>
        </CardHeader>
        <div className="table-card-toolbar">
          <Input
            className="w-full min-w-[12rem] flex-1 sm:max-w-xs"
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
          <TableColumnPicker
            columns={columnPickerItems}
            isVisible={(id: FinanceOptionalColumn) => isVisible(id)}
            onVisibleChange={setColumnVisible}
            className="sm:ml-auto"
          />
        </div>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && items.length === 0}
            emptyMessage={t("finance.notFound")}
            skeletonCols={2 + visibleCount}
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
                {isVisible("type") && <TableHead>{t("finance.typeIncome")}</TableHead>}
                {isVisible("title") && <TableHead>{t("expenses.titleField")}</TableHead>}
                {isVisible("category") && <TableHead>{t("finance.category")}</TableHead>}
                {isVisible("amount") && <TableHead>{t("common.amount")}</TableHead>}
                {isVisible("note") && <TableHead>{t("common.note")}</TableHead>}
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <MotionTableRow key={`${item.type}-${item.id}`} {...rowEnter(index)}>
                  <TableCellDate>{formatDateWithWeekday(item.date)}</TableCellDate>
                  {isVisible("type") && (
                  <TableCellMuted>
                    <Badge variant="outline" className={typeBadgeClass(item.type)}>
                      {item.type === "income" && t("finance.typeIncome")}
                      {item.type === "expense" && t("finance.typeExpense")}
                      {item.type === "payment" && t("finance.typePayment")}
                    </Badge>
                  </TableCellMuted>
                  )}
                  {isVisible("title") && (
                  <TableCellPrimary>{item.title}</TableCellPrimary>
                  )}
                  {isVisible("category") && (
                  <TableCellMuted>
                    {item.type === "income" && item.category
                      ? incomeCategoryLabel(t, item.category)
                      : item.type === "expense" && item.category
                        ? expenseCategoryLabel(t, item.category)
                        : "—"}
                  </TableCellMuted>
                  )}
                  {isVisible("amount") && (
                  <TableCellMoney tone={Number(item.amount) >= 0 ? "positive" : "negative"}>
                    {formatMoney(item.amount)}
                  </TableCellMoney>
                  )}
                  {isVisible("note") && (
                  <TableCellMuted className="max-w-xs">{item.note}</TableCellMuted>
                  )}
                  <TableCellActions>
                    <div className="action-toolbar">
                    {item.type === "payment" ? (
                      <MotionButton
                        variant="ghost"
                        size="icon-sm"
                        className="size-8"
                        onClick={() => item.client_id && navigate(`/clients/${item.client_id}`)}
                        disabled={!item.client_id}
                        title={t("finance.viewClient")}
                        {...motionTap}
                      >
                        <ExternalLinkIcon className="size-3.5" />
                      </MotionButton>
                    ) : (
                      <>
                        <MotionButton
                          variant="ghost"
                          size="icon-sm"
                          className="size-8"
                          onClick={() => openEdit(item)}
                          title={t("common.edit")}
                          {...motionTap}
                        >
                          <PencilIcon className="size-3.5" />
                        </MotionButton>
                        <MotionButton
                          variant="ghost"
                          size="icon-sm"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget({ kind: item.type as EntryKind, id: item.id })}
                          title={t("common.delete")}
                          {...motionTap}
                        >
                          <Trash2Icon className="size-3.5" />
                        </MotionButton>
                      </>
                    )}
                    </div>
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
          <div className="flex flex-wrap justify-end gap-2 pt-2">
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

              <div className="flex flex-wrap justify-end gap-2 pt-2">
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

              <div className="flex flex-wrap justify-end gap-2 pt-2">
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
