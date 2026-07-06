from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import ClientStatus
from app.schemas.contract import ContractRead


class ClientBase(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    contact_person: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    website: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    activity_type: str | None = Field(default=None, max_length=150)
    status: ClientStatus = ClientStatus.FAOL
    notes: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    contact_person: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    website: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    activity_type: str | None = Field(default=None, max_length=150)
    status: ClientStatus | None = None
    notes: str | None = None


class ClientRead(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    logo_url: str | None = None
    created_at: datetime
    updated_at: datetime


class ClientCardRead(ClientRead):
    contracts: list[ContractRead]
    total_debt: Decimal
