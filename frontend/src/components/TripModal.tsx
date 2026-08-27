import { useState, useEffect, useMemo } from "react";
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
import type { Client, Trip, TripCreatePayload, User } from "../types";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
import { MotionButton, motionTap } from "@/components/ui/button";
import { FloatingLabelDatePicker } from "@/components/ui/date-picker";
import { FloatingLabelTextarea } from "@/components/ui/floating-label-input";

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

export function TripModal({
  open,
  onClose,
  trip,
  onSaved,
  defaultYear = new Date().getFullYear(),
}: TripModalProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [region, setRegion] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState("");
  const [results, setResults] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");

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

  const applyClient = (client: Client) => {
    const nextCountry = client.country || DEFAULT_COUNTRY;
    setClientId(String(client.id));
    setClientName(client.company_name);
    setCountry(nextCountry);
    setRegion(resolveRegion(client.city, nextCountry));
  };

  useEffect(() => {
    if (!open) return;

    api.users.list().then(setUsers).catch(() => {});
    api.clients
      .list({ limit: 200 })
      .then((res) => setClients(res.items))
      .catch(() => {});

    if (trip) {
      const first = trip.factories[0];
      setCountry(trip.country || DEFAULT_COUNTRY);
      setRegion(trip.region);
      setTripDate(trip.start_date);
      setEmployeeName(trip.employee_name);
      setUserId(trip.user_id);
      setPurpose(trip.purpose || "");
      setResults(trip.results || "");
      setClientId(first?.client_id ? String(first.client_id) : "");
      setClientName(first?.factory_name || "");
    } else {
      setCountry(DEFAULT_COUNTRY);
      setRegion("");
      setTripDate(todayInYear(defaultYear || new Date().getFullYear()));
      setEmployeeName(user?.full_name || "");
      setUserId(user?.id ?? null);
      setPurpose("");
      setResults("");
      setClientId("");
      setClientName("");
    }
    setError("");
  }, [open, trip, defaultYear, user]);

  useEffect(() => {
    if (clientId || !clientName) return;
    const match = clients.find(
      (c) => c.company_name.toLowerCase() === clientName.toLowerCase(),
    );
    if (match) setClientId(String(match.id));
  }, [clients, clientId, clientName]);

  const handleClientSelect = (id: string) => {
    const matched = clients.find((c) => String(c.id) === id);
    if (!matched) return;
    applyClient(matched);
  };

  const handleCreateClient = async (name: string) => {
    setError("");
    try {
      const created = await api.clients.create({
        company_name: name.trim(),
        country,
        city: region || undefined,
        status: "faol",
      });
      setClients((prev) => [...prev, created]);
      applyClient(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleEmployeeSelect = (name: string) => {
    setEmployeeName(name);
    const matched = users.find((item) => item.full_name === name || item.username === name);
    setUserId(matched ? matched.id : null);
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    const factoryName = clientName.trim();
    if (!factoryName) {
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

    const payload: TripCreatePayload = {
      title: `${region}: ${factoryName}`.slice(0, 255),
      region,
      country,
      start_date: tripDate,
      end_date: tripDate,
      employee_name: employeeName.trim(),
      user_id: userId,
      purpose: purpose.trim() || null,
      results: results.trim() || null,
      factories: [
        {
          factory_name: factoryName,
          client_id: clientId ? Number(clientId) : null,
        },
      ],
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11.5rem]">
          <SearchableSelect
            id="trip-client"
            label={t("trips.client")}
            required
            variant="floating"
            value={clientId}
            options={clientOptions}
            placeholder={t("contracts.selectClient")}
            onValueChange={handleClientSelect}
            allowCreate
            onCreate={(name) => {
              void handleCreateClient(name);
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

        <FloatingLabelTextarea
          id="trip-purpose"
          label={t("trips.purpose")}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          rows={2}
        />

        <FloatingLabelTextarea
          id="trip-results"
          label={t("trips.results")}
          value={results}
          onChange={(e) => setResults(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <MotionButton type="button" variant="outline" onClick={onClose} disabled={submitting} {...motionTap}>
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
