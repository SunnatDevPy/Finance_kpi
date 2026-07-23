type RouteModule = () => Promise<unknown>;

const routeModules: Record<string, RouteModule> = {
  "/": () => import("../pages/Dashboard"),
  "/clients": () => import("../pages/Clients"),
  "/contracts": () => import("../pages/Contracts"),
  "/payments": () => import("../pages/Payments"),
  "/finance": () => import("../pages/Finance"),
  "/service-types": () => import("../pages/ServiceTypes"),
  "/profile": () => import("../pages/Profile"),
  "/employees": () => import("../pages/Employees"),
  "/audit-log": () => import("../pages/AuditLog"),
  "/trash": () => import("../pages/Trash"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  const normalized = path.split("?")[0] || "/";
  if (prefetched.has(normalized)) return;
  const loader = routeModules[normalized];
  if (!loader) return;
  prefetched.add(normalized);
  void loader();
}
