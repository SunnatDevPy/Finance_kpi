import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const NOTIFY_DAYS_KEY = "finance_notify_days";
const DEFAULT_NOTIFY_DAYS = 30;

function readNotifyDays(): number {
  const saved = localStorage.getItem(NOTIFY_DAYS_KEY);
  if (!saved) return DEFAULT_NOTIFY_DAYS;
  const value = Number.parseInt(saved, 10);
  if (Number.isNaN(value)) return DEFAULT_NOTIFY_DAYS;
  return Math.min(365, Math.max(1, value));
}

interface PreferencesContextValue {
  notifyDays: number;
  setNotifyDays: (days: number) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [notifyDays, setNotifyDaysState] = useState(readNotifyDays);

  const setNotifyDays = useCallback((days: number) => {
    const normalized = Math.min(365, Math.max(1, days));
    setNotifyDaysState(normalized);
    localStorage.setItem(NOTIFY_DAYS_KEY, String(normalized));
  }, []);

  const value = useMemo(
    () => ({ notifyDays, setNotifyDays }),
    [notifyDays, setNotifyDays],
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
