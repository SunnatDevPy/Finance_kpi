import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { CancelIcon, LoadingIconBtn, SaveIconBtn } from "@/components/ButtonIcons";
import { Modal } from "@/components/Modal";
import { MotionButton, motionTap } from "@/components/ui/button";
import { FloatingLabelDatePicker } from "@/components/ui/date-picker";
import { FloatingLabelInput, FloatingLabelMoneyInput } from "@/components/ui/floating-label-input";
import { useI18n } from "@/context/I18nContext";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import type { Payment, PaymentListItem } from "@/types";
import { toWholeAmountDigits } from "@/utils/format";

interface PaymentEditModalProps {
  payment: PaymentListItem | Payment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentEditModal({ payment, onClose, onSuccess }: PaymentEditModalProps) {
  const { t } = useI18n();
  const { submitting, guard } = useSubmitGuard();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [contractLabel, setContractLabel] = useState("");
  const [form, setForm] = useState({
    amount: "",
    paid_at: "",
    note: "",
  });

  useEffect(() => {
    if (!payment) return;

    setError("");
    setLoading(!("company_name" in payment));

    if ("company_name" in payment) {
      const label = payment.contract_number
        ? `${payment.company_name} — №${payment.contract_number}`
        : payment.company_name;
      setContractLabel(label);
      setForm({
        amount: toWholeAmountDigits(payment.amount),
        paid_at: payment.paid_at,
        note: payment.note ?? "",
      });
      setLoading(false);
      return;
    }

    api.payments
      .get(payment.id)
      .then((data) => {
        setContractLabel(`${t("common.contract")} #${data.contract_id}`);
        setForm({
          amount: toWholeAmountDigits(data.amount),
          paid_at: data.paid_at,
          note: data.note ?? "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [payment, t]);

  const handleSubmit = guard(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payment) return;
    setError("");
    if (!form.paid_at) {
      setError(t("clients.selectDateError"));
      return;
    }
    const amount = Number.parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      setError(t("payments.amountRequired"));
      return;
    }
    try {
      await api.payments.update(payment.id, {
        amount,
        paid_at: form.paid_at,
        note: form.note.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  return (
    <Modal title={t("payments.editTitle")} open={payment !== null} onClose={onClose}>
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {contractLabel ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              {contractLabel}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FloatingLabelDatePicker
              id="edit-pay-date"
              label={t("common.date")}
              required
              value={form.paid_at}
              onChange={(value) => setForm((prev) => ({ ...prev, paid_at: value }))}
            />
            <FloatingLabelMoneyInput
              id="edit-pay-amount"
              label={t("common.amount")}
              required
              value={form.amount}
              onValueChange={(digits) => setForm((prev) => ({ ...prev, amount: digits }))}
            />
          </div>

          <FloatingLabelInput
            id="edit-pay-note"
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
      )}
    </Modal>
  );
}
