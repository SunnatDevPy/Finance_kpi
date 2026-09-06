import { useState, useEffect, useMemo } from "react";
import { Building2Icon, PlusIcon, VideoIcon, UsersIcon, XIcon } from "lucide-react";
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

export interface FactoryItem {
  factory_name: string;
  client_id?: number | null;
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
  "Brending",
  "Veb-sayt",
  "SMM",
  "Marketing",
  "SEO",
  "ERP / CRM",
  "Konsalting",
  "To'liq paket",
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
  const [dealPotential, setDealPotential] = useState("");
  const [status, setStatus] = useState<B2BMeetingStatus>("in_progress");
  const [results, setResults] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [purpose, setPurpose] = useState("");

  const [selectedFactories, setSelectedFactories] = useState<FactoryItem[]>([]);
  const [clientSearchValue, setClientSearchValue] = useState("");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const { submitting, guard } = useSubmitGuard();

  const regionOptions = useMemo(() => getRegionsForCountry(country), [country]);

  const clientOptions = useMemo(
    () =>
      [...clients]
        .sort((a, b) => a.company_name.localeCompare(b.company_name, "uz"))
        .map((client) => ({ value: String(client.id), label: client.company_name })),
    [clients],
  );

  const employeeOptions = useMemo(
    () =>
      users.map((item) => ({
        value: item.full_name,
        label: item.full_name,
      })),
    [users],
  );

  const addFactory = (client: Client) => {
    const nextCountry = client.country || country || DEFAULT_COUNTRY;
    setCountry(nextCountry);
    if (!region && client.city) {
      setRegion(resolveRegion(client.city, nextCountry));
    }
    setSelectedFactories((prev) => {
      if (
        prev.some(
          (f) =>
            f.client_id === client.id ||
            f.factory_name.toLowerCase() === client.company_name.toLowerCase(),
        )
      ) {
        return prev;
      }
      return [...prev, { factory_name: client.company_name, client_id: client.id }];
    });
    setClientSearchValue("");
  };

  const handleCreateAndAddClient = async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setError("");
    try {
      const created = await api.clients.create({
        company_name: cleanName,
        country,
        city: region || undefined,
        status: "faol",
      });
      setClients((prev) => [...prev, created]);
      addFactory(created);
      setIsQuickAddOpen(false);
      setQuickAddName("");
    } catch {
      setSelectedFactories((prev) => {
        if (prev.some((f) => f.factory_name.toLowerCase() === cleanName.toLowerCase())) {
          return prev;
        }
        return [...prev, { factory_name: cleanName, client_id: null }];
      });
      setIsQuickAddOpen(false);
      setQuickAddName("");
    }
  };

  const removeFactory = (indexToRemove: number) => {
    setSelectedFactories((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  useEffect(() => {
    if (!open) return;

    api.users.list().then(setUsers).catch(() => {});
    api.clients
      .list({ limit: 200 })
      .then((res) => setClients(res.items))
      .catch(() => {});

    if (trip) {
      const factories: FactoryItem[] = [];
      if (trip.factories && trip.factories.length > 0) {
        trip.factories.forEach((f) => {
          factories.push({
            factory_name: f.factory_name,
            client_id: f.client_id,
          });
        });
      } else if (trip.company_name) {
        const parts = trip.company_name.split(",").map((p) => p.trim()).filter(Boolean);
        parts.forEach((p) => {
          factories.push({
            factory_name: p,
            client_id: trip.client_id,
          });
        });
      }
      setSelectedFactories(factories);
      setMeetingFormat(trip.meeting_format === "zoom" ? "zoom" : "live");
      setCountry(trip.country || DEFAULT_COUNTRY);
      setRegion(trip.region);
      setTripDate(trip.start_date);
      setEmployeeName(trip.employee_name);
      setUserId(trip.user_id);
      setServicesDiscussed(trip.services_discussed || "");
      setDealPotential(trip.deal_potential ? String(Math.round(Number(trip.deal_potential))) : "");
      setStatus(trip.status || "in_progress");
      setResults(trip.results || "");
      setNextStep(trip.next_step || "");
      setPurpose(trip.purpose || "");
    } else {
      setSelectedFactories([]);
      setClientSearchValue("");
      setIsQuickAddOpen(false);
      setQuickAddName("");
      setMeetingFormat("live");
      setCountry(DEFAULT_COUNTRY);
      setRegion("");
      setTripDate(todayInYear(defaultYear || new Date().getFullYear()));
      setEmployeeName(user?.full_name || "");
      setUserId(user?.id ?? null);
      setServicesDiscussed("");
      setDealPotential("");
      setStatus("in_progress");
      setResults("");
      setNextStep("");
      setPurpose("");
    }
    setError("");
  }, [open, trip, defaultYear, user]);

  const handleClientSelect = (id: string) => {
    const matched = clients.find((c) => String(c.id) === id);
    if (!matched) return;
    addFactory(matched);
  };

  const handleEmployeeSelect = (name: string) => {
    setEmployeeName(name);
    const matched = users.find((item) => item.full_name === name || item.username === name);
    setUserId(matched ? matched.id : null);
  };

  const addServiceTag = (svc: string) => {
    const current = servicesDiscussed.trim();
    if (!current) {
      setServicesDiscussed(svc);
      return;
    }
    const tags = current.split(",").map((s) => s.trim().toLowerCase());
    if (!tags.includes(svc.toLowerCase())) {
      setServicesDiscussed(`${current}, ${svc}`);
    }
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFactories.length === 0) {
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

    const companyNames = selectedFactories.map((f) => f.factory_name.trim()).join(", ");
    const primaryFactory = selectedFactories[0];
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
      deal_potential: dealPotential ? Number(dealPotential) : 0,
      status,
      results: results.trim() || null,
      next_step: nextStep.trim() || null,
      purpose: purpose.trim() || null,
      factories: selectedFactories.map((f) => ({
        factory_name: f.factory_name.trim(),
        client_id: f.client_id || null,
        notes: results.trim() || null,
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
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

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
              <UsersIcon className="size-4" />
              {t("trips.formatLive")}
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
              <VideoIcon className="size-4" />
              {t("trips.formatZoom")}
            </button>
          </div>
        </div>

        {/* Company / Factories & Date */}
        <div className="space-y-2 rounded-xl border border-border/70 bg-card/40 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Building2Icon className="size-3.5 text-brand-600 dark:text-brand-400" />
              <span>{t("trips.colFactories")} *</span>
              {selectedFactories.length > 0 && (
                <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-bold text-brand-700 dark:text-brand-300">
                  {t("trips.selectedFactoriesCount").replace("{count}", String(selectedFactories.length))}
                </span>
              )}
            </label>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-md border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-500/20 dark:text-brand-300 transition-colors"
              title="Yangi fabrika qo'shish"
            >
              <PlusIcon className="size-3" />
              <span>{t("trips.quickAddFactory")}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <SearchableSelect
              id="trip-client"
              label={t("trips.client")}
              variant="floating"
              value={clientSearchValue}
              options={clientOptions.filter(
                (opt) => !selectedFactories.some((f) => String(f.client_id) === opt.value),
              )}
              placeholder={t("trips.addFactoryPlaceholder")}
              onValueChange={handleClientSelect}
              allowCreate
              onCreate={(name) => {
                void handleCreateAndAddClient(name);
              }}
              createLabel={(name) => t("trips.createClientOption").replace("{name}", name)}
            />
            <FloatingLabelDatePicker
              id="trip-date"
              label={t("trips.tripDate")}
              value={tripDate}
              onChange={setTripDate}
              required
            />
          </div>

          {/* Quick Add Inline Form */}
          {isQuickAddOpen && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/5 p-2.5">
              <input
                type="text"
                autoFocus
                placeholder="Yangi fabrika / korxona nomi..."
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateAndAddClient(quickAddName);
                  }
                }}
                className="h-8 flex-1 min-w-[180px] rounded-md border border-border bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <MotionButton
                type="button"
                size="sm"
                className="h-8 px-3 text-xs font-medium"
                disabled={!quickAddName.trim()}
                onClick={() => void handleCreateAndAddClient(quickAddName)}
                {...motionTap}
              >
                <PlusIcon className="mr-1 size-3.5" />
                Qo'shish
              </MotionButton>
              <MotionButton
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-xs text-muted-foreground"
                onClick={() => {
                  setIsQuickAddOpen(false);
                  setQuickAddName("");
                }}
                {...motionTap}
              >
                Bekor
              </MotionButton>
            </div>
          )}

          {/* Selected Factories Chips */}
          {selectedFactories.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {selectedFactories.map((f, idx) => (
                <span
                  key={`${f.factory_name}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-brand-700 dark:text-brand-300 shadow-sm"
                >
                  <Building2Icon className="size-3.5 opacity-70" />
                  <span>{f.factory_name}</span>
                  <button
                    type="button"
                    onClick={() => removeFactory(idx)}
                    className="rounded p-0.5 text-brand-600/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="O'chirish"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">
              Bir kunda bir nechta fabrikalarni tanlash mumkin (3-4 yoki undan ko'p).
            </p>
          )}
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
            {COMMON_SERVICES.map((svc) => (
              <button
                key={svc}
                type="button"
                onClick={() => addServiceTag(svc)}
                className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                + {svc}
              </button>
            ))}
          </div>
        </div>

        {/* Deal Potential & Status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FloatingLabelMoneyInput
            label={t("trips.dealPotential")}
            value={dealPotential}
            onValueChange={setDealPotential}
          />
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

        {/* Next Step */}
        <FloatingLabelTextarea
          id="trip-next-step"
          label={t("trips.nextStep")}
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          rows={2}
          placeholder=" "
        />

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
