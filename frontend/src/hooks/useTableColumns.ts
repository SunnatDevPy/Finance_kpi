import { useCallback, useMemo, useState } from "react";

export interface TableColumnDef<T extends string> {
  id: T;
  defaultVisible: boolean;
}

function readStoredVisibility<T extends string>(
  storageKey: string,
  defaults: Record<T, boolean>,
): Record<T, boolean> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<T, boolean>>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function useTableColumns<T extends string>(
  storageKey: string,
  columns: readonly TableColumnDef<T>[],
) {
  const defaults = useMemo(
    () =>
      Object.fromEntries(columns.map((column) => [column.id, column.defaultVisible])) as Record<
        T,
        boolean
      >,
    [columns],
  );

  const [visible, setVisible] = useState<Record<T, boolean>>(() =>
    readStoredVisibility(storageKey, defaults),
  );

  const isVisible = useCallback((id: T) => visible[id] ?? defaults[id], [defaults, visible]);

  const setColumnVisible = useCallback(
    (id: T, value: boolean) => {
      setVisible((prev) => {
        const next = { ...prev, [id]: value };
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  const visibleCount = useMemo(
    () => columns.filter((column) => isVisible(column.id)).length,
    [columns, isVisible],
  );

  return { isVisible, setColumnVisible, visibleCount };
}
