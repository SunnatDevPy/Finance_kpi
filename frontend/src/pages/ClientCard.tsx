import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  FlagIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import { api } from "../api/client";
import { CancelIcon, LoadingIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { ClientCardOverview } from "../components/ClientCardOverview";
import { QuickPaymentModal, type QuickPaymentTarget } from "../components/QuickPaymentModal";
import { ClientLogoUploader } from "@/components/ClientLogoUploader";
import { CountryCityFields } from "../components/CountryCityFields";
import {
  ContractFormFields,
  emptyContractForm,
  type ContractFormState,
} from "../components/ContractFormFields";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { ContractStatusBadge } from "../components/ContractStatusBadge";
import { StaggerContainer, StaggerItem } from "../components/Stagger";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
  TableCellMoney,
  TableCellMuted,
  TableCellDate,
  TableCellPrimary,
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
import { useI18n } from "../context/I18nContext";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
import { Button, MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelInput, FloatingLabelMoneyInput, FloatingLabelPhoneInput, FloatingLabelTextarea } from "@/components/ui/floating-label-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditLogEntry, ClientCard, ClientFormData, Contract, Payment, ServiceType } from "../types";
import { ActiveStatusToggle } from "../components/ActiveStatusToggle";
import { resolveCountryValue, resolveRegionValue } from "@/data/geoRegions";
import { parsePhoneNational, toPhoneE164 } from "@/hooks/usePhoneInput";
import { cn } from "@/lib/utils";
import {
  emptyClientForm,
  formatDateTimeWithWeekday,
  formatDateWithWeekday,
  formatAmount,
  formatMoney,
  toNumber,
  toWholeAmountDigits,
} from "../utils/format";

function activeLineItemCount(contract: Contract): number {
  return contract.line_items.filter((item) => !item.is_cancelled).length;
}

function contractWasModified(contract: Contract): boolean {
  return (
    new Date(contract.updated_at).getTime() - new Date(contract.created_at).getTime() > 2000
  );
}

const SERVICE_ITEM_STYLES = [
  {
    row: "border-l-2 border-l-brand-500/80 bg-brand-500/[0.06] dark:bg-brand-500/10",
    label: "bg-brand-500/12 text-brand-800 dark:bg-brand-500/20 dark:text-brand-100",
  },
  {
    row: "border-l-2 border-l-sky-500/80 bg-sky-500/[0.06] dark:bg-sky-500/10",
    label: "bg-sky-500/12 text-sky-900 dark:bg-sky-500/20 dark:text-sky-100",
  },
  {
    row: "border-l-2 border-l-violet-500/80 bg-violet-500/[0.06] dark:bg-violet-500/10",
    label: "bg-violet-500/12 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100",
  },
  {
    row: "border-l-2 border-l-amber-500/80 bg-amber-500/[0.06] dark:bg-amber-500/10",
    label: "bg-amber-500/12 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
  },
] as const;

function serviceItemStyle(index: number, cancelled: boolean) {
  if (cancelled) {
    return {
      row: "border-l-2 border-l-border/50 bg-muted/25",
      label: "bg-muted text-muted-foreground",
    };
  }
  return SERVICE_ITEM_STYLES[index % SERVICE_ITEM_STYLES.length];
}

function auditActionLabel(action: AuditLogEntry["action"], t: (key: string) => string): string {
  const keys: Record<AuditLogEntry["action"], string> = {
    create: "auditLog.actionCreate",
    update: "auditLog.actionUpdate",
    delete: "auditLog.actionDelete",
    restore: "auditLog.actionRestore",
  };
  return t(keys[action]);
}

export function ClientCardPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [card, setCard] = useState<ClientCard | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [paymentTarget, setPaymentTarget] = useState<QuickPaymentTarget | null>(null);
  const [cancelItemTarget, setCancelItemTarget] = useState<{
    contractId: number;
    lineItemId: number;
  } | null>(null);
  const [cancelContractTarget, setCancelContractTarget] = useState<number | null>(null);
  const [historyContractId, setHistoryContractId] = useState<number | null>(null);
  const [historyEntries, setHistoryEntries] = useState<AuditLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editLineItemTarget, setEditLineItemTarget] = useState<{
    contractId: number;
    lineItemId: number;
    serviceTypeId: number;
    price: string;
  } | null>(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [contractForm, setContractForm] = useState<ContractFormState>(() =>
    emptyContractForm([]),
  );
  const [contractNumberHint, setContractNumberHint] = useState<{
    last: string | null;
    next: string;
  } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<ClientFormData>(emptyClientForm());
  const [exportBusy, setExportBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const { submitting: contractSubmitting, guard: guardContract } = useSubmitGuard();
  const { submitting: editPriceSubmitting, guard: guardEditPrice } = useSubmitGuard();
  const { submitting: editClientSubmitting, guard: guardEditClient } = useSubmitGuard();

  /** Bitta shartnoma bo'yicha barcha to'lovlarni sahifalab yuklaydi
   * — backend sahifa hajmi 200 bilan cheklangani uchun, uzoq mijozlarning
   * to'liq to'lov tarixi (200 tadan ortiq bo'lsa) kesib qolib ketmasligi kerak. */
  const fetchAllPaymentsForContract = async (contractId: number): Promise<Payment[]> => {
    const limit = 200;
    let skip = 0;
    const all: Payment[] = [];
    while (true) {
      const page = await api.payments.list({ contractId, skip, limit });
      all.push(...page.items);
      if (page.items.length < limit || all.length >= page.total) break;
      skip += limit;
    }
    return all;
  };

  const load = () => {
    if (!id) return;
    api.clients
      .card(Number(id))
      .then(async (cardData) => {
        setCard(cardData);
        const contractIds = cardData.contracts.map((c) => c.id);
        if (contractIds.length === 0) {
          setPayments([]);
          return;
        }
        const pages = await Promise.all(contractIds.map(fetchAllPaymentsForContract));
        setPayments(pages.flat());
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

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

  const openContractModal = async () => {
    if (!card) return;
    setError("");
    setContractNumberHint(null);
    setContractModalOpen(true);
    try {
      const [types, numberData] = await Promise.all([
        api.serviceTypes.list(true),
        api.contracts.nextNumber(card.id),
      ]);
      setServiceTypes(types);
      setContractForm({
        ...emptyContractForm(types),
        contract_number: numberData.next_number,
      });
      setContractNumberHint({ last: numberData.last_number, next: numberData.next_number });
    } catch {
      loadServiceTypes();
      setContractNumberHint(null);
    }
  };

  const closeContractModal = () => {
    setContractModalOpen(false);
    setContractNumberHint(null);
    setContractForm(emptyContractForm(serviceTypes));
  };

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

  const handleCreateContract = guardContract(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    setError("");
    if (!contractForm.start_date || !contractForm.end_date) {
      setError(t("clients.selectDateError"));
      return;
    }
    if (contractForm.line_items.some((item) => !item.price)) {
      setError(t("common.error"));
      return;
    }
    try {
      await api.contracts.create({
        client_id: card.id,
        start_date: contractForm.start_date,
        end_date: contractForm.end_date,
        status: contractForm.status,
        notes: contractForm.notes || undefined,
        contract_number: contractForm.contract_number || undefined,
        invoice_number: contractForm.invoice_number || undefined,
        line_items: contractForm.line_items.map((item) => ({
          service_type_id: item.service_type_id,
          price: parseFloat(item.price),
        })),
      });
      closeContractModal();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  const toggleClientStatus = async (active: boolean) => {
    if (!card) return;
    const nextStatus = active ? "faol" : "nofaol";
    if (card.status === nextStatus) return;
    const snapshot = card;
    setError("");
    setCard((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    try {
      await api.clients.update(card.id, { status: nextStatus });
    } catch (err) {
      setCard(snapshot);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const openEditModal = () => {
    if (!card) return;
    setError("");
    setEditForm({
      company_name: card.company_name,
      contact_person: card.contact_person || "",
      phone: parsePhoneNational(card.phone || ""),
      website: card.website || "",
      country: resolveCountryValue(card.country || ""),
      city: resolveRegionValue(resolveCountryValue(card.country || ""), card.city || ""),
      activity_type: card.activity_type || "",
      status: card.status,
      notes: card.notes || "",
    });
    setEditModalOpen(true);
  };

  const handleEditClient = guardEditClient(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    setError("");
    try {
      const payload = {
        ...editForm,
        contact_person: editForm.contact_person || undefined,
        phone: editForm.phone ? toPhoneE164(editForm.phone) : undefined,
        website: editForm.website || undefined,
        country: editForm.country || undefined,
        city: editForm.city || undefined,
        activity_type: editForm.activity_type || undefined,
        notes: editForm.notes || undefined,
      };
      const updated = await api.clients.update(card.id, payload);
      setCard((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  const handleExportCard = async () => {
    if (!card) return;
    setExportBusy(true);
    setError("");
    try {
      await api.clients.exportCard(card.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setExportBusy(false);
    }
  };

  const handleDownloadContract = async (contractId: number, contractNumber: string | null) => {
    setError("");
    try {
      await api.contracts.downloadDocument(contractId, "contract", contractNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleCancelLineItem = async () => {
    if (!cancelItemTarget) return;
    setBusy(true);
    setError("");
    try {
      await api.contracts.cancelLineItem(cancelItemTarget.contractId, cancelItemTarget.lineItemId);
      setCancelItemTarget(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelContract = async () => {
    if (cancelContractTarget === null) return;
    setBusy(true);
    setError("");
    try {
      await api.contracts.cancelAll(cancelContractTarget);
      setCancelContractTarget(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmContract = async (contractId: number) => {
    setError("");
    try {
      await api.contracts.confirm(contractId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleCompleteContract = async (contractId: number) => {
    setError("");
    try {
      await api.contracts.complete(contractId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleReactivateLineItem = async (contractId: number, lineItemId: number) => {
    setError("");
    try {
      await api.contracts.reactivateLineItem(contractId, lineItemId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const openContractHistory = async (contractId: number) => {
    setHistoryContractId(contractId);
    setHistoryLoading(true);
    setHistoryEntries([]);
    try {
      const data = await api.contracts.history(contractId, { limit: 100 });
      setHistoryEntries(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setHistoryContractId(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeContractHistory = () => {
    setHistoryContractId(null);
    setHistoryEntries([]);
  };

  const openEditLineItem = async (
    contractId: number,
    lineItemId: number,
    serviceTypeId: number,
    price: string,
  ) => {
    if (serviceTypes.length === 0) {
      try {
        const types = await api.serviceTypes.list(true);
        setServiceTypes(types);
      } catch {
        setServiceTypes([]);
      }
    }
    setEditLineItemTarget({
      contractId,
      lineItemId,
      serviceTypeId,
      price: toWholeAmountDigits(price),
    });
  };

  const handleEditLineItem = guardEditPrice(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLineItemTarget) return;
    const amount = parseFloat(editLineItemTarget.price);
    if (!Number.isFinite(amount) || amount <= 0 || !editLineItemTarget.serviceTypeId) {
      setError(t("common.error"));
      return;
    }
    setError("");
    try {
      await api.contracts.updateLineItem(editLineItemTarget.contractId, editLineItemTarget.lineItemId, {
        service_type_id: editLineItemTarget.serviceTypeId,
        price: amount,
      });
      setEditLineItemTarget(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  if (error && !card) {
    return <PageError message={error} />;
  }

  if (!card) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const contractById = new Map(card.contracts.map((contract) => [contract.id, contract]));
  const sortedPayments = [...payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at));

  return (
    <PageShell>
      <nav className="-mb-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link
          to="/clients"
          className="link-surface flex items-center gap-1.5 font-medium text-foreground/80 transition-colors hover:text-primary"
        >
          <ArrowLeftIcon className="size-3.5" />
          {t("nav.clients")}
        </Link>
        <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
        <span className="truncate font-medium text-foreground">{card.company_name}</span>
      </nav>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {card.company_name}
            <MotionButton
              type="button"
              size="sm"
              variant="outline"
              className="h-9 text-sm font-medium"
              disabled={exportBusy}
              onClick={() => void handleExportCard()}
              {...motionTap}
            >
              <DownloadIcon data-icon="inline-start" className={exportBusy ? "animate-pulse" : undefined} />
              {exportBusy ? t("export.downloading") : t("clients.exportExcel")}
            </MotionButton>
          </span>
        }
        subtitle={t("clients.card")}
      />

      <PageError message={error} />

      <StaggerContainer>
        <StaggerItem>
          <ClientCardOverview
            client={card}
            contracts={card.contracts}
            totalDebt={card.total_debt}
            cancelledAmount={card.cancelled_amount}
            onClientUpdated={(updated) => setCard((prev) => (prev ? { ...prev, ...updated } : prev))}
            onEdit={openEditModal}
            onStatusChange={(active) => void toggleClientStatus(active)}
          />
        </StaggerItem>
      </StaggerContainer>

      <Card className="content-card">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base">{t("clients.paymentHistory")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PremiumDataTable
            empty={sortedPayments.length === 0}
            emptyMessage={t("clients.noPayments")}
            skeletonCols={4}
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("common.contract")}</TableHead>
                <TableHead>{t("common.amount")}</TableHead>
                <TableHead>{t("common.note")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPayments.map((p, index) => {
                const linkedContract = contractById.get(p.contract_id);
                return (
                  <MotionTableRow key={p.id} {...rowEnter(index)}>
                    <TableCellDate>{formatDateWithWeekday(p.paid_at)}</TableCellDate>
                    <TableCellMuted>
                      {linkedContract?.contract_number
                        ? `№${linkedContract.contract_number}`
                        : `#${p.contract_id}`}
                    </TableCellMuted>
                    <TableCellMoney tone={toNumber(p.amount) < 0 ? "negative" : "positive"}>
                      {formatMoney(p.amount)}
                    </TableCellMoney>
                    <TableCellMuted>{p.note}</TableCellMuted>
                  </MotionTableRow>
                );
              })}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

      <Card className="content-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-3">
          <div>
            <CardTitle className="text-base">{t("common.contracts")}</CardTitle>
            <CardDescription className="text-xs">{t("clients.contractsDesc")}</CardDescription>
          </div>
          <MotionButton size="sm" onClick={() => void openContractModal()} {...motionTap}>
            <PlusIcon data-icon="inline-start" />
            {t("clients.newContract")}
          </MotionButton>
        </CardHeader>
        <CardContent className="pt-3">
          {card.contracts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-muted-foreground">{t("clients.noContracts")}</p>
              <MotionButton size="sm" variant="outline" onClick={() => void openContractModal()} {...motionTap}>
                <PlusIcon data-icon="inline-start" />
                {t("clients.newContract")}
              </MotionButton>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {card.contracts.map((contract) => {
                const activeItems = activeLineItemCount(contract);
                const canRemoveService = activeItems > 1;
                const debt = toNumber(contract.debt_amount);
                return (
                <div
                  key={contract.id}
                  className="overflow-hidden rounded-lg border border-border/60 bg-card"
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-border/40 bg-muted/15 px-3 py-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                      {contractWasModified(contract) && (
                        <button
                          type="button"
                          onClick={() => void openContractHistory(contract.id)}
                          className="link-surface flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          <ClockIcon className="size-3 shrink-0" />
                          {t("clients.modified")}
                        </button>
                      )}
                      {contract.contract_number && (
                        <span className="text-xs font-semibold text-primary/90">
                          №{contract.contract_number}
                        </span>
                      )}
                      <span className="text-xs font-medium text-foreground">
                        {formatDateWithWeekday(contract.start_date, "short")} —{" "}
                        {formatDateWithWeekday(contract.end_date, "short")}
                      </span>
                      {contract.is_cancelled ? (
                        <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] text-muted-foreground">
                          <XCircleIcon className="size-2.5" />
                          {t("clients.cancelled")}
                        </Badge>
                      ) : (
                        <ContractStatusBadge status={contract.status} />
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {t("clients.totalAmount")}:{" "}
                        <span className="font-medium text-foreground">{formatAmount(contract.total_amount)}</span>
                        {" · "}
                        {t("clients.received")}:{" "}
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatAmount(contract.paid_amount)}
                        </span>
                        {" · "}
                        {debt < 0 ? t("clients.overpaid") : t("clients.debtShort")}:{" "}
                        <span
                          className={cn(
                            "font-medium",
                            debt < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : debt > 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-foreground",
                          )}
                        >
                          {formatAmount(debt < 0 ? Math.abs(debt) : contract.debt_amount)}
                        </span>
                      </span>
                    </div>
                    <div className="action-toolbar shrink-0">
                      <MotionButton
                        size="icon-sm"
                        variant="ghost"
                        className="size-7"
                        title={t("contracts.downloadContract")}
                        onClick={() => handleDownloadContract(contract.id, contract.contract_number)}
                        {...motionTap}
                      >
                        <FileTextIcon className="size-3.5" />
                      </MotionButton>
                      {debt > 0 && (
                        <MotionButton
                          size="icon-sm"
                          variant="ghost"
                          className="size-7 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                          title={t("clients.payment")}
                          onClick={() => setPaymentTarget({ kind: "contract", contract })}
                          {...motionTap}
                        >
                          <BanknoteIcon className="size-3.5" />
                        </MotionButton>
                      )}
                      {!contract.is_cancelled && contract.status === "yangi" && (
                        <MotionButton
                          size="icon-sm"
                          variant="ghost"
                          className="size-7 text-primary hover:bg-primary/10"
                          title={t("clients.confirmContract")}
                          onClick={() => void handleConfirmContract(contract.id)}
                          {...motionTap}
                        >
                          <CheckCircle2Icon className="size-3.5" />
                        </MotionButton>
                      )}
                      {!contract.is_cancelled && contract.status === "davom_etmoqda" && (
                        <MotionButton
                          size="icon-sm"
                          variant="ghost"
                          className="size-7 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                          title={t("clients.completeContract")}
                          onClick={() => void handleCompleteContract(contract.id)}
                          {...motionTap}
                        >
                          <FlagIcon className="size-3.5" />
                        </MotionButton>
                      )}
                      {!contract.is_cancelled && (
                        <MotionButton
                          size="icon-sm"
                          variant="ghost"
                          className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title={t("clients.cancelContract")}
                          onClick={() => setCancelContractTarget(contract.id)}
                          {...motionTap}
                        >
                          <XCircleIcon className="size-3.5" />
                        </MotionButton>
                      )}
                    </div>
                  </div>
                  <div className="px-2 py-1.5">
                    <PremiumDataTable skeletonCols={3} skeletonRows={2} className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-8 py-1">{t("clients.service")}</TableHead>
                          <TableHead className="h-8 py-1 text-right">{t("common.price")}</TableHead>
                          <TableHead className="h-8 w-16 py-1 text-right">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contract.line_items.map((item, index) => {
                          const accent = serviceItemStyle(index, item.is_cancelled);
                          return (
                          <MotionTableRow
                            key={item.id}
                            {...rowEnter(index)}
                            className={cn("h-9", accent.row)}
                          >
                            <TableCellPrimary
                              className={cn("py-1.5 text-xs", item.is_cancelled && "line-through opacity-70")}
                            >
                              <span
                                className={cn(
                                  "inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
                                  accent.label,
                                )}
                              >
                                {item.service_type_name}
                              </span>
                              {item.is_cancelled && (
                                <Badge variant="secondary" className="ml-1.5 align-middle text-[9px]">
                                  {t("clients.cancelled")}
                                </Badge>
                              )}
                            </TableCellPrimary>
                            <TableCellMoney
                              tone="neutral"
                              className={cn(
                                "py-1.5 text-right text-xs font-semibold",
                                item.is_cancelled && "text-muted-foreground line-through opacity-70",
                              )}
                            >
                              {formatMoney(item.price)}
                            </TableCellMoney>
                            <TableCell className="py-1.5 text-right">
                              {item.is_cancelled ? (
                                <MotionButton
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7"
                                  title={t("clients.reactivateLineItem")}
                                  onClick={() => handleReactivateLineItem(contract.id, item.id)}
                                  {...motionTap}
                                >
                                  <RotateCcwIcon className="size-3.5" />
                                </MotionButton>
                              ) : (
                                <div className="action-toolbar ml-auto w-fit">
                                  <MotionButton
                                    variant="ghost"
                                    size="icon-sm"
                                    className="size-7"
                                    title={t("clients.editService")}
                                    onClick={() =>
                                      openEditLineItem(
                                        contract.id,
                                        item.id,
                                        item.service_type_id,
                                        item.price,
                                      )
                                    }
                                    {...motionTap}
                                  >
                                    <PencilIcon className="size-3.5" />
                                  </MotionButton>
                                  <MotionButton
                                    variant="ghost"
                                    size="icon-sm"
                                    className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                                    title={
                                      canRemoveService
                                        ? t("clients.cancelLineItem")
                                        : t("clients.lastServiceCannotDelete")
                                    }
                                    disabled={!canRemoveService}
                                    onClick={() =>
                                      setCancelItemTarget({
                                        contractId: contract.id,
                                        lineItemId: item.id,
                                      })
                                    }
                                    {...motionTap}
                                  >
                                    <Trash2Icon className="size-3.5" />
                                  </MotionButton>
                                </div>
                              )}
                            </TableCell>
                          </MotionTableRow>
                          );
                        })}
                      </TableBody>
                    </PremiumDataTable>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <QuickPaymentModal
        target={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSuccess={load}
      />

      <Modal
        title={t("clients.newContract")}
        open={contractModalOpen}
        onClose={closeContractModal}
        wide
      >
        <form onSubmit={handleCreateContract} className="flex flex-col gap-4">
          <ContractFormFields
            form={contractForm}
            onChange={updateContractForm}
            serviceTypes={serviceTypes}
            contractNumberHint={contractNumberHint}
            showContractNumberHint
            onAddLineItem={addContractLineItem}
            onRemoveLineItem={removeContractLineItem}
          />
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <MotionButton type="button" variant="outline" onClick={closeContractModal} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" disabled={contractSubmitting} {...motionTap}>
              {contractSubmitting ? <LoadingIconBtn /> : <SaveIconBtn />}
              {contractSubmitting ? t("common.saving") : t("common.save")}
            </MotionButton>
          </div>
        </form>
      </Modal>

      <Modal
        title={t("clients.editService")}
        open={editLineItemTarget !== null}
        onClose={() => setEditLineItemTarget(null)}
      >
        {editLineItemTarget && (
          <form onSubmit={handleEditLineItem} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="line_item_service">
                {t("clients.service")}
              </label>
              <Select
                value={String(editLineItemTarget.serviceTypeId)}
                onValueChange={(value) => {
                  if (!value) return;
                  setEditLineItemTarget((prev) =>
                    prev ? { ...prev, serviceTypeId: parseInt(value, 10) } : prev,
                  );
                }}
              >
                <SelectTrigger id="line_item_service" className="h-12 w-full">
                  <SelectValue placeholder={t("clients.service")} />
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
            </div>
            <FloatingLabelMoneyInput
              id="line_item_price"
              label={t("common.price")}
              required
              value={editLineItemTarget.price}
              onValueChange={(digits) =>
                setEditLineItemTarget((prev) => (prev ? { ...prev, price: digits } : prev))
              }
            />
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <MotionButton
                type="button"
                variant="outline"
                onClick={() => setEditLineItemTarget(null)}
                {...motionTap}
              >
                <CancelIcon />
                {t("common.cancel")}
              </MotionButton>
              <MotionButton type="submit" disabled={editPriceSubmitting} {...motionTap}>
                {editPriceSubmitting ? <LoadingIconBtn /> : <SaveIconBtn />}
                {editPriceSubmitting ? t("common.saving") : t("common.save")}
              </MotionButton>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        title={t("clients.edit")}
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        wide
      >
        <form onSubmit={handleEditClient} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <ClientLogoUploader
              client={card}
              onUpdated={(updated) => setCard((prev) => (prev ? { ...prev, ...updated } : prev))}
            />
          </div>
          <FloatingLabelInput
            id="edit_company_name"
            label={t("clients.company")}
            required
            containerClassName="md:col-span-2"
            value={editForm.company_name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, company_name: e.target.value }))}
          />
          <FloatingLabelInput
            id="edit_contact"
            label={t("clients.contact")}
            value={editForm.contact_person}
            onChange={(e) => setEditForm((prev) => ({ ...prev, contact_person: e.target.value }))}
          />
          <FloatingLabelPhoneInput
            id="edit_phone"
            label={t("clients.phone")}
            value={editForm.phone}
            onValueChange={(phone) => setEditForm((prev) => ({ ...prev, phone }))}
          />
          <FloatingLabelInput
            id="edit_website"
            label={t("clients.website")}
            value={editForm.website}
            onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
          />
          <FloatingLabelInput
            id="edit_activity"
            label={t("clients.activity")}
            value={editForm.activity_type}
            onChange={(e) => setEditForm((prev) => ({ ...prev, activity_type: e.target.value }))}
          />
          <CountryCityFields
            country={editForm.country}
            city={editForm.city}
            onCountryChange={(country) => setEditForm((prev) => ({ ...prev, country }))}
            onCityChange={(city) => setEditForm((prev) => ({ ...prev, city }))}
          />
          <ActiveStatusToggle
            layout="field"
            label={t("clients.state")}
            active={editForm.status === "faol"}
            onActiveChange={(active) =>
              setEditForm((prev) => ({ ...prev, status: active ? "faol" : "nofaol" }))
            }
          />
          <FloatingLabelTextarea
            id="edit_notes"
            label={t("clients.notes")}
            rows={3}
            containerClassName="md:col-span-2"
            value={editForm.notes}
            onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
              <CancelIcon />
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={editClientSubmitting}>
              {editClientSubmitting ? <LoadingIconBtn /> : <SaveIconBtn />}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        title={t("clients.contractHistory")}
        open={historyContractId !== null}
        onClose={closeContractHistory}
        wide
      >
        <p className="mb-4 text-sm text-muted-foreground">{t("clients.contractHistoryDesc")}</p>
        <PremiumDataTable
          loading={historyLoading}
          empty={!historyLoading && historyEntries.length === 0}
          emptyMessage={t("clients.historyEmpty")}
          skeletonCols={3}
        >
          <TableHeader>
            <TableRow>
              <TableHead>{t("auditLog.time")}</TableHead>
              <TableHead>{t("auditLog.action")}</TableHead>
              <TableHead>{t("auditLog.summary")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyEntries.map((entry, index) => (
              <MotionTableRow key={entry.id} {...rowEnter(index)}>
                <TableCellDate>{formatDateTimeWithWeekday(entry.created_at)}</TableCellDate>
                <TableCellMuted>{auditActionLabel(entry.action, t)}</TableCellMuted>
                <TableCellPrimary subtitle={entry.username}>
                  {entry.summary ?? "—"}
                </TableCellPrimary>
              </MotionTableRow>
            ))}
          </TableBody>
        </PremiumDataTable>
      </Modal>

      <AlertDialog
        open={cancelItemTarget !== null}
        onOpenChange={(open) => !open && setCancelItemTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.cancelLineItemTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clients.cancelLineItemDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <CancelIcon />
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={busy} onClick={handleCancelLineItem}>
              <Trash2Icon data-icon="inline-start" />
              {t("clients.cancelLineItem")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelContractTarget !== null}
        onOpenChange={(open) => !open && setCancelContractTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.cancelContractTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clients.cancelContractDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <CancelIcon />
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={busy} onClick={handleCancelContract}>
              <XCircleIcon data-icon="inline-start" />
              {t("clients.cancelContract")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
