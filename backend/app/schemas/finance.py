from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

FinanceEntryType = Literal["income", "expense", "payment"]


class FinanceLedgerItem(BaseModel):
    type: FinanceEntryType
    id: int
    date: date
    title: str
    category: str | None = None
    amount: Decimal
    note: str | None = None
    client_id: int | None = None
    company_name: str | None = None


class FinanceLedgerPage(BaseModel):
    items: list[FinanceLedgerItem]
    total: int
    skip: int
    limit: int
    total_income: Decimal
    total_expense: Decimal
    net_balance: Decimal


class FinanceExpenseCategoryAmount(BaseModel):
    category: str
    total: Decimal


class FinanceTurnoverRead(BaseModel):
    year: int
    period: str
    date_from: date
    date_to: date
    total_revenue: Decimal
    total_expense: Decimal
    net_balance: Decimal
    expenses_by_category: list[FinanceExpenseCategoryAmount]


class FinanceTurnoverPlanUpdate(BaseModel):
    year: int = Field(ge=2000, le=2035)
    yearly_plan: Decimal = Field(gt=0, decimal_places=2, max_digits=18)


class FinanceTurnoverTrendPoint(BaseModel):
    year: int
    total_revenue: Decimal
    total_expense: Decimal
    net_balance: Decimal


class FinanceTurnoverTrendRead(BaseModel):
    year_from: int
    year_to: int
    points: list[FinanceTurnoverTrendPoint]


class FinanceTurnoverMonthlyTrendPoint(BaseModel):
    month: int = Field(ge=1, le=12)
    total_revenue: Decimal
    total_expense: Decimal
    net_balance: Decimal


class FinanceTurnoverMonthlyTrendRead(BaseModel):
    year: int
    points: list[FinanceTurnoverMonthlyTrendPoint]
