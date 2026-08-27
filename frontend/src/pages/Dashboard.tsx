import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
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
  ArrowDownIcon,
  ArrowUpIcon,
  BanknoteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  CrownIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
  PlaneIcon,
  ScaleIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";
import { api } from "../api/client";
import { ExportButtons } from "../components/ExportButtons";
import { CardPdfButton } from "../components/CardPdfButton";
import { DateRangePicker } from "../components/DateRangePicker";
import { SortableTableHead } from "@/components/SortableTableHead";
import { StatCard } from "../components/StatCard";
import { MonthlyRevenueModal } from "../components/MonthlyRevenueModal";
import { RegionFactoriesModal } from "../components/RegionFactoriesModal";
import { TableViewLink } from "../components/TableViewLink";
import { usePersistedState } from "../hooks/usePersistedState";
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
import type { ClientRegionStatsItem, ContractClientStatsItem, DashboardStats, RegionTripsSummary, TopClientItem, TopClientLtvItem, TripStatsSummary } from "../types";
import { useI18n } from "../context/I18nContext";
import { useTableSort } from "@/hooks/useTableSort";
import {
  chartMonthsYearLabel,
  formatAmount,
  formatChartMonthTick,
  formatCompactMoney,
  formatDateShort,
  formatMoney,
  formatPercent,
  sortByMonthKey,
  toNumber,
} from "../utils/format";
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

const TABLE_LIMIT_OPTIONS = [10, 20, 30] as const;
const TREND_MONTH_OPTIONS = [6, 12] as const;
const TRIP_YEARS = [2030, 2029, 2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020] as const;
const CONTRACTS_BY_CLIENT_PAGE_SIZE = 20;
type TableLimit = (typeof TABLE_LIMIT_OPTIONS)[number];
type SortOrder = "asc" | "desc";
type Horizon = "month" | "year";
type RegionSortKey = "city" | "clients_count" | "total_amount" | "total_paid" | "total_debt";

type ContractClientSortKey = "company" | "count" | "amount";
type SortDir = "asc" | "desc";

const CONTRACT_STATUS_COLORS: Record<(typeof CONTRACT_WORKFLOW_STATUSES)[number], string> = {
  yangi: "hsl(220 70% 50%)",
  davom_etmoqda: "hsl(160 72% 38%)",
  tugadi: "hsl(220 13% 55%)",
  toxtatildi: "hsl(38 92% 50%)",
};

function moneyTooltip(value: unknown) {
  return formatMoney(Number(value));
}

function TableLimitSortControls({
  limit,
  onLimitChange,
  order,
  onOrderChange,
}: {
  limit: TableLimit;
  onLimitChange: (value: TableLimit) => void;
  order: SortOrder;
  onOrderChange: (value: SortOrder) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <div className="segmented-control">
        {TABLE_LIMIT_OPTIONS.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={limit === option ? "default" : "ghost"}
            className="h-8 px-3.5"
            onClick={() => onLimitChange(option)}
          >
            Top {option}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="size-8 shrink-0 p-0"
        onClick={() => onOrderChange(order === "desc" ? "asc" : "desc")}
        aria-label={order === "desc" ? t("common.sortAsc") : t("common.sortDesc")}
        title={order === "desc" ? t("common.sortAsc") : t("common.sortDesc")}
      >
        {order === "desc" ? <ArrowDownIcon className="size-4" /> : <ArrowUpIcon className="size-4" />}
      </Button>
    </div>
  );
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

function CategoryBarListCard({
  title,
  description,
  items,
  maxAmount,
  paginated = false,
  pageSize = 10,
  onExportPdf,
}: {
  title: string;
  description: string;
  items: { name: string; amount: number }[];
  maxAmount: number;
  paginated?: boolean;
  pageSize?: number;
  onExportPdf?: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [reverseOrder, setReverseOrder] = useState(false);

  const sortedItems = useMemo(() => {
    const next = [...items];
    next.sort((a, b) => (reverseOrder ? a.amount - b.amount : b.amount - a.amount));
    return next;
  }, [items, reverseOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleItems = paginated
    ? sortedItems.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : sortedItems;

  useEffect(() => {
    setPage(0);
  }, [items.length, reverseOrder]);

  return (
    <RevealCard className="h-full">
      <Card className="content-card flex h-full flex-col">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {paginated && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="size-8 p-0"
                  onClick={() => setReverseOrder((value) => !value)}
                  aria-label={reverseOrder ? t("common.sortDesc") : t("common.sortAsc")}
                  title={reverseOrder ? t("common.sortDesc") : t("common.sortAsc")}
                >
                  {reverseOrder ? <ArrowUpIcon className="size-4" /> : <ArrowDownIcon className="size-4" />}
                </Button>
              )}
              {onExportPdf && <CardPdfButton onExport={onExportPdf} />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 pt-4">
          {visibleItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : (
            visibleItems.map((item, index) => (
              <div key={`${item.name}-${safePage}-${index}`} className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2 text-sm leading-tight">
                  <span className="line-clamp-2 min-w-0 flex-1 break-words font-medium text-foreground">
                    {item.name}
                  </span>
                  <span className="shrink-0 self-start font-semibold tabular-nums text-foreground/90">
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
                    animate={{ width: `${Math.max(4, (item.amount / maxAmount) * 100)}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
                  />
                </div>
              </div>
            ))
          )}
          {paginated && sortedItems.length > pageSize && (
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 px-2.5"
                disabled={safePage === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                <ChevronLeftIcon className="size-4" />
                {t("pagination.prev")}
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {safePage + 1} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 px-2.5"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
              >
                {t("pagination.next")}
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </RevealCard>
  );
}

export function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [regionStats, setRegionStats] = useState<ClientRegionStatsItem[]>([]);
  const [regionCountryFilter, setRegionCountryFilter] = useState("all");
  const [regionCityFilter, setRegionCityFilter] = useState("all");
  const [selectedRegionModal, setSelectedRegionModal] = useState<ClientRegionStatsItem | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [horizon, setHorizon] = usePersistedState<Horizon>("wtma.dashboard.horizon", "month");
  const [revenueModalOpen, setRevenueModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [regionError, setRegionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rankedClients, setRankedClients] = useState<TopClientItem[]>([]);
  const [rankedLimit, setRankedLimit] = useState<TableLimit>(10);
  const [rankedOrder, setRankedOrder] = useState<SortOrder>("desc");
  const [rankedLoading, setRankedLoading] = useState(true);
  const [rankedError, setRankedError] = useState("");
  const [ltvClients, setLtvClients] = useState<TopClientLtvItem[]>([]);
  const [ltvLimit, setLtvLimit] = useState<TableLimit>(10);
  const [ltvOrder, setLtvOrder] = useState<SortOrder>("desc");
  const [ltvLoading, setLtvLoading] = useState(true);
  const [ltvError, setLtvError] = useState("");
  const [trendMonths, setTrendMonths] = useState<(typeof TREND_MONTH_OPTIONS)[number]>(12);
  const { sortBy: regionSortBy, sortOrder: regionSortOrder, handleSort: handleRegionSort } =
    useTableSort<RegionSortKey>("wtma.dashboard.regions.sort", "clients_count", "desc", ["city"]);
  const [contractsByClient, setContractsByClient] = useState<ContractClientStatsItem[]>([]);
  const [contractsByClientLoading, setContractsByClientLoading] = useState(true);
  const [contractsByClientError, setContractsByClientError] = useState("");
  const [contractsSortKey, setContractsSortKey] = useState<ContractClientSortKey>("amount");
  const [contractsSortDir, setContractsSortDir] = useState<SortDir>("desc");
  const [contractsExportLoading, setContractsExportLoading] = useState<"xlsx" | "pdf" | null>(null);
  const [contractsPage, setContractsPage] = useState(0);
  const [tripYear, setTripYear] = useState<number | "all">("all");
  const [tripStats, setTripStats] = useState<TripStatsSummary | null>(null);
  const [tripRegions, setTripRegions] = useState<RegionTripsSummary[]>([]);
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState("");

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

  const yearlyGrowthConfig = useMemo(
    () =>
      ({
        revenue: { label: t("dashboard.charts.revenue"), color: "hsl(220 70% 50%)" },
        growth: { label: t("dashboard.charts.growth"), color: "hsl(38 92% 50%)" },
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

  useEffect(() => {
    setTripLoading(true);
    setTripError("");
    const year = tripYear === "all" ? null : tripYear;
    Promise.all([api.trips.summary(year), api.trips.byRegion(year)])
      .then(([summary, regions]) => {
        setTripStats(summary);
        setTripRegions(regions);
      })
      .catch((e) => setTripError(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setTripLoading(false));
  }, [tripYear, t]);

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

  const sortedRegionStats = useMemo(() => {
    const next = [...filteredRegionStats];
    next.sort((a, b) => {
      let cmp = 0;
      if (regionSortBy === "city") {
        cmp = a.city.localeCompare(b.city, "uz") || a.country.localeCompare(b.country, "uz");
      } else if (regionSortBy === "clients_count") {
        cmp = a.clients_count - b.clients_count;
      } else if (regionSortBy === "total_amount") {
        cmp = toNumber(a.total_amount) - toNumber(b.total_amount);
      } else if (regionSortBy === "total_paid") {
        cmp = toNumber(a.total_paid) - toNumber(b.total_paid);
      } else {
        cmp = toNumber(a.total_debt) - toNumber(b.total_debt);
      }
      return regionSortOrder === "asc" ? cmp : -cmp;
    });
    return next;
  }, [filteredRegionStats, regionSortBy, regionSortOrder]);

  useEffect(() => {
    setRankedLoading(true);
    setRankedError("");
    api
      .dashboardTopClientsRanked({
        limit: rankedLimit,
        order: rankedOrder,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      .then(setRankedClients)
      .catch((e) => setRankedError(e.message))
      .finally(() => setRankedLoading(false));
  }, [rankedLimit, rankedOrder, dateFrom, dateTo]);

  useEffect(() => {
    setLtvLoading(true);
    setLtvError("");
    api
      .dashboardTopClients(ltvLimit, ltvOrder)
      .then(setLtvClients)
      .catch((e) => setLtvError(e.message))
      .finally(() => setLtvLoading(false));
  }, [ltvLimit, ltvOrder]);

  useEffect(() => {
    setContractsByClientLoading(true);
    setContractsByClientError("");
    api
      .dashboardContractsByClient({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      .then(setContractsByClient)
      .catch((e) => setContractsByClientError(e.message))
      .finally(() => setContractsByClientLoading(false));
  }, [dateFrom, dateTo]);

  const toggleContractsSort = (key: ContractClientSortKey) => {
    if (contractsSortKey === key) {
      setContractsSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setContractsSortKey(key);
    setContractsSortDir(key === "company" ? "asc" : "desc");
  };

  const sortedContractsByClient = useMemo(() => {
    const items = [...contractsByClient];
    items.sort((a, b) => {
      let cmp = 0;
      if (contractsSortKey === "company") {
        cmp = a.company_name.localeCompare(b.company_name, "uz");
      } else if (contractsSortKey === "count") {
        cmp = a.contracts_count - b.contracts_count;
      } else {
        cmp = toNumber(a.total_amount) - toNumber(b.total_amount);
      }
      return contractsSortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [contractsByClient, contractsSortKey, contractsSortDir]);

  const contractsTotalPages = Math.max(
    1,
    Math.ceil(sortedContractsByClient.length / CONTRACTS_BY_CLIENT_PAGE_SIZE),
  );
  const contractsSafePage = Math.min(contractsPage, contractsTotalPages - 1);
  const visibleContractsByClient = sortedContractsByClient.slice(
    contractsSafePage * CONTRACTS_BY_CLIENT_PAGE_SIZE,
    contractsSafePage * CONTRACTS_BY_CLIENT_PAGE_SIZE + CONTRACTS_BY_CLIENT_PAGE_SIZE,
  );

  useEffect(() => {
    setContractsPage(0);
  }, [sortedContractsByClient.length, contractsSortKey, contractsSortDir]);

  const handleContractsExport = async (format: "xlsx" | "pdf") => {
    setContractsExportLoading(format);
    try {
      await api.dashboardExportContractsByClient(format, {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
    } catch (err) {
      setContractsByClientError(err instanceof Error ? err.message : t("export.failed"));
    } finally {
      setContractsExportLoading(null);
    }
  };

  const chartData = useMemo(() => {
    if (!stats) return null;

    const monthlyRevenueSorted = sortByMonthKey(
      stats.charts.monthly_revenue.map((point) => ({
        month: point.month,
        revenue: toNumber(point.value),
      })),
    );
    const revenueTrend = monthlyRevenueSorted.slice(-trendMonths);
    const revenueYearLabel = chartMonthsYearLabel(revenueTrend.map((point) => point.month));

    const planComparisonSorted = sortByMonthKey(
      stats.charts.revenue_vs_plan.map((point) => ({
        month: point.month,
        revenue: toNumber(point.revenue),
        plan: toNumber(point.plan),
      })),
    );
    const planYearLabel = chartMonthsYearLabel(planComparisonSorted.map((point) => point.month));

    const planComparison = planComparisonSorted;

    const byServiceSorted = [...stats.charts.revenue_by_service]
      .map((item) => ({ name: item.name, amount: toNumber(item.amount) }))
      .sort((a, b) => b.amount - a.amount);
    const byService = byServiceSorted;
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

    const profitTrend = sortByMonthKey(
      stats.charts.profit_by_month.map((point) => ({
        month: point.month,
        profit: toNumber(point.value),
      })),
    );

    const yearlyTotals = new Map<string, number>();
    for (const point of sortByMonthKey(
      stats.charts.monthly_revenue.map((item) => ({ month: item.month, value: toNumber(item.value) })),
    )) {
      const year = point.month.slice(0, 4);
      yearlyTotals.set(year, (yearlyTotals.get(year) ?? 0) + point.value);
    }
    const yearlyYears = [...yearlyTotals.keys()].sort();
    const yearlyGrowth = yearlyYears.map((year, index) => {
      const revenue = yearlyTotals.get(year) ?? 0;
      const prevRevenue = index > 0 ? yearlyTotals.get(yearlyYears[index - 1]) ?? 0 : null;
      const growth =
        prevRevenue && prevRevenue > 0
          ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10
          : null;
      return { year, revenue, growth };
    });

    return {
      revenueTrend,
      revenueYearLabel,
      planComparison,
      planYearLabel,
      byService,
      byServiceMax,
      clientStatus,
      contractStatus,
      contractStatusAll,
      profitTrend,
      yearlyGrowth,
    };
  }, [stats, t, trendMonths]);

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

  const hasDateRange = Boolean(dateFrom || dateTo);
  const showYear = !hasDateRange && horizon === "year";
  const financeRevenue = hasDateRange ? stats.monthly_revenue : stats.total_revenue;
  const periodRangeLabel = `${formatDateShort(stats.period_start)} – ${formatDateShort(stats.period_end)}`;
  const yearRangeLabel = `${formatDateShort(stats.year_start)} – ${formatDateShort(stats.year_end)}`;
  const revenueValue = showYear ? stats.yearly_revenue : stats.monthly_revenue;
  const revenueChange = showYear ? stats.yearly_growth_pct : stats.revenue_growth_pct;
  const revenuePeriodLabel = showYear ? yearRangeLabel : periodRangeLabel;
  const debtValue = showYear ? stats.yearly_debt : stats.total_debt;
  const planValue = showYear ? stats.yearly_plan : stats.monthly_plan;
  const planPercent =
    toNumber(planValue) > 0
      ? Math.round((toNumber(revenueValue) / toNumber(planValue)) * 100)
      : 0;

  const selectHorizon = (next: Horizon) => {
    setDateFrom("");
    setDateTo("");
    setHorizon(next);
  };

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
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="segmented-control" role="group" aria-label={t("dashboard.horizonAria")}>
            <Button
              type="button"
              size="sm"
              variant={!hasDateRange && horizon === "month" ? "default" : "ghost"}
              className="h-8 px-3.5"
              onClick={() => selectHorizon("month")}
            >
              {t("dashboard.horizonMonth")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!hasDateRange && horizon === "year" ? "default" : "ghost"}
              className="h-8 px-3.5"
              onClick={() => selectHorizon("year")}
            >
              {t("dashboard.horizonYear")}
            </Button>
          </div>
        </div>
        <StaggerContainer className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StaggerItem>
            <StatCard
              size="large"
              title={t("dashboard.totalRevenue")}
              value={formatMoney(financeRevenue)}
              numericValue={toNumber(financeRevenue)}
              formatValue={formatMoney}
              accent="green"
              icon={TrendingUpIcon}
              to="/finance"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              size="large"
              title={t("dashboard.totalExpenses")}
              value={formatMoney(stats.period_expenses)}
              numericValue={toNumber(stats.period_expenses)}
              formatValue={formatMoney}
              accent="red"
              icon={WalletIcon}
            />
          </StaggerItem>
        </StaggerContainer>

        <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StaggerItem>
            <StatCard
              size="compact"
              title={showYear ? t("dashboard.yearlyDebt") : t("dashboard.totalDebt")}
              value={formatMoney(debtValue)}
              numericValue={toNumber(debtValue)}
              formatValue={formatMoney}
              accent="red"
              icon={AlertTriangleIcon}
              to="/clients?debtors=1"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              size="compact"
              title={showYear ? t("dashboard.yearlyRevenue") : t("dashboard.monthlyRevenue")}
              value={formatMoney(revenueValue)}
              numericValue={toNumber(revenueValue)}
              formatValue={formatMoney}
              subtitle={revenuePeriodLabel}
              change={revenueChange}
              changeLabel={t("dashboard.vsPrev")}
              accent="green"
              icon={TrendingUpIcon}
              onClick={() => setRevenueModalOpen(true)}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              size="compact"
              title={showYear ? t("dashboard.yearlyPlan") : t("dashboard.monthlyPlan")}
              value={formatMoney(planValue)}
              numericValue={toNumber(planValue)}
              formatValue={formatMoney}
              subtitle={`${t("dashboard.planDone")}: ${planPercent}%`}
              accent="amber"
              icon={WalletIcon}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              size="compact"
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
              size="compact"
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
              size="compact"
              title={t("dashboard.profitMargin")}
              value={formatPercent(stats.profit_margin_pct)}
              numericValue={stats.profit_margin_pct ?? 0}
              formatValue={(n) => formatPercent(n)}
              accent="violet"
              icon={ScaleIcon}
            />
          </StaggerItem>
        </StaggerContainer>
      </div>

      {/* ── Insights: services + expenses ── */}
      <section className="page-section">
        <SectionHeader title={t("dashboard.insights")} description={t("dashboard.insightsDesc")} />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <CategoryBarListCard
            title={t("dashboard.charts.byService")}
            description={t("dashboard.charts.byServiceDesc")}
            items={chartData.byService}
            maxAmount={chartData.byServiceMax}
            paginated
            pageSize={10}
            onExportPdf={() => api.dashboardExportPdf.services()}
          />
          <RevealCard>
          <Card className="content-card flex h-full flex-col">
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{t("dashboard.charts.contractsByClient")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("dashboard.charts.contractsByClientDesc")}
                  </CardDescription>
                </div>
                <div className="inline-flex overflow-hidden rounded-lg border border-border/70 shadow-sm">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="relative min-w-[5.25rem] rounded-none border-0 border-r border-border/70 shadow-none"
                    disabled={contractsExportLoading !== null}
                    onClick={() => handleContractsExport("xlsx")}
                  >
                    <span className={cn("inline-flex items-center gap-1", contractsExportLoading === "xlsx" && "invisible")}>
                      <FileSpreadsheetIcon data-icon="inline-start" />
                      {t("export.excel")}
                    </span>
                    {contractsExportLoading === "xlsx" && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2Icon className="size-3.5 animate-spin" />
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="relative min-w-[5.25rem] rounded-none border-0 shadow-none"
                    disabled={contractsExportLoading !== null}
                    onClick={() => handleContractsExport("pdf")}
                  >
                    <span className={cn("inline-flex items-center gap-1", contractsExportLoading === "pdf" && "invisible")}>
                      <FileTextIcon data-icon="inline-start" />
                      {t("export.pdf")}
                    </span>
                    {contractsExportLoading === "pdf" && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2Icon className="size-3.5 animate-spin" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className={cn("flex min-w-0 flex-1 flex-col p-0", contractsByClientLoading && "pointer-events-none opacity-60")}>
              {contractsByClientError && (
                <p className="px-6 py-4 text-sm text-red-600 dark:text-red-400">
                  {t("common.error")}: {contractsByClientError}
                </p>
              )}
              {!contractsByClientError && (
                <PremiumDataTable
                  className="min-w-0"
                  tableClassName="table-fixed"
                  empty={sortedContractsByClient.length === 0}
                  emptyMessage={t("common.noData")}
                  skeletonCols={3}
                  footer={
                    sortedContractsByClient.length > CONTRACTS_BY_CLIENT_PAGE_SIZE ? (
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 px-2.5"
                          disabled={contractsSafePage === 0}
                          onClick={() => setContractsPage((value) => Math.max(0, value - 1))}
                        >
                          <ChevronLeftIcon className="size-4" />
                          {t("pagination.prev")}
                        </Button>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {contractsSafePage + 1} / {contractsTotalPages}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 px-2.5"
                          disabled={contractsSafePage >= contractsTotalPages - 1}
                          onClick={() =>
                            setContractsPage((value) => Math.min(contractsTotalPages - 1, value + 1))
                          }
                        >
                          {t("pagination.next")}
                          <ChevronRightIcon className="size-4" />
                        </Button>
                      </div>
                    ) : undefined
                  }
                >
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        label={t("dashboard.company")}
                        column="company"
                        activeColumn={contractsSortKey}
                        order={contractsSortDir}
                        onSort={(column) => toggleContractsSort(column as ContractClientSortKey)}
                        className="w-[48%] whitespace-normal px-3 normal-case tracking-normal"
                      />
                      <SortableTableHead
                        label={t("dashboard.ltvContractsCount")}
                        column="count"
                        activeColumn={contractsSortKey}
                        order={contractsSortDir}
                        onSort={(column) => toggleContractsSort(column as ContractClientSortKey)}
                        className="w-[22%] px-2 text-right whitespace-normal normal-case tracking-normal"
                      />
                      <SortableTableHead
                        label={t("common.total")}
                        column="amount"
                        activeColumn={contractsSortKey}
                        order={contractsSortDir}
                        onSort={(column) => toggleContractsSort(column as ContractClientSortKey)}
                        className="w-[30%] px-2 text-right whitespace-normal normal-case tracking-normal"
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleContractsByClient.map((item, index) => (
                      <MotionTableRow key={item.client_id} {...rowEnter(index)}>
                        <TableCellCompany
                          to={`/clients/${item.client_id}`}
                          name={item.company_name}
                          multiline
                          className="px-3 py-2"
                        />
                        <TableCell className="px-2 py-2 text-right text-sm tabular-nums font-medium">
                          {item.contracts_count}
                        </TableCell>
                        <TableCellMoney tone="neutral" className="px-2 py-2 text-right text-sm whitespace-nowrap">
                          {formatMoney(item.total_amount)}
                        </TableCellMoney>
                      </MotionTableRow>
                    ))}
                  </TableBody>
                </PremiumDataTable>
              )}
            </CardContent>
          </Card>
          </RevealCard>
        </div>
      </section>

      {/* ── Status donuts ── */}
      <section className="page-section">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <RevealCard className="h-full">
            <Card className="content-card h-full">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{t("dashboard.charts.clientStatus")}</CardTitle>
                <CardDescription className="text-xs">{t("dashboard.charts.clientStatusDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2 pt-4">
                <div className="relative h-[200px] w-full max-w-[240px]">
                  <ChartContainer config={revenueConfig} className="h-full w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={chartData.clientStatus}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={82}
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

          <RevealCard className="h-full">
            <Card className="content-card h-full">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{t("dashboard.charts.contractStatus")}</CardTitle>
                <CardDescription className="text-xs">{t("dashboard.charts.contractStatusDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2 pt-4">
                <div className="relative h-[200px] w-full max-w-[240px]">
                  <ChartContainer config={revenueConfig} className="h-full w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={chartData.contractStatus}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={82}
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
                <div className="grid w-full grid-cols-2 gap-x-3 gap-y-2 text-xs">
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
        </div>
      </section>

      {/* ── Region stats ── */}
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
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
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
                <CardPdfButton onExport={() => api.dashboardExportPdf.regions()} />
              </div>
            )}
            {regionCountryOptions.length === 0 && (
              <CardPdfButton onExport={() => api.dashboardExportPdf.regions()} />
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
              skeletonCols={6}
            >
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label={t("dashboard.regionColumn")}
                    column="city"
                    activeColumn={regionSortBy}
                    order={regionSortOrder}
                    onSort={handleRegionSort}
                  />
                  <SortableTableHead
                    label={t("dashboard.regionClients")}
                    column="clients_count"
                    activeColumn={regionSortBy}
                    order={regionSortOrder}
                    onSort={handleRegionSort}
                    className="w-[5.5rem] text-right"
                  />
                  <TableHead className="text-right w-28">
                    {t("trips.safarlar2026")}
                  </TableHead>
                  <SortableTableHead
                    label={t("dashboard.regionAmount")}
                    column="total_amount"
                    activeColumn={regionSortBy}
                    order={regionSortOrder}
                    onSort={handleRegionSort}
                    className="text-right"
                  />
                  <SortableTableHead
                    label={t("dashboard.regionReceived")}
                    column="total_paid"
                    activeColumn={regionSortBy}
                    order={regionSortOrder}
                    onSort={handleRegionSort}
                    className="text-right"
                  />
                  <SortableTableHead
                    label={t("dashboard.regionDebt")}
                    column="total_debt"
                    activeColumn={regionSortBy}
                    order={regionSortOrder}
                    onSort={handleRegionSort}
                    className="text-right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRegionStats.map((item, index) => (
                  <MotionTableRow
                    key={`${item.country}-${item.city}`}
                    {...rowEnter(index)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => setSelectedRegionModal(item)}
                    title={t("trips.clickToViewFactories")}
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400 flex items-center gap-1.5">
                          <span>{item.city}</span>
                          <span className="text-[10px] opacity-0 group-hover:opacity-100 text-brand-500 font-normal transition-opacity">
                            ({t("trips.viewFactories")})
                          </span>
                        </p>
                        {item.country && item.country !== "O'zbekiston" && (
                          <p className="truncate text-xs text-muted-foreground">{item.country}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-xs font-semibold">
                        {item.clients_count} ta
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {(item.trips_count ?? item.trips_count_2026 ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          <PlaneIcon className="size-3" />
                          {item.trips_count ?? item.trips_count_2026}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
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

      <Card className="content-card">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <PlaneIcon className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base">{t("dashboard.tripsTitle")}</CardTitle>
                <CardDescription className="text-xs">{t("dashboard.tripsDesc")}</CardDescription>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Select
                value={String(tripYear)}
                onValueChange={(value) => {
                  if (!value) return;
                  setTripYear(value === "all" ? "all" : Number(value));
                }}
                className="w-full sm:w-44"
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("trips.allYearsFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{t("trips.allYearsFilter")}</SelectItem>
                    {TRIP_YEARS.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {t("trips.yearLabel").replace("{year}", String(year))}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg shadow-sm"
                render={<Link to="/trips" />}
              >
                {t("dashboard.viewAllTrips")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {tripError && (
            <p className="px-6 py-4 text-sm text-red-600 dark:text-red-400">
              {t("common.error")}: {tripError}
            </p>
          )}
          {!tripError && (
            <>
              <div className="grid grid-cols-2 gap-3 border-b px-6 py-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.tripsCount")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {tripLoading ? "—" : tripStats?.total_trips ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.tripsRegions")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {tripLoading ? "—" : tripStats?.total_regions ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("dashboard.tripFactories")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {tripLoading ? "—" : tripStats?.total_factories ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("trips.colEmployee")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {tripLoading ? "—" : tripStats?.total_employees ?? 0}
                  </p>
                </div>
              </div>
              <PremiumDataTable
                loading={tripLoading}
                empty={!tripLoading && tripRegions.length === 0}
                emptyMessage={t("dashboard.noTrips")}
                skeletonCols={4}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.regionColumn")}</TableHead>
                    <TableHead>{t("dashboard.tripFactories")}</TableHead>
                    <TableHead>{t("dashboard.tripEmployee")}</TableHead>
                    <TableHead className="min-w-[240px]">{t("dashboard.tripResult")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tripRegions.map((row, index) => {
                    const shownFactories = row.factories.slice(0, 5);
                    const extraFactories = row.factories.length - shownFactories.length;
                    return (
                      <MotionTableRow
                        key={`${row.country}-${row.region}`}
                        {...rowEnter(index)}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          const match = regionStats.find(
                            (item) =>
                              item.city.toLowerCase().includes(row.region.toLowerCase()) ||
                              row.region.toLowerCase().includes(item.city.toLowerCase()),
                          );
                          if (match) setSelectedRegionModal(match);
                        }}
                      >
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{row.region}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.trips_count} {t("trips.tripsCountSuffix")}
                              {row.country && row.country !== "O'zbekiston" ? ` · ${row.country}` : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm leading-relaxed text-foreground">
                            {shownFactories.join(", ") || "—"}
                            {extraFactories > 0 ? ` +${extraFactories}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm leading-relaxed text-foreground">
                            {row.employees.join(", ") || "—"}
                          </p>
                        </TableCell>
                        <TableCell className="min-w-[240px] max-w-md">
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                            {(row.results ?? []).length > 0 ? row.results.join(" · ") : "—"}
                          </p>
                        </TableCell>
                      </MotionTableRow>
                    );
                  })}
                </TableBody>
              </PremiumDataTable>
            </>
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
                <div className="flex flex-wrap items-baseline gap-2">
                  <CardTitle className="text-base">{t("dashboard.charts.revenueTrend")}</CardTitle>
                  {chartData.revenueYearLabel && (
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                      {chartData.revenueYearLabel}
                    </span>
                  )}
                </div>
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
          <CardContent className="pt-4">
            <ChartContainer config={revenueConfig} className="h-[260px] w-full">
              <AreaChart data={chartData.revenueTrend} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 72% 38%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(160 72% 38%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatChartMonthTick}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
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
            <div className="flex flex-wrap items-baseline gap-2">
              <CardTitle className="text-base">{t("dashboard.charts.planVsFact")}</CardTitle>
              {chartData.planYearLabel && (
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {chartData.planYearLabel}
                </span>
              )}
            </div>
            <CardDescription className="text-xs">{t("dashboard.charts.planVsFactDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer config={revenueConfig} className="h-[260px] w-full">
              <ComposedChart data={chartData.planComparison} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatChartMonthTick}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
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

      {/* ── P&L charts: profit trend / yearly growth ── */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
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
                <XAxis
                  dataKey="month"
                  tickFormatter={formatChartMonthTick}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
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

        <RevealCard>
        <Card className="content-card">
          <CardHeader className="border-b">
            <CardTitle className="text-base">{t("dashboard.charts.yearlyGrowth")}</CardTitle>
            <CardDescription className="text-xs">{t("dashboard.charts.yearlyGrowthDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {chartData.yearlyGrowth.length === 0 ? (
              <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                {t("common.noData")}
              </p>
            ) : (
              <ChartContainer config={yearlyGrowthConfig} className="h-[260px] w-full">
                <ComposedChart data={chartData.yearlyGrowth} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="revenue"
                    tickFormatter={formatCompactMoney}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="growth"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) =>
                          name === "growth"
                            ? (value == null ? "—" : `${Number(value)}%`)
                            : moneyTooltip(value)
                        }
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="revenue"
                    dataKey="revenue"
                    fill="hsl(220 70% 50%)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                  <Line
                    yAxisId="growth"
                    type="monotone"
                    dataKey="growth"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "hsl(38 92% 50%)", strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        </RevealCard>
      </div>

      {/* ── Top clients ── */}
      <Card className="content-card">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <UsersIcon className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base">{t("dashboard.topClientsTable")}</CardTitle>
                <CardDescription className="text-xs">{t("dashboard.topClientsTableDesc")}</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TableLimitSortControls
                limit={rankedLimit}
                onLimitChange={setRankedLimit}
                order={rankedOrder}
                onOrderChange={setRankedOrder}
              />
              <CardPdfButton
                onExport={() =>
                  api.dashboardExportPdf.topClientsRanked({
                    limit: rankedLimit,
                    order: rankedOrder,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                  })
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn("p-0", rankedLoading && "pointer-events-none opacity-60")}>
          {rankedError && (
            <p className="px-6 py-3 text-sm text-red-600 dark:text-red-400">
              {t("common.error")}: {rankedError}
            </p>
          )}
          {!rankedError && (
          <PremiumDataTable
            empty={rankedClients.length === 0}
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
              {rankedClients.map((client, index) => {
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
          )}
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
            <div className="flex flex-wrap items-center gap-2">
              <TableLimitSortControls
                limit={ltvLimit}
                onLimitChange={setLtvLimit}
                order={ltvOrder}
                onOrderChange={setLtvOrder}
              />
              <CardPdfButton
                onExport={() =>
                  api.dashboardExportPdf.topClientsLtv({
                    limit: ltvLimit,
                    order: ltvOrder,
                  })
                }
              />
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
      <MonthlyRevenueModal
        open={revenueModalOpen}
        onClose={() => setRevenueModalOpen(false)}
        periodStart={showYear ? stats.year_start : stats.period_start}
        periodEnd={showYear ? stats.year_end : stats.period_end}
        periodLabel={revenuePeriodLabel}
      />
      {selectedRegionModal && (
        <RegionFactoriesModal
          open={Boolean(selectedRegionModal)}
          onClose={() => setSelectedRegionModal(null)}
          region={selectedRegionModal.city}
          country={selectedRegionModal.country}
          factories={selectedRegionModal.factories || []}
          tripsCount={selectedRegionModal.trips_count ?? selectedRegionModal.trips_count_2026 ?? 0}
        />
      )}
    </PageShell>
  );
}
