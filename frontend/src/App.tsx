import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AdminRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { PageLoader } from "./components/PageLoader";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { ThemeProvider } from "./context/ThemeContext";
import { markRouteReady } from "./lib/appReady";
import { lazyWithRetry, markAppHealthy } from "./lib/runtimeRecovery";

/** Suspense qamrovi ichida joylashgan — shu sabab uning effekti faqat
 * haqiqiy sahifa (lazy chunk) yuklanib, fallback (`PageLoader`) haqiqiy
 * kontent bilan almashtirilgandagina ishga tushadi. Shu orqali ilova
 * birinchi ochilishida faqat bitta (index.html dagi) loader ko'rinadi —
 * `PageLoader` orqasidan yana bitta "ikkinchi yuklash" chiqmaydi. */
function RouteReady({ children }: { children: ReactNode }) {
  useEffect(() => {
    markRouteReady();
    markAppHealthy();
  }, []);
  return <>{children}</>;
}

const AuditLogPage = lazy(lazyWithRetry(() => import("./pages/AuditLog").then((m) => ({ default: m.AuditLogPage }))));
const ClientCardPage = lazy(lazyWithRetry(() => import("./pages/ClientCard").then((m) => ({ default: m.ClientCardPage }))));
const ClientsPage = lazy(lazyWithRetry(() => import("./pages/Clients").then((m) => ({ default: m.ClientsPage }))));
const ContractsPage = lazy(lazyWithRetry(() => import("./pages/Contracts").then((m) => ({ default: m.ContractsPage }))));
const DashboardPage = lazy(lazyWithRetry(() => import("./pages/Dashboard").then((m) => ({ default: m.DashboardPage }))));
const EmployeesPage = lazy(lazyWithRetry(() => import("./pages/Employees").then((m) => ({ default: m.EmployeesPage }))));
const FinancePage = lazy(lazyWithRetry(() => import("./pages/Finance").then((m) => ({ default: m.FinancePage }))));
const LoginPage = lazy(lazyWithRetry(() => import("./pages/Login").then((m) => ({ default: m.LoginPage }))));
const PaymentsPage = lazy(lazyWithRetry(() => import("./pages/Payments").then((m) => ({ default: m.PaymentsPage }))));
const ProfilePage = lazy(lazyWithRetry(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage }))));
const ServiceTypesPage = lazy(lazyWithRetry(() => import("./pages/ServiceTypes").then((m) => ({ default: m.ServiceTypesPage }))));
const TrashPage = lazy(lazyWithRetry(() => import("./pages/Trash").then((m) => ({ default: m.TrashPage }))));

export default function App() {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <I18nProvider>
        <AppErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <RouteReady>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="clients" element={<ClientsPage />} />
                      <Route path="clients/:id" element={<ClientCardPage />} />
                      <Route path="contracts" element={<ContractsPage />} />
                      <Route path="payments" element={<PaymentsPage />} />
                      <Route path="expenses" element={<Navigate to="/finance" replace />} />
                      <Route path="finance" element={<FinancePage />} />
                      <Route path="debts" element={<Navigate to="/clients?debtors=1" replace />} />
                      <Route path="service-types" element={<ServiceTypesPage />} />
                      <Route path="profile" element={<ProfilePage />} />
                      <Route element={<AdminRoute />}>
                        <Route path="employees" element={<EmployeesPage />} />
                        <Route path="audit-log" element={<AuditLogPage />} />
                        <Route path="trash" element={<TrashPage />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </RouteReady>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
        </AppErrorBoundary>
        </I18nProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
