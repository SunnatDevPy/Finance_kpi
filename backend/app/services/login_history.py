from fastapi import Request
from sqlalchemy import select
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


def list_login_history(db: Session, *, limit: int = 100) -> list[LoginHistory]:
    safe_limit = max(1, min(limit, 500))
    return list(
        db.scalars(
            select(LoginHistory).order_by(LoginHistory.logged_in_at.desc()).limit(safe_limit)
        ).all()
    )
