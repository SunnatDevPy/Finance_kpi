import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { CancelIcon, LoadingIconBtn, SaveIconBtn } from "@/components/ButtonIcons";
import { Modal } from "@/components/Modal";
import { MotionButton, motionTap } from "@/components/ui/button";
import { FloatingLabelDatePicker } from "@/components/ui/date-picker";
import { FloatingLabelInput, FloatingLabelMoneyInput } from "@/components/ui/floating-label-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/context/I18nContext";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import type { Client, Contract } from "@/types";
import { formatAmount, toNumber, toWholeAmountDigits } from "@/utils/format";

export type QuickPaymentTarget =
  | { kind: "client"; clientId: number }
  | { kind: "contract"; contract: Contract };

interface QuickPaymentModalProps {
  target: QuickPaymentTarget | null;
  onClose: () => void;
  onSuccess: () => void;
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function QuickPaymentModal({ target, onClose, onSuccess }: QuickPaymentModalProps) {
  const { t } = useI18n();
  const { submitting, guard } = useSubmitGuard();
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    contract_id: "",
    amount: "",
    paid_at: todayIso(),
    note: "",
  });

  const lockClient = target?.kind === "client" || target?.kind === "contract";
  const lockContract = target?.kind === "contract";

  const debtContracts = useMemo(
    () => contracts.filter((contract) => toNumber(contract.debt_amount) > 0),
    [contracts],
  );

  useEffect(() => {
    if (!target) return;

    setError("");
    const clientId =
      target.kind === "client" ? String(target.clientId) : String(target.contract.client_id);
    const contractId = target.kind === "contract" ? String(target.contract.id) : "";
    const amount =
      target.kind === "contract"
        ? toWholeAmountDigits(target.contract.debt_amount)
        : "";

    setForm({
      client_id: clientId,
      contract_id: contractId,
      amount,
      paid_at: todayIso(),
      note: "",
    });

    api.clients
      .list({ limit: 200 })
      .then((data) => setClients(data.items))
      .catch(() => setClients([]));

    setContractsLoading(true);
    api.contracts
      .list({
        clientId: parseInt(clientId, 10),
        limit: 200,
      })
      .then((data) => {
        setContracts(data.items);
        if (target.kind === "client") {
          const withDebt = data.items.filter((contract) => toNumber(contract.debt_amount) > 0);
          if (withDebt.length === 1) {
            const only = withDebt[0];
            setForm((prev) => ({
              ...prev,
              contract_id: String(only.id),
              amount: toWholeAmountDigits(only.debt_amount),
            }));
          }
        }
      })
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false));
  }, [target]);

  const handleClientChange = (clientId: string) => {
    setForm((prev) => ({ ...prev, client_id: clientId, contract_id: "", amount: "" }));
    setContracts([]);
    if (!clientId) return;

    setContractsLoading(true);
    api.contracts
      .list({ clientId: parseInt(clientId, 10), limit: 200 })
      .then((data) => setContracts(data.items))
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false));
  };

  const handleContractChange = (contractId: string) => {
    const contract = contracts.find((item) => String(item.id) === contractId);
    setForm((prev) => ({
      ...prev,
      contract_id: contractId,
      amount: contract ? toWholeAmountDigits(contract.debt_amount) : "",
    }));
  };

  const handleSubmit = guard(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!form.contract_id) {
      setError(t("contracts.selectClientError"));
      return;
    }
    if (!form.paid_at) {
      setError(t("clients.selectDateError"));
      return;
    }
    try {
      await api.payments.create({
        contract_id: parseInt(form.contract_id, 10),
        amount: parseFloat(form.amount),
        paid_at: form.paid_at,
        note: form.note || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  return (
    <Modal title={t("clients.addPayment")} open={target !== null} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="quick-pay-client">{t("contracts.selectClientLabel")} *</Label>
          <Select
            value={form.client_id}
            onValueChange={(value) => value && handleClientChange(value)}
            disabled={lockClient}
          >
            <SelectTrigger id="quick-pay-client" className="h-12 w-full">
              <SelectValue placeholder={t("contracts.selectClient")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={String(client.id)}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="quick-pay-contract">{t("common.contract")} *</Label>
          <Select
            value={form.contract_id}
            onValueChange={(value) => value && handleContractChange(value)}
            disabled={!form.client_id || contractsLoading || lockContract}
          >
            <SelectTrigger id="quick-pay-contract" className="h-12 w-full">
              <SelectValue
                placeholder={
                  contractsLoading
                    ? t("common.loading")
                    : !form.client_id
                      ? t("contracts.selectClient")
                      : debtContracts.length === 0
                        ? t("clients.noDebtContracts")
                        : t("common.contract")
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(lockContract ? contracts : debtContracts).map((contract) => (
                  <SelectItem key={contract.id} value={String(contract.id)}>
                    {contract.contract_number ? `№${contract.contract_number} — ` : ""}
                    {formatAmount(contract.debt_amount)} {t("clients.debtShort").toLowerCase()}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FloatingLabelDatePicker
            id="quick-pay-date"
            label={t("common.date")}
            required
            value={form.paid_at}
            onChange={(value) => setForm((prev) => ({ ...prev, paid_at: value }))}
          />
          <FloatingLabelMoneyInput
            id="quick-pay-amount"
            label={t("common.amount")}
            required
            value={form.amount}
            onValueChange={(digits) => setForm((prev) => ({ ...prev, amount: digits }))}
          />
        </div>

        <FloatingLabelInput
          id="quick-pay-note"
          label={t("common.note")}
          value={form.note}
          onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
        />

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <MotionButton type="button" variant="outline" onClick={onClose} {...motionTap}>
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
  );
}
