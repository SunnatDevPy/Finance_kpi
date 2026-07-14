import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArchiveIcon,
  CheckCircle2Icon,
  CopyIcon,
  FileUpIcon,
  PencilIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import { useI18n } from "../context/I18nContext";
import type { MutationToastPayload, ToastAction } from "../lib/mutationToast";
import { subscribeMutationToasts } from "../lib/toastBus";
import { cn } from "@/lib/utils";

const MAX_TOASTS = 4;
const TOAST_TTL_MS = 4200;

interface ToastItem extends MutationToastPayload {
  id: string;
}

const ACTION_STYLES: Record<
  ToastAction,
  { icon: typeof CheckCircle2Icon; className: string }
> = {
  created: {
    icon: CheckCircle2Icon,
    className: "border-emerald-200/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/90 dark:text-emerald-100",
  },
  updated: {
    icon: PencilIcon,
    className: "border-sky-200/80 bg-sky-50/95 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/90 dark:text-sky-100",
  },
  deleted: {
    icon: ArchiveIcon,
    className: "border-amber-200/80 bg-amber-50/95 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/90 dark:text-amber-100",
  },
  restored: {
    icon: RotateCcwIcon,
    className: "border-violet-200/80 bg-violet-50/95 text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/90 dark:text-violet-100",
  },
  imported: {
    icon: FileUpIcon,
    className: "border-emerald-200/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/90 dark:text-emerald-100",
  },
  duplicated: {
    icon: CopyIcon,
    className: "border-sky-200/80 bg-sky-50/95 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/90 dark:text-sky-100",
  },
};

export function ToastViewport() {
  const { t } = useI18n();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((payload: MutationToastPayload) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { ...payload, id }].slice(-MAX_TOASTS));
    window.setTimeout(() => dismiss(id), TOAST_TTL_MS);
  }, [dismiss]);

  useEffect(() => subscribeMutationToasts(pushToast), [pushToast]);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed top-4 right-4 z-[120] flex w-[min(calc(100vw-2rem),22rem)] flex-col gap-2"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((toast) => {
          const style = ACTION_STYLES[toast.action];
          const Icon = style.icon;
          const message = t(`toast.${toast.action}.${toast.resource}`);

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 28, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border px-3.5 py-3 shadow-lg shadow-black/10 backdrop-blur-md",
                style.className,
              )}
              role="status"
            >
              <Icon className="mt-0.5 size-4 shrink-0 opacity-90" aria-hidden />
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label={t("common.close")}
              >
                <XIcon className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
