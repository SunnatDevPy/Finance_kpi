import { useState, useEffect, useMemo, useCallback } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { GEO_COUNTRIES, getRegionsForCountry } from "../data/geoRegions";
import type { Paginated, Trip } from "../types";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useListLoading } from "../hooks/useListLoading";
import { formatDate } from "../utils/format";
import { CancelIcon, DeleteIconBtn, LoadingIconBtn } from "../components/ButtonIcons";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const TRIP_OPTIONAL_COLUMNS = [
  { id: "employee", labelKey: "trips.colEmployee", defaultVisible: true },
  { id: "purpose", labelKey: "trips.colPurpose", defaultVisible: true },
] as const;

type TripOptionalColumn = (typeof TRIP_OPTIONAL_COLUMNS)[number]["id"];

export function TripsPage() {
  const { t, locale } = useI18n();
  const { isAdmin } = useAuth();
  const { isVisible, setColumnVisible, visibleCount, items: columnPickerItems } =
    usePickerColumns("wtma.trips.tableColumns", TRIP_OPTIONAL_COLUMNS, t);

  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();

  const [tripsData, setTripsData] = useState<Paginated<Trip>>({
    items: [],
    total: 0,
    skip: 0,
    limit: 20,
  });

  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const loadTrips = useCallback(
    (silent = false) => {
      start(silent);
      setError("");
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
        .catch((e) => setError(e instanceof Error ? e.message : t("common.error")))
        .finally(() => finish());
    },
    [selectedYear, countryFilter, regionFilter, search, page, pageSize, start, finish, t],
  );

  useEffect(() => {
    loadTrips(false);
  }, [loadTrips]);

  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await api.trips.delete(deleteId);
      setDeleteId(null);
      loadTrips(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title={t("trips.pageTitle")} subtitle={t("trips.pageSubtitleAll")}>
        <MotionButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            api.trips.export("xlsx", {
              year: selectedYear === "all" ? undefined : selectedYear,
              country: countryFilter === "all" ? undefined : countryFilter,
              region: regionFilter === "all" ? undefined : regionFilter,
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
              country: countryFilter === "all" ? undefined : countryFilter,
              region: regionFilter === "all" ? undefined : regionFilter,
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

      <Card className="content-card">
        <CardHeader className="pb-3">
          <CardTitle>{t("trips.listTitle")}</CardTitle>
          <CardDescription>
            {tripsData.total} {t("trips.records")}
          </CardDescription>
        </CardHeader>
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
          <Select
            value={String(selectedYear)}
            onValueChange={(val) => {
              setSelectedYear(val === "all" ? "all" : Number(val));
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[140px]">
              <SelectValue placeholder={t("trips.allYearsFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("trips.allYearsFilter")}</SelectItem>
                {AVAILABLE_YEARS.map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>
                    {t("trips.yearLabel").replace("{year}", String(yr))}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={countryFilter}
            onValueChange={(val) => {
              setCountryFilter(val || "all");
              setRegionFilter("all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[160px]">
              <SelectValue placeholder={t("trips.allCountriesFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("trips.allCountriesFilter")}</SelectItem>
                {GEO_COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {locale === "ru" ? c.labelRu : c.labelUz}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={regionFilter}
            onValueChange={(val) => {
              setRegionFilter(val || "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-[200px]">
              <SelectValue placeholder={t("trips.allRegionsFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("trips.allRegionsFilter")}</SelectItem>
                {dynamicRegionsForCountry.map((reg) => (
                  <SelectItem key={reg.value} value={reg.value}>
                    {reg.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <TableColumnPicker
            columns={columnPickerItems}
            isVisible={(id: TripOptionalColumn) => isVisible(id)}
            onVisibleChange={setColumnVisible}
            className="sm:ml-auto"
          />
        </div>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && tripsData.items.length === 0}
            emptyMessage={t("trips.noTripsFound")}
            skeletonCols={5 + visibleCount}
            tableClassName="min-w-[860px]"
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
                <TableHead className="w-12 text-center">{t("trips.colIndex")}</TableHead>
                <TableHead className="min-w-[180px]">{t("trips.colFactories")}</TableHead>
                <TableHead className="w-32">{t("trips.colDate")}</TableHead>
                <TableHead className="min-w-[150px]">{t("trips.colRegion")}</TableHead>
                {isVisible("employee") && (
                  <TableHead className="min-w-[150px]">{t("trips.colEmployee")}</TableHead>
                )}
                {isVisible("purpose") && (
                  <TableHead className="min-w-[320px]">{t("trips.colPurpose")}</TableHead>
                )}
                <TableHead className="w-20 text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripsData.items.map((item, idx) => (
                <MotionTableRow key={item.id} {...rowEnter(idx)}>
                  <TableCell className="w-12 text-center text-xs font-medium tabular-nums text-muted-foreground">
                    {page * pageSize + idx + 1}
                  </TableCell>
                  {item.factories[0] ? (
                    <TableCellCompany
                      to={item.factories[0].client_id ? `/clients/${item.factories[0].client_id}` : undefined}
                      name={item.factories[0].factory_name}
                    />
                  ) : (
                    <TableCellMuted>—</TableCellMuted>
                  )}
                  <TableCellDate>{formatDate(item.start_date)}</TableCellDate>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{item.region}</p>
                      {item.country && item.country !== "O'zbekiston" ? (
                        <p className="truncate text-xs text-muted-foreground">{item.country}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  {isVisible("employee") && <TableCellMuted>{item.employee_name}</TableCellMuted>}
                  {isVisible("purpose") && (
                    <TableCell className="min-w-[320px] max-w-xl">
                      <div className="space-y-1 py-0.5 text-sm leading-relaxed text-foreground">
                        {item.purpose ? <p className="whitespace-pre-wrap break-words">{item.purpose}</p> : null}
                        {item.results ? (
                          <p className="whitespace-pre-wrap break-words text-muted-foreground">{item.results}</p>
                        ) : null}
                        {!item.purpose && !item.results ? (
                          <span className="text-muted-foreground">—</span>
                        ) : null}
                      </div>
                    </TableCell>
                  )}
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
              ))}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

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

      <TripModal
        open={tripModalOpen}
        onClose={() => {
          setTripModalOpen(false);
          setEditingTrip(null);
        }}
        trip={editingTrip}
        onSaved={() => loadTrips(true)}
        defaultYear={typeof selectedYear === "number" ? selectedYear : new Date().getFullYear()}
      />
    </PageShell>
  );
}
