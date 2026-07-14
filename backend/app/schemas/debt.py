from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class DebtContractItem(BaseModel):
    contract_id: int
    contract_number: str | None
    start_date: date
    end_date: date
    total_amount: Decimal
    paid_amount: Decimal
    debt_amount: Decimal
    is_cancelled: bool


class DebtClientItem(BaseModel):
    client_id: int
    company_name: str
    phone: str | None
    total_debt: Decimal
    contracts: list[DebtContractItem]


class DebtsSummary(BaseModel):
    clients: list[DebtClientItem]
    total_debt: Decimal
    total_overpaid: Decimal
    debtor_count: int
    cancelled_amount: Decimal
