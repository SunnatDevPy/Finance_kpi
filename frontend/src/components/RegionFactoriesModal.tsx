import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLinkIcon,
  MapPinIcon,
  PhoneIcon,
  PlaneIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react";
import { Modal } from "./Modal";
import { CompanyAvatar } from "./CompanyAvatar";
import {
  PremiumDataTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./PremiumDataTable";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import type { RegionFactoryItem } from "../types";
import { useI18n } from "../context/I18nContext";
import { formatAmount, formatDateShort } from "../utils/format";

interface RegionFactoriesModalProps {
  open: boolean;
  onClose: () => void;
  region: string;
  country?: string;
  factories: RegionFactoryItem[];
  tripsCount?: number;
}

export function RegionFactoriesModal({
  open,
  onClose,
  region,
  country,
  factories,
  tripsCount = 0,
}: RegionFactoriesModalProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return factories;
    const q = search.toLowerCase().trim();
    return factories.filter(
      (f) =>
        f.company_name.toLowerCase().includes(q) ||
        (f.activity_type && f.activity_type.toLowerCase().includes(q)) ||
        (f.contact_person && f.contact_person.toLowerCase().includes(q)) ||
        (f.phone && f.phone.includes(q)) ||
        f.visited_by.some((v) => v.toLowerCase().includes(q)),
    );
  }, [factories, search]);

  const modalTitle = country && country !== "O'zbekiston" ? `${region} (${country})` : region;

  return (
    <Modal title={modalTitle} open={open} onClose={onClose} extraWide>
      <div className="flex flex-col space-y-4">
        {/* Quick summary header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
              <MapPinIcon className="size-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {t("trips.regionModalNote")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("trips.regionFactoriesSubtitle")
                  .replace("{count}", String(factories.length))
                  .replace("{trips}", String(tripsCount))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold tabular-nums text-foreground shadow-2xs">
            <PlaneIcon className="size-3.5 text-brand-500" />
            <span>{tripsCount}</span>
            <span className="text-muted-foreground font-normal">{t("trips.tripsCountSuffix")}</span>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("trips.searchFactoriesPlaceholder")}
              className="h-8 pl-9 text-xs"
            />
          </div>

          <span className="text-xs text-muted-foreground">
            {t("common.itemsFound").replace("{count}", String(filtered.length))}
          </span>
        </div>

        {/* Content Table */}
        <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-border/60">
          <PremiumDataTable
            empty={filtered.length === 0}
            emptyMessage={t("trips.noFactoriesInRegion")}
            skeletonCols={5}
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("trips.factoryName")}</TableHead>
                <TableHead>{t("clients.activityType")}</TableHead>
                <TableHead>{t("clients.contact")}</TableHead>
                <TableHead className="text-right">{t("clients.contracts")}</TableHead>
                <TableHead className="text-right">{t("trips.safarlar2026")}</TableHead>
                <TableHead className="w-12 text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id} className="group hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={f.company_name} className="size-8 text-xs" />
                      <div className="min-w-0">
                        <Link
                          to={`/clients/${f.id}`}
                          onClick={onClose}
                          className="font-semibold text-foreground hover:text-brand-600 dark:hover:text-brand-400 hover:underline flex items-center gap-1.5 truncate"
                        >
                          <span className="truncate">{f.company_name}</span>
                          <ExternalLinkIcon className="size-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground" />
                        </Link>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {f.activity_type || "—"}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs">
                      {f.contact_person && (
                        <p className="font-medium text-foreground flex items-center gap-1">
                          <UserIcon className="size-3 text-muted-foreground" />
                          <span className="truncate">{f.contact_person}</span>
                        </p>
                      )}
                      {f.phone && (
                        <p className="text-muted-foreground font-mono text-[11px] flex items-center gap-1">
                          <PhoneIcon className="size-3 text-muted-foreground" />
                          <span>{f.phone}</span>
                        </p>
                      )}
                      {!f.contact_person && !f.phone && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    <div className="text-xs">
                      <span className="font-semibold text-foreground">{f.contracts_count} ta</span>
                      {Number(f.total_amount) > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {formatAmount(f.total_amount)}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5 text-xs">
                      {(f.trips_count ?? f.trips_count_2026 ?? 0) > 0 ? (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            <PlaneIcon className="size-3" />
                            {f.trips_count ?? f.trips_count_2026} marta
                          </span>
                          {f.visited_by.length > 0 && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[130px]" title={f.visited_by.join(", ")}>
                              {f.visited_by.join(", ")}
                            </span>
                          )}
                          {f.last_trip_date && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDateShort(f.last_trip_date)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Link
                      to={`/clients/${f.id}`}
                      onClick={onClose}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      title={t("clients.viewProfile")}
                    >
                      <ExternalLinkIcon className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </PremiumDataTable>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
