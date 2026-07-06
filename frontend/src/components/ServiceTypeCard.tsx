import { memo } from "react";
import { BarChart3Icon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import {
  ActivateIconBtn,
  DeactivateIconBtn,
} from "./ButtonIcons";
import { CompanyAvatar } from "./CompanyAvatar";
import { ActiveStatusBadge } from "./UserBadges";
import type { ServiceType } from "../types";
import { formatCompactMoney } from "../utils/format";
import { MotionButton, motionTap } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ServiceTypeCardProps {
  item: ServiceType;
  menuOpen: boolean;
  menuRef?: React.Ref<HTMLDivElement>;
  labels: {
    usageCount: string;
    revenueShort: string;
    viewStats: string;
    timesUsed: (count: number) => string;
    deactivate: string;
    activate: string;
    delete: string;
  };
  onOpen: (item: ServiceType) => void;
  onToggleMenu: (id: number) => void;
  onToggleActive: (item: ServiceType) => void;
  onDelete: (id: number) => void;
}

export const ServiceTypeCard = memo(function ServiceTypeCard({
  item,
  menuOpen,
  menuRef,
  labels,
  onOpen,
  onToggleMenu,
  onToggleActive,
  onDelete,
}: ServiceTypeCardProps) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-md",
        item.is_active ? "border-border/80" : "border-rose-200/70 dark:border-rose-500/35",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        className="flex w-full cursor-pointer flex-col gap-4 p-5 pr-14 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={() => onOpen(item)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(item);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={item.name} className="size-11 rounded-xl text-sm" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-foreground">{item.name}</p>
              <div className="mt-1.5">
                <ActiveStatusBadge active={item.is_active} />
              </div>
            </div>
          </div>
          <BarChart3Icon className="size-4 shrink-0 text-muted-foreground/40" />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {labels.usageCount}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {labels.timesUsed(item.usage_count)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {labels.revenueShort}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {item.usage_count > 0 ? formatCompactMoney(item.total_revenue) : "—"}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{labels.viewStats}</p>
      </div>

      <div ref={menuOpen ? menuRef : undefined} className="absolute right-3 top-3 z-20">
        <MotionButton
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleMenu(item.id);
          }}
          {...motionTap}
        >
          <MoreHorizontalIcon className="size-4" />
        </MotionButton>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-1 min-w-[10.5rem] rounded-lg border border-border bg-popover p-1 shadow-lg"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-muted"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleActive(item);
              }}
            >
              {item.is_active ? (
                <>
                  <DeactivateIconBtn />
                  {labels.deactivate}
                </>
              ) : (
                <>
                  <ActivateIconBtn />
                  {labels.activate}
                </>
              )}
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-40"
              disabled={item.usage_count > 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(item.id);
              }}
            >
              <Trash2Icon className="size-3.5" />
              {labels.delete}
            </button>
          </div>
        )}
      </div>
    </article>
  );
});
