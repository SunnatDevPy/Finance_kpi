import { useEffect, useMemo, useState } from "react";
import { ArchiveIcon, RotateCcwIcon } from "lucide-react";
import { api } from "../api/client";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
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
import type { Client, Contract, Expense, Income, Payment } from "../types";
import { formatDateWithWeekday, formatMoney } from "../utils/format";
import { expenseCategoryLabel } from "../utils/expenseCategory";
import { incomeCategoryLabel } from "../utils/incomeCategory";

type TrashTab = "clients" | "contracts" | "payments" | "expenses" | "incomes";

export function TrashPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TrashTab>("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [clientNames, setClientNames] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<{ tab: TrashTab; id: number } | null>(null);
  const { loading, start, finish } = useListLoading();

  const load = (silent = false) => {
    start(silent);
    setError("");
    Promise.all([
      api.clients.trash(),
      api.contracts.trash(),
      api.payments.trash(),
      api.expenses.trash(),
      api.incomes.trash(),
      api.clients.list({ limit: 200 }).catch(() => ({ items: [] as Client[] })),
    ])
      .then(
        ([
          trashedClients,
          trashedContracts,
          trashedPayments,
          trashedExpenses,
          trashedIncomes,
          activeClients,
        ]) => {
          setClients(trashedClients);
          setContracts(trashedContracts);
          setPayments(trashedPayments);
          setExpenses(trashedExpenses);
          setIncomes(trashedIncomes);
          const map: Record<number, string> = {};
          for (const client of [...trashedClients, ...activeClients.items]) {
            map[client.id] = client.company_name;
          }
          setClientNames(map);
        },
      )
      .catch((e) => setError(e.message))
      .finally(() => finish());
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs: { id: TrashTab; label: string; count: number }[] = useMemo(
    () => [
      { id: "clients", label: t("trash.tabClients"), count: clients.length },
      { id: "contracts", label: t("trash.tabContracts"), count: contracts.length },
      { id: "payments", label: t("trash.tabPayments"), count: payments.length },
      { id: "expenses", label: t("trash.tabExpenses"), count: expenses.length },
      { id: "incomes", label: t("trash.tabIncomes"), count: incomes.length },
    ],
    [t, clients.length, contracts.length, payments.length, expenses.length, incomes.length],
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
                {t("common.itemsFound").replace(
                  "{count}",
                  String(tabs.find((option) => option.id === tab)?.count ?? 0),
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
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
