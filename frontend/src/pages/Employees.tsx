import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PlusIcon } from "lucide-react";
import { api } from "../api/client";
import {
  BlockIconBtn,
  CancelIcon,
  CreateUserIconBtn,
  UnblockIconBtn,
} from "../components/ButtonIcons";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import {
  MotionTableRow,
  PremiumDataTable,
  rowEnter,
  TableBody,
  TableCell,
  TableCellActions,
  TableCellPrimary,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/PremiumDataTable";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User, UserRole } from "../types";

export function EmployeesPage() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    password: "",
    role: "menejer" as UserRole,
  });

  const load = () => {
    setLoading(true);
    api.users
      .list()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) load();
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

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.users.create(form);
      setModalOpen(false);
      setForm({ username: "", full_name: "", password: "", role: "menejer" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const toggleActive = async (user: User) => {
    try {
      await api.users.update(user.id, { is_active: !user.is_active });
      load();
    } catch (err) {
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

      <Card>
        <CardContent className="p-0 pt-4">
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
              {filteredUsers.map((user, index) => (
                <MotionTableRow key={user.id} {...rowEnter(index)}>
                  <TableCellPrimary>{user.full_name}</TableCellPrimary>
                  <TableCell className="text-muted-foreground">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {t(`roles.${user.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCellActions>
                    <MotionButton variant="ghost" size="sm" onClick={() => toggleActive(user)} {...motionTap}>
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
                  </TableCellActions>
                </MotionTableRow>
              ))}
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
          <div className="flex justify-end gap-2">
            <MotionButton type="button" variant="outline" onClick={() => setModalOpen(false)} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" {...motionTap}>
              <CreateUserIconBtn />
              {t("common.create")}
            </MotionButton>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
