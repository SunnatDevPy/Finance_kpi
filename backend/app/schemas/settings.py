from decimal import Decimal

from pydantic import BaseModel, Field


class SettingsRead(BaseModel):
    monthly_plan: Decimal


class MonthlyPlanUpdate(BaseModel):
    monthly_plan: Decimal = Field(gt=0, decimal_places=2, max_digits=18)
