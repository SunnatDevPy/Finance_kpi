from datetime import datetime

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
