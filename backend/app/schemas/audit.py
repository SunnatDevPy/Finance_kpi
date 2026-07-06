import json
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models import AuditAction


class LoginHistoryRead(BaseModel):
    id: int
    user_id: int
    username: str
    full_name: str
    ip_address: str | None
    logged_in_at: datetime

    model_config = {"from_attributes": True}


class AuditLogRead(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: AuditAction
    summary: str | None
    changes: dict[str, list] | None
    user_id: int | None
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("changes", mode="before")
    @classmethod
    def _parse_changes(cls, value: object) -> object:
        if isinstance(value, str):
            return json.loads(value)
        return value


class AuditLogPage(BaseModel):
    items: list[AuditLogRead]
    total: int
    skip: int
    limit: int
