import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileUpIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { api } from "../api/client";
import { ClientLogoUploader } from "../components/ClientLogoUploader";
import { ExportButtons } from "../components/ExportButtons";
import { CancelIcon, DeleteIconBtn, SaveIconBtn } from "../components/ButtonIcons";
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
import { FloatingLabelInput, FloatingLabelTextarea } from "@/components/ui/floating-label-input";
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
import { Badge } from "@/components/ui/badge";
import type { Client, ClientFormData, ClientImportResult } from "../types";
import { useI18n } from "../context/I18nContext";
import { emptyClientForm } from "../utils/format";
import { PageHeader, PageShell } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useListLoading } from "../hooks/useListLoading";

export function ClientsPage() {
  const { t } = useI18n();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyClientForm());
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { loading, start, finish } = useListLoading();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<ClientImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    (silent = true) => {
      start(silent);
      api.clients
        .list({
          search: search || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
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
    [search, statusFilter, page, pageSize, start, finish],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyClientForm());
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      company_name: client.company_name,
      contact_person: client.contact_person || "",
      phone: client.phone || "",
      website: client.website || "",
      country: client.country || "",
      city: client.city || "",
      activity_type: client.activity_type || "",
      status: client.status,
      notes: client.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        contact_person: form.contact_person || undefined,
        phone: form.phone || undefined,
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
        await api.clients.create(payload);
        load(true);
      }
      setModalOpen(false);
    } catch (err) {
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
      if (result.created > 0) load();
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

      <div className="filter-bar">
        <Input
          className="max-w-sm flex-1"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
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
      </div>

      <PageError message={error} />

      <Card className="content-card">
        <CardHeader>
          <CardTitle>{t("clients.listTitle")}</CardTitle>
          <CardDescription>
            {t("common.itemsFound").replace("{count}", String(total))}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && clients.length === 0}
            emptyMessage={t("clients.notFound")}
            skeletonCols={6}
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
                <TableHead>{t("clients.contact")}</TableHead>
                <TableHead>{t("clients.phone")}</TableHead>
                <TableHead>{t("clients.city")}</TableHead>
                <TableHead>{t("clients.state")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
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
                  <TableCellMuted>{client.contact_person}</TableCellMuted>
                  <TableCellMuted>{client.phone}</TableCellMuted>
                  <TableCellMuted>{client.city}</TableCellMuted>
                  <TableCell>
                    <StatusBadge status={client.status} />
                  </TableCell>
                  <TableCellActions>
                    <MotionButton variant="ghost" size="sm" onClick={() => openEdit(client)} {...motionTap}>
                      <PencilIcon data-icon="inline-start" />
                      {t("common.edit")}
                    </MotionButton>
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(client.id)}
                      {...motionTap}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      {t("common.delete")}
                    </MotionButton>
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
        onClose={() => setModalOpen(false)}
        wide
      >
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
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
            id="contact_person"
            label={t("clients.contact")}
            value={form.contact_person}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
          />
          <FloatingLabelInput
            id="phone"
            label={t("clients.phone")}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <FloatingLabelInput
            id="website"
            label={t("clients.website")}
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
          <FloatingLabelInput
            id="country"
            label={t("clients.country")}
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
          <FloatingLabelInput
            id="city"
            label={t("clients.city")}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <FloatingLabelInput
            id="activity_type"
            label={t("clients.activity")}
            value={form.activity_type}
            onChange={(e) => setForm({ ...form, activity_type: e.target.value })}
          />
          <div className="flex flex-col gap-2">
            <Label>{t("clients.state")}</Label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm({ ...form, status: value as "faol" | "nofaol" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="faol">Faol</SelectItem>
                  <SelectItem value="nofaol">Nofaol</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <FloatingLabelTextarea
            id="notes"
            label={t("clients.notes")}
            rows={3}
            containerClassName="md:col-span-2"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2 md:col-span-2">
            <MotionButton type="button" variant="outline" onClick={() => setModalOpen(false)} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" {...motionTap}>
              <SaveIconBtn />
              {t("common.save")}
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
    </PageShell>
  );
}
