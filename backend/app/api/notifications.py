from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.schemas.notification import ExpiringContractRead, OverdueDebtRead
from app.services.notifications import get_expiring_contracts, get_overdue_debts

router = APIRouter(prefix="/notifications", dependencies=[Depends(get_current_user)])


@router.get("/expiring-contracts", response_model=list[ExpiringContractRead])
def expiring_contracts(
    db: Session = Depends(get_db),
    days: int = Query(default=30, ge=1, le=365),
) -> list[ExpiringContractRead]:
    return get_expiring_contracts(db, days=days)


@router.get("/overdue-debts", response_model=list[OverdueDebtRead])
def overdue_debts(
    db: Session = Depends(get_db),
    min_days: int = Query(default=0, ge=0, le=365),
) -> list[OverdueDebtRead]:
    return get_overdue_debts(db, min_days_overdue=min_days)
