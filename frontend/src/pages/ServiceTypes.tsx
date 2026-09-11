import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AwardIcon,
  BarChart3Icon,
  CalendarIcon,
  FilterIcon,
  LayersIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  TrendingUpIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
  formatChartBarValue,
  formatCompactMoney,
  formatMoney,
  formatYAxisMoney,
} from "../utils/format";

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

function ServiceBarLabel(props: any) {
  const { x = 0, y = 0, width = 0, value } = props;
  const text = formatChartBarValue(value);
  if (!text) return null;
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
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={chartData} margin={{ left: 8, right: 16, top: 24, bottom: 20 }}>
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
                        fill="hsl(var(--primary))"
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
                      <ArrowUpIcon className="size-3" />
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
                      <ArrowDownIcon className="size-3" />
                      <span>{t("services.filterFalling")}</span>
                      <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold">
                        {trendCounts.falling}
                      </span>
                    </button>
                  </div>

                  {/* Scrollable list of ALL services */}
                  <div className="flex max-h-[340px] flex-col gap-2 overflow-y-auto pr-1">
                    {filteredRankedServices.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        {t("services.notFound")}
                      </p>
                    ) : (
                      filteredRankedServices.map((item, idx) => {
                        const rev = parseFloat(item.total_revenue || "0");
                        const pct =
                          summary.totalRevenue > 0
                            ? Math.round((rev / summary.totalRevenue) * 100)
                            : 0;
                        return (
                          <div
                            key={item.id}
                            onClick={() => openDetail(item)}
                            className="group flex flex-col gap-1.5 rounded-xl border border-border/50 bg-muted/20 p-2.5 transition-all hover:border-primary/40 hover:bg-muted/40 cursor-pointer"
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
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {t("services.timesUsed").replace(
                                  "{count}",
                                  String(item.usage_count || 0),
                                )}
                              </span>
                              <TrendBadge value={item.growth_rate} size="sm" />
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
            /* Multi-Year Dynamics Table */
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
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
                    <ArrowUpIcon className="size-3" />
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
                    <ArrowDownIcon className="size-3" />
                    <span>{t("services.filterFalling")}</span>
                    <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold">
                      {trendCounts.falling}
                    </span>
                  </button>
                </div>

                <span className="text-xs text-muted-foreground">
                  {dynamicsServices.length} {t("services.allServices").toLowerCase()}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/70">
                <Table variant="premium">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="min-w-[160px]">{t("services.name")}</TableHead>
                      <TableHead className="w-28 text-center">{t("services.growthRate")}</TableHead>
                      {availableYears.map((year) => (
                        <TableHead key={year} className="text-center min-w-[95px]">
                          {year}-yil
                        </TableHead>
                      ))}
                      <TableHead className="text-right min-w-[120px]">{t("services.revenueShort")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dynamicsServices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4 + availableYears.length} className="py-8 text-center text-sm text-muted-foreground">
                          {t("services.notFound")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      dynamicsServices.map((item, idx) => {
                        const totalRev = parseFloat(item.total_revenue || "0");
                        return (
                          <TableRow
                            key={item.id}
                            onClick={() => openDetail(item)}
                            className="cursor-pointer group"
                          >
                            <TableCell className="font-semibold text-xs text-muted-foreground text-center">
                              #{idx + 1}
                            </TableCell>
                            <TableCell>
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
                            </TableCell>
                            <TableCell className="text-center">
                              <TrendBadge value={item.growth_rate} size="sm" />
                            </TableCell>
                            {availableYears.map((year) => {
                              const pt = item.yearly_breakdown?.find((p) => p.year === year);
                              const hasData = pt && (parseFloat(pt.revenue) > 0 || pt.usage_count > 0);
                              return (
                                <TableCell key={year} className="text-center">
                                  {hasData ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="font-medium text-xs text-foreground tabular-nums">
                                        {formatCompactMoney(pt.revenue)}
                                      </span>
                                      {pt.growth_rate !== null && pt.growth_rate !== undefined ? (
                                        <TrendBadge value={pt.growth_rate} size="sm" />
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground/60">—</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/40 text-xs">—</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right font-semibold text-xs text-foreground tabular-nums">
                              {formatCompactMoney(totalRev)}
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
