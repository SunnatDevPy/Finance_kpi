import { useCallback, useRef, useState } from "react";

/** Initial fetch shows full loading; silent refetches do not touch UI state. */
export function useListLoading(initialLoading = true) {
  const [loading, setLoading] = useState(initialLoading);
  const hasLoaded = useRef(false);

  const start = useCallback((silent = false) => {
    if (silent && hasLoaded.current) return;
    setLoading(true);
  }, []);

  const finish = useCallback(() => {
    setLoading(false);
    hasLoaded.current = true;
  }, []);

  return { loading, start, finish };
}
