from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import LoginHistory, User


def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def record_login(db: Session, user: User, request: Request) -> None:
    ua = request.headers.get("User-Agent")
    entry = LoginHistory(
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        ip_address=client_ip(request),
        user_agent=ua[:512] if ua else None,
    )
    db.add(entry)
    db.commit()


def list_login_history(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[LoginHistory], int]:
    safe_limit = max(1, min(limit, 200))
    safe_skip = max(0, skip)
    total = db.scalar(select(func.count(LoginHistory.id))) or 0
    items = list(
        db.scalars(
            select(LoginHistory)
            .order_by(LoginHistory.logged_in_at.desc())
            .offset(safe_skip)
            .limit(safe_limit)
        ).all()
    )
    return items, total
