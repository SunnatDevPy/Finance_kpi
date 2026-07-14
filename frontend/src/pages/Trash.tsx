import { useEffect, useMemo, useState } from "react";
import { ArchiveIcon, RotateCcwIcon } from "lucide-react";
import { api } from "../api/client";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
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
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Client, Contract, Expense, Income, Payment } from "../types";
import { formatDateWithWeekday, formatMoney } from "../utils/format";
import { expenseCategoryLabel } from "../utils/expenseCategory";
import { incomeCategoryLabel } from "../utils/incomeCategory";

type TrashTab = "clients" | "contracts" | "payments" | "expenses" | "incomes";

export function TrashPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TrashTab>("clients");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<TrashTab, number>>({
    clients: 0,
    contracts: 0,
    payments: 0,
    expenses: 0,
    incomes: 0,
  });

  const [clientNames, setClientNames] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<{ tab: TrashTab; id: number } | null>(null);
  const { loading, start, finish } = useListLoading();

  const loadCounts = () => {
    Promise.all([
      api.clients.trash({ limit: 1 }),
      api.contracts.trash({ limit: 1 }),
      api.payments.trash({ limit: 1 }),
      api.expenses.trash({ limit: 1 }),
      api.incomes.trash({ limit: 1 }),
    ])
      .then(([c, co, p, e, i]) => {
        setCounts({
          clients: c.total,
          contracts: co.total,
          payments: p.total,
          expenses: e.total,
          incomes: i.total,
        });
      })
      .catch(() => {});
  };

  const loadClientNames = () => {
    Promise.all([
      api.clients.trash({ limit: 200 }),
      api.clients.list({ limit: 200 }).catch(() => ({ items: [] as Client[], total: 0, skip: 0, limit: 0 })),
    ])
      .then(([trashedClients, activeClients]) => {
        const map: Record<number, string> = {};
        for (const c of [...trashedClients.items, ...activeClients.items]) {
          map[c.id] = c.company_name;
        }
        setClientNames(map);
      })
      .catch(() => {});
  };

  const loadTab = (silent = false) => {
    start(silent);
    setError("");
    const params = { search: search || undefined, skip: (page - 1) * pageSize, limit: pageSize };
    const request =
      tab === "clients"
        ? api.clients.trash(params).then((res) => {
            setClients(res.items);
            setTotal(res.total);
          })
        : tab === "contracts"
          ? api.contracts.trash(params).then((res) => {
              setContracts(res.items);
              setTotal(res.total);
            })
          : tab === "payments"
            ? api.payments.trash(params).then((res) => {
                setPayments(res.items);
                setTotal(res.total);
              })
            : tab === "expenses"
              ? api.expenses.trash(params).then((res) => {
                  setExpenses(res.items);
                  setTotal(res.total);
                })
              : api.incomes.trash(params).then((res) => {
                  setIncomes(res.items);
                  setTotal(res.total);
                });

    request.catch((e) => setError(e.message)).finally(() => finish());
  };

  useEffect(() => {
    loadCounts();
    loadClientNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, search, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadTab(true), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, page, pageSize]);

  const tabs: { id: TrashTab; label: string; count: number }[] = useMemo(
    () => [
      { id: "clients", label: t("trash.tabClients"), count: counts.clients },
      { id: "contracts", label: t("trash.tabContracts"), count: counts.contracts },
      { id: "payments", label: t("trash.tabPayments"), count: counts.payments },
      { id: "expenses", label: t("trash.tabExpenses"), count: counts.expenses },
      { id: "incomes", label: t("trash.tabIncomes"), count: counts.incomes },
    ],
    [t, counts],
  );

  const handleRestore = async () => {
    if (!restoreTarget) return;
    const { tab: targetTab, id } = restoreTarget;
    setRestoreTarget(null);
    try {
      if (targetTab === "clients") {
        await api.clients.restore(id);
        setClients((prev) => prev.filter((item) => item.id !== id));
      } else if (targetTab === "contracts") {
        await api.contracts.restore(id);
        setContracts((prev) => prev.filter((item) => item.id !== id));
      } else if (targetTab === "payments") {
        await api.payments.restore(id);
        setPayments((prev) => prev.filter((item) => item.id !== id));
      } else if (targetTab === "expenses") {
        await api.expenses.restore(id);
        setExpenses((prev) => prev.filter((item) => item.id !== id));
      } else {
        await api.incomes.restore(id);
        setIncomes((prev) => prev.filter((item) => item.id !== id));
      }
      setTotal((prev) => Math.max(0, prev - 1));
      loadCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <PageShell>
      <PageHeader title={t("trash.title")} subtitle={t("trash.subtitle")} />

      <PageError message={error} />

      <div className="segmented-control w-fit">
        {tabs.map((option) => (
          <MotionButton
            key={option.id}
            type="button"
            size="sm"
            variant={tab === option.id ? "default" : "ghost"}
            className="h-8 px-3.5"
            onClick={() => setTab(option.id)}
            {...motionTap}
          >
            {option.label}
            {option.count > 0 && (
              <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold">
                {option.count}
              </span>
            )}
          </MotionButton>
        ))}
      </div>

      <Card className="content-card">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArchiveIcon className="size-5" />
            </span>
            <div>
              <CardTitle>{tabs.find((option) => option.id === tab)?.label}</CardTitle>
              <CardDescription>
                {t("common.itemsFound").replace("{count}", String(total))}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="table-card-toolbar">
          <Input
            className="w-full min-w-[12rem] flex-1 sm:max-w-xs"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <CardContent className="p-0">
          {tab === "clients" && (
            <PremiumDataTable
              loading={loading}
              empty={!loading && clients.length === 0}
              emptyMessage={t("trash.empty")}
              skeletonCols={4}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{t("clients.company")}</TableHead>
                  <TableHead>{t("clients.phone")}</TableHead>
                  <TableHead>{t("trash.deletedAt")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((item, index) => (
                  <MotionTableRow key={item.id} {...rowEnter(index)}>
                    <TableCellPrimary>{item.company_name}</TableCellPrimary>
                    <TableCellMuted>{item.phone}</TableCellMuted>
                    <TableCellDate>{formatDateWithWeekday(item.updated_at)}</TableCellDate>
                    <TableCellActions>
                      <MotionButton
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setRestoreTarget({ tab: "clients", id: item.id })}
                        {...motionTap}
                      >
                        <RotateCcwIcon data-icon="inline-start" />
                        {t("trash.restore")}
                      </MotionButton>
                    </TableCellActions>
                  </MotionTableRow>
                ))}
              </TableBody>
            </PremiumDataTable>
          )}

          {tab === "contracts" && (
            <PremiumDataTable
              loading={loading}
              empty={!loading && contracts.length === 0}
              emptyMessage={t("trash.empty")}
              skeletonCols={5}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{t("clients.company")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.total")}</TableHead>
                  <TableHead>{t("trash.deletedAt")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((item, index) => (
                  <MotionTableRow key={item.id} {...rowEnter(index)}>
                    <TableCellPrimary subtitle={`#${item.id}`}>
                      {clientNames[item.client_id] ?? `ID ${item.client_id}`}
                    </TableCellPrimary>
                    <TableCellMuted>
                      {formatDateWithWeekday(item.start_date, "short")} — {formatDateWithWeekday(item.end_date, "short")}
                    </TableCellMuted>
                    <TableCellMoney>{formatMoney(item.total_amount)}</TableCellMoney>
                    <TableCellDate>{formatDateWithWeekday(item.updated_at)}</TableCellDate>
                    <TableCellActions>
                      <MotionButton
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setRestoreTarget({ tab: "contracts", id: item.id })}
                        {...motionTap}
                      >
                        <RotateCcwIcon data-icon="inline-start" />
                        {t("trash.restore")}
                      </MotionButton>
                    </TableCellActions>
                  </MotionTableRow>
                ))}
              </TableBody>
            </PremiumDataTable>
          )}

          {tab === "payments" && (
            <PremiumDataTable
              loading={loading}
              empty={!loading && payments.length === 0}
              emptyMessage={t("trash.empty")}
              skeletonCols={4}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.contract")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.amount")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((item, index) => (
                  <MotionTableRow key={item.id} {...rowEnter(index)}>
                    <TableCellMuted>#{item.contract_id}</TableCellMuted>
                    <TableCellDate>{formatDateWithWeekday(item.paid_at)}</TableCellDate>
                    <TableCellMoney>{formatMoney(item.amount)}</TableCellMoney>
                    <TableCellActions>
                      <MotionButton
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setRestoreTarget({ tab: "payments", id: item.id })}
                        {...motionTap}
                      >
                        <RotateCcwIcon data-icon="inline-start" />
                        {t("trash.restore")}
                      </MotionButton>
                    </TableCellActions>
                  </MotionTableRow>
                ))}
              </TableBody>
            </PremiumDataTable>
          )}

          {tab === "expenses" && (
            <PremiumDataTable
              loading={loading}
              empty={!loading && expenses.length === 0}
              emptyMessage={t("trash.empty")}
              skeletonCols={5}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("expenses.category")}</TableHead>
                  <TableHead>{t("expenses.titleField")}</TableHead>
                  <TableHead>{t("common.amount")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((item, index) => (
                  <MotionTableRow key={item.id} {...rowEnter(index)}>
                    <TableCellDate>{formatDateWithWeekday(item.expense_date)}</TableCellDate>
                    <TableCellMuted>{expenseCategoryLabel(t, item.category)}</TableCellMuted>
                    <TableCellPrimary>{item.title}</TableCellPrimary>
                    <TableCellMoney tone="negative">{formatMoney(item.amount)}</TableCellMoney>
                    <TableCellActions>
                      <MotionButton
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setRestoreTarget({ tab: "expenses", id: item.id })}
                        {...motionTap}
                      >
                        <RotateCcwIcon data-icon="inline-start" />
                        {t("trash.restore")}
                      </MotionButton>
                    </TableCellActions>
                  </MotionTableRow>
                ))}
              </TableBody>
            </PremiumDataTable>
          )}

          {tab === "incomes" && (
            <PremiumDataTable
              loading={loading}
              empty={!loading && incomes.length === 0}
              emptyMessage={t("trash.empty")}
              skeletonCols={5}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("finance.category")}</TableHead>
                  <TableHead>{t("expenses.titleField")}</TableHead>
                  <TableHead>{t("common.amount")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((item, index) => (
                  <MotionTableRow key={item.id} {...rowEnter(index)}>
                    <TableCellDate>{formatDateWithWeekday(item.income_date)}</TableCellDate>
                    <TableCellMuted>{incomeCategoryLabel(t, item.category)}</TableCellMuted>
                    <TableCellPrimary>{item.title}</TableCellPrimary>
                    <TableCellMoney tone="positive">{formatMoney(item.amount)}</TableCellMoney>
                    <TableCellActions>
                      <MotionButton
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setRestoreTarget({ tab: "incomes", id: item.id })}
                        {...motionTap}
                      >
                        <RotateCcwIcon data-icon="inline-start" />
                        {t("trash.restore")}
                      </MotionButton>
                    </TableCellActions>
                  </MotionTableRow>
                ))}
              </TableBody>
            </PremiumDataTable>
          )}
          <Pagination
            embedded
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <AlertDialog open={restoreTarget !== null} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trash.restore")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trash.restoreConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>{t("trash.restore")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
