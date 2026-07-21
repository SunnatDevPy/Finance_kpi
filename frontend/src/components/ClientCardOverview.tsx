import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileTextIcon, PencilIcon, UserRoundIcon } from "lucide-react";
import { ClientLogoUploader } from "@/components/ClientLogoUploader";
import { ActiveStatusToggle } from "@/components/ActiveStatusToggle";
import { MotionButton, motionTap } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";
import { formatAmount, toNumber } from "@/utils/format";
import type { Client, Contract } from "@/types";

interface ClientCardOverviewProps {
  client: Client;
  contracts: Contract[];
  totalDebt: string;
  cancelledAmount?: string;
  onClientUpdated: (client: Client) => void;
  onEdit: () => void;
  onStatusChange: (active: boolean) => void;
}

function OverviewCard({
  title,
  icon: Icon,
  children,
  accent = "neutral",
}: {
  title: string;
  icon: typeof UserRoundIcon;
  children: React.ReactNode;
  accent?: "neutral" | "blue";
}) {
  const accentClass = {
    neutral: "border-border/70 bg-card",
    blue: "border-blue-200/60 bg-gradient-to-br from-blue-50/80 via-card to-card dark:border-blue-900/40 dark:from-blue-950/30",
  }[accent];

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      className={cn(
        "flex h-full min-h-[12.5rem] flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md",
        accentClass,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted/60 text-primary">
          <Icon className="size-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex flex-1 flex-col justify-center p-4">{children}</div>
    </motion.div>
  );
}

function MetricBlock({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 text-xl font-bold tabular-nums tracking-tight sm:text-2xl", tone)}>
        {value}
      </p>
    </div>
  );
}

export function ClientCardOverview({
  client,
  contracts,
  totalDebt,
  cancelledAmount = "0",
  onClientUpdated,
  onEdit,
  onStatusChange,
}: ClientCardOverviewProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const totalAmount = contracts.reduce((sum, c) => sum + toNumber(c.total_amount), 0);
    const totalPaid = contracts.reduce((sum, c) => sum + toNumber(c.paid_amount), 0);
    const debt = toNumber(totalDebt);
    const cancelled = toNumber(cancelledAmount);
    return {
      totalAmount,
      totalPaid,
      debt,
      cancelled,
      count: contracts.length,
      isOverpaid: debt < 0,
    };
  }, [contracts, totalDebt, cancelledAmount]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OverviewCard title={t("clients.contactAndLocation")} icon={UserRoundIcon}>
          <div className="flex flex-col gap-4">
            <ClientLogoUploader client={client} size="md" onUpdated={onClientUpdated} />
            <dl className="info-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  [t("clients.contact"), client.contact_person],
                  [t("clients.phone"), client.phone],
                  [t("clients.website"), client.website],
                  [t("clients.country"), client.country],
                  [t("clients.city"), client.city],
                  [t("clients.activity"), client.activity_type],
                  [t("clients.notes"), client.notes],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className={label === t("clients.notes") ? "sm:col-span-2" : undefined}>
                  <dt>{label}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        </OverviewCard>

        <OverviewCard title={t("clients.financeSummary")} icon={FileTextIcon} accent="blue">
          <div className="grid grid-cols-2 gap-5">
            <MetricBlock label={t("clients.contractsTotal")} value={formatAmount(stats.totalAmount)} />
            <MetricBlock
              label={t("clients.totalReceived")}
              value={formatAmount(stats.totalPaid)}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <MetricBlock
              label={stats.isOverpaid ? t("clients.overpaid") : t("clients.debtShort")}
              value={formatAmount(stats.isOverpaid ? Math.abs(stats.debt) : stats.debt)}
              tone={
                stats.isOverpaid
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }
            />
            <MetricBlock
              label={t("clients.cancelledAmount")}
              value={formatAmount(stats.cancelled)}
              tone="text-amber-600 dark:text-amber-400"
            />
            <MetricBlock
              label={t("clients.contractsCount")}
              value={String(stats.count)}
              tone="text-primary"
            />
          </div>
        </OverviewCard>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
        <ActiveStatusToggle
          active={client.status === "faol"}
          onActiveChange={onStatusChange}
        />
        <MotionButton type="button" variant="outline" size="sm" onClick={onEdit} {...motionTap}>
          <PencilIcon data-icon="inline-start" />
          {t("clients.edit")}
        </MotionButton>
      </div>
    </div>
  );
}
