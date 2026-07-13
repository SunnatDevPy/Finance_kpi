import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3Icon,
  CheckCircle2Icon,
  LayersIcon,
  PlusIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import { api } from "../api/client";
import {
  CancelIcon,
  LoadingIconBtn,
  SaveIconBtn,
} from "../components/ButtonIcons";
import { Modal } from "../components/Modal";
import { PageError } from "../components/PageError";
import { PageHeader, PageShell } from "../components/PageHeader";
import { ServiceTypeCard } from "../components/ServiceTypeCard";
import { ServiceTypeDetailModal } from "../components/ServiceTypeDetailModal";
import { StaggerContainer, StaggerItem } from "../components/Stagger";
import { StatCard } from "../components/StatCard";
import { useListLoading } from "../hooks/useListLoading";
import { useSubmitGuard } from "../hooks/useSubmitGuard";
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
import { MotionButton, motionTap } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import type { ServiceType } from "../types";
import { formatCompactMoney } from "../utils/format";

export function ServiceTypesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ServiceType[]>([]);
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ServiceType | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const { loading, start, finish } = useListLoading();
  const { submitting, guard } = useSubmitGuard();
  const menuRef = useRef<HTMLDivElement>(null);

  const load = (silent = false) => {
    start(silent);
    api.serviceTypes
      .list()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => finish());
  };

  useEffect(() => {
    load(false);
  }, []);

  useEffect(() => {
    if (menuOpenId === null) return;
    const closeMenu = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpenId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuOpenId]);

  const cardLabels = useMemo(
    () => ({
      usageCount: t("services.usageCount"),
      revenueShort: t("services.revenueShort"),
      viewStats: t("services.viewStats"),
      timesUsed: (count: number) => t("services.timesUsed").replace("{count}", String(count)),
      deactivate: t("services.deactivate"),
      activate: t("services.activate"),
      delete: t("common.delete"),
    }),
    [t],
  );

  const summary = useMemo(() => {
    const active = items.filter((item) => item.is_active).length;
    const totalRevenue = items.reduce((sum, item) => sum + parseFloat(item.total_revenue || "0"), 0);
    return { total: items.length, active, inactive: items.length - active, totalRevenue };
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, search]);

  const handleCreate = guard(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const created = await api.serviceTypes.create({ name });
      setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setCreateModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  });

  const toggleActive = useCallback(async (item: ServiceType) => {
    const nextActive = !item.is_active;
    const snapshot = items;
    setError("");
    setMenuOpenId(null);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_active: nextActive } : row)),
    );
    setDetailItem((prev) => (prev?.id === item.id ? { ...prev, is_active: nextActive } : prev));
    try {
      await api.serviceTypes.update(item.id, { is_active: nextActive });
    } catch (err) {
      setItems(snapshot);
      setDetailItem((prev) =>
        prev?.id === item.id ? { ...prev, is_active: item.is_active } : prev,
      );
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }, [items, t]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    const snapshot = items;
    setError("");
    setItems((prev) => prev.filter((row) => row.id !== id));
    setDeleteId(null);
    setDetailItem((prev) => (prev?.id === id ? null : prev));
    try {
      await api.serviceTypes.delete(id);
    } catch (err) {
      setItems(snapshot);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const openDetail = useCallback((item: ServiceType) => {
    setMenuOpenId(null);
    setDetailItem(item);
  }, []);

  const handleToggleMenu = useCallback((id: number) => {
    setMenuOpenId((prev) => (prev === id ? null : id));
  }, []);

  const handleRequestDelete = useCallback((id: number) => {
    setMenuOpenId(null);
    setDeleteId(id);
  }, []);

  return (
    <PageShell>
      <PageHeader title={t("services.title")} subtitle={t("services.subtitle")}>
        <MotionButton type="button" onClick={() => setCreateModalOpen(true)} {...motionTap}>
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

      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard
            title={t("services.summaryTotal")}
            value={String(summary.total)}
            accent="blue"
            icon={LayersIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("services.summaryActive")}
            value={String(summary.active)}
            accent="green"
            icon={CheckCircle2Icon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("services.summaryInactive")}
            value={String(summary.inactive)}
            accent="amber"
            icon={XCircleIcon}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title={t("services.totalRevenue")}
            value={formatCompactMoney(summary.totalRevenue)}
            accent="violet"
            icon={BarChart3Icon}
          />
        </StaggerItem>
      </StaggerContainer>

      <Card className="content-card">
        <CardHeader className="border-b">
          <CardTitle>{t("services.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("services.notFound")}</p>
          ) : (
            <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <StaggerItem key={item.id}>
                  <ServiceTypeCard
                    item={item}
                    menuOpen={menuOpenId === item.id}
                    menuRef={menuOpenId === item.id ? menuRef : undefined}
                    labels={cardLabels}
                    onOpen={openDetail}
                    onToggleMenu={handleToggleMenu}
                    onToggleActive={toggleActive}
                    onDelete={handleRequestDelete}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </CardContent>
      </Card>

      <ServiceTypeDetailModal
        item={detailItem}
        open={detailItem !== null}
        onClose={() => setDetailItem(null)}
        onToggleActive={toggleActive}
        onDelete={(id) => {
          setDeleteId(id);
        }}
      />

      <Modal title={t("services.newTitle")} open={createModalOpen} onClose={() => setCreateModalOpen(false)}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <FloatingLabelInput
            id="name"
            label={t("services.name")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <MotionButton type="button" variant="outline" onClick={() => setCreateModalOpen(false)} {...motionTap}>
              <CancelIcon />
              {t("common.cancel")}
            </MotionButton>
            <MotionButton type="submit" disabled={submitting} {...motionTap}>
              {submitting ? <LoadingIconBtn /> : <SaveIconBtn />}
              {submitting ? t("common.saving") : t("common.save")}
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
            <AlertDialogCancel type="button">
              <CancelIcon />
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              <Trash2Icon data-icon="inline-start" className="size-4" />
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
