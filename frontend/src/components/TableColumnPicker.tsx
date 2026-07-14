import { useEffect, useRef, useState } from "react";
import { Columns3Icon } from "lucide-react";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";

export interface TableColumnPickerItem<T extends string> {
  id: T;
  label: string;
}

interface TableColumnPickerProps<T extends string> {
  columns: readonly TableColumnPickerItem<T>[];
  isVisible: (id: T) => boolean;
  onVisibleChange: (id: T, visible: boolean) => void;
  className?: string;
}

export function TableColumnPicker<T extends string>({
  columns,
  isVisible,
  onVisibleChange,
  className,
}: TableColumnPickerProps<T>) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <MotionButton
        type="button"
        variant="outline"
        size="sm"
        className="h-10"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        {...motionTap}
      >
        <Columns3Icon data-icon="inline-start" className="size-4" />
        {t("common.columns")}
      </MotionButton>
      {open && (
        <div
          role="dialog"
          aria-label={t("common.columns")}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border/80 bg-card p-2 shadow-lg"
        >
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {t("common.columnsDesc")}
          </p>
          <ul className="flex flex-col gap-0.5">
            {columns.map((column) => (
              <li key={column.id}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/60">
                  <span className="font-medium text-foreground">{column.label}</span>
                  <Switch
                    checked={isVisible(column.id)}
                    onCheckedChange={(checked) => onVisibleChange(column.id, checked)}
                    aria-label={column.label}
                  />
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
