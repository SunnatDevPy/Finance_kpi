import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { CancelIcon, LoadingIconBtn, SaveIconBtn } from "@/components/ButtonIcons";
import { Modal } from "@/components/Modal";
import { MotionButton, motionTap } from "@/components/ui/button";
import { FloatingLabelDatePicker } from "@/components/ui/date-picker";
import { FloatingLabelInput, FloatingLabelMoneyInput } from "@/components/ui/floating-label-input";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useI18n } from "@/context/I18nContext";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import type { Client, Contract } from "@/types";
import { formatMoney, toNumber, toWholeAmountDigits } from "@/utils/format";

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

  const clientOptions = useMemo(
    () =>
      [...clients]
        .sort((a, b) => a.company_name.localeCompare(b.company_name, "uz"))
        .map((client) => ({ value: String(client.id), label: client.company_name })),
    [clients],
  );

  const contractOptions = useMemo(() => {
    const source = lockContract ? contracts : debtContracts;
    return source.map((contract) => ({
      value: String(contract.id),
      label: `${contract.contract_number ? `№${contract.contract_number} — ` : ""}${formatMoney(contract.debt_amount)} ${t("clients.debtShort").toLowerCase()}`,
    }));
  }, [contracts, debtContracts, lockContract, t]);

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
      .list({ limit: 1000 })
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

        <SearchableSelect
          id="quick-pay-client"
          label={t("contracts.selectClientLabel")}
          required
          value={form.client_id}
          options={clientOptions}
          placeholder={t("contracts.selectClient")}
          disabled={lockClient}
          onValueChange={handleClientChange}
        />

        <SearchableSelect
          id="quick-pay-contract"
          label={t("common.contract")}
          required
          value={form.contract_id}
          options={contractOptions}
          disabled={!form.client_id || contractsLoading || lockContract}
          placeholder={
            contractsLoading
              ? t("common.loading")
              : !form.client_id
                ? t("contracts.selectClient")
                : debtContracts.length === 0
                  ? t("clients.noDebtContracts")
                  : t("common.contract")
          }
          onValueChange={handleContractChange}
        />

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
