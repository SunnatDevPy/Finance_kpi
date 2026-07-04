from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class PaymentRead(PaymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contract_id: int
    created_at: datetime


class PaymentListRead(PaymentRead):
    company_name: str
    client_id: int
