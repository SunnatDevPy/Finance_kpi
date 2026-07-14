import { MenuIcon, PanelLeftIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "../context/I18nContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./NotificationBell";
import { SettingsToolbar } from "./SettingsToolbar";
import { HEADER_TOOLBAR_BTN } from "./header-toolbar";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onMenuClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppHeader({ onMenuClick, collapsed = false, onToggleCollapse }: AppHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-20 flex h-[3.75rem] shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-background/75 px-4 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 sm:gap-4 sm:px-6 min-h-[calc(3.75rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        {/* Mobile: ochish uchun burger tugma (drawer sifatida) */}
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className={cn(HEADER_TOOLBAR_BTN, "lg:hidden")}
          onClick={onMenuClick}
          aria-label={t("common.menu")}
        >
          <MenuIcon className="size-4" />
        </Button>
        {/* Katta ekran: sidebar bilan bog'langan yig'ish/yoyish tugmasi */}
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className={cn(HEADER_TOOLBAR_BTN, "hidden lg:inline-flex")}
          onClick={onToggleCollapse}
          aria-label={collapsed ? t("common.expandSidebar") : t("common.collapseSidebar")}
          aria-pressed={collapsed}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex"
          >
            <PanelLeftIcon className="size-4" />
          </motion.span>
        </Button>
        <NotificationBell />
      </div>
      <SettingsToolbar variant="header" />
    </header>
  );
}
