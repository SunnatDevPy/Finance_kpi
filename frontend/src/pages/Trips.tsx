import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2Icon,
  CheckCircle2Icon,
  ChevronRightIcon,
  Edit2Icon,
  FileSpreadsheetIcon,
  FileTextIcon,
  GlobeIcon,
  LayersIcon,
  MapPinIcon,
  PlaneIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon,
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
import { Pagination } from "../components/Pagination";
import { TripModal } from "../components/TripModal";
import { RegionFactoriesModal } from "../components/RegionFactoriesModal";
import { api } from "../api/client";
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

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020] as const;

export function TripsPage() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();

  // Default filter: "all" (Barchasi)
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [activeTab, setActiveTab] = useState<"table" | "regions">("table");

  const [stats, setStats] = useState<TripStatsSummary | null>(null);

  const [tripsData, setTripsData] = useState<Paginated<Trip>>({
    items: [],
    total: 0,
    skip: 0,
    limit: 20,
  });

  const [regionSummaries, setRegionSummaries] = useState<RegionTripsSummary[]>([]);
  const [regionStats, setRegionStats] = useState<ClientRegionStatsItem[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

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

  // Load KPI Stats
  const loadStats = useCallback(() => {
    const yr = selectedYear === "all" ? undefined : selectedYear;
    api.trips
      .summary(yr)
      .then(setStats)
      .catch(() => {});
  }, [selectedYear]);

  // Load Trips List
  const loadTrips = useCallback(() => {
    api.trips
      .list({
        year: selectedYear === "all" ? undefined : selectedYear,
        region: regionFilter === "all" ? undefined : regionFilter,
        search: search.trim() || undefined,
        skip: page * pageSize,
        limit: pageSize,
      })
      .then(setTripsData)
      .catch(() => {});
  }, [selectedYear, regionFilter, search, page, pageSize]);

  // Load Region Summaries & Dashboard region stats (for factories list)
  const loadRegionData = useCallback(() => {
    api.trips
      .byRegion(selectedYear === "all" ? null : selectedYear)
      .then(setRegionSummaries)
      .catch(() => {});

    api.dashboardClientsByRegion()
      .then(setRegionStats)
      .catch(() => {});
  }, [selectedYear]);

  useEffect(() => {
    loadStats();
    loadTrips();
    loadRegionData();
  }, [loadStats, loadTrips, loadRegionData]);

  const uniqueRegions = useMemo(() => {
    const set = new Set<string>();
    tripsData.items.forEach((t) => {
      if (t.region) {
        set.add(t.country && t.country !== "O'zbekiston" ? `${t.region} (${t.country})` : t.region);
      }
    });
    regionSummaries.forEach((r) => {
      if (r.region) {
        set.add(r.country && r.country !== "O'zbekiston" ? `${r.region} (${r.country})` : r.region);
      }
    });
    return Array.from(set).sort();
  }, [tripsData.items, regionSummaries]);

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
    const regStat = regionStats.find(
      (r) =>
        (r.country.toLowerCase().includes(matchCountry) || matchCountry.includes(r.country.toLowerCase())) &&
        (r.city.toLowerCase().includes(regionName.toLowerCase()) ||
          regionName.toLowerCase().includes(r.city.toLowerCase())),
    ) || regionStats.find(
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

  return (
    <PageShell>
      {/* Top Page Header */}
      <PageHeader
        title={t("trips.pageTitle")}
        subtitle={
          selectedYear === "all"
            ? t("trips.pageSubtitleAll")
            : t("trips.pageSubtitle").replace("{year}", String(selectedYear))
        }
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Segmented Control (Default: Barchasi) */}
          <div className="segmented-control max-w-full overflow-x-auto">
            <Button
              type="button"
              size="sm"
              variant={selectedYear === "all" ? "default" : "ghost"}
              className="h-8 px-3 text-xs font-semibold"
              onClick={() => {
                setSelectedYear("all");
                setPage(0);
              }}
            >
              {t("common.all")}
            </Button>
            {AVAILABLE_YEARS.slice(0, 4).map((yr) => (
              <Button
                key={yr}
                type="button"
                size="sm"
                variant={selectedYear === yr ? "default" : "ghost"}
                className="h-8 px-3 text-xs font-semibold"
                onClick={() => {
                  setSelectedYear(yr);
                  setPage(0);
                }}
              >
                {yr}
              </Button>
            ))}
            {/* More years select */}
            <Select
              value={typeof selectedYear === "number" && selectedYear < 2023 ? String(selectedYear) : ""}
              onValueChange={(val) => {
                if (val) {
                  setSelectedYear(Number(val));
                  setPage(0);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs border-0 bg-transparent px-2 shadow-none focus:ring-0">
                <SelectValue placeholder={t("trips.otherYears")} />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_YEARS.slice(4).map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>
                    {yr}-yil
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={() =>
                api.trips.export("xlsx", {
                  year: selectedYear === "all" ? undefined : selectedYear,
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
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={() =>
                api.trips.export("pdf", {
                  year: selectedYear === "all" ? undefined : selectedYear,
                })
              }
            >
              <FileTextIcon className="size-3.5 text-red-500" />
              <span>PDF</span>
            </Button>
          </div>

          {/* New Trip Button */}
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 px-3.5 text-xs shadow-md shadow-brand-500/20"
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

      {/* KPI Stats Cards */}
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

      {/* View Switcher & Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 pt-2">
        {/* Tab switcher */}
        <div className="segmented-control w-fit">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "table" ? "default" : "ghost"}
            className="h-8 gap-2 px-3.5 text-xs font-semibold"
            onClick={() => setActiveTab("table")}
          >
            <LayersIcon className="size-3.5" />
            <span>{t("trips.tabs.allTrips")} ({tripsData.total})</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "regions" ? "default" : "ghost"}
            className="h-8 gap-2 px-3.5 text-xs font-semibold"
            onClick={() => setActiveTab("regions")}
          >
            <GlobeIcon className="size-3.5" />
            <span>{t("trips.tabs.byRegion")} ({regionSummaries.length})</span>
          </Button>
        </div>

        {/* Search & Region filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder={t("trips.searchPlaceholder")}
              className="h-8 pl-9 text-xs"
            />
          </div>

          <Select
            value={regionFilter}
            onValueChange={(val) => {
              setRegionFilter(val || "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 text-xs min-w-[160px]">
              <SelectValue placeholder={t("trips.allRegionsFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("trips.allRegionsFilter")}</SelectItem>
                {uniqueRegions.map((reg) => {
                  const rawVal = reg.split(" (")[0];
                  return (
                    <SelectItem key={reg} value={rawVal}>
                      {reg}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 size-8 p-0"
            onClick={() => {
              loadTrips();
              loadStats();
              loadRegionData();
            }}
            title={t("common.reload")}
          >
            <RefreshCwIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* TAB 1: ALL TRIPS TABLE */}
      {activeTab === "table" && (
        <div className="space-y-4">
          <PremiumDataTable
            empty={tripsData.items.length === 0}
            emptyMessage={t("trips.noTripsFound")}
            skeletonCols={6}
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("trips.tripDate")}</TableHead>
                <TableHead>{t("trips.region")}</TableHead>
                <TableHead>{t("trips.employee")}</TableHead>
                <TableHead>{t("trips.factoriesVisited")}</TableHead>
                <TableHead>{t("trips.purposeAndResults")}</TableHead>
                <TableHead className="w-20 text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripsData.items.map((item, idx) => (
                <MotionTableRow key={item.id} {...rowEnter(idx)}>
                  {/* Dates */}
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

                  {/* Region & Country */}
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

                  {/* Employee */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 shrink-0">
                        {item.employee_name.charAt(0)}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
                        {item.employee_name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Factories (visited factories list) */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {item.factories.map((f, fIdx) => (
                        <span
                          key={fIdx}
                          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground shadow-2xs"
                        >
                          <Building2Icon className="size-2.5 text-muted-foreground" />
                          <span>{f.factory_name}</span>
                        </span>
                      ))}
                      {item.factories.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Purpose & Results */}
                  <TableCell>
                    <div className="max-w-xs space-y-0.5 text-xs">
                      {item.purpose && (
                        <p className="line-clamp-1 text-foreground">{item.purpose}</p>
                      )}
                      {item.results && (
                        <p className="line-clamp-1 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1">
                          <CheckCircle2Icon className="size-3 shrink-0" />
                          <span>{item.results}</span>
                        </p>
                      )}
                      {!item.purpose && !item.results && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0"
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
                          className="size-7 p-0 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                          onClick={() => handleDeleteTrip(item.id)}
                          disabled={deletingTripId === item.id}
                          title={t("common.delete")}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
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

      {/* TAB 2: BY REGION BREAKDOWN */}
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

      {/* Trip Modal */}
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

      {/* Region Factories Details Modal */}
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
