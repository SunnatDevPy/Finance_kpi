from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ExpiringContractRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    contract_id: int
    client_id: int
    company_name: str
    end_date: date
    days_left: int
    total_amount: Decimal
    debt_amount: Decimal
