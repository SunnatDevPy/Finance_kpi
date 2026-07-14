import { motion, AnimatePresence } from "framer-motion";
import { DownloadIcon, XIcon } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { MotionButton, motionTap } from "@/components/ui/button";

export function PwaInstallBanner() {
  const { t } = useI18n();
  const { canInstall, install, dismiss } = usePwaInstall();

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 z-[110] mx-auto max-w-md pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-xl shadow-black/10 backdrop-blur-md">
            <img
              src="/pwa-192.png"
              alt=""
              className="size-11 shrink-0 rounded-xl border border-border/50"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t("pwa.installTitle")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("pwa.installDesc")}</p>
              <div className="mt-3 flex gap-2">
                <MotionButton size="sm" onClick={() => install()} {...motionTap}>
                  <DownloadIcon data-icon="inline-start" />
                  {t("pwa.installAction")}
                </MotionButton>
                <MotionButton size="sm" variant="ghost" onClick={dismiss} {...motionTap}>
                  {t("pwa.later")}
                </MotionButton>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("common.close")}
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
