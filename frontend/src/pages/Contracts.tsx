import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  CopyIcon,
  DownloadIcon,
  FileUpIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  Trash2Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { api } from "../api/client";
import { ContractStatusBadge } from "../components/ContractStatusBadge";
import { CancelIcon, DeleteIconBtn, LoadingIconBtn, RemoveIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { DateRangePicker } from "../components/DateRangePicker";
import { ExportButtons } from "../components/ExportButtons";
import { Modal } from "../components/Modal";
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
  TableCellDate,
  TableCellMoney,
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
import { Badge } from "@/components/ui/badge";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelDatePicker } from "@/components/ui/date-picker";
import { FloatingLabelInput, FloatingLabelMoneyInput, FloatingLabelTextarea } from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, Contract, ContractFormLineItem, ContractImportResult, ServiceType } from "../types";
import { useI18n } from "../context/I18nContext";
import { useListLoading } from "../hooks/useListLoading";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
import { formatDate, formatMoney, formatWeekday, toNumber, toWholeAmountDigits } from "../utils/format";
import { PageHeader, PageShell } from "../components/PageHeader";

export function ContractsPage() {
  const { t } = useI18n();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();
  const { submitting, guard } = useSubmitGuard();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<ContractImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contractNumberHint, setContractNumberHint] = useState<{
    last: string | null;
    next: string;
  } | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    start_date: "",
    end_date: "",
    notes: "",
    contract_number: "",
    invoice_number: "",
    line_items: [{ service_type_id: 0, price: "" }] as ContractFormLineItem[],
  });

  const load = (silent = true) => {
    start(silent);
    Promise.all([
      api.contracts.list({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: search || undefined,
      }),
      api.clients.list({ limit: 200 }),
      api.serviceTypes.list(true),
    ])
      .then(([c, cl, st]) => {
        setContracts(c.items);
        setTotal(c.total);
        setClients(cl.items);
        setServiceTypes(st);
        if (st.length > 0) {
          setForm((f) => ({
            ...f,
            line_items: f.line_items.map((item, i) =>
              i === 0 && !item.service_type_id ? { ...item, service_type_id: st[0].id } : item,
            ),
          }));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => finish());
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
  }, [page, pageSize, search]);

  const clientName = (id: number) =>
    clients.find((c) => c.id === id)?.company_name || `#${id}`;

  const emptyForm = () => ({
    client_id: "",
    start_date: "",
    end_date: "",
    notes: "",
    contract_number: "",
    invoice_number: "",
    line_items: [{ service_type_id: serviceTypes[0]?.id || 0, price: "" }] as ContractFormLineItem[],
  });

  const openCreate = () => {
    setEditing(null);
    setContractNumberHint(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (contract: Contract) => {
    setEditing(contract);
    setContractNumberHint(null);
    setForm({
      client_id: String(contract.client_id),
      start_date: contract.start_date,
      end_date: contract.end_date,
      notes: contract.notes || "",
      contract_number: contract.contract_number || "",
      invoice_number: contract.invoice_number || "",
      line_items: contract.line_items.map((item) => ({
        service_type_id: item.service_type_id,
        price: toWholeAmountDigits(item.price),
      })),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setContractNumberHint(null);
    setForm(emptyForm());
  };

  const handleClientChange = async (clientId: string) => {
    if (editing) {
      setForm((f) => ({ ...f, client_id: clientId }));
      return;
    }

    setForm((f) => ({ ...f, client_id: clientId, contract_number: "" }));
    setContractNumberHint(null);

    try {
      const data = await api.contracts.nextNumber(parseInt(clientId, 10));
      setForm((f) => ({
        ...f,
        client_id: clientId,
        contract_number: data.next_number,
      }));
      setContractNumberHint({ last: data.last_number, next: data.next_number });
    } catch {
      setContractNumberHint(null);
    }
  };

  const addLineItem = () => {
    setForm({
      ...form,
      line_items: [
        ...form.line_items,
        { service_type_id: serviceTypes[0]?.id || 0, price: "" },
      ],
    });
  };

  const removeLineItem = (index: number) => {
    if (form.line_items.length <= 1) return;
    setForm({
      ...form,
      line_items: form.line_items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!editing && !form.client_id) {
      setError(t("contracts.selectClientError"));
      return;
    }
    if (!form.start_date || !form.end_date) {
      setError(t("clients.selectDateError"));
      return;
    }
    const payload = {
      start_date: form.start_date,
      end_date: form.end_date,
      notes: form.notes || undefined,
      contract_number: form.contract_number || undefined,
      invoice_number: form.invoice_number || undefined,
      line_items: form.line_items.map((item) => ({
        service_type_id: item.service_type_id,
        price: parseFloat(item.price),
      })),
    };
    try {
      if (editing) {
        const updated = await api.contracts.update(editing.id, payload);
        setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        await api.contracts.create({
          client_id: parseInt(form.client_id),
          ...payload,
        });
        load(true);
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  const handleDownloadDocument = async (contract: Contract, type: "invoice" | "act") => {
    setError("");
    try {
      await api.contracts.downloadDocument(contract.id, type, contract.contract_number);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleDuplicate = async (contract: Contract) => {
    setError("");
    try {
      await api.contracts.duplicate(contract.id);
      load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    const snapshot = contracts;
    setContracts((prev) => prev.filter((c) => c.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    setDeleteId(null);
    try {
      await api.contracts.delete(id);
    } catch (err) {
      setContracts(snapshot);
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
    api.contracts.downloadImportTemplate().catch((err) => {
      setImportError(err instanceof Error ? err.message : t("common.error"));
    });
  };

  const handleImportUpload = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportError("");
    try {
      const result = await api.contracts.import(importFile);
      setImportResult(result);
      if (result.created_contracts > 0) load(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title={t("contracts.title")} subtitle={t("contracts.subtitle")}>
        <ExportButtons
          resource="contracts"
          dateFrom={exportDateFrom}
          dateTo={exportDateTo}
        />
        <MotionButton variant="outline" onClick={openImportModal} {...motionTap}>
          <FileUpIcon data-icon="inline-start" />
          {t("contracts.importFromExcel")}
        </MotionButton>
        <MotionButton onClick={openCreate} {...motionTap}>
          <PlusIcon data-icon="inline-start" />
          {t("contracts.new")}
        </MotionButton>
      </PageHeader>

      <PageError message={error} />

      <div className="filter-bar">
        <Input
          className="max-w-sm flex-1"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <DateRangePicker
          from={exportDateFrom}
          to={exportDateTo}
          onChange={(from, to) => {
            setExportDateFrom(from);
            setExportDateTo(to);
          }}
        />
      </div>

      <Card className="content-card">
        <CardHeader>
          <CardTitle>{t("contracts.listTitle")}</CardTitle>
          <CardDescription>
            {t("common.itemsFound").replace("{count}", String(total))}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && contracts.length === 0}
            emptyMessage={t("contracts.notFound")}
            skeletonCols={7}
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
                <TableHead>{t("contracts.client")}</TableHead>
                <TableHead>{t("contracts.period")}</TableHead>
                <TableHead>{t("contracts.state")}</TableHead>
                <TableHead>{t("contracts.services")}</TableHead>
                <TableHead>{t("common.total")}</TableHead>
                <TableHead>{t("common.debt")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract, index) => (
                <MotionTableRow key={contract.id} {...rowEnter(index)}>
                  <TableCellCompany
                    to={`/clients/${contract.client_id}`}
                    name={clientName(contract.client_id)}
                  />
                  <TableCellDate>
                    <div className="flex flex-col gap-0.5">
                      {contract.contract_number && (
                        <span className="whitespace-nowrap text-[11px] font-semibold text-primary/80">
                          №{contract.contract_number}
                        </span>
                      )}
                      <span className="whitespace-nowrap text-xs font-medium text-foreground/90">
                        {formatDate(contract.start_date)}
                        <span className="ml-1 font-normal text-muted-foreground">
                          {formatWeekday(contract.start_date, "short")}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-xs font-medium text-foreground/90">
                        <span className="text-muted-foreground/50">→</span> {formatDate(contract.end_date)}
                        <span className="ml-1 font-normal text-muted-foreground">
                          {formatWeekday(contract.end_date, "short")}
                        </span>
                      </span>
                      {contract.invoice_number && (
                        <span className="whitespace-nowrap text-[10px] font-normal text-muted-foreground">
                          {t("contracts.invoiceNumber")}: {contract.invoice_number}
                        </span>
                      )}
                    </div>
                  </TableCellDate>
                  <TableCell>
                    {contract.is_cancelled ? (
                      <Badge variant="secondary" className="gap-1 text-muted-foreground">
                        <XCircleIcon className="size-3" />
                        {t("clients.cancelled")}
                      </Badge>
                    ) : (
                      <ContractStatusBadge endDate={contract.end_date} />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="grid w-56 grid-cols-2 gap-1">
                      {contract.line_items.map((item, i) => (
                        <Badge
                          key={i}
                          title={item.service_type_name}
                          className="min-w-0 justify-center truncate px-2 text-[10.5px] font-medium"
                        >
                          {item.service_type_name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCellMoney tone="neutral">
                    {formatMoney(contract.total_amount)}
                  </TableCellMoney>
                  <TableCellMoney tone={toNumber(contract.debt_amount) < 0 ? "positive" : "negative"}>
                    {formatMoney(
                      toNumber(contract.debt_amount) < 0
                        ? Math.abs(toNumber(contract.debt_amount))
                        : contract.debt_amount,
                    )}
                  </TableCellMoney>
                  <TableCellActions>
                    <MotionButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDownloadDocument(contract, "invoice")}
                      title={t("contracts.downloadInvoice")}
                      {...motionTap}
                    >
                      <ReceiptIcon data-icon="inline-start" />
                    </MotionButton>
                    <MotionButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDownloadDocument(contract, "act")}
                      title={t("contracts.downloadAct")}
                      {...motionTap}
                    >
                      <ClipboardCheckIcon data-icon="inline-start" />
                    </MotionButton>
                    <MotionButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDuplicate(contract)}
                      title={t("contracts.duplicate")}
                      {...motionTap}
                    >
                      <CopyIcon data-icon="inline-start" />
                    </MotionButton>
                    <MotionButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(contract)}
                      title={t("common.edit")}
                      {...motionTap}
                    >
                      <PencilIcon data-icon="inline-start" />
                    </MotionButton>
                    <MotionButton
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteId(contract.id)}
                      title={t("common.delete")}
                      {...motionTap}
                    >
                      <Trash2Icon data-icon="inline-start" />
                    </MotionButton>
                  </TableCellActions>
                </MotionTableRow>
              ))}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

      <Modal
        title={editing ? t("contracts.edit") : t("contracts.new")}
        open={modalOpen}
        onClose={closeModal}
        wide
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="client">{t("contracts.selectClientLabel")} *</Label>
            {editing ? (
              <FloatingLabelInput
                id="client"
                label={t("contracts.selectClientLabel")}
                required
                readOnly
                value={clientName(editing.client_id)}
                className="bg-muted"
              />
            ) : (
              <Select
                value={form.client_id}
                onValueChange={(value) => value && handleClientChange(value)}
              >
                <SelectTrigger id="client" className="w-full">
                  <SelectValue placeholder={t("contracts.selectClient")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FloatingLabelDatePicker
              id="start_date"
              label={t("contracts.start")}
              required
              value={form.start_date}
              onChange={(value) => setForm({ ...form, start_date: value })}
            />
            <FloatingLabelDatePicker
              id="end_date"
              label={t("contracts.end")}
              required
              value={form.end_date}
              min={form.start_date || undefined}
              onChange={(value) => setForm({ ...form, end_date: value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <FloatingLabelInput
                id="contract_number"
                label={t("contracts.contractNumber")}
                value={form.contract_number}
                onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
              />
              {!editing && contractNumberHint && (
                <p className="px-1 text-xs text-muted-foreground">
                  {contractNumberHint.last
                    ? t("contracts.contractNumberNext")
                        .replace("{last}", contractNumberHint.last)
                        .replace("{next}", contractNumberHint.next)
                    : t("contracts.contractNumberFirst").replace(
                        "{number}",
                        contractNumberHint.next,
                      )}
                </p>
              )}
            </div>
            <FloatingLabelInput
              id="invoice_number"
              label={t("contracts.invoiceNumber")}
              value={form.invoice_number}
              onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>{t("contracts.services")} *</Label>
              <MotionButton type="button" variant="ghost" size="sm" onClick={addLineItem} {...motionTap}>
                <PlusIcon data-icon="inline-start" />
                {t("contracts.addService")}
              </MotionButton>
            </div>
            <AnimatePresence initial={false}>
            {form.line_items.map((item, index) => (
              <motion.div
                key={index}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
              <div className="pt-2.5 pb-1">
              <div className="flex flex-col gap-2 rounded-lg border border-border/50 p-2.5 sm:flex-row sm:items-start sm:border-0 sm:p-0">
                <Select
                  value={String(item.service_type_id)}
                  onValueChange={(value) => {
                    if (!value) return;
                    const items = [...form.line_items];
                    items[index].service_type_id = parseInt(value);
                    setForm({ ...form, line_items: items });
                  }}
                >
                  <SelectTrigger className="w-full data-[size=default]:h-12 sm:mt-3 sm:w-44 sm:shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {serviceTypes.map((st) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className="flex flex-1 items-center gap-2">
                  <FloatingLabelMoneyInput
                    containerClassName="w-full flex-1"
                    label={t("common.price")}
                    required
                    value={item.price}
                    onValueChange={(digits) => {
                      const items = [...form.line_items];
                      items[index].price = digits;
                      setForm({ ...form, line_items: items });
                    }}
                  />
                  {form.line_items.length > 1 && (
                    <MotionButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-destructive"
                      onClick={() => removeLineItem(index)}
                      {...motionTap}
                    >
                      <RemoveIconBtn />
                    </MotionButton>
                  )}
                </div>
              </div>
              </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>

          <FloatingLabelTextarea
            id="notes"
            label={t("common.note")}
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2">
            <MotionButton type="button" variant="outline" onClick={closeModal} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" disabled={submitting} {...motionTap}>
              {submitting ? <LoadingIconBtn /> : <SaveIconBtn />}
              {submitting ? t("common.saving") : t("common.save")}
            </MotionButton>
          </div>
        </form>
      </Modal>

      <Modal
        title={t("contracts.importFromExcel")}
        open={importModalOpen}
        onClose={closeImportModal}
      >
        <div className="flex flex-col gap-4">
          {!importResult ? (
            <>
              <p className="text-sm text-muted-foreground">{t("contracts.importDesc")}</p>

              <MotionButton
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
                {...motionTap}
              >
                <DownloadIcon data-icon="inline-start" />
                {t("contracts.downloadTemplate")}
              </MotionButton>

              <label
                htmlFor="contract-import-file"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <UploadCloudIcon className="size-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {importFile ? importFile.name : t("contracts.chooseFile")}
                </span>
                <span className="text-xs text-muted-foreground">{t("contracts.xlsxOnly")}</span>
                <input
                  id="contract-import-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xlsm"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {importError && <p className="text-sm text-destructive">{importError}</p>}

              <div className="flex justify-end gap-2 pt-2">
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
                  {importBusy ? t("export.downloading") : t("contracts.uploadFile")}
                </MotionButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/30">
                <CheckCircle2Icon className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    {t("contracts.importCreated").replace("{count}", String(importResult.created_contracts))}
                  </p>
                  {(importResult.created_clients > 0 || importResult.created_service_types > 0) && (
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                      {t("contracts.importCreatedDetail")
                        .replace("{clients}", String(importResult.created_clients))
                        .replace("{services}", String(importResult.created_service_types))}
                    </p>
                  )}
                </div>
              </div>

              {importResult.duplicates.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      {t("contracts.importDuplicates").replace(
                        "{count}",
                        String(importResult.duplicates.length),
                      )}
                    </p>
                  </div>
                  <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-amber-800/90 dark:text-amber-300/90">
                    {importResult.duplicates.map((d, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {t("common.rank")} {d.row}
                        </Badge>
                        {d.company_name}
                        {d.contract_number ? ` — №${d.contract_number}` : ""}
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
                      {t("contracts.importErrors").replace("{count}", String(importResult.errors.length))}
                    </p>
                  </div>
                  <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-red-800/90 dark:text-red-300/90">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {t("common.rank")} {e.row}
                        </Badge>
                        {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
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
                  {t("contracts.importAnother")}
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
            <AlertDialogTitle>{t("contracts.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("contracts.deleteDesc")}</AlertDialogDescription>
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
    </PageShell>
  );
}
