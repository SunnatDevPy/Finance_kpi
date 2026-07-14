import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  badge?: ReactNode;
}

/** Sahifa sarlavhasi yonidagi tugmalar guruhi — bir-biriga qapishmaydi. */
export function ToolbarCluster({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("toolbar-cluster", className)}>{children}</div>;
}

/** Dashboard va boshqa sahifalardagi bo'lim sarlavhasi. */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="section-heading">{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, children, className, badge }: PageHeaderProps) {
  return (
    <div className={cn("page-header-premium shine-border", className)}>
      <div className="pointer-events-none absolute -right-20 -top-20 size-40 rounded-full bg-brand-500/5 blur-3xl" />
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-brand-500 via-brand-600 to-brand-800" />
      <div className="relative flex flex-wrap items-start justify-between gap-5 pl-3 sm:gap-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-words text-[1.65rem] font-bold leading-tight tracking-tight text-foreground sm:text-[1.85rem]">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && <p className="section-description mt-2">{subtitle}</p>}
        </div>
        {children && <ToolbarCluster>{children}</ToolbarCluster>}
      </div>
    </div>
  );
}

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("page-shell", className)}>{children}</div>;
}
