import { useEffect, useMemo, useState, type FormEvent } from "react";
import { HistoryIcon, PencilIcon, PlusIcon, UsersIcon } from "lucide-react";
import { api } from "../api/client";
import {
  CancelIcon,
  CreateUserIconBtn,
  LoadingIconBtn,
  SaveIconBtn,
} from "../components/ButtonIcons";
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
import { CompanyAvatar } from "../components/CompanyAvatar";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { TableColumnPicker } from "../components/TableColumnPicker";
import { usePickerColumns } from "../hooks/usePickerColumns";
import { ActiveStatusToggle } from "../components/ActiveStatusToggle";
import { RoleBadge } from "../components/UserBadges";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
  TableCellDate,
  TableCellMuted,
  TableCellPrimary,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useListLoading } from "../hooks/useListLoading";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditLogEntry, User, UserRole } from "../types";
import { formatDateTimeWithWeekday } from "../utils/format";

function auditActionLabel(action: AuditLogEntry["action"], t: (key: string) => string): string {
  const keys: Record<AuditLogEntry["action"], string> = {
    create: "auditLog.actionCreate",
    update: "auditLog.actionUpdate",
    delete: "auditLog.actionDelete",
    restore: "auditLog.actionRestore",
  };
  return t(keys[action]);
}

const EMPLOYEE_OPTIONAL_COLUMNS = [
  { id: "username", labelKey: "auth.login", defaultVisible: true },
  { id: "role", labelKey: "employees.role", defaultVisible: true },
  { id: "state", labelKey: "clients.state", defaultVisible: true },
] as const;

type EmployeeOptionalColumn = (typeof EMPLOYEE_OPTIONAL_COLUMNS)[number]["id"];

export function EmployeesPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const { t } = useI18n();
  const { isVisible, setColumnVisible, visibleCount, items: columnPickerItems } =
    usePickerColumns("wtma.employees.tableColumns", EMPLOYEE_OPTIONAL_COLUMNS, t);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const { loading, start, finish } = useListLoading();
  const { submitting, guard } = useSubmitGuard();
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    password: "",
    role: "menejer" as UserRole,
  });
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [historyEntries, setHistoryEntries] = useState<AuditLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "menejer" as UserRole, password: "" });
  const { submitting: editSubmitting, guard: guardEdit } = useSubmitGuard();
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);

  const openHistory = async (target: User) => {
    setHistoryUser(target);
    setHistoryLoading(true);
    setHistoryEntries([]);
    try {
      const data = await api.audit.log({ entityType: "user", entityId: target.id, limit: 100 });
      setHistoryEntries(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const load = (silent = false) => {
    start(silent);
    api.users
      .list()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => finish());
  };

  useEffect(() => {
    if (isAdmin) load(false);
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query),
    );
  }, [users, search]);

  const handleCreate = guard(async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const created = await api.users.create(form);
      setUsers((prev) => [...prev, created]);
      setModalOpen(false);
      setForm({ username: "", full_name: "", password: "", role: "menejer" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  const applyActiveChange = async (target: User, nextActive: boolean) => {
    const snapshot = users;
    setError("");
    setUsers((prev) =>
      prev.map((row) => (row.id === target.id ? { ...row, is_active: nextActive } : row)),
    );
    try {
      await api.users.update(target.id, { is_active: nextActive });
    } catch (err) {
      setUsers(snapshot);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const setUserActive = (target: User, nextActive: boolean) => {
    if (target.is_active === nextActive) return;
    if (currentUser && target.id === currentUser.id && !nextActive) {
      setError(t("employees.cannotBlockSelf"));
      return;
    }
    if (!nextActive) {
      // Bloklash oldidan tasdiqlash — noto'g'ri bosilib xodim tasodifan
      // tizimdan chetlashtirilib qolmasligi uchun.
      setDeactivateTarget(target);
      return;
    }
    void applyActiveChange(target, nextActive);
  };

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    void applyActiveChange(deactivateTarget, false);
    setDeactivateTarget(null);
  };

  const openEdit = (target: User) => {
    setEditUser(target);
    setEditForm({ full_name: target.full_name, role: target.role, password: "" });
  };

  const closeEdit = () => {
    setEditUser(null);
    setEditForm({ full_name: "", role: "menejer", password: "" });
  };

  const handleEditSubmit = guardEdit(async (e: FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setError("");
    try {
      const payload: Partial<{ full_name: string; role: UserRole; password: string }> = {
        full_name: editForm.full_name,
        role: editForm.role,
      };
      if (editForm.password) payload.password = editForm.password;
      const updated = await api.users.update(editUser.id, payload);
      setUsers((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  return (
    <PageShell>
      <PageHeader title={t("employees.title")} subtitle={t("employees.subtitle")}>
        <MotionButton onClick={() => setModalOpen(true)} {...motionTap}>
          <PlusIcon data-icon="inline-start" />
          {t("employees.new")}
        </MotionButton>
      </PageHeader>

      <PageError message={error} />

      <Card className="content-card">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <UsersIcon className="size-5" />
            </span>
            <div>
              <CardTitle>{t("employees.listTitle")}</CardTitle>
              <CardDescription>
                {t("common.itemsFound").replace("{count}", String(filteredUsers.length))}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="table-card-toolbar">
          <Input
            className="w-full min-w-[12rem] flex-1 sm:max-w-xs"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <TableColumnPicker
            columns={columnPickerItems}
            isVisible={(id: EmployeeOptionalColumn) => isVisible(id)}
            onVisibleChange={setColumnVisible}
            className="sm:ml-auto"
          />
        </div>
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && filteredUsers.length === 0}
            emptyMessage={t("common.noData")}
            skeletonCols={2 + visibleCount}
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("employees.fullName")}</TableHead>
                {isVisible("username") && <TableHead>{t("auth.login")}</TableHead>}
                {isVisible("role") && <TableHead>{t("employees.role")}</TableHead>}
                {isVisible("state") && <TableHead>{t("clients.state")}</TableHead>}
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user, index) => {
                const isSelf = currentUser?.id === user.id;
                return (
                  <MotionTableRow key={user.id} {...rowEnter(index)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <CompanyAvatar name={user.full_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{user.full_name}</p>
                          {isSelf && (
                            <p className="text-xs text-muted-foreground">{t("employees.you")}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {isVisible("username") && (
                    <TableCell className="font-medium text-muted-foreground">{user.username}</TableCell>
                    )}
                    {isVisible("role") && (
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    )}
                    {isVisible("state") && (
                    <TableCell>
                      <ActiveStatusToggle
                        active={user.is_active}
                        disabled={isSelf}
                        onActiveChange={(active) => void setUserActive(user, active)}
                      />
                    </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="action-toolbar">
                        <MotionButton
                          variant="ghost"
                          size="icon-sm"
                          className="size-8"
                          onClick={() => openEdit(user)}
                          title={t("common.edit")}
                          {...motionTap}
                        >
                          <PencilIcon className="size-3.5" />
                        </MotionButton>
                        <MotionButton
                          variant="ghost"
                          size="icon-sm"
                          className="size-8"
                          onClick={() => void openHistory(user)}
                          title={t("employees.history")}
                          {...motionTap}
                        >
                          <HistoryIcon className="size-3.5" />
                        </MotionButton>
                      </div>
                    </TableCell>
                  </MotionTableRow>
                );
              })}
            </TableBody>
          </PremiumDataTable>
        </CardContent>
      </Card>

      <Modal title={t("employees.newTitle")} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <FloatingLabelInput
            id="full_name"
            label={t("employees.fullName")}
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <FloatingLabelInput
            id="username"
            label={t("auth.login")}
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <FloatingLabelInput
            id="password"
            type="password"
            label={t("auth.password")}
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <div className="flex flex-col gap-2">
            <Label>{t("employees.role")} *</Label>
            <Select
              value={form.role}
              onValueChange={(value) => value && setForm({ ...form, role: value as UserRole })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="menejer">{t("roles.menejer")}</SelectItem>
                <SelectItem value="admin">{t("roles.admin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <MotionButton type="button" variant="outline" onClick={() => setModalOpen(false)} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" disabled={submitting} {...motionTap}>
              {submitting ? <LoadingIconBtn /> : <CreateUserIconBtn />}
              {submitting ? t("common.saving") : t("common.create")}
            </MotionButton>
          </div>
        </form>
      </Modal>

      <Modal
        title={editUser ? t("employees.editTitle").replace("{name}", editUser.full_name) : t("employees.editTitle").replace("{name}", "")}
        open={editUser !== null}
        onClose={closeEdit}
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <FloatingLabelInput
            id="edit_full_name"
            label={t("employees.fullName")}
            required
            value={editForm.full_name}
            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
          />
          <div className="flex flex-col gap-2">
            <Label>{t("employees.role")} *</Label>
            <Select
              value={editForm.role}
              disabled={editUser?.id === currentUser?.id}
              onValueChange={(value) => value && setEditForm({ ...editForm, role: value as UserRole })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="menejer">{t("roles.menejer")}</SelectItem>
                <SelectItem value="admin">{t("roles.admin")}</SelectItem>
              </SelectContent>
            </Select>
            {editUser?.id === currentUser?.id && (
              <p className="text-xs text-muted-foreground">{t("employees.cannotChangeSelfRole")}</p>
            )}
          </div>
          <FloatingLabelInput
            id="edit_password"
            type="password"
            label={t("employees.newPasswordOptional")}
            minLength={6}
            value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
          />
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <MotionButton type="button" variant="outline" onClick={closeEdit} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" disabled={editSubmitting} {...motionTap}>
              {editSubmitting ? <LoadingIconBtn /> : <SaveIconBtn />}
              {editSubmitting ? t("common.saving") : t("common.save")}
            </MotionButton>
          </div>
        </form>
      </Modal>

      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("employees.deactivateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget
                ? t("employees.deactivateDesc").replace("{name}", deactivateTarget.full_name)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">
              <CancelIcon />
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction type="button" variant="destructive" onClick={confirmDeactivate}>
              {t("employees.block")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Modal
        title={historyUser ? t("employees.historyTitle").replace("{name}", historyUser.full_name) : t("employees.history")}
        open={historyUser !== null}
        onClose={() => setHistoryUser(null)}
        wide
      >
        <PremiumDataTable
          loading={historyLoading}
          empty={!historyLoading && historyEntries.length === 0}
          emptyMessage={t("auditLog.empty")}
          skeletonCols={3}
        >
          <TableHeader>
            <TableRow>
              <TableHead>{t("auditLog.time")}</TableHead>
              <TableHead>{t("auditLog.action")}</TableHead>
              <TableHead>{t("auditLog.summary")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyEntries.map((entry, index) => (
              <MotionTableRow key={entry.id} {...rowEnter(index)}>
                <TableCellDate>{formatDateTimeWithWeekday(entry.created_at)}</TableCellDate>
                <TableCellMuted>{auditActionLabel(entry.action, t)}</TableCellMuted>
                <TableCellPrimary subtitle={entry.username}>
                  {entry.summary ?? "—"}
                </TableCellPrimary>
              </MotionTableRow>
            ))}
          </TableBody>
        </PremiumDataTable>
      </Modal>
    </PageShell>
  );
}
