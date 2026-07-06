from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ServiceTypeBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    is_active: bool = True


class ServiceTypeCreate(ServiceTypeBase):
    pass


class ServiceTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = None


class ServiceTypeRead(ServiceTypeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    usage_count: int = 0
    total_revenue: Decimal = Decimal("0")


class ServiceTypeClientUsage(BaseModel):
    client_id: int
    company_name: str
    usage_count: int
    total_amount: Decimal


class ServiceTypeStatsRead(BaseModel):
    service_type_id: int
    name: str
    is_active: bool
    created_at: datetime
    usage_count: int
    active_usage_count: int
    cancelled_count: int
    total_revenue: Decimal
    contracts_count: int
    clients_count: int
    last_used_at: date | None
    top_clients: list[ServiceTypeClientUsage]
