import type {
  AppSettings,
  AuditEntityType,
  AuditLogEntry,
  ChartPoint,
  Client,
  ClientCard,
  ClientFormData,
  ClientImportResult,
  CompanyProfile,
  Contract,
  ContractImportResult,
  ContractWorkflowStatus,
  DashboardStats,
  DebtsSummary,
  DebtFilter,
  Expense,
  ExpenseCategory,
  ExpenseSummary,
  ExpiringContract,
  FinanceEntryType,
  FinanceImportResult,
  FinanceLedgerPage,
  Income,
  IncomeCategory,
  IncomeSummary,
  LoginHistoryEntry,
  OverdueDebt,
  Payment,
  PaymentsPaginated,
  Paginated,
  ServiceType,
  ServiceTypeStats,
  TopClientLtvItem,
  User,
  UserRole,
} from "../types";
import { notifyMutationSuccess } from "../lib/toastBus";

const API_BASE = "/api/v1";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

/**
 * Bir xil so'rovni (metod + yo'l + tana) qisqa vaqt oralig'ida ikki marta
 * yubormaslik uchun — masalan interfeys "qotib qolib" foydalanuvchi tugmani
 * ikki marta bossa, yoki bir nechta joydan bir xil so'rov tasodifan chaqirilsa,
 * ikkinchisi tarmoqqa yangi so'rov yubormasdan birinchisining natijasini kutadi.
 */
const inFlightRequests = new Map<string, Promise<unknown>>();
const DEDUPE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEDUPE_GRACE_MS = 800;

export interface TrashParams {
  search?: string;
  skip?: number;
  limit?: number;
}

function trashQueryString(params?: TrashParams): string {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.skip !== undefined) q.set("skip", String(params.skip));
  if (params?.limit !== undefined) q.set("limit", String(params.limit));
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

function dedupeKey(path: string, options?: RequestInit): string | null {
  const method = (options?.method ?? "GET").toUpperCase();
  if (!DEDUPE_METHODS.has(method)) return null;
  const body = options?.body;
  if (body !== undefined && typeof body !== "string") return null;
  return `${method} ${path}\u0000${body ?? ""}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const key = dedupeKey(path, options);
  if (key) {
    const existing = inFlightRequests.get(key);
    if (existing) return existing as Promise<T>;
  }

  const exec = performRequest<T>(path, options);
  if (key) {
    inFlightRequests.set(key, exec);
    const clear = () => {
      window.setTimeout(() => {
        if (inFlightRequests.get(key) === exec) inFlightRequests.delete(key);
      }, DEDUPE_GRACE_MS);
    };
    exec.then(clear, clear);
  }
  return exec;
}

async function performRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Xatolik yuz berdi" }));
    const message =
      typeof error.detail === "string"
        ? error.detail
        : Array.isArray(error.detail)
          ? error.detail.map((e: { msg: string }) => e.msg).join(", ")
          : "Xatolik yuz berdi";
    throw new Error(message);
  }

  if (response.status === 204) {
    const method = (options?.method ?? "GET").toUpperCase();
    if (DEDUPE_METHODS.has(method)) notifyMutationSuccess(method, path);
    return undefined as T;
  }
  const data = await response.json();
  const method = (options?.method ?? "GET").toUpperCase();
  if (DEDUPE_METHODS.has(method)) notifyMutationSuccess(method, path);
  return data;
}

async function download(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { headers });

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Xatolik yuz berdi" }));
    const message =
      typeof error.detail === "string"
        ? error.detail
        : Array.isArray(error.detail)
          ? error.detail.map((e: { msg: string }) => e.msg).join(", ")
          : "Xatolik yuz berdi";
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Xatolik yuz berdi" }));
    const message =
      typeof error.detail === "string"
        ? error.detail
        : Array.isArray(error.detail)
          ? error.detail.map((e: { msg: string }) => e.msg).join(", ")
          : "Xatolik yuz berdi";
    throw new Error(message);
  }

  const data = await response.json();
  notifyMutationSuccess("POST", path);
  return data;
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ access_token: string; token_type: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    me: () => request<User>("/auth/me"),
    changePassword: (current_password: string, new_password: string) =>
      request<void>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password, new_password }),
      }),
  },

  users: {
    list: () => request<User[]>("/users"),
    create: (data: {
      username: string;
      full_name: string;
      password: string;
      role: UserRole;
    }) =>
      request<User>("/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: number,
      data: Partial<{
        full_name: string;
        role: UserRole;
        is_active: boolean;
        password: string;
      }>,
    ) =>
      request<User>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  dashboard: (params?: { date_from?: string; date_to?: string }) => {
    const q = new URLSearchParams();
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    const qs = q.toString();
    return request<DashboardStats>(`/dashboard${qs ? `?${qs}` : ""}`);
  },

  dashboardTopClients: (limit = 10) =>
    request<TopClientLtvItem[]>(`/dashboard/top-clients?limit=${limit}`),

  dashboardRevenueTrend: (months: 6 | 12 = 12) =>
    request<ChartPoint[]>(`/dashboard/revenue-trend?months=${months}`),

  debts: {
    list: (search?: string) =>
      request<DebtsSummary>(`/debts${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  },

  notifications: {
    expiringContracts: (days = 30) =>
      request<ExpiringContract[]>(`/notifications/expiring-contracts?days=${days}`),
    overdueDebts: (minDays = 0) =>
      request<OverdueDebt[]>(`/notifications/overdue-debts?min_days=${minDays}`),
  },

  settings: {
    get: () => request<AppSettings>("/settings"),
    updateMonthlyPlan: (monthly_plan: number) =>
      request<AppSettings>("/settings/monthly-plan", {
        method: "PATCH",
        body: JSON.stringify({ monthly_plan }),
      }),
    updateCompanyProfile: (data: Partial<CompanyProfile>) =>
      request<AppSettings>("/settings/company-profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  audit: {
    loginHistory: (limit = 100) =>
      request<LoginHistoryEntry[]>(`/audit/login-history?limit=${limit}`),
    log: (params?: {
      entityType?: AuditEntityType;
      entityId?: number;
      userId?: number;
      dateFrom?: string;
      dateTo?: string;
      skip?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.entityType) q.set("entity_type", params.entityType);
      if (params?.entityId !== undefined) q.set("entity_id", String(params.entityId));
      if (params?.userId !== undefined) q.set("user_id", String(params.userId));
      if (params?.dateFrom) q.set("date_from", params.dateFrom);
      if (params?.dateTo) q.set("date_to", params.dateTo);
      if (params?.skip !== undefined) q.set("skip", String(params.skip));
      if (params?.limit !== undefined) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<Paginated<AuditLogEntry>>(`/audit/log${qs ? `?${qs}` : ""}`);
    },
  },

  export: {
    download: (
      resource: "clients" | "contracts" | "payments" | "debts" | "expenses" | "incomes",
      format: "xlsx" | "pdf",
      params?: { date_from?: string; date_to?: string; ids?: number[] },
    ) => {
      const q = new URLSearchParams({ format });
      if (params?.date_from) q.set("date_from", params.date_from);
      if (params?.date_to) q.set("date_to", params.date_to);
      if (params?.ids?.length) q.set("ids", params.ids.join(","));
      return download(`/export/${resource}?${q}`, `${resource}.${format}`);
    },
  },

  clients: {
    list: (params?: {
      status?: string;
      search?: string;
      city?: string;
      debtFilter?: DebtFilter;
      hasDebt?: boolean;
      skip?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.search) q.set("search", params.search);
      if (params?.city) q.set("city", params.city);
      if (params?.debtFilter) q.set("debt_filter", params.debtFilter);
      if (params?.hasDebt !== undefined) q.set("has_debt", params.hasDebt ? "true" : "false");
      if (params?.skip !== undefined) q.set("skip", String(params.skip));
      if (params?.limit !== undefined) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<Paginated<Client>>(`/clients${qs ? `?${qs}` : ""}`);
    },
    cities: () => request<string[]>("/clients/cities"),
    get: (id: number) => request<Client>(`/clients/${id}`),
    card: (id: number) => request<ClientCard>(`/clients/${id}/card`),
    create: (data: Partial<ClientFormData>) =>
      request<Client>("/clients", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<ClientFormData>) =>
      request<Client>(`/clients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<void>(`/clients/${id}`, { method: "DELETE" }),
    downloadImportTemplate: () => download("/clients/import-template", "mijozlar_shabloni.xlsx"),
    import: (file: File) => uploadFile<ClientImportResult>("/clients/import", file),
    trash: (params?: TrashParams) => request<Paginated<Client>>(`/clients/trash${trashQueryString(params)}`),
    restore: (id: number) => request<Client>(`/clients/${id}/restore`, { method: "POST" }),
    uploadLogo: (id: number, file: File) => uploadFile<Client>(`/clients/${id}/logo`, file),
    deleteLogo: (id: number) => request<Client>(`/clients/${id}/logo`, { method: "DELETE" }),
    exportCard: (id: number) => download(`/clients/${id}/export`, `mijoz_${id}.xlsx`),
  },

  serviceTypes: {
    list: (activeOnly = false) =>
      request<ServiceType[]>(`/service-types${activeOnly ? "?active_only=true" : ""}`),
    create: (data: { name: string; is_active?: boolean }) =>
      request<ServiceType>("/service-types", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { name?: string; is_active?: boolean }) =>
      request<ServiceType>(`/service-types/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<void>(`/service-types/${id}`, { method: "DELETE" }),
    stats: (id: number) => request<ServiceTypeStats>(`/service-types/${id}/stats`),
  },

  contracts: {
    list: (params?: {
      clientId?: number;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: ContractWorkflowStatus;
      debtFilter?: DebtFilter;
      hasDebt?: boolean;
      skip?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.clientId) q.set("client_id", String(params.clientId));
      if (params?.search) q.set("search", params.search);
      if (params?.dateFrom) q.set("date_from", params.dateFrom);
      if (params?.dateTo) q.set("date_to", params.dateTo);
      if (params?.status) q.set("status", params.status);
      if (params?.debtFilter) q.set("debt_filter", params.debtFilter);
      if (params?.hasDebt !== undefined) q.set("has_debt", params.hasDebt ? "true" : "false");
      if (params?.skip !== undefined) q.set("skip", String(params.skip));
      if (params?.limit !== undefined) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<Paginated<Contract>>(`/contracts${qs ? `?${qs}` : ""}`);
    },
    nextNumber: (clientId: number) =>
      request<{ last_number: string | null; next_number: string }>(
        `/contracts/next-number?client_id=${clientId}`,
      ),
    create: (data: {
      client_id: number;
      start_date: string;
      end_date: string;
      notes?: string;
      status?: ContractWorkflowStatus;
      contract_number?: string;
      invoice_number?: string;
      line_items: { service_type_id: number; price: number }[];
    }) =>
      request<Contract>("/contracts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: number,
      data: {
        start_date?: string;
        end_date?: string;
        notes?: string;
        status?: ContractWorkflowStatus;
        contract_number?: string;
        invoice_number?: string;
        line_items?: { service_type_id: number; price: number }[];
      },
    ) =>
      request<Contract>(`/contracts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    duplicate: (id: number) =>
      request<Contract>(`/contracts/${id}/duplicate`, { method: "POST" }),
    delete: (id: number) => request<void>(`/contracts/${id}`, { method: "DELETE" }),
    downloadImportTemplate: () =>
      download("/contracts/import-template", "shartnomalar_shabloni.xlsx"),
    import: (file: File) => uploadFile<ContractImportResult>("/contracts/import", file),
    cancelLineItem: (contractId: number, lineItemId: number) =>
      request<Contract>(`/contracts/${contractId}/line-items/${lineItemId}/cancel`, {
        method: "PATCH",
      }),
    updateLineItem: (
      contractId: number,
      lineItemId: number,
      data: { service_type_id: number; price: number },
    ) =>
      request<Contract>(`/contracts/${contractId}/line-items/${lineItemId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    history: (contractId: number, params?: { skip?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.skip !== undefined) q.set("skip", String(params.skip));
      if (params?.limit !== undefined) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<Paginated<AuditLogEntry>>(
        `/contracts/${contractId}/history${qs ? `?${qs}` : ""}`,
      );
    },
    reactivateLineItem: (contractId: number, lineItemId: number) =>
      request<Contract>(`/contracts/${contractId}/line-items/${lineItemId}/reactivate`, {
        method: "PATCH",
      }),
    cancelAll: (contractId: number) =>
      request<Contract>(`/contracts/${contractId}/cancel-all`, { method: "POST" }),
    confirm: (contractId: number) =>
      request<Contract>(`/contracts/${contractId}/confirm`, { method: "POST" }),
    complete: (contractId: number) =>
      request<Contract>(`/contracts/${contractId}/complete`, { method: "POST" }),
    trash: (params?: TrashParams) => request<Paginated<Contract>>(`/contracts/trash${trashQueryString(params)}`),
    restore: (id: number) => request<Contract>(`/contracts/${id}/restore`, { method: "POST" }),
    downloadDocument: (id: number, type: "invoice" | "act" | "contract", contractNumber?: string | null) => {
      const prefix =
        type === "invoice" ? "schyot-faktura" : type === "act" ? "akt" : "shartnoma";
      return download(
        `/contracts/${id}/documents/${type}`,
        `${prefix}_${contractNumber || id}.pdf`,
      );
    },
  },

  payments: {
    list: (params?: {
      contractId?: number;
      date_from?: string;
      date_to?: string;
      search?: string;
      skip?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.contractId) q.set("contract_id", String(params.contractId));
      if (params?.date_from) q.set("date_from", params.date_from);
      if (params?.date_to) q.set("date_to", params.date_to);
      if (params?.search) q.set("search", params.search);
      if (params?.skip !== undefined) q.set("skip", String(params.skip));
      if (params?.limit !== undefined) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<PaymentsPaginated>(`/payments${qs ? `?${qs}` : ""}`);
    },
    create: (data: {
      contract_id: number;
      amount: number;
      paid_at: string;
      note?: string;
    }) =>
      request<Payment>("/payments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<void>(`/payments/${id}`, { method: "DELETE" }),
    trash: (params?: TrashParams) => request<Paginated<Payment>>(`/payments/trash${trashQueryString(params)}`),
    restore: (id: number) => request<Payment>(`/payments/${id}/restore`, { method: "POST" }),
  },

  expenses: {
    list: (params?: {
      category?: ExpenseCategory;
      search?: string;
      date_from?: string;
      date_to?: string;
      skip?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.category) q.set("category", params.category);
      if (params?.search) q.set("search", params.search);
      if (params?.date_from) q.set("date_from", params.date_from);
      if (params?.date_to) q.set("date_to", params.date_to);
      if (params?.skip !== undefined) q.set("skip", String(params.skip));
      if (params?.limit !== undefined) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<Paginated<Expense>>(`/expenses${qs ? `?${qs}` : ""}`);
    },
    summary: (params?: { date_from?: string; date_to?: string }) => {
      const q = new URLSearchParams();
      if (params?.date_from) q.set("date_from", params.date_from);
      if (params?.date_to) q.set("date_to", params.date_to);
      const qs = q.toString();
      return request<ExpenseSummary>(`/expenses/summary${qs ? `?${qs}` : ""}`);
    },
    create: (data: {
      category: ExpenseCategory;
      title: string;
      amount: number;
      expense_date: string;
      note?: string;
    }) =>
      request<Expense>("/expenses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: number,
      data: Partial<{
        category: ExpenseCategory;
        title: string;
        amount: number;
        expense_date: string;
        note: string;
      }>,
    ) =>
      request<Expense>(`/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<void>(`/expenses/${id}`, { method: "DELETE" }),
    trash: (params?: TrashParams) => request<Paginated<Expense>>(`/expenses/trash${trashQueryString(params)}`),
    restore: (id: number) => request<Expense>(`/expenses/${id}/restore`, { method: "POST" }),
  },

  incomes: {
    list: (params?: {
      category?: IncomeCategory;
      search?: string;
      date_from?: string;
      date_to?: string;
      skip?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.category) q.set("category", params.category);
      if (params?.search) q.set("search", params.search);
      if (params?.date_from) q.set("date_from", params.date_from);
      if (params?.date_to) q.set("date_to", params.date_to);
      if (params?.skip !== undefined) q.set("skip", String(params.skip));
      if (params?.limit !== undefined) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<Paginated<Income>>(`/incomes${qs ? `?${qs}` : ""}`);
    },
    summary: (params?: { date_from?: string; date_to?: string }) => {
      const q = new URLSearchParams();
      if (params?.date_from) q.set("date_from", params.date_from);
      if (params?.date_to) q.set("date_to", params.date_to);
      const qs = q.toString();
      return request<IncomeSummary>(`/incomes/summary${qs ? `?${qs}` : ""}`);
    },
    create: (data: {
      category: IncomeCategory;
      title: string;
      amount: number;
      income_date: string;
      note?: string;
    }) =>
      request<Income>("/incomes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: number,
      data: Partial<{
        category: IncomeCategory;
        title: string;
        amount: number;
        income_date: string;
        note: string;
      }>,
    ) =>
      request<Income>(`/incomes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<void>(`/incomes/${id}`, { method: "DELETE" }),
    trash: (params?: TrashParams) => request<Paginated<Income>>(`/incomes/trash${trashQueryString(params)}`),
    restore: (id: number) => request<Income>(`/incomes/${id}/restore`, { method: "POST" }),
  },

  finance: {
    ledger: (params?: {
      type?: FinanceEntryType;
      search?: string;
      date_from?: string;
      date_to?: string;
      skip?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.type) q.set("type", params.type);
      if (params?.search) q.set("search", params.search);
      if (params?.date_from) q.set("date_from", params.date_from);
      if (params?.date_to) q.set("date_to", params.date_to);
      if (params?.skip !== undefined) q.set("skip", String(params.skip));
      if (params?.limit !== undefined) q.set("limit", String(params.limit));
      const qs = q.toString();
      return request<FinanceLedgerPage>(`/finance/ledger${qs ? `?${qs}` : ""}`);
    },
    downloadImportTemplate: () =>
      download("/finance/import-template", "moliya_tarixi_shabloni.xlsx"),
    import: (file: File) => uploadFile<FinanceImportResult>("/finance/import", file),
  },
};
