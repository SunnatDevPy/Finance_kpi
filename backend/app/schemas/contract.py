from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import ContractWorkflowStatus


class ContractLineItemBase(BaseModel):
    service_type_id: int
    price: Decimal = Field(gt=0, decimal_places=2, max_digits=18)


class ContractLineItemCreate(ContractLineItemBase):
    pass


class ContractLineItemUpdate(BaseModel):
    service_type_id: int
    price: Decimal = Field(gt=0, decimal_places=2, max_digits=18)


class ContractLineItemRead(ContractLineItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_type_name: str
    is_cancelled: bool = False
    cancelled_at: datetime | None = None


class ContractBase(BaseModel):
    client_id: int
    start_date: date
    end_date: date | None = None
    notes: str | None = None
    contract_number: str | None = Field(default=None, max_length=50)
    invoice_number: str | None = Field(default=None, max_length=100)
    status: ContractWorkflowStatus = ContractWorkflowStatus.YANGI

    @model_validator(mode="after")
    def validate_dates(self) -> "ContractBase":
        if self.end_date is None:
            self.end_date = self.start_date
        if self.end_date < self.start_date:
            raise ValueError("Sana noto'g'ri")
        return self


class ContractCreate(ContractBase):
    line_items: list[ContractLineItemCreate] = Field(min_length=1)


class ContractUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    contract_number: str | None = Field(default=None, max_length=50)
    invoice_number: str | None = Field(default=None, max_length=100)
    status: ContractWorkflowStatus | None = None
    line_items: list[ContractLineItemCreate] | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "ContractUpdate":
        if self.start_date is not None and self.end_date is None:
            self.end_date = self.start_date
        if self.end_date is not None and self.start_date is None:
            self.start_date = self.end_date
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("Sana noto'g'ri")
        return self


class ContractNextNumber(BaseModel):
    """Mijoz bo'yicha keyingi shartnoma raqami (1, 2, 3 …)."""

    last_number: str | None = None
    next_number: str


class ContractRead(ContractBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: ContractWorkflowStatus
    line_items: list[ContractLineItemRead]
    total_amount: Decimal
    paid_amount: Decimal
    debt_amount: Decimal
    is_cancelled: bool = False
    created_at: datetime
    updated_at: datetime
