from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import ExpenseCategory


class ExpenseBase(BaseModel):
    category: ExpenseCategory
    title: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, decimal_places=2, max_digits=18)
    expense_date: date
    note: str | None = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    category: ExpenseCategory | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2, max_digits=18)
    expense_date: date | None = None
    note: str | None = None


class ExpenseRead(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class ExpenseCategoryTotal(BaseModel):
    category: ExpenseCategory
    total: Decimal


class ExpenseSummary(BaseModel):
    total_expenses: Decimal
    by_category: list[ExpenseCategoryTotal]
    period_start: date | None
    period_end: date | None
