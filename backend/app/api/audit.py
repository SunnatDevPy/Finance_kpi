from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.schemas.audit import AuditLogPage, LoginHistoryRead
from app.services.audit import list_audit_logs
from app.services.login_history import list_login_history

router = APIRouter(prefix="/audit", dependencies=[Depends(require_admin)])


@router.get("/login-history", response_model=list[LoginHistoryRead])
def get_login_history(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
) -> list[LoginHistoryRead]:
    return list_login_history(db, limit=limit)


@router.get("/log", response_model=AuditLogPage)
def get_audit_log(
    db: Session = Depends(get_db),
    entity_type: str | None = Query(default=None),
    entity_id: int | None = Query(default=None),
    user_id: int | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> AuditLogPage:
    items, total = list_audit_logs(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    return AuditLogPage(items=items, total=total, skip=skip, limit=limit)
