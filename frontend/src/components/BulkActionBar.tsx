import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  children?: ReactNode;
  className?: string;
}

/** Bir nechta qator tanlanganda tepada chiqadigan ommaviy amallar paneli. */
export function BulkActionBar({ count, onClear, children, className }: BulkActionBarProps) {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={className}
        >
          <div className="mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-3 sm:mx-6">
            <span className="text-sm font-semibold text-foreground">
              {t("common.selectedCount").replace("{count}", String(count))}
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {children}
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                <XIcon data-icon="inline-start" />
                {t("common.clearSelection")}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
