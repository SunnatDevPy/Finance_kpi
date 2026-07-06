from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

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
