import {
  floatedLabel,
  labelPeer,
} from "@/components/ui/floating-label-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/context/I18nContext";
import {
  CONTRACT_WORKFLOW_STATUSES,
  type ContractWorkflowStatus,
} from "@/data/contractWorkflow";
import { cn } from "@/lib/utils";

interface FloatingLabelStatusSelectProps {
  label: string;
  value: ContractWorkflowStatus;
  onValueChange: (value: ContractWorkflowStatus) => void;
  id?: string;
  required?: boolean;
  containerClassName?: string;
}

export function FloatingLabelStatusSelect({
  label,
  value,
  onValueChange,
  id = "contract-status",
  required,
  containerClassName,
}: FloatingLabelStatusSelectProps) {
  const { t } = useI18n();

  return (
    <div className={cn("relative pt-3", containerClassName)}>
      <Select
        value={value}
        onValueChange={(next) => {
          if (!next) return;
          onValueChange(next as ContractWorkflowStatus);
        }}
      >
        <SelectTrigger id={id} size="form" className="peer w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {CONTRACT_WORKFLOW_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`contractWorkflowStatus.${status}`)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <label htmlFor={id} className={cn(labelPeer, floatedLabel)}>
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </label>
    </div>
  );
}
