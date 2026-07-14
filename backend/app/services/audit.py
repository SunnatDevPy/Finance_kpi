import json
from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditAction, AuditLog, User


def _serialize(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return value


def diff_fields(before: dict[str, Any], after: dict[str, Any]) -> dict[str, tuple[Any, Any]]:
    """Return only the fields whose value actually changed."""
    changes: dict[str, tuple[Any, Any]] = {}
    for key, new_value in after.items():
        old_value = before.get(key)
        if old_value != new_value:
            changes[key] = (old_value, new_value)
    return changes


def record_audit(
    db: Session,
    *,
    user: User | None,
    entity_type: str,
    entity_id: int,
    action: AuditAction,
    changes: dict[str, tuple[Any, Any]] | None = None,
    summary: str | None = None,
) -> None:
    changes_json = None
    if changes:
        changes_json = json.dumps(
            {field: [_serialize(old), _serialize(new)] for field, (old, new) in changes.items()},
            ensure_ascii=False,
        )
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        summary=summary,
        changes=changes_json,
        user_id=user.id if user else None,
        username=user.full_name if user else "System",
    )
    db.add(entry)
    db.commit()


def list_audit_logs(
    db: Session,
    *,
    entity_type: str | None = None,
    entity_id: int | None = None,
    user_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[AuditLog], int]:
    from sqlalchemy import func

    filters = []
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        filters.append(AuditLog.entity_id == entity_id)
    if user_id is not None:
        filters.append(AuditLog.user_id == user_id)
    if date_from is not None:
        filters.append(AuditLog.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to is not None:
        filters.append(
            AuditLog.created_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time())
        )

    count_stmt = select(func.count(AuditLog.id))
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = db.scalar(count_stmt) or 0

    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if filters:
        stmt = stmt.where(*filters)
    items = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return items, total
