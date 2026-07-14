from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import AuditAction, Income, IncomeCategory, User
from app.schemas.income import IncomeCreate, IncomeRead, IncomeSummary, IncomeUpdate
from app.schemas.pagination import Page
from app.services.audit import diff_fields, record_audit
from app.services.helpers import get_income_or_404
from app.services.incomes import get_income_summary

router = APIRouter(prefix="/incomes", dependencies=[Depends(get_current_user)])


@router.get("", response_model=Page[IncomeRead])
def list_incomes(
    db: Session = Depends(get_db),
    category: IncomeCategory | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[IncomeRead]:
    filters = [Income.deleted_at.is_(None)]
    if category is not None:
        filters.append(Income.category == category)
    if date_from is not None:
        filters.append(Income.income_date >= date_from)
    if date_to is not None:
        filters.append(Income.income_date <= date_to)
    if search:
        pattern = f"%{search}%"
        filters.append(or_(Income.title.ilike(pattern), Income.note.ilike(pattern)))

    count_stmt = select(func.count(Income.id)).where(*filters)
    total = db.scalar(count_stmt) or 0

    stmt = (
        select(Income)
        .where(*filters)
        .order_by(Income.income_date.desc(), Income.id.desc())
    )
    items = list(db.scalars(stmt.offset(skip).limit(limit)).all())

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.get("/summary", response_model=IncomeSummary)
def income_summary(
    db: Session = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> IncomeSummary:
    return get_income_summary(db, date_from=date_from, date_to=date_to)


@router.get("/trash", response_model=Page[IncomeRead], dependencies=[Depends(require_admin)])
def list_deleted_incomes(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, min_length=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[IncomeRead]:
    filters = [Income.deleted_at.is_not(None)]
    if search:
        filters.append(Income.title.ilike(f"%{search}%"))

    total = db.scalar(select(func.count(Income.id)).where(*filters)) or 0
    stmt = (
        select(Income)
        .where(*filters)
        .order_by(Income.deleted_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = list(db.scalars(stmt).all())
    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
def create_income(
    payload: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Income:
    income = Income(**payload.model_dump())
    db.add(income)
    db.commit()
    db.refresh(income)
    record_audit(
        db,
        user=current_user,
        entity_type="income",
        entity_id=income.id,
        action=AuditAction.CREATE,
        summary=f"Kirim qo'shildi: {income.title} ({income.amount})",
    )
    return income


@router.get("/{income_id}", response_model=IncomeRead)
def get_income(income_id: int, db: Session = Depends(get_db)) -> Income:
    return get_income_or_404(db, income_id)


@router.patch("/{income_id}", response_model=IncomeRead)
def update_income(
    income_id: int,
    payload: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Income:
    income = get_income_or_404(db, income_id)
    data = payload.model_dump(exclude_unset=True)
    before = {field: getattr(income, field) for field in data}
    for field, value in data.items():
        setattr(income, field, value)
    db.commit()
    db.refresh(income)
    changes = diff_fields(before, data)
    if changes:
        record_audit(
            db,
            user=current_user,
            entity_type="income",
            entity_id=income.id,
            action=AuditAction.UPDATE,
            changes=changes,
            summary=f"Kirim tahrirlandi: {income.title}",
        )
    return income


@router.delete(
    "/{income_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    income = get_income_or_404(db, income_id)
    income.deleted_at = datetime.now(timezone.utc)
    db.commit()
    record_audit(
        db,
        user=current_user,
        entity_type="income",
        entity_id=income.id,
        action=AuditAction.DELETE,
        summary=f"Kirim arxivga o'tkazildi: {income.title} ({income.amount})",
    )


@router.post(
    "/{income_id}/restore",
    response_model=IncomeRead,
    dependencies=[Depends(require_admin)],
)
def restore_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Income:
    income = db.get(Income, income_id)
    if income is None or income.deleted_at is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kirim topilmadi")
    income.deleted_at = None
    db.commit()
    db.refresh(income)
    record_audit(
        db,
        user=current_user,
        entity_type="income",
        entity_id=income.id,
        action=AuditAction.RESTORE,
        summary=f"Kirim arxivdan tiklandi: {income.title}",
    )
    return income
