from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models import Client, ClientStatus
from app.schemas.contract import ContractRead


class ClientContactInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)


class ClientContactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str | None = None
    sort_order: int


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
    contacts: list[ClientContactInput] | None = None


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
    contacts: list[ClientContactInput] | None = None


class ClientRead(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    logo_url: str | None = None
    contacts: list[ClientContactRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    total_amount: Decimal = Decimal("0")
    total_paid: Decimal = Decimal("0")
    total_debt: Decimal = Decimal("0")


class ClientCardRead(ClientRead):
    contracts: list[ContractRead]
    total_debt: Decimal
    cancelled_amount: Decimal


def client_contacts_read(client: Client) -> list[ClientContactRead]:
    if client.contacts:
        return [
            ClientContactRead.model_validate(contact)
            for contact in sorted(client.contacts, key=lambda item: item.sort_order)
        ]

    legacy = []
    if client.contact_person:
        legacy = [(client.contact_person, client.phone)]
    return [
        ClientContactRead(id=index, name=name, phone=phone, sort_order=index)
        for index, (name, phone) in enumerate(legacy)
    ]


def build_client_read(
    client: Client,
    *,
    total_amount: Decimal = Decimal("0"),
    total_paid: Decimal = Decimal("0"),
    total_debt: Decimal = Decimal("0"),
) -> ClientRead:
    payload = ClientRead.model_validate(client).model_dump(
        exclude={"total_amount", "total_paid", "total_debt", "contacts"}
    )
    payload["contacts"] = client_contacts_read(client)
    payload["total_amount"] = total_amount
    payload["total_paid"] = total_paid
    payload["total_debt"] = total_debt
    return ClientRead(**payload)
