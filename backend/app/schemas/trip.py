from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class TripFactoryBase(BaseModel):
    factory_name: str = Field(..., min_length=1, max_length=255)
    client_id: int | None = None
    notes: str | None = None


class TripFactoryCreate(TripFactoryBase):
    pass


class TripFactoryRead(TripFactoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: int


class TripBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    region: str = Field(..., min_length=1, max_length=100)
    country: str = Field(default="O'zbekiston", max_length=100)
    start_date: date
    end_date: date
    user_id: int | None = None
    employee_name: str = Field(..., min_length=1, max_length=150)
    purpose: str | None = None
    results: str | None = None


class TripCreate(TripBase):
    factories: list[TripFactoryCreate] = Field(default_factory=list)


class TripUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    region: str | None = Field(default=None, min_length=1, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    user_id: int | None = None
    employee_name: str | None = Field(default=None, min_length=1, max_length=150)
    purpose: str | None = None
    results: str | None = None
    factories: list[TripFactoryCreate] | None = None


class TripRead(TripBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    factories: list[TripFactoryRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


class TripStatsSummary(BaseModel):
    year: int | None = None
    total_trips: int
    total_regions: int
    total_factories: int
    total_employees: int


class RegionTripsSummary(BaseModel):
    region: str
    country: str = "O'zbekiston"
    trips_count: int
    factories_count: int
    factories: list[str] = Field(default_factory=list)
    employees: list[str] = Field(default_factory=list)
    last_trip_date: date | None = None


class RegionFactoryDetail(BaseModel):
    id: int | None = None
    company_name: str
    city: str | None = None
    country: str | None = "O'zbekiston"
    activity_type: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    contracts_count: int = 0
    total_amount: Decimal = Decimal("0")
    total_paid: Decimal = Decimal("0")
    visited_in_2026: bool = False
    visited_count: int = 0
    visited_by: list[str] = Field(default_factory=list)
    last_visit_date: date | None = None
