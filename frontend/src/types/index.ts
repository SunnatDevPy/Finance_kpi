export type ClientStatus = "faol" | "nofaol";
export type ContractWorkflowStatus =
  | "yangi"
  | "davom_etmoqda"
  | "tugadi"
  | "toxtatildi";
export type UserRole = "admin" | "menejer";
export type DebtFilter = "debtors" | "no_debt" | "overpaid";
export type ClientDebtFilter = "all" | DebtFilter;

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
  total_debt: string;
  total_amount: string;
  total_paid: string;
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
  status: ContractWorkflowStatus;
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
  contract_number: string | null;
}

export interface PaymentsPaginated extends Paginated<PaymentListItem> {
  total_amount: string;
}

export interface ClientCard extends Client {
  contracts: Contract[];
  total_debt: string;
  cancelled_amount: string;
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
  cancelled_amount: string;
  period_cancelled_amount: string;
  cancelled_contracts_count: number;
  clients: { total: number; faol: number; nofaol: number };
  contracts: {
    total: number;
    yangi: number;
    davom_etmoqda: number;
    tugadi: number;
    toxtatildi: number;
  };
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
  period_other_income: string;
  total_other_income: string;
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

export interface ClientRegionStatsItem {
  country: string;
  city: string;
  clients_count: number;
  total_amount: string;
  total_paid: string;
  total_debt: string;
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
  contract_number: string | null;
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
  cancelled_amount: string;
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

export interface OverdueDebt {
  contract_id: number;
  client_id: number;
  company_name: string;
  end_date: string;
  days_overdue: number;
  debt_amount: string;
}

export type AuditAction = "create" | "update" | "delete" | "restore";
export type AuditEntityType = "client" | "contract" | "payment" | "expense" | "income" | "user";

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

export type IncomeCategory =
  | "sale"
  | "service"
  | "investment"
  | "loan"
  | "grant"
  | "refund"
  | "other";

export interface Income {
  id: number;
  category: IncomeCategory;
  title: string;
  amount: string;
  income_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeCategoryTotal {
  category: IncomeCategory;
  total: string;
}

export interface IncomeSummary {
  total_income: string;
  by_category: IncomeCategoryTotal[];
  period_start: string | null;
  period_end: string | null;
}

export type FinanceEntryType = "income" | "expense" | "payment";

export interface FinanceLedgerItem {
  type: FinanceEntryType;
  id: number;
  date: string;
  title: string;
  category: string | null;
  amount: string;
  note: string | null;
  client_id: number | null;
  company_name: string | null;
}

export interface FinanceLedgerPage {
  items: FinanceLedgerItem[];
  total: number;
  skip: number;
  limit: number;
  total_income: string;
  total_expense: string;
  net_balance: string;
}

export interface FinanceImportError {
  row: number;
  message: string;
}

export interface FinanceImportResult {
  created_income: number;
  created_expense: number;
  errors: FinanceImportError[];
}

export type FinancePeriod = "full" | "q1" | "q2" | "q3" | "q4";

export type FinanceTurnoverYear = number | "all";

export interface FinanceTurnover {
  year: number;
  period: string;
  date_from: string;
  date_to: string;
  total_revenue: string;
  total_expense: string;
  net_balance: string;
  expenses_by_category: FinanceExpenseCategoryAmount[];
}

export interface FinanceExpenseCategoryAmount {
  category: string;
  total: string;
}

export interface FinanceTurnoverTrendPoint {
  year: number;
  total_revenue: string;
  total_expense: string;
  net_balance: string;
}

export interface FinanceTurnoverTrend {
  year_from: number;
  year_to: number;
  points: FinanceTurnoverTrendPoint[];
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
