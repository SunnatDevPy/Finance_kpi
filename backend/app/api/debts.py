from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.schemas.debt import DebtsSummary
from app.services.debts import get_debts_overview

router = APIRouter(prefix="/debts", dependencies=[Depends(get_current_user)])


@router.get("", response_model=DebtsSummary)
def debts(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, min_length=1),
) -> DebtsSummary:
    """Which companies owe us money (or were overpaid), broken down per contract."""
    return get_debts_overview(db, search=search)
