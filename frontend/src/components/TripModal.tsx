import { useState, useEffect, useMemo } from "react";
import {
  Building2Icon,
  PlusIcon,
  VideoIcon,
  UsersIcon,
  XIcon,
  CircleDollarSignIcon,
} from "lucide-react";
import { Modal } from "./Modal";
import { SearchableSelect } from "./SearchableSelect";
import { CancelIcon, LoadingIconBtn, SaveIconBtn } from "./ButtonIcons";
import { FloatingLabelSearchSelect } from "./FloatingLabelSearchSelect";
import {
  DEFAULT_COUNTRY,
  getRegionsForCountry,
  type GeoOption,
} from "@/data/geoRegions";
import { api } from "../api/client";
import type {
  B2BMeetingFormat,
  B2BMeetingStatus,
  Client,
  Trip,
  TripCreatePayload,
  User,
} from "../types";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
import { MotionButton, motionTap } from "@/components/ui/button";
import { FloatingLabelDatePicker } from "@/components/ui/date-picker";
import {
  FloatingLabelInput,
  FloatingLabelMoneyInput,
  FloatingLabelTextarea,
} from "@/components/ui/floating-label-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "../utils/format";

export interface FactoryItem {
  factory_name: string;
  client_id?: number | null;
  notes?: string;
  deal_potential?: string;
}

interface TripModalProps {
  open: boolean;
  onClose: () => void;
  trip?: Trip | null;
  onSaved: () => void;
  defaultYear?: number;
}

function todayInYear(year: number) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveRegion(city: string | null | undefined, country: string): string {
  const raw = (city || "").trim();
  if (!raw) return "";
  const options: GeoOption[] = getRegionsForCountry(country);
  const query = raw.toLowerCase();
  const found = options.find((option) => {
    const value = option.value.toLowerCase();
    if (value === query) return true;
    if (value.includes(query) || query.includes(value)) return true;
    return Boolean(
      option.searchTerms?.some(
        (term) => query.includes(term.toLowerCase()) || term.toLowerCase().includes(query),
      ),
    );
  });
  return found?.value ?? raw;
}

const COMMON_SERVICES = [
  "Audit",
  "Bozor Tahlili",
  "Brendbuk",
  "Foto",
  "SMM",
  "Veb-sayt",
  "Veb-sayt tahriri",
  "Video",
];

export function TripModal({
  open,
  onClose,
  trip,
  onSaved,
  defaultYear = new Date().getFullYear(),
}: TripModalProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [meetingFormat, setMeetingFormat] = useState<B2BMeetingFormat>("live");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [region, setRegion] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [servicesDiscussed, setServicesDiscussed] = useState("");
  const [status, setStatus] = useState<B2BMeetingStatus>("in_progress");
  const [results, setResults] = useState("");
  const [purpose, setPurpose] = useState("");

  const [selectedFactories, setSelectedFactories] = useState<FactoryItem[]>([
    { factory_name: "", client_id: null, notes: "", deal_potential: "" },
  ]);

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const { submitting, guard } = useSubmitGuard();

  const regionOptions = useMemo(() => getRegionsForCountry(country), [country]);

  const clientOptions = useMemo(
    () =>
      [...clients]
        .sort((a, b) => a.company_name.localeCompare(b.company_name, "uz"))
        .map((client) => ({ value: client.company_name, label: client.company_name })),
    [clients],
  );

  const employeeOptions = useMemo(() => {
    const userOpts = users.map((item) => ({
      value: item.full_name,
      label: item.full_name,
    }));
    return [{ value: "Jamoa", label: "Jamoa" }, ...userOpts];
  }, [users]);

  const addFactoryRow = (client?: Client) => {
    setSelectedFactories((prev) => {
      const nextCountry = client?.country || country || DEFAULT_COUNTRY;
      if (client?.country) setCountry(nextCountry);
      if (client?.city && !region) {
        setRegion(resolveRegion(client.city, nextCountry));
      }
      return [
        ...prev,
        {
          factory_name: client ? client.company_name : "",
          client_id: client ? client.id : null,
          notes: "",
          deal_potential: "",
        },
      ];
    });
  };

  const updateFactoryRow = (index: number, patch: Partial<FactoryItem>) => {
    setSelectedFactories((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeFactoryRow = (indexToRemove: number) => {
    setSelectedFactories((prev) => {
      if (prev.length <= 1) {
        return [{ factory_name: "", client_id: null, notes: "", deal_potential: "" }];
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const totalPotential = useMemo(() => {
    return selectedFactories.reduce((sum, f) => {
      const val = Number(f.deal_potential) || 0;
      return sum + val;
    }, 0);
  }, [selectedFactories]);

  const validFactoriesCount = useMemo(() => {
    return selectedFactories.filter((f) => f.factory_name.trim()).length;
  }, [selectedFactories]);

  useEffect(() => {
    if (!open) return;

    api.users.list().then(setUsers).catch(() => {});
    api.clients
      .list({ limit: 200 })
      .then((res) => setClients(res.items))
      .catch(() => {});

    if (trip) {
      let factories: FactoryItem[] = [];
      if (trip.factories && trip.factories.length > 0) {
        factories = trip.factories.map((f) => ({
          factory_name: f.factory_name,
          client_id: f.client_id,
          deal_potential: f.deal_potential ? String(Math.round(Number(f.deal_potential))) : "",
          notes: f.notes || "",
        }));
      } else if (trip.company_name) {
        const parts = trip.company_name.split(",").map((p) => p.trim()).filter(Boolean);
        factories = parts.map((p, idx) => ({
          factory_name: p,
          client_id: idx === 0 ? trip.client_id : null,
          deal_potential: idx === 0 && trip.deal_potential ? String(Math.round(Number(trip.deal_potential))) : "",
          notes: idx === 0 ? (trip.results || "") : "",
        }));
      }
      if (factories.length === 0) {
        factories = [{ factory_name: "", client_id: null, deal_potential: "", notes: "" }];
      } else if (factories.length === 1 && !factories[0].deal_potential && trip.deal_potential) {
        factories[0].deal_potential = String(Math.round(Number(trip.deal_potential)));
      }
      setSelectedFactories(factories);
      setMeetingFormat(trip.meeting_format === "zoom" ? "zoom" : "live");
      setCountry(trip.country || DEFAULT_COUNTRY);
      setRegion(trip.region);
      setTripDate(trip.start_date);
      setEmployeeName(trip.employee_name);
      setUserId(trip.user_id);
      setServicesDiscussed(trip.services_discussed || "");
      setStatus(trip.status || "in_progress");
      setResults(trip.results || "");
      setPurpose(trip.purpose || "");
    } else {
      setSelectedFactories([{ factory_name: "", client_id: null, deal_potential: "", notes: "" }]);
      setMeetingFormat("live");
      setCountry(DEFAULT_COUNTRY);
      setRegion("");
      setTripDate(todayInYear(defaultYear || new Date().getFullYear()));
      setEmployeeName("Jamoa");
      setUserId(null);
      setServicesDiscussed("");
      setStatus("in_progress");
      setResults("");
      setPurpose("");
    }
    setError("");
  }, [open, trip, defaultYear, user]);

  const handleEmployeeSelect = (name: string) => {
    setEmployeeName(name);
    if (name === "Jamoa") {
      setUserId(null);
      return;
    }
    const matched = users.find((item) => item.full_name === name || item.username === name);
    setUserId(matched ? matched.id : null);
  };

  const toggleServiceTag = (svc: string) => {
    const currentList = servicesDiscussed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const index = currentList.findIndex((s) => s.toLowerCase() === svc.toLowerCase());
    if (index >= 0) {
      currentList.splice(index, 1);
      setServicesDiscussed(currentList.join(", "));
    } else {
      currentList.push(svc);
      setServicesDiscussed(currentList.join(", "));
    }
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    const validFactories = selectedFactories.filter((f) => f.factory_name.trim());
    if (validFactories.length === 0) {
      setError(t("trips.validation.clientRequired"));
      return;
    }
    if (!region) {
      setError(t("trips.validation.regionRequired"));
      return;
    }
    if (!employeeName.trim()) {
      setError(t("trips.validation.employeeRequired"));
      return;
    }
    if (!tripDate) {
      setError(t("trips.validation.datesRequired"));
      return;
    }

    const companyNames = validFactories.map((f) => f.factory_name.trim()).join(", ");
    const primaryFactory = validFactories[0];
    const formatTitle = meetingFormat === "zoom" ? "Zoom" : "Jonli uchrashuv";
    const payload: TripCreatePayload = {
      title: `${companyNames} (${formatTitle})`.slice(0, 255),
      meeting_format: meetingFormat,
      company_name: companyNames,
      client_id: primaryFactory?.client_id || null,
      region,
      country,
      start_date: tripDate,
      end_date: tripDate,
      employee_name: employeeName.trim(),
      user_id: userId,
      services_discussed: servicesDiscussed.trim() || null,
      deal_potential: totalPotential,
      status,
      results: results.trim() || null,
      purpose: purpose.trim() || null,
      factories: validFactories.map((f) => ({
        factory_name: f.factory_name.trim(),
        client_id: f.client_id || null,
        deal_potential: Number(f.deal_potential) || 0,
        notes: f.notes?.trim() || null,
      })),
    };

    try {
      if (trip) {
        await api.trips.update(trip.id, payload);
      } else {
        await api.trips.create(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  return (
    <Modal
      title={trip ? t("trips.editTrip") : t("trips.newTrip")}
      open={open}
      onClose={onClose}
      extraWide
      className="sm:max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Top bar: Format & Sana */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-center">
          {/* Format Selector: Zoom vs Jonli uchrashuv */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("trips.meetingFormat")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMeetingFormat("live")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  meetingFormat === "live"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <UsersIcon className="size-4 text-emerald-600" />
                <span>{t("trips.formatLive")}</span>
              </button>
              <button
                type="button"
                onClick={() => setMeetingFormat("zoom")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  meetingFormat === "zoom"
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:border-blue-500/40 dark:text-blue-300"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <VideoIcon className="size-4 text-blue-600" />
                <span>{t("trips.formatZoom")}</span>
              </button>
            </div>
          </div>

          {/* Sana (Trip Date) */}
          <div>
            <FloatingLabelDatePicker
              id="trip-date"
              label={t("trips.tripDate")}
              value={tripDate}
              onChange={setTripDate}
              required
            />
          </div>
        </div>

        {/* Region & Assignee */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FloatingLabelSearchSelect
            label={t("trips.region")}
            value={region}
            options={regionOptions}
            onValueChange={setRegion}
            required
          />
          <SearchableSelect
            id="trip-employee"
            label={t("trips.whoGoing")}
            required
            variant="floating"
            value={employeeName}
            options={employeeOptions}
            placeholder={t("trips.employeePlaceholder")}
            onValueChange={handleEmployeeSelect}
            allowCreate
            onCreate={handleEmployeeSelect}
            createLabel={(name) => t("common.createNamed").replace("{name}", name)}
          />
        </div>

        {/* Kompaniyalar ro'yxati (har biri alohida: Kompaniya + Kelishildi haqida + Summa + X) */}
        <div className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Building2Icon className="size-3.5 text-brand-600 dark:text-brand-400" />
              <span>{t("trips.colFactories")} *</span>
              {validFactoriesCount > 0 && (
                <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-bold text-brand-700 dark:text-brand-300">
                  {validFactoriesCount} ta kompaniya
                </span>
              )}
            </label>
            <MotionButton
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addFactoryRow()}
              className="h-8 gap-1.5 border-brand-500/30 bg-brand-500/10 text-xs font-medium text-brand-700 hover:bg-brand-500/20 dark:text-brand-300 transition-colors"
              {...motionTap}
            >
              <PlusIcon className="size-3.5" />
              <span>Kompaniya qo'shish</span>
            </MotionButton>
          </div>

          {/* List of company rows */}
          <div className="space-y-2.5">
            {selectedFactories.map((item, index) => {
              const rowOptions = item.factory_name &&
                !clientOptions.some((opt) => opt.value.toLowerCase() === item.factory_name.toLowerCase())
                ? [{ value: item.factory_name, label: item.factory_name }, ...clientOptions]
                : clientOptions;

              return (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2.5 rounded-xl border border-border/60 bg-background/95 p-3 shadow-xs sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_minmax(11rem,13rem)_auto] sm:items-center sm:gap-3"
                >
                  {/* Kompaniya / Fabrika */}
                  <div className="min-w-0">
                    <SearchableSelect
                      id={`trip-factory-${index}`}
                      label="Kompaniya / Fabrika"
                      required
                      variant="floating"
                      value={item.factory_name}
                      options={rowOptions}
                      placeholder="Tanlang yoki nom yozing..."
                      onValueChange={(companyName) => {
                        const matched = clients.find((c) => c.company_name === companyName);
                        updateFactoryRow(index, {
                          factory_name: companyName,
                          client_id: matched ? matched.id : null,
                        });
                        if (matched?.city && !region) {
                          setRegion(resolveRegion(matched.city, matched.country || country));
                        }
                        if (matched?.country && (!country || country === DEFAULT_COUNTRY)) {
                          setCountry(matched.country);
                        }
                      }}
                      allowCreate
                      onCreate={(typedName) => {
                        const trimmed = typedName.trim();
                        if (!trimmed) return;
                        const matched = clients.find(
                          (c) => c.company_name.toLowerCase() === trimmed.toLowerCase(),
                        );
                        updateFactoryRow(index, {
                          factory_name: trimmed,
                          client_id: matched ? matched.id : null,
                        });
                      }}
                      createLabel={(name) => `Yangi: "${name}"`}
                    />
                  </div>

                  {/* Kelishildi haqida */}
                  <div className="min-w-0">
                    <FloatingLabelInput
                      label="Kelishildi haqida"
                      value={item.notes || ""}
                      onChange={(e) => updateFactoryRow(index, { notes: e.target.value })}
                      placeholder=" "
                    />
                  </div>

                  {/* Summa */}
                  <div className="min-w-0">
                    <FloatingLabelMoneyInput
                      label="Summa (so'm)"
                      value={item.deal_potential || ""}
                      onValueChange={(val) => updateFactoryRow(index, { deal_potential: val })}
                      placeholder=" "
                    />
                  </div>

                  {/* O'chirish (X) */}
                  <div className="flex items-center justify-end sm:justify-center">
                    <MotionButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => removeFactoryRow(index)}
                      title="O'chirish"
                      {...motionTap}
                    >
                      <XIcon className="size-4" />
                    </MotionButton>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedFactories.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic pt-1">
              Kamida bitta kompaniya / fabrikani kiriting.
            </p>
          )}
        </div>

        {/* Services Discussed & Quick Suggestions */}
        <div className="space-y-1.5">
          <FloatingLabelInput
            label={t("trips.servicesDiscussed")}
            value={servicesDiscussed}
            onChange={(e) => setServicesDiscussed(e.target.value)}
            placeholder=" "
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-muted-foreground">Tavsiya:</span>
            {COMMON_SERVICES.map((svc) => {
              const isSelected = servicesDiscussed
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .includes(svc.toLowerCase());
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleServiceTag(svc)}
                  className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${
                    isSelected
                      ? "border-brand-500/50 bg-brand-500/15 font-medium text-brand-700 dark:text-brand-300"
                      : "border-border/60 bg-muted/40 text-foreground/80 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isSelected ? "✓ " : "+ "}{svc}
                </button>
              );
            })}
          </div>
        </div>

        {/* Holat & Uchrashuv natijalari */}
        <div className="space-y-3">
          <div className="relative pt-3">
            <Select
              value={status}
              onValueChange={(val) => setStatus(val as B2BMeetingStatus)}
            >
              <SelectTrigger className="h-12 w-full rounded-lg border-input bg-transparent text-sm">
                <SelectValue placeholder={t("trips.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">{t("trips.statusInProgress")}</SelectItem>
                <SelectItem value="negotiation">{t("trips.statusNegotiation")}</SelectItem>
                <SelectItem value="won">{t("trips.statusWon")}</SelectItem>
                <SelectItem value="cancelled">{t("trips.statusCancelled")}</SelectItem>
              </SelectContent>
            </Select>
            <label className="pointer-events-none absolute left-3 top-3 z-20 -translate-y-1/2 bg-background px-2 text-sm font-semibold leading-tight text-brand-700 dark:bg-card dark:text-brand-300">
              {t("trips.status")}
            </label>
          </div>

          {/* Meeting Outcome (Results) */}
          <FloatingLabelTextarea
            id="trip-results"
            label={t("trips.results")}
            value={results}
            onChange={(e) => setResults(e.target.value)}
            rows={2}
            placeholder=" "
          />
        </div>

        {/* Umumiy summa (Pastda avtomatik jamlanuvchi kartochka) */}
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <CircleDollarSignIcon className="size-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Umumiy summa
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatMoney(totalPotential)} <span className="text-sm font-medium text-muted-foreground">so'm</span>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground border border-border/50">
              <Building2Icon className="size-3.5 text-brand-600 dark:text-brand-400" />
              <span>{validFactoriesCount} ta kompaniya kiritildi</span>
            </span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Kompaniyalar summasi avtomatik jamlanadi
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <MotionButton
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            {...motionTap}
          >
            <CancelIcon />
            {t("common.cancel")}
          </MotionButton>
          <MotionButton type="submit" disabled={submitting} {...motionTap}>
            {submitting ? <LoadingIconBtn /> : <SaveIconBtn />}
            {submitting ? t("common.saving") : trip ? t("common.save") : t("trips.createTrip")}
          </MotionButton>
        </div>
      </form>
    </Modal>
  );
}
