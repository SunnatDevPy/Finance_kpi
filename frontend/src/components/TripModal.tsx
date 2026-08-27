import { useState, useEffect, useMemo } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Modal } from "./Modal";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { FloatingLabelSearchSelect } from "./FloatingLabelSearchSelect";
import {
  GEO_COUNTRIES,
  DEFAULT_COUNTRY,
  getRegionsForCountry,
} from "@/data/geoRegions";
import { api } from "../api/client";
import type { Client, Trip, TripCreatePayload, TripFactoryFormItem, User } from "../types";
import { useI18n } from "../context/I18nContext";
import { useSubmitGuard } from "../hooks/useSubmitGuard";

interface TripModalProps {
  open: boolean;
  onClose: () => void;
  trip?: Trip | null;
  onSaved: () => void;
  defaultYear?: number;
}

export function TripModal({
  open,
  onClose,
  trip,
  onSaved,
  defaultYear = 2026,
}: TripModalProps) {
  const { t, locale } = useI18n();
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [region, setRegion] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState("");
  const [results, setResults] = useState("");
  const [factories, setFactories] = useState<TripFactoryFormItem[]>([]);
  const [newFactoryInput, setNewFactoryInput] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const { submitting, guard } = useSubmitGuard();

  const regionOptions = useMemo(() => getRegionsForCountry(country), [country]);

  useEffect(() => {
    if (!open) return;

    // Load available users and clients
    api.users.list().then(setUsers).catch(() => {});
    api.clients.list({ limit: 200 }).then((res) => setClients(res.items)).catch(() => {});

    if (trip) {
      setTitle(trip.title);
      setCountry(trip.country || DEFAULT_COUNTRY);
      setRegion(trip.region);
      setStartDate(trip.start_date);
      setEndDate(trip.end_date);
      setEmployeeName(trip.employee_name);
      setUserId(trip.user_id);
      setPurpose(trip.purpose || "");
      setResults(trip.results || "");
      setFactories(
        trip.factories.map((f) => ({
          factory_name: f.factory_name,
          client_id: f.client_id,
          notes: f.notes,
        })),
      );
    } else {
      const today = new Date();
      const yr = defaultYear || today.getFullYear();
      const monthStr = String(today.getMonth() + 1).padStart(2, "0");
      const dayStr = String(today.getDate()).padStart(2, "0");
      const defaultDate = `${yr}-${monthStr}-${dayStr}`;

      setTitle("");
      setCountry(DEFAULT_COUNTRY);
      setRegion("");
      setStartDate(defaultDate);
      setEndDate(defaultDate);
      setEmployeeName("");
      setUserId(null);
      setPurpose("");
      setResults("");
      setFactories([]);
      setNewFactoryInput("");
    }
    setError("");
  }, [open, trip, defaultYear]);

  // Clients filtered by selected country / region for suggestions
  const suggestedClients = useMemo(() => {
    return clients.filter((c) => {
      const cCountry = (c.country || DEFAULT_COUNTRY).toLowerCase();
      const matchCountry = cCountry.includes(country.toLowerCase()) || country.toLowerCase().includes(cCountry);
      if (!matchCountry) return false;
      if (!region) return true;
      const regLower = region.toLowerCase();
      return (
        !c.city ||
        regLower.includes(c.city.toLowerCase()) ||
        c.city.toLowerCase().includes(regLower)
      );
    });
  }, [clients, country, region]);

  const handleAddFactory = (name: string, clientId?: number | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (factories.some((f) => f.factory_name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    setFactories((prev) => [
      ...prev,
      { factory_name: trimmed, client_id: clientId ?? null, notes: "" },
    ]);
    setNewFactoryInput("");
  };

  const handleRemoveFactory = (index: number) => {
    setFactories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFactoryNoteChange = (index: number, note: string) => {
    setFactories((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], notes: note };
      return next;
    });
  };

  const handleEmployeeSelect = (name: string) => {
    setEmployeeName(name);
    const matched = users.find((u) => u.full_name === name || u.username === name);
    setUserId(matched ? matched.id : null);
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!region) {
      setError(t("trips.validation.regionRequired"));
      return;
    }
    if (!startDate || !endDate) {
      setError(t("trips.validation.datesRequired"));
      return;
    }
    if (!employeeName.trim()) {
      setError(t("trips.validation.employeeRequired"));
      return;
    }
    if (factories.length === 0) {
      setError(t("trips.validation.factoriesRequired"));
      return;
    }

    const finalTitle =
      title.trim() ||
      `${country !== DEFAULT_COUNTRY ? `${country}, ` : ""}${region} safari (${factories.length} ta fabrika)`;

    const payload: TripCreatePayload = {
      title: finalTitle,
      region,
      country,
      start_date: startDate,
      end_date: endDate,
      employee_name: employeeName.trim(),
      user_id: userId,
      purpose: purpose.trim() || null,
      results: results.trim() || null,
      factories: factories.map((f) => ({
        factory_name: f.factory_name,
        client_id: f.client_id,
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
      wide
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="trip-title" className="text-xs font-medium">
            {t("trips.titleLabel")} <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
          </Label>
          <Input
            id="trip-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("trips.titlePlaceholder")}
          />
        </div>

        {/* Country & Region & Employee */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("clients.country")} *</Label>
            <Select
              value={country}
              onValueChange={(val) => {
                setCountry(val);
                setRegion("");
              }}
            >
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder={t("clients.country")} />
              </SelectTrigger>
              <SelectContent>
                {GEO_COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {locale === "ru" ? c.labelRu : c.labelUz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("trips.region")} *</Label>
            <FloatingLabelSearchSelect
              label={t("trips.region")}
              value={region}
              options={regionOptions}
              onValueChange={setRegion}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-employee" className="text-xs font-medium">
              {t("trips.employee")} *
            </Label>
            <div className="flex gap-2">
              <Input
                id="trip-employee"
                value={employeeName}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                placeholder={t("trips.employeePlaceholder")}
                list="employee-suggestions"
              />
              <datalist id="employee-suggestions">
                {users.map((u) => (
                  <option key={u.id} value={u.full_name}>
                    {u.role === "admin" ? "Admin" : "Menejer"} ({u.username})
                  </option>
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trip-start-date" className="text-xs font-medium">
              {t("trips.startDate")} *
            </Label>
            <Input
              id="trip-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-end-date" className="text-xs font-medium">
              {t("trips.endDate")} *
            </Label>
            <Input
              id="trip-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Visited Factories */}
        <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold text-foreground">
                {t("trips.factoriesVisited")} * ({factories.length} ta)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {t("trips.factoriesVisitedDesc")}
              </p>
            </div>
          </div>

          {/* Quick suggestion pills if country/region is selected */}
          {suggestedClients.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground font-medium">
                {t("trips.suggestedInRegion")}:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {suggestedClients.map((c) => {
                  const alreadyAdded = factories.some(
                    (f) => f.factory_name.toLowerCase() === c.company_name.toLowerCase(),
                  );
                  if (alreadyAdded) return null;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleAddFactory(c.company_name, c.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground transition hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      <PlusIcon className="size-3 text-brand-500" />
                      <span>{c.company_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add factory input */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Input
                value={newFactoryInput}
                onChange={(e) => setNewFactoryInput(e.target.value)}
                placeholder={t("trips.addFactoryPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddFactory(newFactoryInput);
                  }
                }}
                list="all-client-suggestions"
              />
              <datalist id="all-client-suggestions">
                {clients.map((c) => (
                  <option key={c.id} value={c.company_name}>
                    {c.country ? `${c.country}, ` : ""}{c.city ? `${c.city} — ` : ""}{c.activity_type || ""}
                  </option>
                ))}
              </datalist>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddFactory(newFactoryInput)}
              disabled={!newFactoryInput.trim()}
            >
              <PlusIcon className="size-4 mr-1.5" />
              {t("common.add")}
            </Button>
          </div>

          {/* List of added factories */}
          {factories.length > 0 && (
            <div className="space-y-2 pt-2">
              {factories.map((f, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-background p-3 shadow-sm sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-600 dark:text-brand-400">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-foreground truncate">
                      {f.factory_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={f.notes || ""}
                      onChange={(e) => handleFactoryNoteChange(idx, e.target.value)}
                      placeholder={t("trips.factoryNotePlaceholder")}
                      className="h-8 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFactory(idx)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600"
                      title={t("common.delete")}
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purpose & Results */}
        <div className="space-y-1.5">
          <Label htmlFor="trip-purpose" className="text-xs font-medium">
            {t("trips.purpose")}
          </Label>
          <Textarea
            id="trip-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder={t("trips.purposePlaceholder")}
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trip-results" className="text-xs font-medium">
            {t("trips.results")}
          </Label>
          <Textarea
            id="trip-results"
            value={results}
            onChange={(e) => setResults(e.target.value)}
            placeholder={t("trips.resultsPlaceholder")}
            rows={2}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("common.saving") : trip ? t("common.save") : t("trips.createTrip")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
