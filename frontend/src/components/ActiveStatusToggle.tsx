import { useId, type MouseEvent, type PointerEvent } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  floatedLabel,
  labelPeer,
} from "@/components/ui/floating-label-input";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";

interface ActiveStatusToggleProps {
  active: boolean;
  onActiveChange: (active: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  layout?: "inline" | "field";
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

export function ActiveStatusToggle({
  active,
  onActiveChange,
  disabled = false,
  label,
  className,
  layout = "inline",
  onPointerDown,
  onClick,
}: ActiveStatusToggleProps) {
  const { t } = useI18n();
  const id = useId();
  const statusLabel = active ? t("status.active") : t("status.inactive");

  const stopPointer = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onPointerDown?.(event);
  };

  const stopClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onClick?.(event);
  };

  if (layout === "field") {
    return (
      <div className={cn("relative pt-3", className)} onPointerDown={stopPointer} onClick={stopClick}>
        <div className="flex h-12 items-center justify-between gap-3 rounded-lg border border-input bg-transparent px-3 shadow-sm dark:bg-input/30">
          <span
            className={cn(
              "text-sm font-medium",
              active ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
            )}
          >
            {statusLabel}
          </span>
          <Switch
            id={id}
            checked={active}
            onCheckedChange={onActiveChange}
            disabled={disabled}
            aria-label={label ?? statusLabel}
          />
        </div>
        {label && (
          <label htmlFor={id} className={cn(labelPeer, floatedLabel)}>
            {label}
          </label>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex w-[8.75rem] shrink-0 items-center gap-2.5", className)}
      onPointerDown={stopPointer}
      onClick={stopClick}
    >
      <Switch
        id={id}
        checked={active}
        onCheckedChange={onActiveChange}
        disabled={disabled}
        aria-label={label ?? statusLabel}
        className="shrink-0"
      />
      <Label
        htmlFor={id}
        className="w-[6.25rem] shrink-0 cursor-pointer text-sm font-medium text-foreground"
      >
        {statusLabel}
      </Label>
    </div>
  );
}
