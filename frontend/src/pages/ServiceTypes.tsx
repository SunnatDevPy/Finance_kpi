import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, LayersIcon, PlusIcon, Trash2Icon, XCircleIcon } from "lucide-react";
import { api } from "../api/client";
import {
  ActivateIconBtn,
  CancelIcon,
  DeactivateIconBtn,
  DeleteIconBtn,
  SaveIconBtn,
} from "../components/ButtonIcons";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StaggerContainer, StaggerItem } from "../components/Stagger";
import { useI18n } from "../context/I18nContext";
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
import { Badge } from "@/components/ui/badge";
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import type { ServiceType } from "../types";

export function ServiceTypesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ServiceType[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.serviceTypes
      .list()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const summary = useMemo(() => {
    const active = items.filter((item) => item.is_active).length;
    return { total: items.length, active, inactive: items.length - active };
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.serviceTypes.create({ name });
      setName("");
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const toggleActive = async (item: ServiceType) => {
    try {
      await api.serviceTypes.update(item.id, { is_active: !item.is_active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.serviceTypes.delete(deleteId);
      setDeleteId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <PageShell>
      <PageHeader title={t("services.title")} subtitle={t("services.subtitle")}>
        <MotionButton onClick={() => setModalOpen(true)} {...motionTap}>
          <PlusIcon data-icon="inline-start" />
          {t("services.new")}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title={t("services.summaryTotal")}
          value={String(summary.total)}
          accent="blue"
          icon={LayersIcon}
        />
        <StatCard
          title={t("services.summaryActive")}
          value={String(summary.active)}
          accent="green"
          icon={CheckCircle2Icon}
        />
        <StatCard
          title={t("services.summaryInactive")}
          value={String(summary.inactive)}
          accent="amber"
          icon={XCircleIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("services.listTitle")}</CardTitle>
          <CardDescription>{t("services.listDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("services.notFound")}</p>
          ) : (
            <StaggerContainer className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <StaggerItem
                  key={item.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className={`group flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow duration-200 hover:border-primary/30 hover:shadow-md ${!item.is_active ? "opacity-55" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl text-sm font-bold tracking-tight ${item.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{item.name}</p>
                      <Badge
                        variant={item.is_active ? "default" : "secondary"}
                        className="mt-0.5 text-[10px] px-1.5 py-0"
                      >
                        {item.is_active ? t("status.faol") : t("status.nofaol")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => toggleActive(item)}
                      {...motionTap}
                    >
                      {item.is_active ? (
                        <><DeactivateIconBtn />{t("services.deactivate")}</>
                      ) : (
                        <><ActivateIconBtn />{t("services.activate")}</>
                      )}
                    </MotionButton>
                    <MotionButton
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(item.id)}
                      {...motionTap}
                    >
                      <Trash2Icon className="size-3.5" />
                    </MotionButton>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </CardContent>
      </Card>

      <Modal title={t("services.newTitle")} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <FloatingLabelInput
            id="name"
            label={t("services.name")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <MotionButton type="button" variant="outline" onClick={() => setModalOpen(false)} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" {...motionTap}>
              <SaveIconBtn />
              {t("common.save")}
            </MotionButton>
          </div>
        </form>
      </Modal>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("services.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("services.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <CancelIcon />
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              <DeleteIconBtn />
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
