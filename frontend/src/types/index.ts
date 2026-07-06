export type ClientStatus = "faol" | "nofaol";
export type UserRole = "admin" | "menejer";

export interface CompanyProfile {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_inn: string;
  company_bank_name: string;
  company_bank_account: string;
  company_mfo: string;
  company_director: string;
}

export interface AppSettings {
  monthly_plan: string;
  company: CompanyProfile;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginHistoryEntry {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  ip_address: string | null;
  logged_in_at: string;
}

export interface Client {
  id: number;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  activity_type: string | null;
  status: ClientStatus;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceType {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  usage_count: number;
  total_revenue: string;
}

export interface ServiceTypeClientUsage {
  client_id: number;
  company_name: string;
  usage_count: number;
  total_amount: string;
}

export interface ServiceTypeStats {
  service_type_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  usage_count: number;
  active_usage_count: number;
  cancelled_count: number;
  total_revenue: string;
  contracts_count: number;
  clients_count: number;
  last_used_at: string | null;
  top_clients: ServiceTypeClientUsage[];
}

export interface ContractLineItem {
  id: number;
  service_type_id: number;
  service_type_name: string;
  price: string;
  is_cancelled: boolean;
  cancelled_at: string | null;
}

export interface Contract {
  id: number;
  client_id: number;
  start_date: string;
  end_date: string;
  notes: string | null;
  contract_number: string | null;
  invoice_number: string | null;
  line_items: ContractLineItem[];
  total_amount: string;
  paid_amount: string;
  debt_amount: string;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  contract_id: number;
  amount: string;
  paid_at: string;
  note: string | null;
  created_at: string;
}

export interface PaymentListItem extends Payment {
  company_name: string;
  client_id: number;
}

export interface ClientCard extends Client {
  contracts: Contract[];
  total_debt: string;
}

export interface ChartPoint {
  month: string;
  label: string;
  value: string;
}

export interface RevenuePlanPoint {
  month: string;
  label: string;
  revenue: string;
  plan: string;
  growth_pct: number | null;
}

export interface NamedAmount {
  name: string;
  amount: string;
}

export interface DashboardCharts {
  monthly_revenue: ChartPoint[];
  revenue_vs_plan: RevenuePlanPoint[];
  client_growth: ChartPoint[];
  cumulative_clients: ChartPoint[];
  contracts_by_month: ChartPoint[];
  revenue_by_service: NamedAmount[];
  debt_vs_paid: NamedAmount[];
  expenses_by_category: NamedAmount[];
  profit_by_month: ChartPoint[];
}

export interface DashboardStats {
  total_debt: string;
  total_paid: string;
  monthly_revenue: string;
  monthly_plan: string;
  revenue_growth_pct: number | null;
  collection_rate: number;
  total_contracts: number;
  active_contracts: number;
  clients: { total: number; faol: number; nofaol: number };
  top_clients: {
    client_id: number;
    company_name: string;
    total_paid: string;
    total_debt: string;
  }[];
  charts: DashboardCharts;
  period_start: string;
  period_end: string;
  period_expenses: string;
  total_expenses: string;
  net_profit: string;
  profit_margin_pct: number | null;
}

export interface ClientFormData {
  company_name: string;
  contact_person: string;
  phone: string;
  website: string;
  country: string;
  city: string;
  activity_type: string;
  status: ClientStatus;
  notes: string;
}

export interface ContractFormLineItem {
  service_type_id: number;
  price: string;
}

export interface TopClientLtvItem {
  client_id: number;
  company_name: string;
  total_paid: string;
  contracts_count: number;
  share_pct: number;
}

export interface ClientImportError {
  row: number;
  message: string;
}

export interface ClientImportDuplicate {
  row: number;
  company_name: string;
}

export interface ClientImportResult {
  created: number;
  duplicates: ClientImportDuplicate[];
  errors: ClientImportError[];
}

export interface ContractImportError {
  row: number;
  message: string;
}

export interface ContractImportDuplicate {
  row: number;
  company_name: string;
  contract_number: string | null;
}

export interface ContractImportResult {
  created_contracts: number;
  created_clients: number;
  created_service_types: number;
  duplicates: ContractImportDuplicate[];
  errors: ContractImportError[];
}

export interface DebtContractItem {
  contract_id: number;
  start_date: string;
  end_date: string;
  total_amount: string;
  paid_amount: string;
  debt_amount: string;
  is_cancelled: boolean;
}

export interface DebtClientItem {
  client_id: number;
  company_name: string;
  phone: string | null;
  total_debt: string;
  contracts: DebtContractItem[];
}

export interface DebtsSummary {
  clients: DebtClientItem[];
  total_debt: string;
  total_overpaid: string;
  debtor_count: number;
}

export interface ExpiringContract {
  contract_id: number;
  client_id: number;
  company_name: string;
  end_date: string;
  days_left: number;
  total_amount: string;
  debt_amount: string;
}

export type AuditAction = "create" | "update" | "delete" | "restore";
export type AuditEntityType = "client" | "contract" | "payment" | "expense";

export type ExpenseCategory =
  | "salary"
  | "rent"
  | "marketing"
  | "utilities"
  | "transport"
  | "office"
  | "tax"
  | "bank_fee"
  | "other";

export interface Expense {
  id: number;
  category: ExpenseCategory;
  title: string;
  amount: string;
  expense_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategoryTotal {
  category: ExpenseCategory;
  total: string;
}

export interface ExpenseSummary {
  total_expenses: string;
  by_category: ExpenseCategoryTotal[];
  period_start: string | null;
  period_end: string | null;
}

export interface AuditLogEntry {
  id: number;
  entity_type: string;
  entity_id: number;
  action: AuditAction;
  summary: string | null;
  changes: Record<string, [unknown, unknown]> | null;
  user_id: number | null;
  username: string;
  created_at: string;
}
