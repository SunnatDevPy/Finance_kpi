import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArchiveIcon,
  CreditCardIcon,
  FileTextIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LayersIcon,
  LogOutIcon,
  ScaleIcon,
  UserCircleIcon,
  UserCogIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { AppHeader } from "./AppHeader";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSE_KEY = "finance_sidebar_collapsed";

function SidebarLink({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          collapsed && "lg:justify-center lg:px-0",
          isActive
            ? "bg-white/15 text-white shadow-md shadow-black/10 ring-1 ring-white/10"
            : "text-brand-200/75 hover:bg-white/8 hover:text-white",
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active left indicator */}
          {isActive && (
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-500",
                collapsed && "lg:hidden",
              )}
            />
          )}
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 group-hover:scale-105",
              isActive
                ? "border-brand-400/30 bg-brand-500/25 text-white"
                : "border-white/10 bg-white/5 text-brand-300 group-hover:border-white/15 group-hover:bg-white/10 group-hover:text-white",
            )}
          >
            <Icon className="size-4" />
          </span>
          <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const links = [
    { to: "/", label: t("nav.dashboard"), end: true, icon: LayoutDashboardIcon },
    { to: "/clients", label: t("nav.clients"), icon: UsersIcon },
    { to: "/contracts", label: t("nav.contracts"), icon: FileTextIcon },
    { to: "/payments", label: t("nav.payments"), icon: CreditCardIcon },
    { to: "/finance", label: t("nav.finance"), icon: ScaleIcon },
    { to: "/service-types", label: t("nav.serviceTypes"), icon: LayersIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-20" : "lg:w-64",
        )}
      >
        {/* Sidebar gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950" />
        {/* Subtle pattern overlay */}
        <div className="pointer-events-none absolute inset-0 dot-grid text-white opacity-[0.04]" />
        <div className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative flex flex-col h-full">
          {/* Logo area */}
          <div className="shrink-0 px-4 py-3">
            <NavLink
              to="/"
              className={cn(
                "block overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-white/15 transition hover:shadow-lg",
                collapsed ? "lg:mx-auto lg:size-11 lg:p-1.5" : "p-2",
              )}
            >
              <img
                src="/logo.png"
                alt="World Textile Marketing Agency"
                className={cn("mx-auto h-14 w-full object-contain", collapsed && "lg:hidden")}
              />
              {collapsed && (
                <img
                  src="/favicon.svg"
                  alt="WTMA"
                  className="mx-auto hidden h-8 w-8 object-contain lg:block"
                />
              )}
            </NavLink>
            <p
              className={cn(
                "mt-2.5 text-center text-[10px] font-medium uppercase tracking-[0.15em] text-brand-300/60",
                collapsed && "lg:hidden",
              )}
            >
              {t("nav.subtitle")}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
            {links.map((link) => (
              <SidebarLink
                key={link.to}
                to={link.to}
                label={link.label}
                icon={link.icon}
                end={link.end}
                collapsed={collapsed}
              />
            ))}
            {isAdmin && (
              <>
                <SidebarLink
                  to="/employees"
                  label={t("nav.employees")}
                  icon={UserCogIcon}
                  collapsed={collapsed}
                />
                <SidebarLink
                  to="/audit-log"
                  label={t("nav.auditLog")}
                  icon={HistoryIcon}
                  collapsed={collapsed}
                />
                <SidebarLink
                  to="/trash"
                  label={t("nav.trash")}
                  icon={ArchiveIcon}
                  collapsed={collapsed}
                />
              </>
            )}
          </nav>

          {/* Bottom: Profile + Logout */}
          <div className="relative shrink-0 px-3 py-3 space-y-2">
            <NavLink
              to="/profile"
              title={collapsed ? user?.full_name : undefined}
              className={({ isActive }) =>
                cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
                  collapsed && "lg:justify-center lg:px-0",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-brand-200/75 hover:bg-white/8 hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      isActive
                        ? "bg-brand-500/25 text-white"
                        : "bg-white/5 text-brand-300 group-hover:bg-white/10 group-hover:text-white",
                    )}
                  >
                    <UserCircleIcon className="size-4" />
                  </span>
                  <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
                    <p className="truncate text-sm font-semibold leading-tight">
                      {user?.full_name}
                    </p>
                    <p className="truncate text-[11px] text-brand-300/60">
                      {user?.role === "admin" ? t("roles.admin") : t("roles.menejer")} · {user?.username}
                    </p>
                  </div>
                </>
              )}
            </NavLink>

            <button
              type="button"
              onClick={logout}
              title={collapsed ? t("nav.logout") : undefined}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm font-medium text-red-300 transition hover:border-red-400/60 hover:bg-red-500/25 hover:text-red-200",
              )}
            >
              <LogOutIcon className="size-4 shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>{t("nav.logout")}</span>
            </button>

            <p
              className={cn(
                "text-center text-[9px] font-medium uppercase tracking-[0.2em] text-brand-300/30",
                collapsed && "lg:hidden",
              )}
            >
              WTMA © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          collapsed ? "lg:ml-20" : "lg:ml-64",
        )}
      >
        <AppHeader
          onMenuClick={() => setSidebarOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
        <main className="main-canvas flex-1">
          <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
