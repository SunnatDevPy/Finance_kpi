import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BanIcon, PlusIcon, UsersIcon } from "lucide-react";
import { api } from "../api/client";
import {
  BlockIconBtn,
  CancelIcon,
  CreateUserIconBtn,
  LoadingIconBtn,
  UnblockIconBtn,
} from "../components/ButtonIcons";
import { CompanyAvatar } from "../components/CompanyAvatar";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { ActiveStatusBadge, RoleBadge } from "../components/UserBadges";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
  TableCellActions,
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
import type { User, UserRole } from "../types";
import { cn } from "@/lib/utils";

export function EmployeesPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const { t } = useI18n();
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

  const toggleActive = async (target: User) => {
    if (currentUser && target.id === currentUser.id && target.is_active) {
      setError(t("employees.cannotBlockSelf"));
      return;
    }
    const snapshot = users;
    const nextActive = !target.is_active;
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

  return (
    <PageShell>
      <PageHeader title={t("employees.title")} subtitle={t("employees.subtitle")}>
        <MotionButton onClick={() => setModalOpen(true)} {...motionTap}>
          <PlusIcon data-icon="inline-start" />
          {t("employees.new")}
        </MotionButton>
      </PageHeader>

      <PageError message={error} />

      <div className="filter-bar">
        <Input
          className="max-w-sm flex-1"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="content-card">
        <CardHeader className="border-b">
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
        <CardContent className="p-0">
          <PremiumDataTable
            loading={loading}
            empty={!loading && filteredUsers.length === 0}
            emptyMessage={t("common.noData")}
            skeletonCols={5}
          >
            <TableHeader>
              <TableRow>
                <TableHead>{t("employees.fullName")}</TableHead>
                <TableHead>{t("auth.login")}</TableHead>
                <TableHead>{t("employees.role")}</TableHead>
                <TableHead>{t("clients.state")}</TableHead>
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
                    <TableCell className="font-medium text-muted-foreground">{user.username}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <ActiveStatusBadge active={user.is_active} />
                    </TableCell>
                    <TableCellActions>
                      {isSelf ? (
                        <span
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground/50"
                          title={t("employees.selfNoBlock")}
                          aria-label={t("employees.selfNoBlock")}
                        >
                          <BanIcon className="size-4" aria-hidden />
                        </span>
                      ) : (
                        <MotionButton
                          variant={user.is_active ? "outline" : "secondary"}
                          size="sm"
                          className={cn(
                            "rounded-lg",
                            user.is_active &&
                              "border-amber-300/60 text-amber-800 hover:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-200",
                          )}
                          onClick={() => toggleActive(user)}
                          {...motionTap}
                        >
                          {user.is_active ? (
                            <>
                              <BlockIconBtn />
                              {t("employees.block")}
                            </>
                          ) : (
                            <>
                              <UnblockIconBtn />
                              {t("employees.unblock")}
                            </>
                          )}
                        </MotionButton>
                      )}
                    </TableCellActions>
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
          <div className="flex justify-end gap-2 pt-2">
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
    </PageShell>
  );
}
