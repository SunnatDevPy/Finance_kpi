import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Building2Icon,
  CircleDollarSignIcon,
  FilterXIcon,
  HandshakeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { TableColumnPicker } from "../components/TableColumnPicker";
import { usePickerColumns } from "../hooks/usePickerColumns";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
  TableCellActions,
  TableCellCompany,
  TableCellDate,
  TableCellMuted,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { Pagination } from "../components/Pagination";
import { TripModal } from "../components/TripModal";
import { api } from "../api/client";
import { DEFAULT_COUNTRY, GEO_COUNTRIES, getRegionsForCountry } from "../data/geoRegions";
import type { B2BMeetingMonthlyStats, Paginated, Trip, User } from "../types";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useListLoading } from "../hooks/useListLoading";
import { formatCompactMoney, formatDate, formatMoney } from "../utils/format";
import { CancelIcon, DeleteIconBtn, LoadingIconBtn } from "../components/ButtonIcons";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AVAILABLE_YEARS = [2030, 2029, 2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020] as const;

const MONTHS = [
  { value: 1, labelUz: "Yanvar", labelRu: "Январь" },
  { value: 2, labelUz: "Fevral", labelRu: "Февраль" },
  { value: 3, labelUz: "Mart", labelRu: "Март" },
  { value: 4, labelUz: "Aprel", labelRu: "Апрель" },
  { value: 5, labelUz: "May", labelRu: "Май" },
  { value: 6, labelUz: "Iyun", labelRu: "Июнь" },
  { value: 7, labelUz: "Iyul", labelRu: "Июль" },
  { value: 8, labelUz: "Avgust", labelRu: "Август" },
  { value: 9, labelUz: "Sentyabr", labelRu: "Сентябрь" },
  { value: 10, labelUz: "Oktyabr", labelRu: "Октябрь" },
  { value: 11, labelUz: "Noyabr", labelRu: "Ноябрь" },
  { value: 12, labelUz: "Dekabr", labelRu: "Декабрь" },
];

const TRIP_OPTIONAL_COLUMNS = [
  { id: "format", labelKey: "trips.colFormat", defaultVisible: true },
  { id: "region", labelKey: "trips.colRegion", defaultVisible: true },
  { id: "services", labelKey: "trips.colServices", defaultVisible: true },
  { id: "employee", labelKey: "trips.colEmployee", defaultVisible: true },
  { id: "results", labelKey: "trips.colResults", defaultVisible: true },
  { id: "nextStep", labelKey: "trips.colNextStep", defaultVisible: false },
  { id: "status", labelKey: "trips.colStatus", defaultVisible: true },
  { id: "potential", labelKey: "trips.colPotential", defaultVisible: true },
] as const;

type TripOptionalColumn = (typeof TRIP_OPTIONAL_COLUMNS)[number]["id"];

export function TripsPage() {
  const { t, locale } = useI18n();
  const { isAdmin } = useAuth();
  const { isVisible, setColumnVisible, items: columnPickerItems } =
    usePickerColumns("wtma.trips.tableColumns", TRIP_OPTIONAL_COLUMNS, t);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number | "all">(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>(DEFAULT_COUNTRY);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();

  // Users for employee filter
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api.users.list().then(setUsers).catch(() => {});
  }, []);

  // Data state
  const [tripsData, setTripsData] = useState<Paginated<Trip>>({
    items: [],
    total: 0,
    skip: 0,
    limit: 20,
  });

  const [monthlyStats, setMonthlyStats] = useState<B2BMeetingMonthlyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const employeeOptions = useMemo(() => {
    const names = new Set<string>();
    names.add("Jamoa");
    users.forEach((u) => {
      if (u.full_name) names.add(u.full_name);
    });
    monthlyStats?.by_executor?.forEach((e) => {
      if (e.employee_name) names.add(e.employee_name);
    });
    tripsData.items.forEach((t) => {
      if (t.employee_name) names.add(t.employee_name);
    });
    return Array.from(names).sort((a, b) => {
      if (a === "Jamoa") return -1;
      if (b === "Jamoa") return 1;
      return a.localeCompare(b, "uz");
    });
  }, [users, monthlyStats, tripsData.items]);

  const dynamicRegionsForCountry = useMemo(() => {
    if (countryFilter === "all") {
      const list: { value: string; label: string }[] = [];
      GEO_COUNTRIES.forEach((c) => {
        getRegionsForCountry(c.value).forEach((r) => {
          list.push({
            value: r.value,
            label: `${r.value} (${locale === "ru" ? c.labelRu : c.labelUz})`,
          });
        });
      });
      return list;
    }
    return getRegionsForCountry(countryFilter).map((r) => ({
      value: r.value,
      label: locale === "ru" ? r.labelRu : r.labelUz,
    }));
  }, [countryFilter, locale]);

  const handleCountryChange = (val: string) => {
    const nextCountry = val || "all";
    setCountryFilter(nextCountry);
    if (regionFilter !== "all" && nextCountry !== "all") {
      const valid = getRegionsForCountry(nextCountry).some((r) => r.value === regionFilter);
      if (!valid) {
        setRegionFilter("all");
      }
    }
    setPage(0);
  };

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    api.trips
      .monthlyStats({
        year: selectedYear === "all" ? undefined : selectedYear,
        month: selectedMonth === "all" ? undefined : selectedMonth,
        country: countryFilter === "all" ? undefined : countryFilter,
        region: regionFilter === "all" ? undefined : regionFilter,
      })
      .then(setMonthlyStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [selectedYear, selectedMonth, countryFilter, regionFilter]);

  const loadTrips = useCallback(
    (silent = false) => {
      start(silent);
      setError("");
      api.trips
        .list({
          year: selectedYear === "all" ? undefined : selectedYear,
          month: selectedMonth === "all" ? undefined : selectedMonth,
          country: countryFilter === "all" ? undefined : countryFilter,
          region: regionFilter === "all" ? undefined : regionFilter,
          meeting_format: formatFilter === "all" ? undefined : formatFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
          employee_name: employeeFilter === "all" ? undefined : employeeFilter,
          search: search.trim() || undefined,
          skip: page * pageSize,
          limit: pageSize,
        })
        .then(setTripsData)
        .catch((e) => setError(e instanceof Error ? e.message : t("common.error")))
        .finally(() => finish());
    },
    [
      selectedYear,
      selectedMonth,
      countryFilter,
      regionFilter,
      formatFilter,
      statusFilter,
      employeeFilter,
      search,
      page,
      pageSize,
      start,
      finish,
      t,
    ],
  );

  useEffect(() => {
    loadTrips(false);
  }, [loadTrips]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await api.trips.delete(deleteId);
      setDeleteId(null);
      loadTrips(true);
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters =
    selectedMonth !== "all" ||
    formatFilter !== "all" ||
    statusFilter !== "all" ||
    employeeFilter !== "all" ||
    countryFilter !== DEFAULT_COUNTRY ||
    regionFilter !== "all" ||
    Boolean(search.trim());

  const clearFilters = () => {
    setSelectedMonth("all");
    setFormatFilter("all");
    setStatusFilter("all");
    setEmployeeFilter("all");
    setCountryFilter(DEFAULT_COUNTRY);
    setRegionFilter("all");
    setSearch("");
    setPage(0);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "won":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            {t("trips.statusWon")}
          </Badge>
        );
      case "negotiation":
        return (
          <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
            {t("trips.statusNegotiation")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
            {t("trips.statusCancelled")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            {t("trips.statusInProgress")}
          </Badge>
        );
    }
  };

  const getFormatBadge = (fmt?: string) => {
    if (fmt === "zoom") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
          <VideoIcon className="size-3" />
          Zoom
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <UsersIcon className="size-3" />
        {t("trips.formatLive")}
      </span>
    );
  };

  const currentMonthName = useMemo(() => {
    if (selectedMonth === "all") return "";
    const m = MONTHS.find((item) => item.value === selectedMonth);
    return m ? (locale === "ru" ? m.labelRu : m.labelUz) : "";
  }, [selectedMonth, locale]);

  return (
    <PageShell>
      <PageHeader
        title={t("trips.pageTitle")}
        subtitle={
          currentMonthName
            ? `${currentMonthName} ${selectedYear !== "all" ? selectedYear : ""} — ${t("trips.pageSubtitleAll")}`
            : t("trips.pageSubtitleAll")
        }
      >
        <MotionButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            api.trips.export("xlsx", {
              year: selectedYear === "all" ? undefined : selectedYear,
              month: selectedMonth === "all" ? undefined : selectedMonth,
              country: countryFilter === "all" ? undefined : countryFilter,
              region: regionFilter === "all" ? undefined : regionFilter,
              meeting_format: formatFilter === "all" ? undefined : formatFilter,
              status: statusFilter === "all" ? undefined : statusFilter,
              employee_name: employeeFilter === "all" ? undefined : employeeFilter,
            })
          }
          {...motionTap}
        >
          Excel
        </MotionButton>
        <MotionButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            api.trips.export("pdf", {
              year: selectedYear === "all" ? undefined : selectedYear,
              month: selectedMonth === "all" ? undefined : selectedMonth,
              country: countryFilter === "all" ? undefined : countryFilter,
              region: regionFilter === "all" ? undefined : regionFilter,
              meeting_format: formatFilter === "all" ? undefined : formatFilter,
              status: statusFilter === "all" ? undefined : statusFilter,
              employee_name: employeeFilter === "all" ? undefined : employeeFilter,
            })
          }
          {...motionTap}
        >
          PDF
        </MotionButton>
        <MotionButton
          onClick={() => {
            setEditingTrip(null);
            setTripModalOpen(true);
          }}
          {...motionTap}
        >
          <PlusIcon data-icon="inline-start" />
          {t("trips.addTripButton")}
        </MotionButton>
      </PageHeader>

      <PageError message={error} />

      {/* TOP DASHBOARD: Monthly Statistics & Management Pipeline */}
      <Card className="content-card border-brand-500/20 bg-gradient-to-br from-card to-background">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <HandshakeIcon className="size-5 text-brand-600 dark:text-brand-400" />
              <CardTitle className="text-lg font-bold">
                {currentMonthName
                  ? `${currentMonthName} ${selectedYear !== "all" ? selectedYear : ""} ${t("trips.statsTitle")}`
                  : `${selectedYear !== "all" ? selectedYear : t("trips.allYearsFilter")} ${t("trips.statsTitle")}`}
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              {monthlyStats
                ? t("trips.statsPipelineOverview")
                    .replace("{meetings}", String(monthlyStats.total_meetings))
                    .replace("{factories}", String(monthlyStats.unique_companies))
                    .replace("{potential}", formatCompactMoney(monthlyStats.total_deal_potential))
                : t("trips.statsSubtitle")}
            </CardDescription>
          </div>

          {/* Month & Year Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(selectedMonth)}
              onValueChange={(val) => {
                setSelectedMonth(val === "all" ? "all" : Number(val));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder={t("trips.allMonthsFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("trips.allMonthsFilter")}</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {locale === "ru" ? m.labelRu : m.labelUz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedYear)}
              onValueChange={(val) => {
                setSelectedYear(val === "all" ? "all" : Number(val));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-9 w-[110px] text-xs">
                <SelectValue placeholder={t("trips.allYearsFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("trips.allYearsFilter")}</SelectItem>
                {AVAILABLE_YEARS.map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>
                    {t("trips.yearLabel").replace("{year}", String(yr))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* 4 Main KPI Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Total Meetings & Zoom vs Live */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("trips.statsTotalMeetings")}
                </span>
                <span className="rounded-full bg-brand-500/10 p-1.5 text-brand-600 dark:text-brand-400">
                  <HandshakeIcon className="size-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight">
                {statsLoading ? "—" : monthlyStats?.total_meetings ?? 0}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-300">
                  <VideoIcon className="size-3" />
                  Zoom: {monthlyStats?.zoom_meetings ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                  <UsersIcon className="size-3" />
                  Jonli: {monthlyStats?.live_meetings ?? 0}
                </span>
              </div>
            </div>

            {/* KPI 2: Unique Factories */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("trips.statsUniqueFactories")}
                </span>
                <span className="rounded-full bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                  <Building2Icon className="size-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {statsLoading ? "—" : monthlyStats?.unique_companies ?? 0}
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                Tashrif va muzokaralar qamrovi
              </p>
            </div>

            {/* KPI 3: Total Deal Potential */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("trips.statsTotalPotential")}
                </span>
                <span className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                  <CircleDollarSignIcon className="size-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {statsLoading ? "—" : `${formatCompactMoney(monthlyStats?.total_deal_potential || 0)} so'm`}
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {monthlyStats?.total_deal_potential
                  ? `${formatMoney(monthlyStats.total_deal_potential)} so'm`
                  : "Potentsial mavjud emas"}
              </p>
            </div>

            {/* KPI 4: Conversion & Statuses */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Holatlar tahlili</span>
                <span className="rounded-full bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
                  <UsersIcon className="size-4" />
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                <div className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">Jarayonda:</span>
                  <div className="font-semibold text-amber-700 dark:text-amber-300">
                    {monthlyStats?.by_status?.in_progress ?? 0}
                  </div>
                </div>
                <div className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">Muzokara:</span>
                  <div className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {monthlyStats?.by_status?.negotiation ?? 0}
                  </div>
                </div>
                <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">Kelishildi:</span>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {monthlyStats?.by_status?.won ?? 0}
                  </div>
                </div>
                <div className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">Bekor:</span>
                  <div className="font-semibold text-rose-700 dark:text-rose-300">
                    {monthlyStats?.by_status?.cancelled ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MAIN DATA TABLE */}
      <Card className="content-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("trips.listTitle")}</CardTitle>
              <CardDescription>
                {tripsData.total} {t("trips.records")}
                {employeeFilter !== "all" && ` • Ijrochi: ${employeeFilter}`}
                {countryFilter !== "all" && ` • Davlat: ${countryFilter}`}
                {regionFilter !== "all" && ` • Hudud: ${regionFilter}`}
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <MotionButton
                variant="ghost"
                size="sm"
                className="h-8 self-start text-xs text-muted-foreground sm:self-auto"
                onClick={clearFilters}
                {...motionTap}
              >
                <FilterXIcon className="mr-1.5 size-3.5" />
                Filtrlarni tozalash
              </MotionButton>
            )}
          </div>
        </CardHeader>

        {/* Toolbar & Filters */}
        <div className="table-card-toolbar">
          <Input
            className="w-full min-w-[12rem] flex-1 sm:max-w-xs"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />

          {/* Format Filter */}
          <Select
            value={formatFilter}
            onValueChange={(val) => {
              setFormatFilter(val || "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[140px]">
              <SelectValue placeholder={t("trips.allFormatsFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("trips.allFormatsFilter")}</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="live">{t("trips.formatLive")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val || "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[150px]">
              <SelectValue placeholder={t("trips.allStatusesFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("trips.allStatusesFilter")}</SelectItem>
              <SelectItem value="in_progress">{t("trips.statusInProgress")}</SelectItem>
              <SelectItem value="negotiation">{t("trips.statusNegotiation")}</SelectItem>
              <SelectItem value="won">{t("trips.statusWon")}</SelectItem>
              <SelectItem value="cancelled">{t("trips.statusCancelled")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Employee Filter */}
          <Select
            value={employeeFilter}
            onValueChange={(val) => {
              setEmployeeFilter(val || "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[170px]">
              <SelectValue placeholder={t("trips.allEmployeesFilter") || "Barcha xodimlar"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("trips.allEmployeesFilter") || "Barcha xodimlar"}</SelectItem>
              {employeeOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Country Filter */}
          <Select
            value={countryFilter}
            onValueChange={handleCountryChange}
          >
            <SelectTrigger className="h-10 w-full sm:w-[150px]">
              <SelectValue placeholder={t("trips.allCountriesFilter") || "Barcha davlatlar"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("trips.allCountriesFilter") || "Barcha davlatlar"}</SelectItem>
              {GEO_COUNTRIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {locale === "ru" ? c.labelRu : c.labelUz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Region Filter */}
          <Select
            value={regionFilter}
            onValueChange={(val) => {
              setRegionFilter(val || "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[180px]">
              <SelectValue placeholder={t("trips.allRegionsFilter") || "Barcha hududlar"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("trips.allRegionsFilter") || "Barcha hududlar"}</SelectItem>
                {dynamicRegionsForCountry.map((reg) => (
                  <SelectItem key={reg.value} value={reg.value}>
                    {reg.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Column Picker */}
          <TableColumnPicker
            columns={columnPickerItems}
            isVisible={(id: TripOptionalColumn) => isVisible(id)}
            onVisibleChange={setColumnVisible}
            className="sm:ml-auto"
          />
        </div>

        {/* Table Content */}
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && tripsData.items.length === 0}
            emptyMessage={t("trips.noTripsFound")}
            skeletonCols={7}
            tableClassName="min-w-[1000px]"
            footer={
              tripsData.total > pageSize ? (
                <Pagination
                  embedded
                  page={page + 1}
                  pageSize={pageSize}
                  total={tripsData.total}
                  onPageChange={(p) => setPage(p - 1)}
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(0);
                  }}
                />
              ) : undefined
            }
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">{t("trips.colIndex")}</TableHead>
                <TableHead className="w-28">{t("trips.colDate")}</TableHead>
                {isVisible("format") && <TableHead className="w-32">{t("trips.colFormat")}</TableHead>}
                <TableHead className="min-w-[180px]">{t("trips.colFactories")}</TableHead>
                {isVisible("region") && <TableHead className="min-w-[140px]">{t("trips.colRegion")}</TableHead>}
                {isVisible("services") && <TableHead className="min-w-[160px]">{t("trips.colServices")}</TableHead>}
                {isVisible("employee") && <TableHead className="min-w-[140px]">{t("trips.colEmployee")}</TableHead>}
                {isVisible("results") && <TableHead className="min-w-[200px]">{t("trips.colResults")}</TableHead>}
                {isVisible("nextStep") && <TableHead className="min-w-[180px]">{t("trips.colNextStep")}</TableHead>}
                {isVisible("status") && <TableHead className="w-28 text-center">{t("trips.colStatus")}</TableHead>}
                {isVisible("potential") && (
                  <TableHead className="w-32 text-right">{t("trips.colPotential")}</TableHead>
                )}
                <TableHead className="w-20 text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripsData.items.map((item, idx) => {
                const company =
                  item.company_name ||
                  (item.factories[0] ? item.factories[0].factory_name : item.title);
                const clientId = item.client_id || item.factories[0]?.client_id;
                const sequentialNumber = String(page * pageSize + idx + 1).padStart(3, "0");

                return (
                  <MotionTableRow key={item.id} {...rowEnter(idx)}>
                    {/* № */}
                    <TableCell className="w-14 text-center text-xs font-mono font-semibold text-muted-foreground">
                      {sequentialNumber}
                    </TableCell>

                    {/* Sana */}
                    <TableCellDate>{formatDate(item.start_date)}</TableCellDate>

                    {/* Format */}
                    {isVisible("format") && (
                      <TableCell className="w-32">{getFormatBadge(item.meeting_format)}</TableCell>
                    )}

                    {/* Kompaniya / Fabrika */}
                    {item.factories && item.factories.length > 1 ? (
                      <TableCell className="min-w-[200px]">
                        <div className="flex flex-col gap-1 py-0.5">
                          <span className="inline-flex items-center gap-1 w-fit rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">
                            <Building2Icon className="size-3" />
                            {item.factories.length} {t("trips.viewFactories").toLowerCase()}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.factories.map((f, fIdx) =>
                              f.client_id ? (
                                <Link
                                  key={f.id || fIdx}
                                  to={`/clients/${f.client_id}`}
                                  className="inline-flex items-center gap-1 rounded bg-muted/60 hover:bg-brand-500/15 hover:text-brand-600 px-1.5 py-0.5 text-xs font-medium text-foreground transition-colors"
                                >
                                  {f.factory_name}
                                </Link>
                              ) : (
                                <span
                                  key={f.id || fIdx}
                                  className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-xs text-foreground/90"
                                >
                                  {f.factory_name}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </TableCell>
                    ) : (
                      <TableCellCompany
                        to={clientId ? `/clients/${clientId}` : undefined}
                        name={company}
                      />
                    )}

                    {/* Region */}
                    {isVisible("region") && (
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.region}</p>
                          {item.country && item.country !== "O'zbekiston" ? (
                            <p className="truncate text-xs text-muted-foreground">{item.country}</p>
                          ) : null}
                        </div>
                      </TableCell>
                    )}

                    {/* Muhokama qilingan xizmatlar */}
                    {isVisible("services") && (
                      <TableCell className="max-w-[200px]">
                        {item.services_discussed ? (
                          <div className="flex flex-wrap gap-1">
                            {item.services_discussed.split(",").map((svc, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-block rounded bg-muted/60 px-1.5 py-0.5 text-xs text-foreground/90"
                              >
                                {svc.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <TableCellMuted>—</TableCellMuted>
                        )}
                      </TableCell>
                    )}

                    {/* Mas'ul ijrochi */}
                    {isVisible("employee") && (
                      <TableCell className="font-medium text-foreground">
                        {item.employee_name}
                      </TableCell>
                    )}

                    {/* Uchrashuv natijasi */}
                    {isVisible("results") && (
                      <TableCell className="max-w-[260px]">
                        <p className="line-clamp-2 text-xs leading-relaxed text-foreground/90">
                          {item.results || item.purpose || "—"}
                        </p>
                      </TableCell>
                    )}

                    {/* Keyingi qadam */}
                    {isVisible("nextStep") && (
                      <TableCell className="max-w-[220px]">
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {item.next_step || "—"}
                        </p>
                      </TableCell>
                    )}

                    {/* Holat */}
                    {isVisible("status") && (
                      <TableCell className="w-28 text-center">{getStatusBadge(item.status)}</TableCell>
                    )}

                    {/* Summa */}
                    {isVisible("potential") && (
                      <TableCell className="w-32 text-right">
                        {Number(item.deal_potential) > 0 ? (
                          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(item.deal_potential ?? 0)}
                          </span>
                        ) : (
                          <TableCellMuted>—</TableCellMuted>
                        )}
                      </TableCell>
                    )}

                    {/* Amallar */}
                    <TableCellActions>
                      <div className="action-toolbar">
                        <MotionButton
                          variant="ghost"
                          size="icon-sm"
                          className="size-8"
                          onClick={() => {
                            setEditingTrip(item);
                            setTripModalOpen(true);
                          }}
                          title={t("common.edit")}
                          {...motionTap}
                        >
                          <PencilIcon className="size-3.5" />
                        </MotionButton>
                        {isAdmin && (
                          <MotionButton
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteId(item.id)}
                            title={t("common.delete")}
                            {...motionTap}
                          >
                            <Trash2Icon className="size-3.5" />
                          </MotionButton>
                        )}
                      </div>
                    </TableCellActions>
                  </MotionTableRow>
                );
              })}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trips.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("trips.deleteDesc")}</AlertDialogDescription>
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

      {/* Create / Edit Modal */}
      <TripModal
        open={tripModalOpen}
        onClose={() => {
          setTripModalOpen(false);
          setEditingTrip(null);
        }}
        trip={editingTrip}
        onSaved={() => {
          loadTrips(true);
          loadStats();
        }}
        defaultYear={typeof selectedYear === "number" ? selectedYear : new Date().getFullYear()}
      />
    </PageShell>
  );
}
