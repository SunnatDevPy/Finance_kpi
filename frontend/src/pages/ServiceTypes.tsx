import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  AwardIcon,
  BarChart3Icon,
  CalendarIcon,
  FilterIcon,
  LayersIcon,
  LineChartIcon,
  PlusIcon,
  RotateCcwIcon,
  TableIcon,
  Trash2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import {
  CancelIcon,
  LoadingIconBtn,
  SaveIconBtn,
} from "../components/ButtonIcons";
import { DateRangePicker } from "../components/DateRangePicker";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { ServiceTypeCard } from "../components/ServiceTypeCard";
import { ServiceTypeDetailModal } from "../components/ServiceTypeDetailModal";
import { ActiveStatusToggle } from "../components/ActiveStatusToggle";
import { StaggerContainer, StaggerItem } from "../components/Stagger";
import { StatCard } from "../components/StatCard";
import { TrendBadge } from "../components/TrendBadge";
import { useListLoading } from "../hooks/useListLoading";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
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
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ServiceType } from "../types";
import {
  formatCompactMoney,
  formatMoney,
  formatYAxisMoney,
} from "../utils/format";

interface DynamicsHighlightItem {
  item: ServiceType;
  rate: number;
  diff: number;
  prevRev: number;
  curRev: number;
}

interface DynamicsStats {
  topGainer: DynamicsHighlightItem | null;
  topDecliner: DynamicsHighlightItem | null;
  totalGrowing: number;
  totalFalling: number;
  totalFlat: number;
}

const YEARS = [
  "2030",
  "2029",
  "2028",
  "2027",
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
  "2019",
];

const SERVICE_COLORS = [
  "#2563eb", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
];

function ServiceBarLabel(props: any) {
  const { x = 0, y = 0, width = 0, value } = props;
  const num = typeof value === "number" ? value : parseFloat(String(value || 0));
  if (!num || num <= 0) return null;
  const text = formatCompactMoney(num);
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-foreground font-semibold text-[11px]"
    >
      {text}
    </text>
  );
}

export function ServiceTypesPage() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<ServiceType[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [analyticsTab, setAnalyticsTab] = useState<"distribution" | "dynamics">("distribution");
  const [dynamicsView, setDynamicsView] = useState<"both" | "chart" | "table">("both");
  const [trendFilter, setTrendFilter] = useState<"all" | "growing" | "falling">("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createActive, setCreateActive] = useState(true);
  const [detailItem, setDetailItem] = useState<ServiceType | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const { loading, start, finish } = useListLoading();
  const { submitting, guard } = useSubmitGuard();
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback((silent = false) => {
    start(silent);
    api.serviceTypes
      .list({
        year: yearFilter === "all" ? undefined : yearFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => finish());
  }, [yearFilter, dateFrom, dateTo, start, finish]);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    if (menuOpenId === null) return;
    const closeMenu = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpenId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuOpenId]);

  const hasActivePeriod = yearFilter !== "all" || Boolean(dateFrom || dateTo);

  const handleYearChange = (val: string) => {
    if (!val) return;
    setYearFilter(val);
    if (val !== "all") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    if (from || to) {
      setYearFilter("all");
    }
  };

  const handleClearFilters = () => {
    setYearFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const cardLabels = useMemo(
    () => ({
      usageCount: t("services.usageCount"),
      revenueShort: t("services.revenueShort"),
      viewStats: t("services.viewStats"),
      timesUsed: (count: number) => t("services.timesUsed").replace("{count}", String(count)),
      delete: t("common.delete"),
    }),
    [t],
  );

  const summary = useMemo(() => {
    const active = items.filter((item) => item.is_active).length;
    const totalRevenue = items.reduce((sum, item) => sum + parseFloat(item.total_revenue || "0"), 0);
    const totalUsage = items.reduce((sum, item) => sum + (item.usage_count || 0), 0);
    const sortedByRevenue = [...items].sort(
      (a, b) => parseFloat(b.total_revenue || "0") - parseFloat(a.total_revenue || "0"),
    );
    const topService =
      sortedByRevenue[0] && parseFloat(sortedByRevenue[0].total_revenue || "0") > 0
        ? sortedByRevenue[0]
        : null;
    const avgPerService = items.length > 0 ? totalRevenue / items.length : 0;
    return {
      total: items.length,
      active,
      inactive: items.length - active,
      totalRevenue,
      totalUsage,
      topService,
      avgPerService,
    };
  }, [items]);

  const trendCounts = useMemo(() => {
    let growing = 0;
    let falling = 0;
    items.forEach((item) => {
      const rate = item.growth_rate;
      if (rate !== null && rate !== undefined) {
        if (rate > 0) growing++;
        else if (rate < 0) falling++;
      }
    });
    return {
      all: items.length,
      growing,
      falling,
    };
  }, [items]);

  const allRankedServices = useMemo(() => {
    return [...items]
      .filter((i) => parseFloat(i.total_revenue || "0") > 0 || (i.usage_count || 0) > 0)
      .sort((a, b) => parseFloat(b.total_revenue || "0") - parseFloat(a.total_revenue || "0"));
  }, [items]);

  const filteredRankedServices = useMemo(() => {
    if (trendFilter === "growing") {
      return allRankedServices.filter((i) => (i.growth_rate ?? 0) > 0);
    }
    if (trendFilter === "falling") {
      return allRankedServices.filter((i) => (i.growth_rate ?? 0) < 0);
    }
    return allRankedServices;
  }, [allRankedServices, trendFilter]);

  const chartData = useMemo(() => {
    const list = trendFilter === "all" ? allRankedServices : filteredRankedServices;
    return list.slice(0, 10).map((item) => ({
      name: item.name,
      revenue: parseFloat(item.total_revenue || "0"),
      usage_count: item.usage_count || 0,
    }));
  }, [allRankedServices, filteredRankedServices, trendFilter]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    items.forEach((item) => {
      item.yearly_breakdown?.forEach((pt) => {
        if (pt.year) yearsSet.add(pt.year);
      });
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [items]);

  const dynamicsServices = useMemo(() => {
    let list = [...items].sort(
      (a, b) => parseFloat(b.total_revenue || "0") - parseFloat(a.total_revenue || "0"),
    );
    if (trendFilter === "growing") {
      list = list.filter((i) => (i.growth_rate ?? 0) > 0);
    } else if (trendFilter === "falling") {
      list = list.filter((i) => (i.growth_rate ?? 0) < 0);
    }
    return list;
  }, [items, trendFilter]);

  const chartConfig = {
    revenue: {
      label: t("services.revenueShort"),
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const dynamicsStats: DynamicsStats = useMemo(() => {
    let topGainer: DynamicsHighlightItem | null = null;
    let topDecliner: DynamicsHighlightItem | null = null;
    let totalGrowing = 0;
    let totalFalling = 0;
    let totalFlat = 0;

    items.forEach((item) => {
      const rate = item.growth_rate;
      const curRev = parseFloat(item.total_revenue || "0");
      const prevRev = parseFloat(item.previous_revenue || "0");
      const diff = curRev - prevRev;

      if (rate !== null && rate !== undefined) {
        if (rate > 0) {
          totalGrowing++;
          if (!topGainer || rate > topGainer.rate) {
            topGainer = { item, rate, diff, prevRev, curRev };
          }
        } else if (rate < 0) {
          totalFalling++;
          if (!topDecliner || rate < topDecliner.rate) {
            topDecliner = { item, rate, diff, prevRev, curRev };
          }
        } else {
          totalFlat++;
        }
      }
    });

    return {
      topGainer,
      topDecliner,
      totalGrowing,
      totalFalling,
      totalFlat,
    };
  }, [items]);

  const { topGainer, topDecliner, totalGrowing, totalFalling } = dynamicsStats;

  const dynamicsChartConfig = useMemo(() => {
    const topServices = allRankedServices.slice(0, 5);
    const cfg: ChartConfig = {};
    topServices.forEach((st, idx) => {
      cfg[`service_${st.id}`] = {
        label: st.name,
        color: SERVICE_COLORS[idx % SERVICE_COLORS.length],
      };
    });
    return cfg;
  }, [allRankedServices]);

  const dynamicsChartData = useMemo(() => {
    if (availableYears.length === 0) return [];
    const topServices = allRankedServices.slice(0, 5);
    return availableYears.map((yr) => {
      const pt: Record<string, any> = {
        year: `${yr}-yil`,
        yearNum: yr,
      };
      topServices.forEach((st) => {
        const yearPt = st.yearly_breakdown?.find((p) => p.year === yr);
        pt[`service_${st.id}`] = yearPt ? parseFloat(yearPt.revenue || "0") : 0;
      });
      return pt;
    });
  }, [availableYears, allRankedServices]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (query && !item.name.toLowerCase().includes(query)) return false;
      if (activeFilter === "active" && !item.is_active) return false;
      if (activeFilter === "inactive" && item.is_active) return false;
      return true;
    });
  }, [items, search, activeFilter]);

  const handleCreate = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.serviceTypes.create({ name, is_active: createActive });
      setName("");
      setCreateActive(true);
      setCreateModalOpen(false);
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  const setServiceTypeActive = useCallback(async (item: ServiceType, nextActive: boolean) => {
    if (item.is_active === nextActive) return;
    const snapshot = items;
    setError("");
    setMenuOpenId(null);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_active: nextActive } : row)),
    );
    setDetailItem((prev) => (prev?.id === item.id ? { ...prev, is_active: nextActive } : prev));
    try {
      await api.serviceTypes.update(item.id, { is_active: nextActive });
    } catch (err) {
      setItems(snapshot);
      setDetailItem((prev) =>
        prev?.id === item.id ? { ...prev, is_active: item.is_active } : prev,
      );
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }, [items, t]);

  const handleRename = useCallback(async (item: ServiceType, nextName: string) => {
    const updated = await api.serviceTypes.update(item.id, { name: nextName });
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, name: updated.name } : row)).sort((a, b) => a.name.localeCompare(b.name)),
    );
    setDetailItem((prev) => (prev?.id === item.id ? { ...prev, name: updated.name } : prev));
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    const snapshot = items;
    setError("");
    setItems((prev) => prev.filter((row) => row.id !== id));
    setDeleteId(null);
    setDetailItem((prev) => (prev?.id === id ? null : prev));
    try {
      await api.serviceTypes.delete(id);
    } catch (err) {
      setItems(snapshot);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const openDetail = useCallback((item: ServiceType) => {
    setMenuOpenId(null);
    setDetailItem(item);
  }, []);

  const handleToggleMenu = useCallback((id: number) => {
    setMenuOpenId((prev) => (prev === id ? null : id));
  }, []);

  const handleRequestDelete = useCallback((id: number) => {
    setMenuOpenId(null);
    setDeleteId(id);
  }, []);

  return (
    <PageShell>
      <PageHeader title={t("services.title")} subtitle={t("services.subtitle")}>
        {isAdmin && (
          <MotionButton type="button" onClick={() => setCreateModalOpen(true)} {...motionTap}>
            <PlusIcon data-icon="inline-start" />
            {t("services.new")}
          </MotionButton>
        )}
      </PageHeader>

      <PageError message={error} />

      {/* Filter toolbar: Year (2019-2030) + Date Range */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FilterIcon className="size-3.5 text-primary" />
            <span>{t("common.filter")}:</span>
          </div>

          {/* Year selector: 2019 to 2030 */}
          <div className="w-36 sm:w-40">
            <Select value={yearFilter} onValueChange={handleYearChange}>
              <SelectTrigger className="h-8.5 text-xs">
                <CalendarIcon className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder={t("services.yearFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("services.allYears")}</SelectItem>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Date range picker */}
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={handleDateRangeChange}
            onClear={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="h-8.5"
          />

          {hasActivePeriod && (
            <MotionButton
              type="button"
              variant="ghost"
              size="sm"
              className="h-8.5 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleClearFilters}
              {...motionTap}
            >
              <RotateCcwIcon className="size-3" />
              {t("services.clearFilters")}
            </MotionButton>
          )}
        </div>

        {hasActivePeriod && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2.5 py-1 text-xs font-medium">
              {yearFilter !== "all"
                ? `${yearFilter}-yil`
                : dateFrom && dateTo
                  ? `${dateFrom} — ${dateTo}`
                  : dateFrom
                    ? `≥ ${dateFrom}`
                    : `≤ ${dateTo}`}
            </Badge>
          </div>
        )}
      </div>

      {/* Enhanced StatCards */}
      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            title={t("services.summaryTotal")}
            value={String(summary.total)}
            subtitle={`${summary.active} ${t("status.active").toLowerCase()} · ${summary.inactive} ${t("status.inactive").toLowerCase()}`}
            accent="blue"
            icon={LayersIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={hasActivePeriod ? t("services.periodRevenue") : t("services.totalRevenue")}
            value={formatCompactMoney(summary.totalRevenue)}
            subtitle={
              summary.totalRevenue > 0
                ? `${t("services.avgPerService")}: ${formatCompactMoney(summary.avgPerService)}`
                : undefined
            }
            accent="green"
            icon={TrendingUpIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={hasActivePeriod ? t("services.periodUsage") : t("services.usageCount")}
            value={
              summary.totalUsage > 0
                ? t("services.timesUsed").replace("{count}", String(summary.totalUsage))
                : "0"
            }
            accent="cyan"
            icon={BarChart3Icon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("services.topService")}
            value={summary.topService ? summary.topService.name : "—"}
            subtitle={
              summary.topService && summary.totalRevenue > 0
                ? `${formatCompactMoney(summary.topService.total_revenue)} (${Math.round((parseFloat(summary.topService.total_revenue || "0") / summary.totalRevenue) * 100)}%)`
                : undefined
            }
            accent="violet"
            icon={AwardIcon}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Analytics Card: Revenue & Usage Distribution / Multi-Year Dynamics */}
      <Card className="content-card">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3Icon className="size-4 text-primary" />
                {t("services.analyticsTitle")}
              </CardTitle>
              <CardDescription className="text-xs">{t("services.analyticsSubtitle")}</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Tab Toggle: Taqsimot vs Yillar dinamikasi */}
              <div className="flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setAnalyticsTab("distribution")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                    analyticsTab === "distribution"
                      ? "bg-background text-foreground shadow-xs font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <BarChart3Icon className="size-3.5" />
                  {t("services.tabDistribution")}
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsTab("dynamics")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                    analyticsTab === "dynamics"
                      ? "bg-background text-foreground shadow-xs font-semibold text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <TrendingUpIcon className="size-3.5" />
                  {t("services.tabDynamics")}
                </button>
              </div>

              {summary.totalRevenue > 0 && (
                <Badge variant="outline" className="w-fit text-xs font-semibold">
                  {t("services.revenueShort")}: {formatCompactMoney(summary.totalRevenue)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {analyticsTab === "distribution" ? (
            chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BarChart3Icon className="size-10 text-muted-foreground/30" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {t("services.noPeriodData")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-8">
                  <ChartContainer config={chartConfig} className="h-[320px] w-full">
                    <BarChart data={chartData} margin={{ left: 8, right: 16, top: 24, bottom: 20 }}>
                      <defs>
                        <linearGradient id="serviceBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        interval={0}
                        tick={({ x, y, payload }: any) => {
                          const text = String(payload?.value || "");
                          const truncated = text.length > 14 ? `${text.slice(0, 12)}…` : text;
                          return (
                            <text
                              x={x}
                              y={y + 8}
                              textAnchor="middle"
                              className="fill-muted-foreground text-[11px]"
                            >
                              {truncated}
                            </text>
                          );
                        }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={64}
                        tickFormatter={(val) => formatYAxisMoney(val)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, _name, item) => (
                              <div className="flex flex-col gap-1 text-xs">
                                <span className="font-semibold text-foreground">
                                  {formatMoney(value as number)}
                                </span>
                                <span className="text-muted-foreground">
                                  {t("services.timesUsed").replace(
                                    "{count}",
                                    String(item?.payload?.usage_count || 0),
                                  )}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar
                        dataKey="revenue"
                        fill="url(#serviceBarGrad)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={44}
                      >
                        <LabelList
                          dataKey="revenue"
                          content={ServiceBarLabel}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>

                {/* Ranked Breakdown sidebar with ALL services & Trend Filters */}
                <div className="flex flex-col gap-3 lg:col-span-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("services.allServices")} ({filteredRankedServices.length})
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {t("services.vsPreviousYear")}
                    </span>
                  </div>

                  {/* Trend Filter Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTrendFilter("all")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
                        trendFilter === "all"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span>{t("services.filterAll")}</span>
                      <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-semibold">
                        {trendCounts.all}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendFilter("growing")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
                        trendFilter === "growing"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20",
                      )}
                    >
                      <ArrowUpRightIcon className="size-3" />
                      <span>{t("services.filterGrowing")}</span>
                      <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold">
                        {trendCounts.growing}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendFilter("falling")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
                        trendFilter === "falling"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20",
                      )}
                    >
                      <ArrowDownRightIcon className="size-3" />
                      <span>{t("services.filterFalling")}</span>
                      <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold">
                        {trendCounts.falling}
                      </span>
                    </button>
                  </div>

                  {/* Scrollable list of ALL services */}
                  <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
                    {filteredRankedServices.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        {t("services.notFound")}
                      </p>
                    ) : (
                      filteredRankedServices.map((item, idx) => {
                        const rev = parseFloat(item.total_revenue || "0");
                        const prevRev = parseFloat(item.previous_revenue || "0");
                        const diff = rev - prevRev;
                        const pct =
                          summary.totalRevenue > 0
                            ? Math.round((rev / summary.totalRevenue) * 100)
                            : 0;
                        return (
                          <div
                            key={item.id}
                            onClick={() => openDetail(item)}
                            className="group flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/20 p-2.5 transition-all hover:border-primary/40 hover:bg-muted/40 cursor-pointer shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                  #{idx + 1}
                                </span>
                                <span className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 font-medium text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                  {formatCompactMoney(rev)}
                                </span>
                                <span>({pct}%)</span>
                              </div>
                            </div>

                            {/* Year-over-Year Progression with clear Arrow Flow */}
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                {prevRev > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <span className="opacity-75">{formatCompactMoney(prevRev)}</span>
                                    <ArrowRightIcon className="size-3 text-muted-foreground/60" />
                                    <span className="font-semibold text-foreground">{formatCompactMoney(rev)}</span>
                                  </div>
                                ) : (
                                  <span>
                                    {t("services.timesUsed").replace(
                                      "{count}",
                                      String(item.usage_count || 0),
                                    )}
                                  </span>
                                )}
                              </div>
                              <TrendBadge
                                value={item.growth_rate}
                                diffAmount={prevRev > 0 ? diff : undefined}
                                size="sm"
                                prominentArrow
                              />
                            </div>

                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Multi-Year Dynamics: Top Highlights, Visual Chart and Stepper Flow Table with Arrows */
            <div className="flex flex-col gap-6">
              {/* 1. Top 3 Dynamics Highlights (KPI Cards with Arrows) */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Top Gainer */}
                <div className="flex flex-col justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <TrendingUpIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                      {t("services.topGainer")}
                    </span>
                    {topGainer && (
                      <TrendBadge
                        value={topGainer.rate}
                        diffAmount={topGainer.diff}
                        size="sm"
                        prominentArrow
                      />
                    )}
                  </div>
                  {topGainer ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-foreground">
                        {topGainer.item.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {formatCompactMoney(topGainer.prevRev)}
                        </span>
                        <ArrowRightIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCompactMoney(topGainer.curRev)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("services.noGrowthData")}</span>
                  )}
                </div>

                {/* Top Decliner */}
                <div className="flex flex-col justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                      <TrendingDownIcon className="size-4 text-rose-600 dark:text-rose-400" />
                      {t("services.topDecliner")}
                    </span>
                    {topDecliner && (
                      <TrendBadge
                        value={topDecliner.rate}
                        diffAmount={topDecliner.diff}
                        size="sm"
                        prominentArrow
                      />
                    )}
                  </div>
                  {topDecliner ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-foreground">
                        {topDecliner.item.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {formatCompactMoney(topDecliner.prevRev)}
                        </span>
                        <ArrowRightIcon className="size-3 text-rose-600 dark:text-rose-400" />
                        <span className="font-bold text-rose-700 dark:text-rose-400">
                          {formatCompactMoney(topDecliner.curRev)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("services.noGrowthData")}</span>
                  )}
                </div>

                {/* Overall Dynamics Summary */}
                <div className="flex flex-col justify-between gap-2 rounded-xl border border-border/70 bg-muted/20 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <LayersIcon className="size-4 text-primary" />
                      {t("services.overallTrend")}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {dynamicsServices.length} {t("services.allServices").toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15">
                        <ArrowUpRightIcon className="size-3" />
                      </span>
                      <span>{totalGrowing} ta o'smoqda</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                      <span className="flex size-5 items-center justify-center rounded-full bg-rose-500/15">
                        <ArrowDownRightIcon className="size-3" />
                      </span>
                      <span>{totalFalling} ta pasaymoqda</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Sub-view switcher & Trend Filter Chips */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTrendFilter("all")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
                      trendFilter === "all"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span>{t("services.filterAll")}</span>
                    <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-semibold">
                      {trendCounts.all}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendFilter("growing")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
                      trendFilter === "growing"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20",
                    )}
                  >
                    <ArrowUpRightIcon className="size-3" />
                    <span>{t("services.filterGrowing")}</span>
                    <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold">
                      {trendCounts.growing}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendFilter("falling")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
                      trendFilter === "falling"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20",
                    )}
                  >
                    <ArrowDownRightIcon className="size-3" />
                    <span>{t("services.filterFalling")}</span>
                    <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold">
                      {trendCounts.falling}
                    </span>
                  </button>
                </div>

                {/* View toggle: Both vs Chart vs Table */}
                <div className="flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setDynamicsView("both")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      dynamicsView === "both"
                        ? "bg-background text-foreground shadow-xs font-semibold text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Hamma ko'rinish
                  </button>
                  <button
                    type="button"
                    onClick={() => setDynamicsView("chart")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      dynamicsView === "chart"
                        ? "bg-background text-foreground shadow-xs font-semibold text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <LineChartIcon className="size-3" />
                    {t("services.dynamicsChart")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDynamicsView("table")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      dynamicsView === "table"
                        ? "bg-background text-foreground shadow-xs font-semibold text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <TableIcon className="size-3" />
                    {t("services.dynamicsTable")}
                  </button>
                </div>
              </div>

              {/* 3. Multi-Year Comparative Trend Line Chart */}
              {(dynamicsView === "both" || dynamicsView === "chart") && (
                <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <LineChartIcon className="size-4 text-primary" />
                        {t("services.dynamicsChart")}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Yetakchi xizmatlarning yillar bo'yicha daromad o'sish traektoriyasi
                      </p>
                    </div>
                  </div>
                  {dynamicsChartData.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">{t("services.noGrowthData")}</p>
                  ) : (
                    <ChartContainer config={dynamicsChartConfig} className="h-[280px] w-full">
                      <LineChart data={dynamicsChartData} margin={{ left: 8, right: 24, top: 16, bottom: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          width={68}
                          tickFormatter={(val) => formatYAxisMoney(val)}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex items-center justify-between gap-3 text-xs">
                                  <span className="font-semibold text-foreground">{name}:</span>
                                  <span className="font-bold text-foreground tabular-nums">
                                    {formatMoney(value as number)}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        {allRankedServices.slice(0, 5).map((st, idx) => (
                          <Line
                            key={st.id}
                            type="monotone"
                            dataKey={`service_${st.id}`}
                            name={st.name}
                            stroke={SERVICE_COLORS[idx % SERVICE_COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: SERVICE_COLORS[idx % SERVICE_COLORS.length] }}
                            activeDot={{ r: 6 }}
                          />
                        ))}
                      </LineChart>
                    </ChartContainer>
                  )}
                </div>
              )}

              {/* 4. The Strelkali Oqim Jadvali (Detailed Stepper Flow Table with Arrows) */}
              {(dynamicsView === "both" || dynamicsView === "table") && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <TableIcon className="size-4 text-primary" />
                        {t("services.dynamicsTable")}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Har bir xizmat bo'yicha yillik o'zgarishlar, strelkali o'sish/pasayish ko'rsatkichlari
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {dynamicsServices.length} {t("services.allServices").toLowerCase()}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border/70 shadow-2xs">
                    <Table variant="premium">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead className="min-w-[170px]">{t("services.name")}</TableHead>
                          <TableHead className="min-w-[130px] text-center">{t("services.growthRate")}</TableHead>
                          {availableYears.map((year, idx) => (
                            <TableHead key={year} className="text-center min-w-[125px]">
                              {year}-yil
                              {idx > 0 && <span className="block text-[10px] font-normal text-muted-foreground">vs {availableYears[idx - 1]}</span>}
                            </TableHead>
                          ))}
                          <TableHead className="min-w-[220px]">{t("services.yearlyTrajectory")}</TableHead>
                          <TableHead className="text-right min-w-[120px]">{t("services.revenueShort")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dynamicsServices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5 + availableYears.length} className="py-8 text-center text-sm text-muted-foreground">
                              {t("services.notFound")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          dynamicsServices.map((item, idx) => {
                            const totalRev = parseFloat(item.total_revenue || "0");
                            const prevRev = parseFloat(item.previous_revenue || "0");
                            const diff = totalRev - prevRev;
                            const pct =
                              summary.totalRevenue > 0
                                ? Math.round((totalRev / summary.totalRevenue) * 100)
                                : 0;
                            return (
                              <TableRow
                                key={item.id}
                                onClick={() => openDetail(item)}
                                className="cursor-pointer group hover:bg-muted/30 transition-colors"
                              >
                                <TableCell className="font-semibold text-xs text-muted-foreground text-center">
                                  #{idx + 1}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "size-2 rounded-full shrink-0",
                                          item.is_active ? "bg-emerald-500" : "bg-muted-foreground/40",
                                        )}
                                      />
                                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {item.name}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                      {t("services.timesUsed").replace("{count}", String(item.usage_count || 0))}
                                    </span>
                                  </div>
                                </TableCell>

                                {/* Latest Growth Trend with Arrow & Diff */}
                                <TableCell className="text-center">
                                  {item.growth_rate !== null && item.growth_rate !== undefined ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <TrendBadge
                                        value={item.growth_rate}
                                        diffAmount={prevRev > 0 ? diff : undefined}
                                        size="sm"
                                        prominentArrow
                                      />
                                      {prevRev > 0 && (
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                          {formatCompactMoney(prevRev)} → {formatCompactMoney(totalRev)}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                      {t("services.trendNew")}
                                    </span>
                                  )}
                                </TableCell>

                                {/* Individual Year Columns with Arrows */}
                                {availableYears.map((year, yIdx) => {
                                  const pt = item.yearly_breakdown?.find((p) => p.year === year);
                                  const hasData = pt && (parseFloat(pt.revenue) > 0 || pt.usage_count > 0);

                                  const prevYear = availableYears[yIdx - 1];
                                  const prevPt = prevYear ? item.yearly_breakdown?.find((p) => p.year === prevYear) : null;
                                  const prevPtRev = prevPt ? parseFloat(prevPt.revenue || "0") : 0;
                                  const curPtRev = pt ? parseFloat(pt.revenue || "0") : 0;
                                  const yearDiff = prevPtRev > 0 ? curPtRev - prevPtRev : null;

                                  return (
                                    <TableCell key={year} className="text-center">
                                      {hasData ? (
                                        <div className="flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-muted/15 p-2 transition-all group-hover:border-primary/30 group-hover:bg-background">
                                          <span className="font-bold text-xs text-foreground tabular-nums">
                                            {formatCompactMoney(pt.revenue)}
                                          </span>
                                          {pt.growth_rate !== null && pt.growth_rate !== undefined ? (
                                            <TrendBadge
                                              value={pt.growth_rate}
                                              diffAmount={yearDiff}
                                              size="sm"
                                              prominentArrow
                                            />
                                          ) : yIdx === 0 ? (
                                            <span className="text-[10px] font-medium text-muted-foreground/70">Boshlang'ich</span>
                                          ) : (
                                            <span className="text-[10px] text-muted-foreground/50">—</span>
                                          )}
                                          <span className="text-[10px] text-muted-foreground">
                                            {pt.usage_count} marta
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground/30 text-xs">—</span>
                                      )}
                                    </TableCell>
                                  );
                                })}

                                {/* Visual Timeline Stepper with Arrows */}
                                <TableCell>
                                  {item.yearly_breakdown && item.yearly_breakdown.length > 1 ? (
                                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
                                      {item.yearly_breakdown.map((pt, pIdx) => {
                                        const isLast = pIdx === item.yearly_breakdown!.length - 1;
                                        const hasRev = parseFloat(pt.revenue) > 0;
                                        const nextPt = item.yearly_breakdown![pIdx + 1];
                                        return (
                                          <div key={pt.year} className="flex items-center gap-1.5 shrink-0">
                                            <div
                                              className={cn(
                                                "flex flex-col rounded-md border px-2 py-1 text-center shadow-2xs transition-colors",
                                                isLast
                                                  ? "border-primary/40 bg-primary/10 font-bold text-primary"
                                                  : "border-border/50 bg-muted/20 text-muted-foreground",
                                              )}
                                            >
                                              <span className="text-[10px] font-semibold">{pt.year}</span>
                                              <span className="text-[11px] tabular-nums font-semibold">
                                                {hasRev ? formatCompactMoney(pt.revenue) : "0"}
                                              </span>
                                            </div>
                                            {!isLast && (
                                              <div className="flex flex-col items-center">
                                                <ArrowRightIcon className="size-3.5 text-muted-foreground/70" />
                                                {nextPt?.growth_rate !== null && nextPt?.growth_rate !== undefined && (
                                                  <span
                                                    className={cn(
                                                      "text-[9px] font-bold tabular-nums",
                                                      nextPt.growth_rate > 0
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : nextPt.growth_rate < 0
                                                          ? "text-rose-600 dark:text-rose-400"
                                                          : "text-muted-foreground",
                                                    )}
                                                  >
                                                    {nextPt.growth_rate > 0 ? "↗+" : nextPt.growth_rate < 0 ? "↘" : ""}
                                                    {nextPt.growth_rate.toFixed(0)}%
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60">—</span>
                                  )}
                                </TableCell>

                                {/* Total Revenue */}
                                <TableCell className="text-right font-bold text-xs text-foreground tabular-nums">
                                  <div>{formatCompactMoney(totalRev)}</div>
                                  <div className="text-[10px] font-normal text-muted-foreground">({pct}%)</div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catalog Card */}
      <Card className="content-card">
        <CardHeader className="border-b pb-3">
          <CardTitle>{t("services.listTitle")}</CardTitle>
        </CardHeader>
        <div className="table-card-toolbar">
          <Input
            className="w-full min-w-[12rem] flex-1 sm:max-w-xs"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={activeFilter}
            onValueChange={(v) => v && setActiveFilter(v)}
            className="w-full sm:w-48"
          >
            <SelectTrigger>
              <SelectValue placeholder={t("clients.state")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("services.allStatus")}</SelectItem>
                <SelectItem value="active">{t("status.active")}</SelectItem>
                <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("services.notFound")}</p>
          ) : (
            <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <StaggerItem key={item.id}>
                  <ServiceTypeCard
                    item={item}
                    menuOpen={menuOpenId === item.id}
                    menuRef={menuOpenId === item.id ? menuRef : undefined}
                    labels={cardLabels}
                    canManage={isAdmin}
                    onOpen={openDetail}
                    onToggleMenu={handleToggleMenu}
                    onSetActive={setServiceTypeActive}
                    onDelete={handleRequestDelete}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </CardContent>
      </Card>

      <ServiceTypeDetailModal
        item={detailItem}
        open={detailItem !== null}
        canManage={isAdmin}
        periodParams={{
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          year: yearFilter === "all" ? undefined : yearFilter,
        }}
        onClose={() => setDetailItem(null)}
        onSetActive={setServiceTypeActive}
        onRename={handleRename}
        onDelete={(id) => {
          setDeleteId(id);
        }}
      />

      <Modal title={t("services.newTitle")} open={createModalOpen} onClose={() => setCreateModalOpen(false)}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <FloatingLabelInput
            id="name"
            label={t("services.name")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <ActiveStatusToggle
            layout="field"
            label={t("clients.state")}
            active={createActive}
            onActiveChange={setCreateActive}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <MotionButton type="button" variant="outline" onClick={() => setCreateModalOpen(false)} {...motionTap}>
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

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("services.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("services.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">
              <CancelIcon />
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              <Trash2Icon data-icon="inline-start" className="size-4" />
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
