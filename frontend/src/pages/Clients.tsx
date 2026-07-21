import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangleIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileTextIcon,
  FileUpIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { api } from "../api/client";
import { AutofillHoneypots } from "../components/AutofillHoneypots";
import { ClientLogoUploader } from "../components/ClientLogoUploader";
import {
  ContractFormFields,
  emptyContractForm,
  type ContractFormState,
} from "../components/ContractFormFields";
import { CountryCityFields } from "../components/CountryCityFields";
import { ExportButtons } from "../components/ExportButtons";
import { CancelIcon, DeleteIconBtn, LoadingIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { Modal } from "../components/Modal";
import { QuickPaymentModal, type QuickPaymentTarget } from "../components/QuickPaymentModal";
import { PageError } from "../components/PageError";
import { Pagination } from "../components/Pagination";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
  TableCellActions,
  TableCellCompany,
  TableCellMuted,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
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
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelInput, FloatingLabelPhoneInput, FloatingLabelTextarea } from "@/components/ui/floating-label-input";
import { parsePhoneNational, toPhoneE164 } from "@/hooks/usePhoneInput";
import { resolveCountryValue, resolveRegionValue } from "@/data/geoRegions";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Client, ClientFormData, ClientImportResult, ClientDebtFilter, ServiceType } from "../types";
import { useI18n } from "../context/I18nContext";
import { emptyClientForm, formatAmount, toNumber } from "../utils/format";
import { PageHeader, PageShell } from "../components/PageHeader";
import { ActiveStatusToggle } from "../components/ActiveStatusToggle";
import { TableColumnPicker } from "../components/TableColumnPicker";
import { useTableColumns } from "../hooks/useTableColumns";
import { useListLoading } from "../hooks/useListLoading";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
import { usePersistedState } from "../hooks/usePersistedState";

const CLIENT_OPTIONAL_COLUMNS = [
  { id: "contact", defaultVisible: true },
  { id: "phone", defaultVisible: true },
  { id: "city", defaultVisible: true },
  { id: "debt", defaultVisible: true },
  { id: "state", defaultVisible: true },
] as const;

type ClientOptionalColumn = (typeof CLIENT_OPTIONAL_COLUMNS)[number]["id"];

export function ClientsPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { isVisible, setColumnVisible, visibleCount } = useTableColumns(
    "wtma.clients.tableColumns",
    CLIENT_OPTIONAL_COLUMNS,
  );
  const columnPickerItems = useMemo(
    () =>
      CLIENT_OPTIONAL_COLUMNS.map((column) => ({
        id: column.id,
        label:
          column.id === "contact"
            ? t("clients.contact")
            : column.id === "phone"
              ? t("clients.phone")
              : column.id === "city"
                ? t("clients.city")
                : column.id === "debt"
                  ? t("clients.financeSummary")
                  : t("clients.state"),
      })),
    [t],
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [debtFilter, setDebtFilter] = usePersistedState<ClientDebtFilter>(
    "wtma.clients.debtFilter",
    "all",
  );
  const [cities, setCities] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyClientForm());
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { loading, start, finish } = useListLoading();
  const { submitting, guard } = useSubmitGuard();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<ClientImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addContract, setAddContract] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [contractForm, setContractForm] = useState<ContractFormState>(() =>
    emptyContractForm([]),
  );
  const [paymentTarget, setPaymentTarget] = useState<QuickPaymentTarget | null>(null);

  const closeClientModal = () => {
    setModalOpen(false);
    setAddContract(false);
  };

  const loadServiceTypes = useCallback(() => {
    api.serviceTypes
      .list(true)
      .then((types) => {
        setServiceTypes(types);
        setContractForm(emptyContractForm(types));
      })
      .catch(() => {
        setServiceTypes([]);
        setContractForm(emptyContractForm([]));
      });
  }, []);

  const refreshCities = useCallback(() => {
    api.clients
      .cities()
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  const load = useCallback(
    (silent = true) => {
      start(silent);
      api.clients
        .list({
          search: search || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          city: cityFilter === "all" ? undefined : cityFilter,
          debtFilter: debtFilter === "all" ? undefined : debtFilter,
          skip: (page - 1) * pageSize,
          limit: pageSize,
        })
        .then((data) => {
          setClients(data.items);
          setTotal(data.total);
        })
        .catch((e) => setError(e.message))
        .finally(() => finish());
    },
    [search, statusFilter, cityFilter, debtFilter, page, pageSize, start, finish],
  );

  useEffect(() => {
    refreshCities();
  }, [refreshCities]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, cityFilter, debtFilter]);

  useEffect(() => {
    if (searchParams.get("debtors") === "1") {
      setDebtFilter("debtors");
    }
  }, [searchParams, setDebtFilter]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyClientForm());
    setAddContract(false);
    loadServiceTypes();
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setAddContract(false);
    setForm({
      company_name: client.company_name,
      contact_person: client.contact_person || "",
      phone: parsePhoneNational(client.phone || ""),
      website: client.website || "",
      country: resolveCountryValue(client.country || ""),
      city: resolveRegionValue(
        resolveCountryValue(client.country || ""),
        client.city || "",
      ),
      activity_type: client.activity_type || "",
      status: client.status,
      notes: client.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        contact_person: form.contact_person || undefined,
        phone: form.phone ? toPhoneE164(form.phone) : undefined,
        website: form.website || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        activity_type: form.activity_type || undefined,
        notes: form.notes || undefined,
      };
      if (editing) {
        const updated = await api.clients.update(editing.id, payload);
        setClients((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        if (addContract) {
          if (!contractForm.start_date || !contractForm.end_date) {
            setError(t("clients.selectDateError"));
            return;
          }
          if (contractForm.line_items.some((item) => !item.price)) {
            setError(t("common.error"));
            return;
          }
        }

        const created = await api.clients.create(payload);

        if (addContract) {
          const nextData = await api.contracts.nextNumber(created.id);
          await api.contracts.create({
            client_id: created.id,
            start_date: contractForm.start_date,
            end_date: contractForm.end_date,
            status: contractForm.status,
            notes: contractForm.notes || undefined,
            contract_number: contractForm.contract_number || nextData.next_number,
            invoice_number: contractForm.invoice_number || undefined,
            line_items: contractForm.line_items.map((item) => ({
              service_type_id: item.service_type_id,
              price: parseFloat(item.price),
            })),
          });
        }

        load(true);
        refreshCities();
      }
      closeClientModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  const updateContractForm = (patch: Partial<ContractFormState>) => {
    setContractForm((prev) => ({ ...prev, ...patch }));
  };

  const addContractLineItem = () => {
    setContractForm((prev) => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        { service_type_id: serviceTypes[0]?.id || 0, price: "" },
      ],
    }));
  };

  const removeContractLineItem = (index: number) => {
    setContractForm((prev) => {
      if (prev.line_items.length <= 1) return prev;
      return {
        ...prev,
        line_items: prev.line_items.filter((_, i) => i !== index),
      };
    });
  };

  const updateClientStatus = async (client: Client, active: boolean) => {
    const nextStatus = active ? "faol" : "nofaol";
    if (client.status === nextStatus) return;
    const snapshot = clients;
    setError("");
    setClients((prev) =>
      prev.map((row) => (row.id === client.id ? { ...row, status: nextStatus } : row)),
    );
    try {
      await api.clients.update(client.id, { status: nextStatus });
    } catch (err) {
      setClients(snapshot);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    const snapshot = clients;
    setClients((prev) => prev.filter((c) => c.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    setDeleteId(null);
    try {
      await api.clients.delete(id);
    } catch (err) {
      setClients(snapshot);
      setTotal((prev) => prev + 1);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setImportError("");
    setImportModalOpen(true);
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
    setImportError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    api.clients.downloadImportTemplate().catch((err) => {
      setImportError(err instanceof Error ? err.message : t("common.error"));
    });
  };

  const handleImportUpload = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportError("");
    try {
      const result = await api.clients.import(importFile);
      setImportResult(result);
      if (result.created > 0) {
        load();
        refreshCities();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title={t("clients.title")} subtitle={t("clients.subtitle")}>
        <ExportButtons resource="clients" />
        <MotionButton variant="outline" onClick={openImportModal} {...motionTap}>
          <FileUpIcon data-icon="inline-start" />
          {t("clients.importFromExcel")}
        </MotionButton>
        <MotionButton onClick={openCreate} {...motionTap}>
          <PlusIcon data-icon="inline-start" />
          {t("clients.new")}
        </MotionButton>
      </PageHeader>

      <PageError message={error} />

      <Card className="content-card">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>{t("clients.listTitle")}</CardTitle>
              <CardDescription>
                {t("common.itemsFound").replace("{count}", String(total))}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="table-card-toolbar">
          <Input
            className="w-full min-w-[12rem] flex-1 sm:max-w-xs"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={cityFilter}
            onValueChange={(v) => v && setCityFilter(v)}
            className="w-full sm:w-52"
          >
            <SelectTrigger>
              <SelectValue placeholder={t("clients.city")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("clients.allCities")}</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v)}
            className="w-full sm:w-48"
          >
            <SelectTrigger>
              <SelectValue placeholder={t("clients.state")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("clients.allStatus")}</SelectItem>
                <SelectItem value="faol">{t("status.faol")}</SelectItem>
                <SelectItem value="nofaol">{t("status.nofaol")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={debtFilter}
            onValueChange={(v) => v && setDebtFilter(v as ClientDebtFilter)}
            className="w-full sm:w-52"
          >
            <SelectTrigger>
              <SelectValue placeholder={t("clients.debtFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("clients.allDebt")}</SelectItem>
                <SelectItem value="debtors">{t("clients.onlyDebtors")}</SelectItem>
                <SelectItem value="no_debt">{t("clients.noDebt")}</SelectItem>
                <SelectItem value="overpaid">{t("clients.debtOverpaid")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <TableColumnPicker
            columns={columnPickerItems}
            isVisible={(id: ClientOptionalColumn) => isVisible(id)}
            onVisibleChange={setColumnVisible}
            className="sm:ml-auto"
          />
        </div>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && clients.length === 0}
            emptyMessage={t("clients.notFound")}
            skeletonCols={2 + visibleCount}
            footer={
              <Pagination
                embedded
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("clients.company")}</TableHead>
                {isVisible("contact") && <TableHead>{t("clients.contact")}</TableHead>}
                {isVisible("phone") && <TableHead>{t("clients.phone")}</TableHead>}
                {isVisible("city") && <TableHead>{t("clients.city")}</TableHead>}
                {isVisible("debt") && <TableHead>{t("common.debt")}</TableHead>}
                {isVisible("state") && (
                  <TableHead className="w-[8.75rem]">{t("clients.state")}</TableHead>
                )}
                <TableHead className="w-[7.5rem] text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, index) => (
                <MotionTableRow key={client.id} {...rowEnter(index)}>
                  <TableCellCompany
                    to={`/clients/${client.id}`}
                    name={client.company_name}
                    logoUrl={client.logo_url}
                  />
                  {isVisible("contact") && (
                    <TableCellMuted>{client.contact_person}</TableCellMuted>
                  )}
                  {isVisible("phone") && <TableCellMuted>{client.phone}</TableCellMuted>}
                  {isVisible("city") && <TableCellMuted>{client.city}</TableCellMuted>}
                  {isVisible("debt") && (
                    <TableCell>
                      {(() => {
                        const debt = toNumber(client.total_debt);
                        return (
                          <div className="flex min-w-[10.5rem] flex-col gap-0.5 text-xs">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-muted-foreground">{t("clients.totalAmount")}</span>
                              <span className="font-medium tabular-nums">{formatAmount(client.total_amount)}</span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-muted-foreground">{t("clients.received")}</span>
                              <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                                {formatAmount(client.total_paid)}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-muted-foreground">
                                {debt < 0 ? t("clients.overpaid") : t("clients.debtShort")}
                              </span>
                              <span
                                className={cn(
                                  "font-medium tabular-nums",
                                  debt < 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : debt > 0
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-foreground",
                                )}
                              >
                                {debt === 0 ? "—" : formatAmount(Math.abs(debt))}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                  )}
                  {isVisible("state") && (
                    <TableCell className="w-[8.75rem]">
                      <ActiveStatusToggle
                        active={client.status === "faol"}
                        onActiveChange={(active) => void updateClientStatus(client, active)}
                      />
                    </TableCell>
                  )}
                  <TableCellActions className="w-[7.5rem]">
                    <div className="action-toolbar">
                      {toNumber(client.total_debt) > 0 && (
                        <MotionButton
                          variant="ghost"
                          size="icon-sm"
                          className="size-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                          onClick={() => setPaymentTarget({ kind: "client", clientId: client.id })}
                          title={t("clients.payment")}
                          {...motionTap}
                        >
                          <BanknoteIcon className="size-3.5" />
                        </MotionButton>
                      )}
                      <MotionButton
                        variant="ghost"
                        size="icon-sm"
                        className="size-8"
                        onClick={() => openEdit(client)}
                        title={t("common.edit")}
                        {...motionTap}
                      >
                        <PencilIcon className="size-3.5" />
                      </MotionButton>
                      <MotionButton
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteId(client.id)}
                        title={t("common.delete")}
                        {...motionTap}
                      >
                        <Trash2Icon className="size-3.5" />
                      </MotionButton>
                    </div>
                  </TableCellActions>
                </MotionTableRow>
              ))}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

      <Modal
        title={editing ? t("clients.edit") : t("clients.new")}
        open={modalOpen}
        onClose={closeClientModal}
        wide
      >
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="relative grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <AutofillHoneypots />
          {editing && (
            <div className="md:col-span-2">
              <ClientLogoUploader
                client={editing}
                onUpdated={(updated) => {
                  setEditing(updated);
                  setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                }}
              />
            </div>
          )}
          <FloatingLabelInput
            id="company_name"
            label={t("clients.company")}
            required
            containerClassName="md:col-span-2"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          />
          <FloatingLabelInput
            guardAutofill
            name="wtma_client_contact"
            label={t("clients.contact")}
            value={form.contact_person}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
          />
          <FloatingLabelPhoneInput
            id="phone"
            label={t("clients.phone")}
            value={form.phone}
            onValueChange={(phone) => setForm({ ...form, phone })}
          />
          <FloatingLabelInput
            id="website"
            label={t("clients.website")}
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
          <FloatingLabelInput
            id="activity_type"
            label={t("clients.activity")}
            value={form.activity_type}
            onChange={(e) => setForm({ ...form, activity_type: e.target.value })}
          />
          <CountryCityFields
            country={form.country}
            city={form.city}
            onCountryChange={(country) =>
              setForm((prev) => ({ ...prev, country }))
            }
            onCityChange={(city) => setForm((prev) => ({ ...prev, city }))}
          />
          {editing && (
            <ActiveStatusToggle
              layout="field"
              label={t("clients.state")}
              active={form.status === "faol"}
              onActiveChange={(active) =>
                setForm({ ...form, status: active ? "faol" : "nofaol" })
              }
            />
          )}
          <FloatingLabelTextarea
            id="notes"
            label={t("clients.notes")}
            rows={3}
            containerClassName="md:col-span-2"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          {!editing && (
            <div className="flex flex-col gap-3 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {addContract ? t("clients.contractSection") : t("clients.addContract")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("clients.addContractHint")}
                  </p>
                </div>
                <MotionButton
                  type="button"
                  variant={addContract ? "secondary" : "outline"}
                  onClick={() => setAddContract((prev) => !prev)}
                  {...motionTap}
                >
                  <FileTextIcon data-icon="inline-start" />
                  {addContract ? t("clients.removeContract") : t("clients.addContract")}
                </MotionButton>
              </div>

              <AnimatePresence initial={false}>
                {addContract && (
                  <motion.div
                    key="client-contract-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                      <ContractFormFields
                        form={contractForm}
                        onChange={updateContractForm}
                        serviceTypes={serviceTypes}
                        onAddLineItem={addContractLineItem}
                        onRemoveLineItem={removeContractLineItem}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2 md:col-span-2">
            <MotionButton type="button" variant="outline" onClick={closeClientModal} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" disabled={submitting} {...motionTap}>
              {submitting ? <LoadingIconBtn /> : <SaveIconBtn />}
              {submitting
                ? t("common.saving")
                : !editing && addContract
                  ? t("clients.saveWithContract")
                  : t("common.save")}
            </MotionButton>
          </div>
        </form>
      </Modal>

      <Modal
        title={t("clients.importFromExcel")}
        open={importModalOpen}
        onClose={closeImportModal}
      >
        <div className="flex flex-col gap-4">
          {!importResult ? (
            <>
              <p className="text-sm text-muted-foreground">{t("clients.importDesc")}</p>

              <MotionButton
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
                {...motionTap}
              >
                <DownloadIcon data-icon="inline-start" />
                {t("clients.downloadTemplate")}
              </MotionButton>

              <label
                htmlFor="import-file"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <UploadCloudIcon className="size-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {importFile ? importFile.name : t("clients.chooseFile")}
                </span>
                <span className="text-xs text-muted-foreground">{t("clients.xlsxOnly")}</span>
                <input
                  id="import-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xlsm"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {importError && <p className="text-sm text-destructive">{importError}</p>}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <MotionButton type="button" variant="outline" onClick={closeImportModal} {...motionTap}>
                  <CancelIcon />
                  {t("common.cancel")}
                </MotionButton>
                <MotionButton
                  type="button"
                  disabled={!importFile || importBusy}
                  onClick={handleImportUpload}
                  {...motionTap}
                >
                  <FileUpIcon data-icon="inline-start" />
                  {importBusy ? t("export.downloading") : t("clients.uploadFile")}
                </MotionButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/30">
                <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  {t("clients.importCreated").replace("{count}", String(importResult.created))}
                </p>
              </div>

              {importResult.duplicates.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      {t("clients.importDuplicates").replace(
                        "{count}",
                        String(importResult.duplicates.length),
                      )}
                    </p>
                  </div>
                  <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-amber-800/90 dark:text-amber-300/90">
                    {importResult.duplicates.map((d) => (
                      <li key={d.row} className="flex items-center gap-2">
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {t("common.rank")} {d.row}
                        </Badge>
                        {d.company_name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-red-200/60 bg-red-50/50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="size-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      {t("clients.importErrors").replace("{count}", String(importResult.errors.length))}
                    </p>
                  </div>
                  <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-red-800/90 dark:text-red-300/90">
                    {importResult.errors.map((e) => (
                      <li key={e.row} className="flex items-center gap-2">
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {t("common.rank")} {e.row}
                        </Badge>
                        {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <MotionButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setImportResult(null);
                    setImportFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  {...motionTap}
                >
                  <FileUpIcon data-icon="inline-start" />
                  {t("clients.importAnother")}
                </MotionButton>
                <MotionButton type="button" onClick={closeImportModal} {...motionTap}>
                  {t("common.close")}
                </MotionButton>
              </div>
            </>
          )}
        </div>
      </Modal>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clients.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <CancelIcon />
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              <DeleteIconBtn />
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuickPaymentModal
        target={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSuccess={() => load(true)}
      />
    </PageShell>
  );
}
