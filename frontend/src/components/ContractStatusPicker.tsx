import { Loader2Icon, PencilIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "../context/I18nContext";
import { CONTRACT_WORKFLOW_STATUSES, type ContractWorkflowStatus } from "@/data/contractWorkflow";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<ContractWorkflowStatus, string> = {
  yangi: "bg-amber-500",
  davom_etmoqda: "bg-emerald-500",
  tugadi: "bg-sky-500",
  toxtatildi: "bg-red-500",
};

interface ContractStatusPickerProps {
  value: ContractWorkflowStatus;
  onChange: (status: ContractWorkflowStatus) => void;
  loading?: boolean;
  className?: string;
}

/** Kontraktlar jadvalida statusni to'liq tahrirlash oynasiz, to'g'ridan-to'g'ri o'zgartirish uchun. */
export function ContractStatusPicker({ value, onChange, loading, className }: ContractStatusPickerProps) {
  const { t } = useI18n();

  return (
    <Select
      value={value}
      disabled={loading}
      onValueChange={(next) => {
        if (!next || next === value) return;
        onChange(next as ContractWorkflowStatus);
      }}
    >
      <SelectTrigger
        className={cn(
          "contract-workflow-badge",
          `contract-workflow-badge--${value}`,
          "h-6 w-fit shrink-0 cursor-pointer gap-1.5 rounded-md px-2.5 py-0 transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100",
          className,
        )}
        icon={
          loading ? (
            <Loader2Icon className="size-3 animate-spin opacity-70" aria-hidden />
          ) : (
            <PencilIcon className="size-3 opacity-60" aria-hidden />
          )
        }
      >
        <SelectValue>{t(`contractWorkflowStatus.${value}`)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="!w-auto !min-w-[10rem]">
        <SelectGroup>
          {CONTRACT_WORKFLOW_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])} aria-hidden />
              {t(`contractWorkflowStatus.${status}`)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
