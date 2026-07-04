import { useState } from "react";
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react";
import { api } from "../api/client";
import { useI18n } from "../context/I18nContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExportResource = "clients" | "contracts" | "payments" | "debts";

interface ExportButtonsProps {
  resource: ExportResource;
  dateFrom?: string;
  dateTo?: string;
  showLabel?: boolean;
  /** Dark hero/banner backgrounds — glass-style buttons instead of solid white */
  onDark?: boolean;
}

const LABEL_KEYS: Record<ExportResource, string> = {
  clients: "export.clients",
  contracts: "export.contracts",
  payments: "export.payments",
  debts: "export.debts",
};

export function ExportButtons({
  resource,
  dateFrom,
  dateTo,
  showLabel = true,
  onDark = false,
}: ExportButtonsProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState("");

  const dateParams =
    dateFrom || dateTo ? { date_from: dateFrom, date_to: dateTo } : undefined;

  const handleExport = async (format: "xlsx" | "pdf") => {
    setError("");
    setLoading(format);
    try {
      await api.export.download(resource, format, dateParams);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("export.failed"));
    } finally {
      setLoading(null);
    }
  };

  const darkBtn =
    "relative min-w-[5.25rem] rounded-none border-0 shadow-none !bg-white/10 !text-white/90 hover:!bg-white/18 hover:!text-white active:translate-y-0 disabled:opacity-100 dark:!bg-white/10 dark:hover:!bg-white/18";
  const darkGroup = "border-white/20 bg-white/5 backdrop-blur-sm";
  const darkDivider = "border-white/15";
  const lightBtn =
    "relative min-w-[5.25rem] rounded-none border-0 shadow-none active:translate-y-0 disabled:opacity-100";

  const renderExportButton = (
    format: "xlsx" | "pdf",
    label: string,
    Icon: typeof FileSpreadsheetIcon,
    divider?: boolean,
  ) => {
    const isLoading = loading === format;
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={
          onDark
            ? cn(darkBtn, divider && `border-r ${darkDivider}`)
            : cn(lightBtn, divider && "border-r border-border/70")
        }
        disabled={loading !== null}
        onClick={() => handleExport(format)}
        aria-busy={isLoading}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1 transition-opacity duration-150",
            isLoading && "invisible",
          )}
        >
          <Icon data-icon="inline-start" />
          {label}
        </span>
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
          </span>
        )}
      </Button>
    );
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {showLabel && (
          <span
            className={
              onDark
                ? "hidden text-xs font-medium text-white/60 sm:inline"
                : "hidden text-xs font-medium text-muted-foreground sm:inline"
            }
          >
            {t(LABEL_KEYS[resource])}
          </span>
        )}
        <div
          className={
            onDark
              ? `inline-flex overflow-hidden rounded-lg border shadow-sm ${darkGroup}`
              : "inline-flex overflow-hidden rounded-lg border border-border/70 shadow-sm"
          }
        >
          {renderExportButton("xlsx", t("export.excel"), FileSpreadsheetIcon, true)}
          {renderExportButton("pdf", t("export.pdf"), FileTextIcon)}
        </div>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <DownloadIcon className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}
