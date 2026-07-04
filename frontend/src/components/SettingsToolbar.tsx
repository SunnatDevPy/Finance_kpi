import { MoonIcon, SunIcon } from "lucide-react";
import { useI18n, type Locale } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { HEADER_TOOLBAR_BTN, HEADER_TOOLBAR_SELECT } from "./header-toolbar";

const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: "uz", label: "O'zbek", flag: "/flags/uz.svg" },
  { value: "ru", label: "Русский", flag: "/flags/ru.svg" },
];

function FlagIcon({ src, label }: { src: string; label: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className="h-[14px] w-[21px] shrink-0 rounded-[2px] object-cover border border-border/60"
      title={label}
    />
  );
}

function localeMeta(locale: Locale) {
  return LOCALES.find((item) => item.value === locale) ?? LOCALES[0];
}

interface SettingsToolbarProps {
  variant?: "sidebar" | "floating" | "header" | "login";
}

export function SettingsToolbar({ variant = "sidebar" }: SettingsToolbarProps) {
  const { locale, setLocale, t } = useI18n();
  const { toggleTheme, isDark } = useTheme();
  const current = localeMeta(locale);

  const wrapperClass =
    variant === "sidebar"
      ? "flex flex-col gap-2"
      : "flex items-center gap-2";

  const selectTriggerClass =
    variant === "sidebar"
      ? "h-9 rounded-lg border-brand-600/50 bg-brand-800/40 text-brand-100"
      : variant === "login"
        ? "h-9 min-w-[132px] rounded-lg border-border bg-card text-foreground shadow-sm"
        : HEADER_TOOLBAR_SELECT;

  const themeButtonClass =
    variant === "sidebar"
      ? "h-9 w-full rounded-lg border-brand-600/50 bg-brand-800/40 text-brand-100 hover:bg-brand-800 hover:text-white"
      : variant === "login"
        ? "h-9 rounded-lg border-border bg-card px-3 text-foreground shadow-sm"
        : HEADER_TOOLBAR_BTN;

  return (
    <div className={wrapperClass}>
      <Select value={locale} onValueChange={(v) => v && setLocale(v as Locale)}>
        <SelectTrigger className={selectTriggerClass} aria-label={t("settings.language")}>
          <span className="flex items-center gap-2">
            <FlagIcon src={current.flag} label={current.label} />
            <span
              className={cn(
                "truncate text-sm",
                variant === "header" && "hidden sm:inline",
              )}
            >
              {current.label}
            </span>
          </span>
        </SelectTrigger>
        <SelectContent>
          {LOCALES.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              <span className="flex items-center gap-2">
                <FlagIcon src={item.flag} label={item.label} />
                <span>{item.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size={variant === "header" ? "icon-lg" : variant === "sidebar" ? "sm" : "default"}
        onClick={toggleTheme}
        className={themeButtonClass}
        aria-label={t("settings.toggleTheme")}
        title={isDark ? t("settings.light") : t("settings.dark")}
      >
        {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        {variant !== "header" && (
          <span className="ml-2 text-xs">
            {isDark ? t("settings.light") : t("settings.dark")}
          </span>
        )}
      </Button>
    </div>
  );
}
