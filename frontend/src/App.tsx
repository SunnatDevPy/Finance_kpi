import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { PageLoader } from "./components/PageLoader";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { ThemeProvider } from "./context/ThemeContext";
import { markRouteReady } from "./lib/appReady";

/** Suspense qamrovi ichida joylashgan — shu sabab uning effekti faqat
 * haqiqiy sahifa (lazy chunk) yuklanib, fallback (`PageLoader`) haqiqiy
 * kontent bilan almashtirilgandagina ishga tushadi. Shu orqali ilova
 * birinchi ochilishida faqat bitta (index.html dagi) loader ko'rinadi —
 * `PageLoader` orqasidan yana bitta "ikkinchi yuklash" chiqmaydi. */
function RouteReady({ children }: { children: ReactNode }) {
  useEffect(() => {
    markRouteReady();
  }, []);
  return <>{children}</>;
}

const ClientCardPage = lazy(() => import("./pages/ClientCard").then((m) => ({ default: m.ClientCardPage })));
const ClientsPage = lazy(() => import("./pages/Clients").then((m) => ({ default: m.ClientsPage })));
const ContractsPage = lazy(() => import("./pages/Contracts").then((m) => ({ default: m.ContractsPage })));
const DashboardPage = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.DashboardPage })));
const DebtsPage = lazy(() => import("./pages/Debts").then((m) => ({ default: m.DebtsPage })));
const EmployeesPage = lazy(() => import("./pages/Employees").then((m) => ({ default: m.EmployeesPage })));
const LoginPage = lazy(() => import("./pages/Login").then((m) => ({ default: m.LoginPage })));
const PaymentsPage = lazy(() => import("./pages/Payments").then((m) => ({ default: m.PaymentsPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage })));
const ServiceTypesPage = lazy(() => import("./pages/ServiceTypes").then((m) => ({ default: m.ServiceTypesPage })));

export default function App() {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <I18nProvider>
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
                      <Route path="debts" element={<DebtsPage />} />
                      <Route path="service-types" element={<ServiceTypesPage />} />
                      <Route path="profile" element={<ProfilePage />} />
                      <Route element={<AdminRoute />}>
                        <Route path="employees" element={<EmployeesPage />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </RouteReady>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
        </I18nProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
