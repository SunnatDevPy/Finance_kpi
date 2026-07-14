import { useMemo } from "react";

import type { TableColumnPickerItem } from "@/components/TableColumnPicker";
import { useTableColumns } from "@/hooks/useTableColumns";

export interface PickerColumnDef<T extends string> {
  id: T;
  labelKey: string;
  defaultVisible: boolean;
}

export function usePickerColumns<T extends string>(
  storageKey: string,
  defs: readonly PickerColumnDef<T>[],
  t: (key: string) => string,
) {
  const columnDefs = useMemo(
    () => defs.map((column) => ({ id: column.id, defaultVisible: column.defaultVisible })),
    [defs],
  );
  const { isVisible, setColumnVisible, visibleCount } = useTableColumns(storageKey, columnDefs);
  const items: readonly TableColumnPickerItem<T>[] = useMemo(
    () => defs.map((column) => ({ id: column.id, label: t(column.labelKey) })),
    [defs, t],
  );

  return { isVisible, setColumnVisible, visibleCount, items };
}
