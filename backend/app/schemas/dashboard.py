from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ClientRegionStatsItem(BaseModel):
    country: str
    city: str
    clients_count: int
    total_amount: Decimal
    total_paid: Decimal
    total_debt: Decimal


class ClientCountStats(BaseModel):
    total: int
    faol: int
    nofaol: int


class ContractWorkflowStats(BaseModel):
    total: int
    yangi: int
    davom_etmoqda: int
    tugadi: int
    toxtatildi: int


class TopClientItem(BaseModel):
    client_id: int
    company_name: str
    total_paid: Decimal
    total_debt: Decimal


class TopClientLtvItem(BaseModel):
    client_id: int
    company_name: str
    total_paid: Decimal
    contracts_count: int
    share_pct: float


class ChartPoint(BaseModel):
    month: str
    label: str
    value: Decimal


class RevenuePlanPoint(BaseModel):
    month: str
    label: str
    revenue: Decimal
    plan: Decimal
    growth_pct: float | None


class NamedAmount(BaseModel):
    name: str
    amount: Decimal


class DashboardCharts(BaseModel):
    monthly_revenue: list[ChartPoint]
    revenue_vs_plan: list[RevenuePlanPoint]
    client_growth: list[ChartPoint]
    cumulative_clients: list[ChartPoint]
    contracts_by_month: list[ChartPoint]
    revenue_by_service: list[NamedAmount]
    debt_vs_paid: list[NamedAmount]
    expenses_by_category: list[NamedAmount]
    profit_by_month: list[ChartPoint]


class DashboardStats(BaseModel):
    total_debt: Decimal
    total_paid: Decimal
    monthly_revenue: Decimal
    monthly_plan: Decimal
    revenue_growth_pct: float | None
    collection_rate: float
    total_contracts: int
    active_contracts: int
    cancelled_amount: Decimal
    period_cancelled_amount: Decimal
    cancelled_contracts_count: int
    clients: ClientCountStats
    contracts: ContractWorkflowStats
    top_clients: list[TopClientItem]
    charts: DashboardCharts
    period_start: date
    period_end: date
    period_expenses: Decimal
    total_expenses: Decimal
    period_other_income: Decimal
    total_other_income: Decimal
    net_profit: Decimal
    profit_margin_pct: float | None
    total_revenue: Decimal
