import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangleIcon,
  BanknoteIcon,
  MapPinIcon,
  CheckCircle2Icon,
  CrownIcon,
  ScaleIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";
import { api } from "../api/client";
import { ExportButtons } from "../components/ExportButtons";
import { DateRangePicker } from "../components/DateRangePicker";
import { StatCard } from "../components/StatCard";
import { TableViewLink } from "../components/TableViewLink";
import { StaggerContainer, StaggerItem } from "../components/Stagger";
import { PageShell, SectionHeader } from "../components/PageHeader";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
  TableCellCompany,
  TableCellMoney,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChartPoint, ClientRegionStatsItem, DashboardStats, TopClientLtvItem } from "../types";
import { useI18n } from "../context/I18nContext";
import { formatAmount, formatCompactMoney, formatMoney, formatPercent, toNumber } from "../utils/format";
import { cn } from "@/lib/utils";
import { CONTRACT_WORKFLOW_STATUSES } from "@/data/contractWorkflow";

const SERVICE_BAR_COLORS = [
  "bg-brand-600",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-rose-400",
];

const RANK_STYLES = [
  "bg-amber-400 text-amber-950",
  "bg-slate-300 text-slate-800",
  "bg-orange-400 text-orange-950",
];

const LTV_LIMIT_OPTIONS = [10, 20, 30] as const;
const TREND_MONTH_OPTIONS = [6, 12] as const;

const CONTRACT_STATUS_COLORS: Record<(typeof CONTRACT_WORKFLOW_STATUSES)[number], string> = {
  yangi: "hsl(220 70% 50%)",
  davom_etmoqda: "hsl(160 72% 38%)",
  tugadi: "hsl(220 13% 55%)",
  toxtatildi: "hsl(38 92% 50%)",
};

function moneyTooltip(value: unknown) {
  return formatMoney(Number(value));
}

function RevealCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [regionStats, setRegionStats] = useState<ClientRegionStatsItem[]>([]);
  const [regionCountryFilter, setRegionCountryFilter] = useState("all");
  const [regionCityFilter, setRegionCityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const [regionError, setRegionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ltvClients, setLtvClients] = useState<TopClientLtvItem[]>([]);
  const [ltvLimit, setLtvLimit] = useState<(typeof LTV_LIMIT_OPTIONS)[number]>(10);
  const [ltvLoading, setLtvLoading] = useState(true);
  const [ltvError, setLtvError] = useState("");
  const [trendMonths, setTrendMonths] = useState<(typeof TREND_MONTH_OPTIONS)[number]>(12);
  const [trendPoints, setTrendPoints] = useState<ChartPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState("");

  const revenueConfig = useMemo(
    () =>
      ({
        revenue: { label: t("dashboard.charts.revenue"), color: "hsl(160 72% 38%)" },
        plan: { label: t("dashboard.charts.plan"), color: "hsl(38 92% 50%)" },
      }) satisfies ChartConfig,
    [t],
  );

  const profitConfig = useMemo(
    () =>
      ({
        profit: { label: t("dashboard.charts.profit"), color: "hsl(160 72% 38%)" },
      }) satisfies ChartConfig,
    [t],
  );

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .dashboard({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setRegionError("");
    api.dashboardClientsByRegion()
      .then((items) => {
        setRegionStats(items);
        setRegionCountryFilter("all");
        setRegionCityFilter("all");
      })
      .catch((e) => setRegionError(e.message));
  }, []);

  const regionCountryOptions = useMemo(
    () => [...new Set(regionStats.map((item) => item.country).filter(Boolean))].sort((a, b) => a.localeCompare(b, "uz")),
    [regionStats],
  );

  const regionCityOptions = useMemo(() => {
    const scoped =
      regionCountryFilter === "all"
        ? regionStats
        : regionStats.filter((item) => item.country === regionCountryFilter);
    return [...new Set(scoped.map((item) => item.city))].sort((a, b) => a.localeCompare(b, "uz"));
  }, [regionStats, regionCountryFilter]);

  const filteredRegionStats = useMemo(
    () =>
      regionStats.filter((item) => {
        if (regionCountryFilter !== "all" && item.country !== regionCountryFilter) return false;
        if (regionCityFilter !== "all" && item.city !== regionCityFilter) return false;
        return true;
      }),
    [regionStats, regionCountryFilter, regionCityFilter],
  );

  useEffect(() => {
    setLtvLoading(true);
    setLtvError("");
    api
      .dashboardTopClients(ltvLimit)
      .then(setLtvClients)
      .catch((e) => setLtvError(e.message))
      .finally(() => setLtvLoading(false));
  }, [ltvLimit]);

  useEffect(() => {
    setTrendLoading(true);
    setTrendError("");
    api
      .dashboardRevenueTrend(trendMonths)
      .then(setTrendPoints)
      .catch((e) => setTrendError(e.message))
      .finally(() => setTrendLoading(false));
  }, [trendMonths]);

  const chartData = useMemo(() => {
    if (!stats) return null;

    const revenueTrend = trendPoints.map((point) => ({
      label: point.label,
      revenue: toNumber(point.value),
    }));

    const planComparison = stats.charts.revenue_vs_plan.map((point) => ({
      label: point.label,
      revenue: toNumber(point.revenue),
      plan: toNumber(point.plan),
    }));

    const byServiceSorted = [...stats.charts.revenue_by_service]
      .map((item) => ({ name: item.name, amount: toNumber(item.amount) }))
      .sort((a, b) => b.amount - a.amount);
    const topServices = byServiceSorted.slice(0, 5);
    const othersAmount = byServiceSorted.slice(5).reduce((sum, item) => sum + item.amount, 0);
    const byService =
      othersAmount > 0
        ? [...topServices, { name: t("dashboard.charts.others"), amount: othersAmount }]
        : topServices;
    const byServiceMax = Math.max(1, ...byService.map((item) => item.amount));

    const clientStatus = [
      { name: t("status.faol"), value: stats.clients.faol, color: "hsl(160 72% 38%)" },
      { name: t("status.nofaol"), value: stats.clients.nofaol, color: "hsl(220 13% 69%)" },
    ].filter((item) => item.value > 0);

    const contractStatusAll = CONTRACT_WORKFLOW_STATUSES.map((status) => ({
      key: status,
      name: t(`contractWorkflowStatus.${status}`),
      value: stats.contracts[status],
      color: CONTRACT_STATUS_COLORS[status],
    }));
    const contractStatus = contractStatusAll.filter((item) => item.value > 0);

    const totalPaid = toNumber(stats.total_paid);
    const totalDebt = toNumber(stats.total_debt);
    const cancelledAmount = toNumber(stats.cancelled_amount);
    const balanceTotal = Math.max(1, totalPaid + totalDebt + cancelledAmount);
    const paidPercent = Math.round((totalPaid / balanceTotal) * 100);
    const cancelledPercent = Math.round((cancelledAmount / balanceTotal) * 100);
    const debtPercent = Math.max(0, 100 - paidPercent - cancelledPercent);

    const byExpenseSorted = [...stats.charts.expenses_by_category]
      .map((item) => ({ name: item.name, amount: toNumber(item.amount) }))
      .sort((a, b) => b.amount - a.amount);
    const topExpenseCategories = byExpenseSorted.slice(0, 5);
    const othersExpenseAmount = byExpenseSorted
      .slice(5)
      .reduce((sum, item) => sum + item.amount, 0);
    const expensesByCategory =
      othersExpenseAmount > 0
        ? [...topExpenseCategories, { name: t("dashboard.charts.others"), amount: othersExpenseAmount }]
        : topExpenseCategories;
    const expensesByCategoryMax = Math.max(1, ...expensesByCategory.map((item) => item.amount));

    const profitTrend = stats.charts.profit_by_month.map((point) => ({
      label: point.label,
      profit: toNumber(point.value),
    }));

    return {
      revenueTrend,
      planComparison,
      byService,
      byServiceMax,
      clientStatus,
      contractStatus,
      contractStatusAll,
      totalPaid,
      totalDebt,
      cancelledAmount,
      paidPercent,
      cancelledPercent,
      debtPercent,
      expensesByCategory,
      expensesByCategoryMax,
      profitTrend,
    };
  }, [stats, t, trendPoints]);

  if (error) {
    return <div className="text-red-600 dark:text-red-400">{t("common.error")}: {error}</div>;
  }

  if (!stats || !chartData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const planPercent =
    toNumber(stats.monthly_plan) > 0
      ? Math.round((toNumber(stats.monthly_revenue) / toNumber(stats.monthly_plan)) * 100)
      : 0;

  return (
    <PageShell className={cn(loading && "pointer-events-none opacity-60")}>

      {/* ── Hero banner ── */}
      <div className="premium-hero shine-border px-6 py-7">
        <div className="pointer-events-none absolute inset-0 dot-grid text-white/30 opacity-[0.04]" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/8 blur-3xl animate-mesh" />
        <div className="pointer-events-none absolute -bottom-8 left-16 h-48 w-48 rounded-full bg-brand-500/25 blur-2xl animate-mesh" />
        <div className="pointer-events-none absolute right-24 bottom-2 h-32 w-32 rounded-full bg-blue-400/15 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-full">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300/90">
              World Textile Marketing Agency
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-[2rem]">{t("dashboard.title")}</h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-brand-200/85">{t("dashboard.subtitle")}</p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:min-w-[280px] sm:items-end">
            <div className="toolbar-cluster justify-end">
              <ExportButtons resource="debts" onDark dateFrom={dateFrom} dateTo={dateTo} />
              <ExportButtons resource="payments" onDark dateFrom={dateFrom} dateTo={dateTo} />
            </div>
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onDark
              onChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <StaggerContainer className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StaggerItem>
          <StatCard
            title={t("dashboard.totalDebt")}
            value={formatMoney(stats.total_debt)}
            numericValue={toNumber(stats.total_debt)}
            formatValue={formatMoney}
            accent="red"
            icon={AlertTriangleIcon}
            to="/clients?debtors=1"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("dashboard.monthlyRevenue")}
            value={formatMoney(stats.monthly_revenue)}
            numericValue={toNumber(stats.monthly_revenue)}
            formatValue={formatMoney}
            change={stats.revenue_growth_pct}
            changeLabel={t("dashboard.vsPrev")}
            accent="green"
            icon={TrendingUpIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("dashboard.monthlyPlan")}
            value={formatMoney(stats.monthly_plan)}
            numericValue={toNumber(stats.monthly_plan)}
            formatValue={formatMoney}
            subtitle={`${t("dashboard.planDone")}: ${planPercent}%`}
            accent="amber"
            icon={WalletIcon}
          />
        </StaggerItem>
      </StaggerContainer>

      <StaggerContainer className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            title={t("dashboard.totalPaid")}
            value={formatMoney(stats.total_paid)}
            numericValue={toNumber(stats.total_paid)}
            formatValue={formatMoney}
            subtitle={t("dashboard.contractShare")}
            accent="violet"
            icon={CheckCircle2Icon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("dashboard.collectionRate")}
            value={`${Math.round(stats.collection_rate)}%`}
            numericValue={stats.collection_rate}
            formatValue={(n) => `${Math.round(n)}%`}
            subtitle={t("dashboard.contractShare")}
            accent="cyan"
            icon={ScaleIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("dashboard.cancelledAmount")}
            value={formatMoney(stats.cancelled_amount)}
            numericValue={toNumber(stats.cancelled_amount)}
            formatValue={formatMoney}
            subtitle={`${t("dashboard.cancelledContractsCount")}: ${stats.cancelled_contracts_count}`}
            accent="amber"
            icon={XCircleIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("dashboard.periodCancelledAmount")}
            value={formatMoney(stats.period_cancelled_amount)}
            numericValue={toNumber(stats.period_cancelled_amount)}
            formatValue={formatMoney}
            accent="red"
            icon={XCircleIcon}
          />
        </StaggerItem>
      </StaggerContainer>

      <StaggerContainer className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StaggerItem>
          <StatCard
            title={t("dashboard.totalExpenses")}
            value={formatMoney(stats.period_expenses)}
            numericValue={toNumber(stats.period_expenses)}
            formatValue={formatMoney}
            accent="red"
            icon={WalletIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("dashboard.netProfit")}
            value={formatMoney(stats.net_profit)}
            numericValue={toNumber(stats.net_profit)}
            formatValue={formatMoney}
            accent={toNumber(stats.net_profit) >= 0 ? "green" : "red"}
            icon={BanknoteIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("dashboard.profitMargin")}
            value={formatPercent(stats.profit_margin_pct)}
            numericValue={stats.profit_margin_pct ?? 0}
            formatValue={(n) => formatPercent(n)}
            accent="violet"
            icon={ScaleIcon}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* ── Insights: services / client status / balance ── */}
      <section className="page-section">
        <SectionHeader title={t("dashboard.insights")} description={t("dashboard.insightsDesc")} />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-4">
          {/* Revenue by service */}
          <RevealCard>
          <Card className="content-card">
            <CardHeader className="border-b">
              <CardTitle className="text-base">{t("dashboard.charts.byService")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboard.charts.byServiceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4">
              {chartData.byService.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
              ) : (
                chartData.byService.map((item, index) => (
                  <div key={item.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-foreground">{item.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-foreground/90">
                        {formatCompactMoney(item.amount)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          SERVICE_BAR_COLORS[index % SERVICE_BAR_COLORS.length],
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(4, (item.amount / chartData.byServiceMax) * 100)}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          </RevealCard>

          {/* Client status donut */}
          <RevealCard>
          <Card className="content-card">
            <CardHeader className="border-b">
              <CardTitle className="text-base">{t("dashboard.charts.clientStatus")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboard.charts.clientStatusDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2 pt-4">
              <div className="relative h-[180px] w-full">
                <ChartContainer config={revenueConfig} className="h-full w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={chartData.clientStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {chartData.clientStatus.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {stats.clients.total}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.totalClients")}
                  </span>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center justify-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: "hsl(160 72% 38%)" }} />
                  {t("status.faol")}: <strong className="text-foreground">{stats.clients.faol}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: "hsl(220 13% 69%)" }} />
                  {t("status.nofaol")}: <strong className="text-foreground">{stats.clients.nofaol}</strong>
                </span>
              </div>
            </CardContent>
          </Card>
          </RevealCard>

          {/* Contract status donut */}
          <RevealCard>
          <Card className="content-card">
            <CardHeader className="border-b">
              <CardTitle className="text-base">{t("dashboard.charts.contractStatus")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboard.charts.contractStatusDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2 pt-4">
              <div className="relative h-[180px] w-full">
                <ChartContainer config={revenueConfig} className="h-full w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={chartData.contractStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {chartData.contractStatus.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {stats.contracts.total}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("dashboard.charts.totalContracts")}
                  </span>
                </div>
              </div>
              <div className="grid w-full grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
                {chartData.contractStatusAll.map((item) => (
                  <span key={item.key} className="flex items-center gap-1.5">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="truncate">
                      {item.name}: <strong className="text-foreground">{item.value}</strong>
                    </span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
          </RevealCard>

          {/* Paid vs debt balance */}
          <RevealCard>
          <Card className="content-card">
            <CardHeader className="border-b">
              <CardTitle className="text-base">{t("dashboard.charts.balance")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboard.charts.balanceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-6">
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${chartData.paidPercent}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
                {chartData.cancelledPercent > 0 && (
                  <motion.div
                    className="h-full bg-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${chartData.cancelledPercent}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <motion.div
                  className="h-full bg-red-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${chartData.debtPercent}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    {t("common.paid")}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCompactMoney(chartData.totalPaid)}
                  </span>
                </div>
                {chartData.cancelledAmount > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className="size-2 rounded-full bg-amber-400" />
                      {t("clients.cancelledAmount")}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatCompactMoney(chartData.cancelledAmount)}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-1 sm:text-right">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:justify-end">
                    {t("common.debt")}
                    <span className="size-2 rounded-full bg-red-400" />
                  </span>
                  <span className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
                    {formatCompactMoney(chartData.totalDebt)}
                  </span>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {t("dashboard.collectionRate")}: <strong className="text-foreground">{chartData.paidPercent}%</strong>
              </p>
            </CardContent>
          </Card>
          </RevealCard>
        </div>
      </section>

      {/* ── Clients by region ── */}
      <Card className="content-card">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <MapPinIcon className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base">{t("dashboard.clientsByRegion")}</CardTitle>
                <CardDescription className="text-xs">{t("dashboard.clientsByRegionDesc")}</CardDescription>
              </div>
            </div>
            {regionCountryOptions.length > 0 && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Select
                  value={regionCountryFilter}
                  onValueChange={(value) => {
                    if (!value) return;
                    setRegionCountryFilter(value);
                    setRegionCityFilter("all");
                  }}
                  className="w-full sm:w-56"
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("clients.country")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">{t("clients.allCountries")}</SelectItem>
                      {regionCountryOptions.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select
                  value={regionCityFilter}
                  onValueChange={(value) => value && setRegionCityFilter(value)}
                  className="w-full sm:w-56"
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("dashboard.regionColumn")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">{t("clients.allRegions")}</SelectItem>
                      {regionCityOptions.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {regionError && (
            <p className="px-6 py-4 text-sm text-red-600 dark:text-red-400">
              {t("common.error")}: {regionError}
            </p>
          )}
          {!regionError && (
            <PremiumDataTable
              empty={filteredRegionStats.length === 0}
              emptyMessage={t("dashboard.noRegionData")}
              skeletonCols={5}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard.regionColumn")}</TableHead>
                  <TableHead className="w-[5.5rem] text-right">{t("dashboard.regionClients")}</TableHead>
                  <TableHead className="text-right">{t("dashboard.regionAmount")}</TableHead>
                  <TableHead className="text-right">{t("dashboard.regionReceived")}</TableHead>
                  <TableHead className="text-right">{t("dashboard.regionDebt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegionStats.map((item, index) => (
                  <MotionTableRow key={`${item.country}-${item.city}`} {...rowEnter(index)}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.city}</p>
                        {item.country && item.country !== "O'zbekiston" && (
                          <p className="truncate text-xs text-muted-foreground">{item.country}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{item.clients_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(item.total_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatAmount(item.total_paid)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                      {formatAmount(item.total_debt)}
                    </TableCell>
                  </MotionTableRow>
                ))}
              </TableBody>
            </PremiumDataTable>
          )}
        </CardContent>
      </Card>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <RevealCard>
        <Card className="content-card">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">{t("dashboard.charts.revenueTrend")}</CardTitle>
                <CardDescription className="text-xs">{t("dashboard.charts.revenueTrendDesc")}</CardDescription>
              </div>
              <div className="segmented-control">
                {TREND_MONTH_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={trendMonths === option ? "default" : "ghost"}
                    className="h-8 px-3.5"
                    onClick={() => setTrendMonths(option)}
                  >
                    {option} {t("dashboard.charts.months")}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className={cn("pt-4", trendLoading && "pointer-events-none opacity-60")}>
            {trendError && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                {t("common.error")}: {trendError}
              </p>
            )}
            <ChartContainer config={revenueConfig} className="h-[260px] w-full">
              <AreaChart data={chartData.revenueTrend} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 72% 38%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(160 72% 38%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={formatCompactMoney}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent formatter={(value) => moneyTooltip(value)} />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(160 72% 38%)"
                  fill="url(#revGrad)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(160 72% 38%)", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        </RevealCard>

        <RevealCard>
        <Card className="content-card">
          <CardHeader className="border-b">
            <CardTitle className="text-base">{t("dashboard.charts.planVsFact")}</CardTitle>
            <CardDescription className="text-xs">{t("dashboard.charts.planVsFactDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer config={revenueConfig} className="h-[260px] w-full">
              <ComposedChart data={chartData.planComparison} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={formatCompactMoney}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent formatter={(value) => moneyTooltip(value)} />
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" fill="hsl(160 72% 38%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line
                  type="monotone"
                  dataKey="plan"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2.5}
                  dot={false}
                  strokeDasharray="5 3"
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
        </RevealCard>
      </div>

      {/* ── P&L charts: expenses breakdown / profit trend ── */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <RevealCard>
        <Card className="content-card">
          <CardHeader className="border-b">
            <CardTitle className="text-base">{t("dashboard.charts.expensesByCategory")}</CardTitle>
            <CardDescription className="text-xs">
              {t("dashboard.charts.expensesByCategoryDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-4">
            {chartData.expensesByCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
            ) : (
              chartData.expensesByCategory.map((item, index) => (
                <div key={item.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-foreground">{item.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-foreground/90">
                      {formatCompactMoney(item.amount)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        SERVICE_BAR_COLORS[index % SERVICE_BAR_COLORS.length],
                      )}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.max(4, (item.amount / chartData.expensesByCategoryMax) * 100)}%`,
                      }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        </RevealCard>

        <RevealCard>
        <Card className="content-card">
          <CardHeader className="border-b">
            <CardTitle className="text-base">{t("dashboard.charts.profitTrend")}</CardTitle>
            <CardDescription className="text-xs">{t("dashboard.charts.profitTrendDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer config={profitConfig} className="h-[260px] w-full">
              <AreaChart data={chartData.profitTrend} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 72% 38%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(160 72% 38%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={formatCompactMoney}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => moneyTooltip(value)} />} />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(160 72% 38%)"
                  fill="url(#profitGrad)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(160 72% 38%)", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        </RevealCard>
      </div>

      {/* ── Top clients ── */}
      <Card className="content-card">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-card">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
              <UsersIcon className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base">{t("dashboard.topClientsTable")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboard.topClientsTableDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <PremiumDataTable
            empty={stats.top_clients.length === 0}
            emptyMessage={t("common.noData")}
            skeletonCols={4}
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">{t("common.rank")}</TableHead>
                <TableHead>{t("dashboard.company")}</TableHead>
                <TableHead>{t("common.paid")}</TableHead>
                <TableHead>{t("common.debt")}</TableHead>
                <TableHead>{t("common.paidRatio")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.top_clients.map((client, index) => {
                const paid = toNumber(client.total_paid);
                const debt = toNumber(client.total_debt);
                const ratio = Math.round((paid / Math.max(1, paid + debt)) * 100);
                return (
                  <MotionTableRow key={client.client_id} {...rowEnter(index)}>
                    <TableCell>
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                          index < 3 ? RANK_STYLES[index] : "bg-muted text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </span>
                    </TableCell>
                    <TableCellCompany to={`/clients/${client.client_id}`} name={client.company_name} />
                    <TableCellMoney tone="positive">
                      {formatMoney(client.total_paid)}
                    </TableCellMoney>
                    <TableCellMoney tone="negative">
                      {formatMoney(client.total_debt)}
                    </TableCellMoney>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className={cn(
                              "h-full rounded-full",
                              ratio >= 70 ? "bg-emerald-500" : ratio >= 40 ? "bg-amber-500" : "bg-red-400",
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${ratio}%` }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 12) * 0.02 }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                          {ratio}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <TableViewLink to={`/clients/${client.client_id}`} />
                    </TableCell>
                  </MotionTableRow>
                );
              })}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

      {/* ── Top clients by lifetime value (LTV) ── */}
      <Card className="content-card">
        <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-white dark:from-violet-950/20 dark:to-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
                <CrownIcon className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base">{t("dashboard.topClientsLtv")}</CardTitle>
                <CardDescription className="text-xs">{t("dashboard.topClientsLtvDesc")}</CardDescription>
              </div>
            </div>
            <div className="segmented-control">
              {LTV_LIMIT_OPTIONS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={ltvLimit === option ? "default" : "ghost"}
                  className="h-8 px-3.5"
                  onClick={() => setLtvLimit(option)}
                >
                  Top {option}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn("p-0 pt-2", ltvLoading && "pointer-events-none opacity-60")}>
          {ltvError && (
            <p className="px-6 pb-3 text-sm text-red-600 dark:text-red-400">
              {t("common.error")}: {ltvError}
            </p>
          )}
          {!ltvError && (
          <PremiumDataTable
            empty={ltvClients.length === 0}
            emptyMessage={t("common.noData")}
            skeletonCols={5}
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">{t("common.rank")}</TableHead>
                <TableHead>{t("dashboard.company")}</TableHead>
                <TableHead>LTV ({t("common.paid")})</TableHead>
                <TableHead>{t("dashboard.ltvContractsCount")}</TableHead>
                <TableHead>{t("common.share")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ltvClients.map((client, index) => (
                <MotionTableRow key={client.client_id} {...rowEnter(index)}>
                  <TableCell>
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                        index < 3 ? RANK_STYLES[index] : "bg-muted text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCellCompany to={`/clients/${client.client_id}`} name={client.company_name} />
                  <TableCellMoney tone="positive">{formatMoney(client.total_paid)}</TableCellMoney>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {client.contracts_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-violet-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(4, Math.min(100, client.share_pct))}%` }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 12) * 0.02 }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {client.share_pct.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <TableViewLink to={`/clients/${client.client_id}`} />
                  </TableCell>
                </MotionTableRow>
              ))}
            </TableBody>
          </PremiumDataTable>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
