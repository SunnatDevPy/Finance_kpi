import { useEffect, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "../context/I18nContext";
import { canAutoReload, reloadNow } from "../lib/runtimeRecovery";
import { Button } from "@/components/ui/button";

const AUTO_RELOAD_SECONDS = 5;

export function AppRecoveryFallback() {
  const { t } = useI18n();
  const [secondsLeft, setSecondsLeft] = useState(AUTO_RELOAD_SECONDS);
  const autoReloadEnabled = canAutoReload();

  useEffect(() => {
    if (!autoReloadEnabled) return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          reloadNow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [autoReloadEnabled]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm"
      >
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <RefreshCwIcon className="size-5 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">{t("recovery.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {autoReloadEnabled ? t("recovery.description") : t("recovery.maxRetries")}
        </p>
        {autoReloadEnabled && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("recovery.reloadingIn").replace("{seconds}", String(secondsLeft))}
          </p>
        )}
        <Button className="mt-5 w-full" onClick={reloadNow}>
          <RefreshCwIcon data-icon="inline-start" />
          {t("recovery.reloadNow")}
        </Button>
      </motion.div>
    </div>
  );
}
