import { useCallback } from "react";
import type { TableSortOrder } from "@/components/SortableTableHead";
import { usePersistedState } from "@/hooks/usePersistedState";

export function useTableSort<T extends string>(
  storageKey: string,
  defaultColumn: T,
  defaultOrder: TableSortOrder = "desc",
  ascColumns: readonly T[] = [],
) {
  const [sortBy, setSortBy] = usePersistedState<T>(`${storageKey}.sortBy`, defaultColumn);
  const [sortOrder, setSortOrder] = usePersistedState<TableSortOrder>(
    `${storageKey}.sortOrder`,
    defaultOrder,
  );

  const handleSort = useCallback(
    (column: T) => {
      if (sortBy === column) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        return;
      }
      setSortBy(column);
      setSortOrder(ascColumns.includes(column) ? "asc" : "desc");
    },
    [ascColumns, setSortBy, setSortOrder, sortBy, sortOrder],
  );

  return { sortBy, sortOrder, handleSort };
}
