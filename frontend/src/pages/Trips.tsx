import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2Icon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  Columns3Icon,
  Edit2Icon,
  FileSpreadsheetIcon,
  FileTextIcon,
  GlobeIcon,
  LayersIcon,
  MapPinIcon,
  PlaneIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { PageHeader, PageShell } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StaggerContainer, StaggerItem } from "../components/Stagger";
import {
  PremiumDataTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  MotionTableRow,
  rowEnter,
} from "../components/PremiumDataTable";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Pagination } from "../components/Pagination";
import { TripModal } from "../components/TripModal";
import { RegionFactoriesModal } from "../components/RegionFactoriesModal";
import { api } from "../api/client";
import { GEO_COUNTRIES, getRegionsForCountry } from "../data/geoRegions";
import type {
  ClientRegionStatsItem,
  Paginated,
  RegionFactoryItem,
  RegionTripsSummary,
  Trip,
  TripStatsSummary,
} from "../types";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { formatDateShort } from "../utils/format";

const AVAILABLE_YEARS = [2030, 2029, 2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020] as const;

type ColumnKey = "date" | "region" | "factories" | "employee" | "purpose" | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  date: true,
  region: true,
  factories: true,
  employee: true,
  purpose: true,
  actions: true,
};

const STORAGE_KEY_COLUMNS = "wtma_trips_columns_visibility";

export function TripsPage() {
  const { t, locale } = useI18n();
  const { isAdmin } = useAuth();

  // Filters
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  const [activeTab, setActiveTab] = useState<"table" | "regions">("table");

  // Column Customizer state
  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLUMNS);
      if (saved) {
        return { ...DEFAULT_COLUMNS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_COLUMNS;
  });

  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnsMenuRef.current &&
        !columnsMenuRef.current.contains(event.target as Node)
      ) {
        setColumnsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (key: ColumnKey) => {
    setColumns((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(updated));
      return updated;
    });
  };

  const visibleColumnsCount = useMemo(
    () => Object.values(columns).filter(Boolean).length,
    [columns],
  );

  // Data states
  const [stats, setStats] = useState<TripStatsSummary | null>(null);
  const [tripsData, setTripsData] = useState<Paginated<Trip>>({
    items: [],
    total: 0,
    skip: 0,
    limit: 20,
  });
  const [regionSummaries, setRegionSummaries] = useState<RegionTripsSummary[]>([]);
  const [regionStats, setRegionStats] = useState<ClientRegionStatsItem[]>([]);

  // Modals
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [selectedRegionDetails, setSelectedRegionDetails] = useState<{
    region: string;
    country?: string;
    factories: RegionFactoryItem[];
    tripsCount: number;
  } | null>(null);

  const [deletingTripId, setDeletingTripId] = useState<number | null>(null);

  // Dynamic regions for selected country
  const dynamicRegionsForCountry = useMemo(() => {
    if (countryFilter === "all") {
      // Return all regions across all countries
      const list: { value: string; label: string }[] = [];
      GEO_COUNTRIES.forEach((c) => {
        const regs = getRegionsForCountry(c.value);
        regs.forEach((r) => {
          list.push({
            value: r.value,
            label: `${r.value} (${locale === "ru" ? c.labelRu : c.labelUz})`,
          });
        });
      });
      return list;
    }
    const regs = getRegionsForCountry(countryFilter);
    return regs.map((r) => ({
      value: r.value,
      label: locale === "ru" ? r.labelRu : r.labelUz,
    }));
  }, [countryFilter, locale]);

  // Load KPI Stats
  const loadStats = useCallback(() => {
    const yr = selectedYear === "all" ? undefined : selectedYear;
    const cntry = countryFilter === "all" ? undefined : countryFilter;
    api.trips
      .summary(yr, cntry)
      .then(setStats)
      .catch(() => {});
  }, [selectedYear, countryFilter]);

  // Load Trips List
  const loadTrips = useCallback(() => {
    api.trips
      .list({
        year: selectedYear === "all" ? undefined : selectedYear,
        country: countryFilter === "all" ? undefined : countryFilter,
        region: regionFilter === "all" ? undefined : regionFilter,
        search: search.trim() || undefined,
        skip: page * pageSize,
        limit: pageSize,
      })
      .then(setTripsData)
      .catch(() => {});
  }, [selectedYear, countryFilter, regionFilter, search, page, pageSize]);

  // Load Region Summaries & Dashboard region stats (for factories list)
  const loadRegionData = useCallback(() => {
    const yr = selectedYear === "all" ? null : selectedYear;
    const cntry = countryFilter === "all" ? null : countryFilter;
    api.trips
      .byRegion(yr, cntry)
      .then(setRegionSummaries)
      .catch(() => {});

    api.dashboardClientsByRegion()
      .then(setRegionStats)
      .catch(() => {});
  }, [selectedYear, countryFilter]);

  useEffect(() => {
    loadStats();
    loadTrips();
    loadRegionData();
  }, [loadStats, loadTrips, loadRegionData]);

  const handleDeleteTrip = async (id: number) => {
    if (!confirm(t("trips.confirmDelete"))) return;
    setDeletingTripId(id);
    try {
      await api.trips.delete(id);
      loadTrips();
      loadStats();
      loadRegionData();
    } catch {
      alert(t("common.error"));
    } finally {
      setDeletingTripId(null);
    }
  };

  const handleOpenRegionModal = (regionName: string, countryName?: string) => {
    const matchCountry = (countryName || "O'zbekiston").toLowerCase();
    const regStat =
      regionStats.find(
        (r) =>
          (r.country.toLowerCase().includes(matchCountry) ||
            matchCountry.includes(r.country.toLowerCase())) &&
          (r.city.toLowerCase().includes(regionName.toLowerCase()) ||
            regionName.toLowerCase().includes(r.city.toLowerCase())),
      ) ||
      regionStats.find(
        (r) =>
          r.city.toLowerCase().includes(regionName.toLowerCase()) ||
          regionName.toLowerCase().includes(r.city.toLowerCase()),
      );

    const summary = regionSummaries.find(
      (r) => r.region.toLowerCase() === regionName.toLowerCase(),
    );

    setSelectedRegionDetails({
      region: regionName,
      country: countryName || regStat?.country || "O'zbekiston",
      factories: regStat?.factories || [],
      tripsCount: summary?.trips_count || 0,
    });
  };

  const columnLabels: { key: ColumnKey; label: string }[] = [
    { key: "date", label: t("trips.colDate") },
    { key: "region", label: t("trips.colRegion") },
    { key: "factories", label: t("trips.colFactories") },
    { key: "employee", label: t("trips.colEmployee") },
    { key: "purpose", label: t("trips.colPurpose") },
    { key: "actions", label: t("trips.colActions") },
  ];

  return (
    <PageShell>
      {/* ── Top Page Header (Clean, only export & add actions) ── */}
      <PageHeader
        title={t("trips.pageTitle")}
        subtitle={
          selectedYear === "all"
            ? t("trips.pageSubtitleAll")
            : t("trips.pageSubtitle").replace("{year}", String(selectedYear))
        }
      >
        <div className="flex items-center gap-2">
          {/* Export Buttons */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 px-3 text-xs"
            onClick={() =>
              api.trips.export("xlsx", {
                year: selectedYear === "all" ? undefined : selectedYear,
                country: countryFilter === "all" ? undefined : countryFilter,
                region: regionFilter === "all" ? undefined : regionFilter,
              })
            }
          >
            <FileSpreadsheetIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Excel</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 px-3 text-xs"
            onClick={() =>
              api.trips.export("pdf", {
                year: selectedYear === "all" ? undefined : selectedYear,
                country: countryFilter === "all" ? undefined : countryFilter,
                region: regionFilter === "all" ? undefined : regionFilter,
              })
            }
          >
            <FileTextIcon className="size-3.5 text-red-500" />
            <span>PDF</span>
          </Button>

          {/* New Trip Button */}
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 px-3.5 text-xs shadow-md shadow-brand-500/20"
            onClick={() => {
              setEditingTrip(null);
              setTripModalOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
            <span>{t("trips.addTripButton")}</span>
          </Button>
        </div>
      </PageHeader>

      {/* ── KPI Stats Cards ── */}
      <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard
            title={
              selectedYear === "all"
                ? t("trips.kpi.totalTripsAll")
                : t("trips.kpi.totalTrips").replace("{year}", String(selectedYear))
            }
            value={String(stats?.total_trips ?? 0)}
            numericValue={stats?.total_trips ?? 0}
            icon={PlaneIcon}
            accent="blue"
            subtitle={t("trips.kpi.tripsCompleted")}
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title={t("trips.kpi.regionsVisited")}
            value={String(stats?.total_regions ?? 0)}
            numericValue={stats?.total_regions ?? 0}
            icon={MapPinIcon}
            accent="violet"
            subtitle={t("trips.kpi.regionsCoverage")}
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title={t("trips.kpi.factoriesVisited")}
            value={String(stats?.total_factories ?? 0)}
            numericValue={stats?.total_factories ?? 0}
            icon={Building2Icon}
            accent="green"
            subtitle={t("trips.kpi.factoriesTarget")}
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title={t("trips.kpi.activeEmployees")}
            value={String(stats?.total_employees ?? 0)}
            numericValue={stats?.total_employees ?? 0}
            icon={UserCheckIcon}
            accent="amber"
            subtitle={t("trips.kpi.teamEngagement")}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center justify-between pt-1">
        <div className="segmented-control w-fit">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "table" ? "default" : "ghost"}
            className="h-8 gap-2 px-3.5 text-xs font-semibold"
            onClick={() => setActiveTab("table")}
          >
            <LayersIcon className="size-3.5" />
            <span>
              {t("trips.tabs.allTrips")} ({tripsData.total})
            </span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "regions" ? "default" : "ghost"}
            className="h-8 gap-2 px-3.5 text-xs font-semibold"
            onClick={() => setActiveTab("regions")}
          >
            <GlobeIcon className="size-3.5" />
            <span>
              {t("trips.tabs.byRegion")} ({regionSummaries.length})
            </span>
          </Button>
        </div>
      </div>

      {/* ── Dedicated Filter Bar (Boshida Qidiruv, Yillar dropdown, Mamlakat & Viloyat, Ustunlar sozlash) ── */}
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-xs w-full">
        {/* 1. BOSHIDA: Qidiruv inputi (kengaytirilgan, flex-1 butun bo'sh joyni to'ldiradi) */}
        <div className="relative min-w-[240px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t("trips.searchFactoriesPlaceholder")}
            className="h-10 pl-9 pr-8 text-xs font-normal bg-background w-full"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(0);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        {/* 2. Yillar filtri Dropdown */}
        <div className="w-[145px] shrink-0">
          <Select
            value={String(selectedYear)}
            onValueChange={(val) => {
              setSelectedYear(val === "all" ? "all" : Number(val));
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 text-xs bg-background">
              <SelectValue placeholder={t("trips.allYearsFilter")} className="truncate" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all" className="truncate">{t("trips.allYearsFilter")}</SelectItem>
                {AVAILABLE_YEARS.map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>
                    {yr}-yil
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* 3. Mamlakat tanlash Dropdown */}
        <div className="w-[180px] shrink-0">
          <Select
            value={countryFilter}
            onValueChange={(val) => {
              setCountryFilter(val || "all");
              setRegionFilter("all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 text-xs bg-background">
              <SelectValue placeholder={t("trips.allCountriesFilter")} className="truncate" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all" className="truncate">{t("trips.allCountriesFilter")}</SelectItem>
                {GEO_COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="truncate">
                    {locale === "ru" ? c.labelRu : c.labelUz}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* 4. Viloyat / Shahar tanlash */}
        <div className="w-[245px] shrink-0 min-w-[220px]">
          <Select
            value={regionFilter}
            onValueChange={(val) => {
              setRegionFilter(val || "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 text-xs bg-background" title={regionFilter}>
              <SelectValue placeholder={t("trips.allRegionsFilter")} className="truncate max-w-[200px]" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all" className="truncate">{t("trips.allRegionsFilter")}</SelectItem>
                {dynamicRegionsForCountry.map((reg) => (
                  <SelectItem key={reg.value} value={reg.value} className="truncate" title={reg.label}>
                    {reg.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* 5. Ustun (Columns Visibility Customizer) */}
        <div className="relative shrink-0" ref={columnsMenuRef}>
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2 px-3.5 text-xs bg-background shrink-0"
            onClick={() => setColumnsMenuOpen((prev) => !prev)}
            title={t("trips.columnsCustomizer")}
          >
            <Columns3Icon className="size-4 text-muted-foreground" />
            <span>{t("trips.columns")}</span>
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </Button>

          <AnimatePresence>
            {columnsMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-border/80 bg-popover p-2 shadow-xl backdrop-blur-md"
              >
                <div className="px-2 py-1.5 text-xs font-semibold text-foreground border-b mb-1">
                  {t("trips.columnsCustomizer")}
                </div>
                <div className="space-y-1">
                  {columnLabels.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 cursor-pointer transition select-none"
                    >
                      <Checkbox
                        checked={columns[key]}
                        onCheckedChange={() => toggleColumn(key)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── TAB 1: ALL TRIPS TABLE (With dynamic column toggles) ── */}
      {activeTab === "table" && (
        <div className="space-y-4">
          <PremiumDataTable
            empty={tripsData.items.length === 0}
            emptyMessage={t("trips.noTripsFound")}
            skeletonCols={visibleColumnsCount}
          >
            <TableHeader>
              <TableRow>
                {columns.date && <TableHead>{t("trips.colDate")}</TableHead>}
                {columns.region && <TableHead>{t("trips.colRegion")}</TableHead>}
                {columns.factories && <TableHead>{t("trips.colFactories")}</TableHead>}
                {columns.employee && <TableHead>{t("trips.colEmployee")}</TableHead>}
                {columns.purpose && <TableHead>{t("trips.colPurpose")}</TableHead>}
                {columns.actions && (
                  <TableHead className="w-20 text-right">{t("trips.colActions")}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripsData.items.map((item, idx) => (
                <MotionTableRow key={item.id} {...rowEnter(idx)}>
                  {/* 1. Safar sanasi */}
                  {columns.date && (
                    <TableCell>
                      <div className="flex flex-col text-xs font-mono tabular-nums">
                        <span className="font-semibold text-foreground">
                          {formatDateShort(item.start_date)}
                        </span>
                        {item.start_date !== item.end_date && (
                          <span className="text-[11px] text-muted-foreground">
                            — {formatDateShort(item.end_date)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* 2. Viloyat & Mamlakat */}
                  {columns.region && (
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleOpenRegionModal(item.region, item.country)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 group"
                      >
                        <MapPinIcon className="size-3.5 text-brand-500 shrink-0" />
                        <span>{item.region}</span>
                        {item.country && item.country !== "O'zbekiston" && (
                          <span className="rounded bg-brand-500/15 px-1.5 py-0.2 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                            {item.country}
                          </span>
                        )}
                      </button>
                    </TableCell>
                  )}

                  {/* 3. Fabrikalar / Shahar */}
                  {columns.factories && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {item.factories.map((f, fIdx) => (
                          <span
                            key={fIdx}
                            className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground shadow-2xs"
                          >
                            <Building2Icon className="size-3 text-muted-foreground shrink-0" />
                            <span>{f.factory_name}</span>
                          </span>
                        ))}
                        {item.factories.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* 4. Mas'ul xodim */}
                  {columns.employee && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 shrink-0">
                          {item.employee_name.charAt(0)}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                          {item.employee_name}
                        </span>
                      </div>
                    </TableCell>
                  )}

                  {/* 5. Maqsad va Natija */}
                  {columns.purpose && (
                    <TableCell>
                      <div className="max-w-xs space-y-1 text-xs">
                        {item.purpose && (
                          <p className="line-clamp-2 text-foreground font-normal">
                            {item.purpose}
                          </p>
                        )}
                        {item.results && (
                          <p className="line-clamp-2 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle2Icon className="size-3 shrink-0" />
                            <span>{item.results}</span>
                          </p>
                        )}
                        {!item.purpose && !item.results && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* 6. Amallar */}
                  {columns.actions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => {
                            setEditingTrip(item);
                            setTripModalOpen(true);
                          }}
                          title={t("common.edit")}
                        >
                          <Edit2Icon className="size-3.5" />
                        </Button>

                        {isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                            onClick={() => handleDeleteTrip(item.id)}
                            disabled={deletingTripId === item.id}
                            title={t("common.delete")}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </MotionTableRow>
              ))}
            </TableBody>
          </PremiumDataTable>

          {/* Pagination */}
          {tripsData.total > pageSize && (
            <Pagination
              page={page + 1}
              pageSize={pageSize}
              total={tripsData.total}
              onPageChange={(p) => setPage(p - 1)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(0);
              }}
            />
          )}
        </div>
      )}

      {/* ── TAB 2: BY REGION BREAKDOWN CARDS ── */}
      {activeTab === "regions" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {regionSummaries.map((r, idx) => (
              <motion.div
                key={`${r.country}-${r.region}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition hover:border-brand-500/40 hover:shadow-md dark:bg-card/80"
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-3 border-b pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                        <MapPinIcon className="size-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{r.region}</h3>
                        <p className="text-[11px] text-muted-foreground">{r.country}</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-600 dark:text-brand-400 tabular-nums">
                      <PlaneIcon className="size-3" />
                      {r.trips_count} {t("trips.tripsCountSuffix")}
                    </span>
                  </div>

                  {/* Factories list in this region */}
                  <div className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Building2Icon className="size-3.5 text-muted-foreground" />
                        <span>{t("trips.factoriesVisited")}</span>
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
                        {r.factories.length} ta
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {r.factories.map((fname, fIdx) => (
                        <span
                          key={fIdx}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1 text-xs text-foreground"
                        >
                          <span className="size-1.5 rounded-full bg-brand-500" />
                          <span className="truncate max-w-[170px]">{fname}</span>
                        </span>
                      ))}
                      {r.factories.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                          {t("trips.noFactoriesInRegion")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visited Employees */}
                  {r.employees.length > 0 && (
                    <div className="border-t pt-3 space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <UsersIcon className="size-3 text-muted-foreground" />
                        <span>{t("trips.employeesWhoVisited")}:</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {r.employees.map((emp, eIdx) => (
                          <span
                            key={eIdx}
                            className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            {emp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Open modal button */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {r.last_trip_date && (
                      <>
                        {t("trips.lastVisit")}: {formatDateShort(r.last_trip_date)}
                      </>
                    )}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 group-hover:border-brand-500/50 group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:group-hover:text-brand-400"
                    onClick={() => handleOpenRegionModal(r.region, r.country)}
                  >
                    <span>{t("trips.viewAllFactories")}</span>
                    <ChevronRightIcon className="size-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}

            {regionSummaries.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                {t("trips.noTripsFound")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Trip Modal ── */}
      <TripModal
        open={tripModalOpen}
        onClose={() => {
          setTripModalOpen(false);
          setEditingTrip(null);
        }}
        trip={editingTrip}
        onSaved={() => {
          loadTrips();
          loadStats();
          loadRegionData();
        }}
        defaultYear={typeof selectedYear === "number" ? selectedYear : new Date().getFullYear()}
      />

      {/* ── Region Factories Details Modal (Statuslarsiz) ── */}
      {selectedRegionDetails && (
        <RegionFactoriesModal
          open={Boolean(selectedRegionDetails)}
          onClose={() => setSelectedRegionDetails(null)}
          region={selectedRegionDetails.region}
          country={selectedRegionDetails.country}
          factories={selectedRegionDetails.factories}
          tripsCount2026={selectedRegionDetails.tripsCount}
        />
      )}
    </PageShell>
  );
}
