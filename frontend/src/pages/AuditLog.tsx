import { useEffect, useState } from "react";
import { HistoryIcon } from "lucide-react";
import { api } from "../api/client";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCellDate,
  TableCellMuted,
  TableCellPrimary,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { useI18n } from "../context/I18nContext";
import { useListLoading } from "../hooks/useListLoading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditAction, AuditEntityType, AuditLogEntry } from "../types";
import { formatDateWithWeekday } from "../utils/format";

const ENTITY_TYPES: AuditEntityType[] = ["client", "contract", "payment", "expense", "income"];

function entityLabel(type: string, t: (key: string) => string): string {
  if (type === "client") return t("auditLog.entityClient");
  if (type === "contract") return t("auditLog.entityContract");
  if (type === "payment") return t("auditLog.entityPayment");
  if (type === "expense") return t("auditLog.entityExpense");
  if (type === "income") return t("auditLog.entityIncome");
  return type;
}

function actionVariant(action: AuditAction): "default" | "secondary" | "destructive" | "outline" {
  if (action === "create") return "secondary";
  if (action === "update") return "outline";
  if (action === "delete") return "destructive";
  return "default";
}

function actionLabel(action: AuditAction, t: (key: string) => string): string {
  if (action === "create") return t("auditLog.actionCreate");
  if (action === "update") return t("auditLog.actionUpdate");
  if (action === "delete") return t("auditLog.actionDelete");
  return t("auditLog.actionRestore");
}

export function AuditLogPage() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const load = (silent = true) => {
    start(silent);
    api.audit
      .log({
        entityType: entityType === "all" ? undefined : entityType,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
      .then((data) => {
        setEntries(data.items);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => finish());
  };

  useEffect(() => {
    setPage(1);
  }, [entityType]);

  useEffect(() => {
    load(page !== 1 || entityType !== "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, page, pageSize]);

  return (
    <PageShell>
      <PageHeader title={t("auditLog.title")} subtitle={t("auditLog.subtitle")} />

      <PageError message={error} />

      <div className="filter-bar">
        <Select
          value={entityType}
          onValueChange={(value) => value && setEntityType(value as AuditEntityType | "all")}
          className="w-full sm:w-56"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("auditLog.allEntities")}</SelectItem>
            {ENTITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {entityLabel(type, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="content-card">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <HistoryIcon className="size-5" />
            </span>
            <div>
              <CardTitle>{t("auditLog.listTitle")}</CardTitle>
              <CardDescription>
                {t("common.itemsFound").replace("{count}", String(total))}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && entries.length === 0}
            emptyMessage={t("auditLog.empty")}
            skeletonCols={5}
            footer={
              <Pagination
                embedded
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("auditLog.entityType")}</TableHead>
                <TableHead>{t("auditLog.action")}</TableHead>
                <TableHead>{t("auditLog.summary")}</TableHead>
                <TableHead>{t("auditLog.user")}</TableHead>
                <TableHead>{t("auditLog.time")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <MotionTableRow key={entry.id} {...rowEnter(index)}>
                  <TableCellPrimary subtitle={`#${entry.entity_id}`}>
                    {entityLabel(entry.entity_type, t)}
                  </TableCellPrimary>
                  <TableCellMuted>
                    <Badge variant={actionVariant(entry.action)}>
                      {actionLabel(entry.action, t)}
                    </Badge>
                  </TableCellMuted>
                  <TableCellMuted className="max-w-md">
                    {entry.summary ?? "—"}
                  </TableCellMuted>
                  <TableCellMuted>{entry.username}</TableCellMuted>
                  <TableCellDate>
                    {formatDateWithWeekday(entry.created_at, "short")}{" "}
                    {new Date(entry.created_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCellDate>
                </MotionTableRow>
              ))}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>
    </PageShell>
  );
}
