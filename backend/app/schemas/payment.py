from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.pagination import Page


class PaymentBase(BaseModel):
    amount: Decimal = Field(decimal_places=2, max_digits=18)
    paid_at: date
    note: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_not_zero(cls, value: Decimal) -> Decimal:
        if value == 0:
            raise ValueError("Summa 0 bo'lishi mumkin emas")
        return value


class PaymentCreate(PaymentBase):
    contract_id: int


class PaymentUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, decimal_places=2, max_digits=18)
    paid_at: date | None = None
    note: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_not_zero(cls, value: Decimal | None) -> Decimal | None:
        if value is not None and value == 0:
            raise ValueError("Summa 0 bo'lishi mumkin emas")
        return value


class PaymentRead(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contract_id: int
    created_at: datetime


class PaymentListRead(PaymentRead):
    company_name: str
    client_id: int
    contract_number: str | None = None


class PaymentsPage(Page[PaymentListRead]):
    """Payments list page with the filtered dataset's total amount (not just the current page)."""

    total_amount: Decimal = Decimal("0")
