import { useId, type MouseEvent, type PointerEvent } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  const stop = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onPointerDown?.(event);
  };

  if (layout === "field") {
    return (
      <div className={cn("flex flex-col gap-2", className)} onPointerDown={stop} onClick={onClick}>
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="flex h-10 items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3">
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
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-2.5", className)}
      onPointerDown={stop}
      onClick={onClick}
    >
      <Switch
        id={id}
        checked={active}
        onCheckedChange={onActiveChange}
        disabled={disabled}
        aria-label={label ?? statusLabel}
      />
      <Label htmlFor={id} className="cursor-pointer text-sm font-medium text-foreground">
        {statusLabel}
      </Label>
    </div>
  );
}
