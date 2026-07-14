import { useEffect, useState } from "react";

/**
 * Same as useState, but persists the value to localStorage so filters
 * (search text, date range, etc.) survive navigating away and back.
 */
export function usePersistedState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage may be unavailable (private mode, quota) — ignore.
    }
  }, [key, value]);

  return [value, setValue];
}
