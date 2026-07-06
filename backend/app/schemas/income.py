from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import IncomeCategory


class IncomeBase(BaseModel):
    category: IncomeCategory
    title: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, decimal_places=2, max_digits=18)
    income_date: date
    note: str | None = None


class IncomeCreate(IncomeBase):
    pass


class IncomeUpdate(BaseModel):
    category: IncomeCategory | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2, max_digits=18)
    income_date: date | None = None
    note: str | None = None


class IncomeRead(IncomeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class IncomeCategoryTotal(BaseModel):
    category: IncomeCategory
    total: Decimal


class IncomeSummary(BaseModel):
    total_income: Decimal
    by_category: list[IncomeCategoryTotal]
    period_start: date | None
    period_end: date | None
