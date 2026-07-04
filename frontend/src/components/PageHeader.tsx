import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  badge?: ReactNode;
}

export function PageHeader({ title, subtitle, children, className, badge }: PageHeaderProps) {
  return (
    <div className={cn("page-header-premium shine-border", className)}>
      <div className="pointer-events-none absolute -right-20 -top-20 size-40 rounded-full bg-brand-500/5 blur-3xl" />
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-brand-500 via-brand-600 to-brand-800" />
      <div className="relative flex flex-wrap items-start justify-between gap-4 pl-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
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
