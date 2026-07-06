import { Navigate, Outlet } from "react-router-dom";
import { PageError } from "./PageError";
import { PageShell } from "./PageHeader";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { isAdmin, loading } = useAuth();
  const { t } = useI18n();

  if (loading) return null;
  if (!isAdmin) {
    return (
      <PageShell>
        <PageError message={t("common.accessDenied")} />
      </PageShell>
    );
  }

  return <Outlet />;
}
