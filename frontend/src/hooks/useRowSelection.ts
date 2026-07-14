import { useCallback, useMemo, useState } from "react";

/** Bir nechta qatorni tanlab, keyin bulk amal (masalan eksport) qilish uchun umumiy hook. */
export function useRowSelection(pageIds: number[]) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pageSelectedCount = useMemo(
    () => pageIds.filter((id) => selected.has(id)).length,
    [pageIds, selected],
  );
  const allPageSelected = pageIds.length > 0 && pageSelectedCount === pageIds.length;
  const somePageSelected = pageSelectedCount > 0 && !allPageSelected;

  const toggleAllOnPage = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageIds.length > 0 && pageIds.every((id) => next.has(id));
      for (const id of pageIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, [pageIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selected,
    selectedIds: useMemo(() => Array.from(selected), [selected]),
    count: selected.size,
    isSelected: (id: number) => selected.has(id),
    toggle,
    toggleAllOnPage,
    allPageSelected,
    somePageSelected,
    clear,
  };
}
