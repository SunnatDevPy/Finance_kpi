export type ToastResource =
  | "client"
  | "contract"
  | "payment"
  | "expense"
  | "income"
  | "serviceType"
  | "employee"
  | "settings"
  | "profile"
  | "finance";

export type ToastAction =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "imported"
  | "duplicated";

export interface MutationToastPayload {
  action: ToastAction;
  resource: ToastResource;
}

const RESOURCE_ROOTS: Record<string, ToastResource> = {
  clients: "client",
  contracts: "contract",
  payments: "payment",
  expenses: "expense",
  incomes: "income",
  "service-types": "serviceType",
  users: "employee",
  settings: "settings",
};

function resourceFromPath(path: string): ToastResource | null {
  const segment = path.split("/").filter(Boolean)[0];
  if (!segment) return null;
  return RESOURCE_ROOTS[segment] ?? null;
}

export function resolveMutationToast(
  method: string,
  path: string,
): MutationToastPayload | null {
  const clean = path.split("?")[0];
  const upper = method.toUpperCase();

  if (clean.startsWith("/auth/login")) return null;
  if (clean.includes("/export")) return null;
  if (clean.includes("/import-template")) return null;

  if (clean.endsWith("/restore") && upper === "POST") {
    const resource = resourceFromPath(clean.replace(/\/\d+\/restore$/, ""));
    return resource ? { action: "restored", resource } : null;
  }

  if (clean.endsWith("/duplicate") && upper === "POST") {
    return { action: "duplicated", resource: "contract" };
  }

  if (clean.endsWith("/import") && upper === "POST") {
    if (clean.startsWith("/finance/import")) {
      return { action: "imported", resource: "finance" };
    }
    const resource = resourceFromPath(clean.replace("/import", ""));
    return resource ? { action: "imported", resource } : null;
  }

  if (clean.endsWith("/change-password") && upper === "POST") {
    return { action: "updated", resource: "profile" };
  }

  if (clean.startsWith("/settings") && upper === "PATCH") {
    return { action: "updated", resource: "settings" };
  }

  if (/\/(confirm|complete|cancel-all)$/.test(clean) && upper === "POST") {
    return { action: "updated", resource: "contract" };
  }

  if (clean.includes("/logo") && (upper === "POST" || upper === "DELETE")) {
    return { action: "updated", resource: "client" };
  }

  if (upper === "POST") {
    const resource = resourceFromPath(clean);
    return resource ? { action: "created", resource } : null;
  }

  if (upper === "PATCH") {
    const resource = resourceFromPath(clean);
    return resource ? { action: "updated", resource } : null;
  }

  if (upper === "DELETE") {
    const resource = resourceFromPath(clean);
    return resource ? { action: "deleted", resource } : null;
  }

  return null;
}
