import { useEffect, useState } from "react";
import { HistoryIcon, Trash2Icon } from "lucide-react";
import { api } from "../api/client";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { TableColumnPicker } from "../components/TableColumnPicker";
import { usePickerColumns } from "../hooks/usePickerColumns";
import { usePersistedState } from "../hooks/usePersistedState";
import { Pagination } from "../components/Pagination";
import { DateRangePicker } from "../components/DateRangePicker";
import { Input } from "@/components/ui/input";
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
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditAction, AuditEntityType, AuditLogEntry } from "../types";
import { formatDateTimeWithWeekday } from "../utils/format";

const ENTITY_TYPES: AuditEntityType[] = ["client", "contract", "payment", "expense", "income", "user"];

const AUDIT_OPTIONAL_COLUMNS = [
  { id: "action", labelKey: "auditLog.action", defaultVisible: true },
  { id: "summary", labelKey: "auditLog.summary", defaultVisible: true },
  { id: "user", labelKey: "auditLog.user", defaultVisible: true },
  { id: "time", labelKey: "auditLog.time", defaultVisible: true },
] as const;

type AuditOptionalColumn = (typeof AUDIT_OPTIONAL_COLUMNS)[number]["id"];

function entityLabel(type: string, t: (key: string) => string): string {
  if (type === "client") return t("auditLog.entityClient");
  if (type === "contract") return t("auditLog.entityContract");
  if (type === "payment") return t("auditLog.entityPayment");
  if (type === "expense") return t("auditLog.entityExpense");
  if (type === "income") return t("auditLog.entityIncome");
  if (type === "user") return t("auditLog.entityUser");
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
  const { isVisible, setColumnVisible, visibleCount, items: columnPickerItems } =
    usePickerColumns("wtma.auditLog.tableColumns", AUDIT_OPTIONAL_COLUMNS, t);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [entityId, setEntityId] = usePersistedState("wtma.auditLog.entityId", "");
  const [dateFrom, setDateFrom] = usePersistedState("wtma.auditLog.dateFrom", "");
  const [dateTo, setDateTo] = usePersistedState("wtma.auditLog.dateTo", "");
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);

  const parsedEntityId = entityId.trim() && /^\d+$/.test(entityId.trim()) ? Number(entityId.trim()) : undefined;
  const hasFilters = entityType !== "all" || Boolean(parsedEntityId) || Boolean(dateFrom) || Boolean(dateTo);

  const load = (silent = true) => {
    start(silent);
    api.audit
      .log({
        entityType: entityType === "all" ? undefined : entityType,
        entityId: parsedEntityId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
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
  }, [entityType, entityId, dateFrom, dateTo]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load(page !== 1 || entityType !== "all" || Boolean(entityId) || Boolean(dateFrom) || Boolean(dateTo));
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, dateFrom, dateTo, page, pageSize]);

  const handleClearHistory = async () => {
    setClearOpen(false);
    try {
      await api.audit.clearLog({
        entityType: entityType === "all" ? undefined : entityType,
        entityId: parsedEntityId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setEntries([]);
      setTotal(0);
      setPage(1);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <PageShell>
      <PageHeader title={t("auditLog.title")} subtitle={t("auditLog.subtitle")} />

      <PageError message={error} />

      <Card className="content-card">
        <CardHeader className="border-b pb-3">
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
        <div className="table-card-toolbar">
          <Select
            value={entityType}
            onValueChange={(value) => value && setEntityType(value as AuditEntityType | "all")}
            className="w-full sm:w-52"
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
          <Input
            className="w-full min-w-[8rem] sm:w-32"
            placeholder={t("auditLog.entityId")}
            inputMode="numeric"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value.replace(/[^0-9]/g, ""))}
          />
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
          <TableColumnPicker
            columns={columnPickerItems}
            isVisible={(id: AuditOptionalColumn) => isVisible(id)}
            onVisibleChange={setColumnVisible}
            className="sm:ml-auto"
          />
          <MotionButton
            type="button"
            variant="destructive"
            size="sm"
            className="rounded-lg"
            disabled={total === 0}
            onClick={() => setClearOpen(true)}
            {...motionTap}
          >
            <Trash2Icon data-icon="inline-start" />
            {t("auditLog.clearHistory")}
          </MotionButton>
        </div>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && entries.length === 0}
            emptyMessage={t("auditLog.empty")}
            skeletonCols={1 + visibleCount}
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
                {isVisible("action") && <TableHead>{t("auditLog.action")}</TableHead>}
                {isVisible("summary") && <TableHead>{t("auditLog.summary")}</TableHead>}
                {isVisible("user") && <TableHead>{t("auditLog.user")}</TableHead>}
                {isVisible("time") && <TableHead>{t("auditLog.time")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <MotionTableRow key={entry.id} {...rowEnter(index)}>
                  <TableCellPrimary subtitle={`#${entry.entity_id}`}>
                    {entityLabel(entry.entity_type, t)}
                  </TableCellPrimary>
                  {isVisible("action") && (
                  <TableCellMuted>
                    <Badge variant={actionVariant(entry.action)}>
                      {actionLabel(entry.action, t)}
                    </Badge>
                  </TableCellMuted>
                  )}
                  {isVisible("summary") && (
                  <TableCellMuted className="max-w-md">
                    {entry.summary ?? "—"}
                  </TableCellMuted>
                  )}
                  {isVisible("user") && (
                  <TableCellMuted>{entry.username}</TableCellMuted>
                  )}
                  {isVisible("time") && (
                  <TableCellDate>
                    {formatDateTimeWithWeekday(entry.created_at)}
                  </TableCellDate>
                  )}
                </MotionTableRow>
              ))}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("auditLog.clearHistory")}</AlertDialogTitle>
            <AlertDialogDescription>
              {hasFilters ? t("auditLog.clearHistoryConfirm") : t("auditLog.clearHistoryConfirmAll")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearHistory}
            >
              {t("auditLog.clearHistory")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
