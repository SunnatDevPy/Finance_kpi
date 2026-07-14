import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileTextIcon } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";
import { formatMoney, toNumber } from "@/utils/format";
import type { Contract } from "@/types";

interface ClientFinanceSummaryProps {
  contracts: Contract[];
  totalDebt: string;
}

export function ClientFinanceSummary({ contracts, totalDebt }: ClientFinanceSummaryProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const totalAmount = contracts.reduce((sum, c) => sum + toNumber(c.total_amount), 0);
    const totalPaid = contracts.reduce((sum, c) => sum + toNumber(c.paid_amount), 0);
    const debt = toNumber(totalDebt);
    return {
      totalAmount,
      totalPaid,
      debt,
      count: contracts.length,
      isOverpaid: debt < 0,
    };
  }, [contracts, totalDebt]);

  const metrics: {
    label: string;
    value: string;
    tone: string;
    compact?: boolean;
  }[] = [
    {
      label: t("clients.contractsTotal"),
      value: formatMoney(stats.totalAmount),
      tone: "text-foreground",
    },
    {
      label: t("clients.totalReceived"),
      value: formatMoney(stats.totalPaid),
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: stats.isOverpaid ? t("clients.overpaid") : t("clients.totalDebt"),
      value: formatMoney(stats.isOverpaid ? Math.abs(stats.debt) : stats.debt),
      tone: stats.isOverpaid
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400",
    },
    {
      label: t("clients.contractsCount"),
      value: String(stats.count),
      tone: "text-primary",
      compact: true,
    },
  ];

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg",
        "from-blue-50/90 via-white to-indigo-50/50 border-blue-200/50",
        "dark:from-blue-950/50 dark:via-card dark:to-indigo-950/30 dark:border-blue-800/40",
        "stat-card-glow-blue",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl border border-blue-200/80 bg-blue-500/10 text-blue-600 dark:border-blue-700/50 dark:bg-blue-400/10 dark:text-blue-400">
            <FileTextIcon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t("clients.financeSummary")}</p>
            <p className="text-xs text-muted-foreground">{t("clients.financeSummaryDesc")}</p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-border/40 lg:grid-cols-4 lg:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-card/40 px-5 py-4 backdrop-blur-sm">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </dt>
            <dd
              className={cn(
                "mt-1.5 font-bold tabular-nums tracking-tight",
                metric.compact === true ? "text-2xl" : "text-xl sm:text-2xl",
                metric.tone,
              )}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}
