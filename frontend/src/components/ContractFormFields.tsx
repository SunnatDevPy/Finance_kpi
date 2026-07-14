import { AnimatePresence, motion } from "framer-motion";
import { PlusIcon } from "lucide-react";
import { FloatingLabelStatusSelect } from "./FloatingLabelStatusSelect";
import { RemoveIconBtn } from "./ButtonIcons";
import { DEFAULT_CONTRACT_WORKFLOW_STATUS } from "@/data/contractWorkflow";
import type { ContractWorkflowStatus } from "@/data/contractWorkflow";
import { DateRangePicker } from "./DateRangePicker";
import { MotionButton, motionTap } from "@/components/ui/button";
import {
  floatedLabel,
  FloatingLabelInput,
  FloatingLabelMoneyInput,
  FloatingLabelTextarea,
  labelPeer,
  restingLabel,
} from "@/components/ui/floating-label-input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/context/I18nContext";
import type { ContractFormLineItem, ServiceType } from "@/types";

export interface ContractFormState {
  start_date: string;
  end_date: string;
  status: ContractWorkflowStatus;
  contract_number: string;
  invoice_number: string;
  notes: string;
  line_items: ContractFormLineItem[];
}

interface ContractFormFieldsProps {
  form: ContractFormState;
  onChange: (patch: Partial<ContractFormState>) => void;
  serviceTypes: ServiceType[];
  contractNumberHint?: { last: string | null; next: string } | null;
  showContractNumberHint?: boolean;
  onAddLineItem: () => void;
  onRemoveLineItem: (index: number) => void;
}

export function emptyContractForm(
  serviceTypes: ServiceType[],
): ContractFormState {
  return {
    start_date: "",
    end_date: "",
    status: DEFAULT_CONTRACT_WORKFLOW_STATUS,
    contract_number: "",
    invoice_number: "",
    notes: "",
    line_items: [{ service_type_id: serviceTypes[0]?.id || 0, price: "" }],
  };
}

export function ContractFormFields({
  form,
  onChange,
  serviceTypes,
  contractNumberHint,
  showContractNumberHint = false,
  onAddLineItem,
  onRemoveLineItem,
}: ContractFormFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_11.5rem]">
        <div className="relative min-w-0 pt-3">
          <DateRangePicker
            formField
            className="w-full"
            from={form.start_date}
            to={form.end_date}
            onChange={(start_date, end_date) => onChange({ start_date, end_date })}
          />
          <label
            className={cn(
              labelPeer,
              form.start_date || form.end_date ? floatedLabel : restingLabel,
            )}
          >
            {t("contracts.period")}
            <span className="text-brand-500"> *</span>
          </label>
        </div>
        <FloatingLabelStatusSelect
          id="contract_workflow_status"
          label={t("contracts.state")}
          value={form.status}
          onValueChange={(status) => onChange({ status })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <FloatingLabelInput
            id="contract_number"
            label={t("contracts.contractNumber")}
            value={form.contract_number}
            onChange={(e) => onChange({ contract_number: e.target.value })}
          />
          {showContractNumberHint && contractNumberHint && (
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
          id="contract_invoice_number"
          label={t("contracts.invoiceNumber")}
          value={form.invoice_number}
          onChange={(e) => onChange({ invoice_number: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">
            {t("contracts.services")} <span className="text-brand-500">*</span>
          </span>
          <MotionButton type="button" variant="outline" size="sm" onClick={onAddLineItem} {...motionTap}>
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
              <div className="pt-2 pb-1">
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-border/50 bg-background/90 p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(12.5rem,14rem)_auto] sm:items-end sm:gap-3">
                  <div className="relative min-w-0 pt-3">
                    <Select
                      className="min-w-0"
                      value={String(item.service_type_id)}
                      onValueChange={(value) => {
                        if (!value) return;
                        const items = [...form.line_items];
                        items[index] = { ...items[index], service_type_id: parseInt(value, 10) };
                        onChange({ line_items: items });
                      }}
                    >
                      <SelectTrigger size="form" className="peer w-full">
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
                    <label className={cn(labelPeer, floatedLabel)}>
                      {t("clients.service")}
                      <span className="text-brand-500"> *</span>
                    </label>
                  </div>
                  <FloatingLabelMoneyInput
                    containerClassName="w-full min-w-0"
                    className="tabular-nums"
                    label={t("common.price")}
                    required
                    value={item.price}
                    onValueChange={(digits) => {
                      const items = [...form.line_items];
                      items[index] = { ...items[index], price: digits };
                      onChange({ line_items: items });
                    }}
                  />
                  {form.line_items.length > 1 ? (
                    <div className="flex justify-end pt-3 sm:justify-center">
                      <MotionButton
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-12 shrink-0 text-destructive"
                        onClick={() => onRemoveLineItem(index)}
                        {...motionTap}
                      >
                        <RemoveIconBtn />
                      </MotionButton>
                    </div>
                  ) : (
                    <span className="hidden sm:block" aria-hidden />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <FloatingLabelTextarea
        id="contract_notes"
        label={t("common.note")}
        rows={2}
        value={form.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    </div>
  );
}
