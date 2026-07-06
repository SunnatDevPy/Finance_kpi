import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  BanIcon,
  BanknoteIcon,
  Building2Icon,
  ClipboardCheckIcon,
  FileTextIcon,
  ReceiptIcon,
  RotateCcwIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react";
import { api } from "../api/client";
import { CancelIcon, LoadingIconBtn, SaveIconBtn } from "../components/ButtonIcons";
import { ClientLogoUploader } from "../components/ClientLogoUploader";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { ContractStatusBadge } from "../components/ContractStatusBadge";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
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
import { FloatingLabelDatePicker } from "@/components/ui/date-picker";
import { FloatingLabelInput, FloatingLabelMoneyInput } from "@/components/ui/floating-label-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientCard, Payment } from "../types";
import { cn } from "@/lib/utils";
import { formatDateWithWeekday, formatMoney, toNumber } from "../utils/format";

export function ClientCardPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [card, setCard] = useState<ClientCard | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [payModal, setPayModal] = useState<number | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", paid_at: "", note: "" });
  const [payType, setPayType] = useState<"income" | "refund">("income");
  const [cancelItemTarget, setCancelItemTarget] = useState<{
    contractId: number;
    lineItemId: number;
  } | null>(null);
  const [cancelContractTarget, setCancelContractTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const { submitting: payingSubmitting, guard: guardPayment } = useSubmitGuard();

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
        const pages = await Promise.all(
          contractIds.map((contractId) =>
            api.payments.list({ contractId, limit: 200 }),
          ),
        );
        setPayments(pages.flatMap((p) => p.items));
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, [id]);

  const handlePayment = guardPayment(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setError("");
    if (!payForm.paid_at) {
      setError(t("clients.selectDateError"));
      return;
    }
    try {
      const magnitude = Math.abs(parseFloat(payForm.amount));
      await api.payments.create({
        contract_id: payModal,
        amount: payType === "refund" ? -magnitude : magnitude,
        paid_at: payForm.paid_at,
        note: payForm.note || undefined,
      });
      setPayModal(null);
      setPayForm({ amount: "", paid_at: "", note: "" });
      setPayType("income");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  const handleDownloadDocument = async (
    contractId: number,
    type: "invoice" | "act",
    contractNumber: string | null,
  ) => {
    setError("");
    try {
      await api.contracts.downloadDocument(contractId, type, contractNumber);
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

  const handleReactivateLineItem = async (contractId: number, lineItemId: number) => {
    setError("");
    try {
      await api.contracts.reactivateLineItem(contractId, lineItemId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleCancelContract = async () => {
    if (!cancelContractTarget) return;
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

  return (
    <PageShell>
      <Button variant="ghost" size="sm" className="-mb-2 w-fit" render={<Link to="/clients" />}>
        <ArrowLeftIcon data-icon="inline-start" />
        {t("nav.clients")}
      </Button>

      <PageHeader
        title={card.company_name}
        subtitle={t("clients.card")}
        badge={<StatusBadge status={card.status} />}
      />

      <PageError message={error} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title={t("clients.totalDebt")}
          value={formatMoney(card.total_debt)}
          accent="red"
        />
        <StatCard
          title={t("common.contracts")}
          value={String(card.contracts.length)}
          accent="blue"
          icon={FileTextIcon}
        />
        <StatCard
          title={t("clients.contact")}
          value={card.contact_person || "—"}
          subtitle={card.phone || undefined}
          accent="green"
          icon={UserIcon}
        />
      </div>

      <Card className="content-card">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2Icon className="size-4 text-primary" />
            {t("clients.basicInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-5">
          <ClientLogoUploader
            client={card}
            size="lg"
            onUpdated={(updated) => setCard((prev) => (prev ? { ...prev, ...updated } : prev))}
          />
          <dl className="info-grid grid grid-cols-1 gap-5 md:grid-cols-2">
            {(
              [
                [t("clients.phone"), card.phone],
                [t("clients.website"), card.website],
                [t("clients.country"), card.country],
                [t("clients.city"), card.city],
                [t("clients.activity"), card.activity_type],
                [t("clients.notes"), card.notes],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="content-card">
        <CardHeader className="border-b">
          <CardTitle className="text-base">{t("common.contracts")}</CardTitle>
          <CardDescription>{t("clients.contractsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {card.contracts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("clients.noContracts")}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {card.contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {contract.contract_number && (
                          <span className="text-sm font-semibold text-primary/80">
                            №{contract.contract_number}
                          </span>
                        )}
                        <p className="font-semibold text-foreground">
                          {formatDateWithWeekday(contract.start_date, "short")} — {formatDateWithWeekday(contract.end_date, "short")}
                        </p>
                        {contract.is_cancelled ? (
                          <Badge variant="secondary" className="gap-1 text-muted-foreground">
                            <XCircleIcon className="size-3" />
                            {t("clients.cancelled")}
                          </Badge>
                        ) : (
                          <ContractStatusBadge endDate={contract.end_date} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("common.id")}: {contract.id}
                        {contract.invoice_number && (
                          <> · {t("contracts.invoiceNumber")}: {contract.invoice_number}</>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <MotionButton
                        size="icon-sm"
                        variant="ghost"
                        title={t("contracts.downloadInvoice")}
                        onClick={() => handleDownloadDocument(contract.id, "invoice", contract.contract_number)}
                        {...motionTap}
                      >
                        <ReceiptIcon data-icon="inline-start" />
                      </MotionButton>
                      <MotionButton
                        size="icon-sm"
                        variant="ghost"
                        title={t("contracts.downloadAct")}
                        onClick={() => handleDownloadDocument(contract.id, "act", contract.contract_number)}
                        {...motionTap}
                      >
                        <ClipboardCheckIcon data-icon="inline-start" />
                      </MotionButton>
                      {!contract.is_cancelled && (
                        <MotionButton
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCancelContractTarget(contract.id)}
                          {...motionTap}
                        >
                          <BanIcon data-icon="inline-start" />
                          {t("clients.cancelContract")}
                        </MotionButton>
                      )}
                      <MotionButton
                        size="sm"
                        onClick={() => {
                          setPayModal(contract.id);
                          setPayType("income");
                          setPayForm({
                            amount: "",
                            paid_at: new Date().toISOString().split("T")[0],
                            note: "",
                          });
                        }}
                        {...motionTap}
                      >
                        <BanknoteIcon data-icon="inline-start" />
                        {t("clients.payment")}
                      </MotionButton>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 border-b border-border/40 px-4 py-3 text-sm sm:grid-cols-3">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("common.total")}
                      </span>
                      <p className="mt-0.5 font-semibold tabular-nums">{formatMoney(contract.total_amount)}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("common.paid")}
                      </span>
                      <p className="mt-0.5 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatMoney(contract.paid_amount)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {toNumber(contract.debt_amount) < 0 ? t("clients.overpaid") : t("common.debt")}
                      </span>
                      <p
                        className={cn(
                          "mt-0.5 font-semibold tabular-nums",
                          toNumber(contract.debt_amount) < 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {formatMoney(
                          toNumber(contract.debt_amount) < 0
                            ? Math.abs(toNumber(contract.debt_amount))
                            : contract.debt_amount,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="p-3">
                    <PremiumDataTable skeletonCols={3} skeletonRows={3}>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("clients.service")}</TableHead>
                          <TableHead className="text-right">{t("common.price")}</TableHead>
                          <TableHead className="text-right">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contract.line_items.map((item, index) => (
                          <MotionTableRow key={item.id} {...rowEnter(index)}>
                            <TableCellPrimary
                              className={cn(item.is_cancelled && "text-muted-foreground line-through")}
                            >
                              {item.service_type_name}
                              {item.is_cancelled && (
                                <Badge variant="secondary" className="ml-2 align-middle text-[10px]">
                                  {t("clients.cancelled")}
                                </Badge>
                              )}
                            </TableCellPrimary>
                            <TableCellMoney
                              tone="neutral"
                              className={cn("text-right", item.is_cancelled && "text-muted-foreground line-through")}
                            >
                              {formatMoney(item.price)}
                            </TableCellMoney>
                            <TableCell className="text-right">
                              {item.is_cancelled ? (
                                <MotionButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReactivateLineItem(contract.id, item.id)}
                                  {...motionTap}
                                >
                                  <RotateCcwIcon data-icon="inline-start" />
                                  {t("clients.reactivateLineItem")}
                                </MotionButton>
                              ) : (
                                <MotionButton
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() =>
                                    setCancelItemTarget({ contractId: contract.id, lineItemId: item.id })
                                  }
                                  {...motionTap}
                                >
                                  <XCircleIcon data-icon="inline-start" />
                                  {t("clients.cancelLineItem")}
                                </MotionButton>
                              )}
                            </TableCell>
                          </MotionTableRow>
                        ))}
                      </TableBody>
                    </PremiumDataTable>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card className="content-card">
          <CardHeader className="border-b">
            <CardTitle className="text-base">{t("clients.paymentHistory")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PremiumDataTable skeletonCols={4}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.contract")}</TableHead>
                  <TableHead>{t("common.amount")}</TableHead>
                  <TableHead>{t("common.note")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p, index) => (
                  <MotionTableRow key={p.id} {...rowEnter(index)}>
                    <TableCellDate>{formatDateWithWeekday(p.paid_at)}</TableCellDate>
                    <TableCellMuted>#{p.contract_id}</TableCellMuted>
                    <TableCellMoney tone="positive">{formatMoney(p.amount)}</TableCellMoney>
                    <TableCellMuted>{p.note}</TableCellMuted>
                  </MotionTableRow>
                ))}
              </TableBody>
            </PremiumDataTable>
          </CardContent>
        </Card>
      )}

      <Modal
        title={t("clients.addPayment")}
        open={payModal !== null}
        onClose={() => setPayModal(null)}
      >
        <form onSubmit={handlePayment} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="label">{t("clients.paymentType")}</label>
              <Select value={payType} onValueChange={(value) => value && setPayType(value as "income" | "refund")}>
                <SelectTrigger className="h-12 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="income">{t("clients.paymentTypeIncome")}</SelectItem>
                    <SelectItem value="refund">{t("clients.paymentTypeRefund")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <FloatingLabelDatePicker
              id="paid_at"
              label={t("common.date")}
              required
              value={payForm.paid_at}
              onChange={(value) => setPayForm({ ...payForm, paid_at: value })}
            />
          </div>
          <FloatingLabelMoneyInput
            id="amount"
            label={t("common.amount")}
            required
            value={payForm.amount}
            onValueChange={(digits) => setPayForm({ ...payForm, amount: digits })}
          />
          <FloatingLabelInput
            id="note"
            label={t("common.note")}
            value={payForm.note}
            onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <MotionButton type="button" variant="outline" onClick={() => setPayModal(null)} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" disabled={payingSubmitting} {...motionTap}>
              {payingSubmitting ? <LoadingIconBtn /> : <SaveIconBtn />}
              {payingSubmitting ? t("common.saving") : t("common.save")}
            </MotionButton>
          </div>
        </form>
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
              <XCircleIcon data-icon="inline-start" />
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
              <BanIcon data-icon="inline-start" />
              {t("clients.cancelContract")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
