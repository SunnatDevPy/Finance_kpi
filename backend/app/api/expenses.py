from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import AuditAction, Expense, ExpenseCategory, User
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseSummary, ExpenseUpdate
from app.schemas.pagination import Page
from app.services.audit import diff_fields, record_audit
from app.services.expenses import get_expense_summary
from app.services.helpers import get_expense_or_404
from app.services.purge import purge_expense

router = APIRouter(prefix="/expenses", dependencies=[Depends(get_current_user)])


@router.get("", response_model=Page[ExpenseRead])
def list_expenses(
    db: Session = Depends(get_db),
    category: ExpenseCategory | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[ExpenseRead]:
    filters = [Expense.deleted_at.is_(None)]
    if category is not None:
        filters.append(Expense.category == category)
    if date_from is not None:
        filters.append(Expense.expense_date >= date_from)
    if date_to is not None:
        filters.append(Expense.expense_date <= date_to)
    if search:
        pattern = f"%{search}%"
        filters.append(or_(Expense.title.ilike(pattern), Expense.note.ilike(pattern)))

    count_stmt = select(func.count(Expense.id)).where(*filters)
    total = db.scalar(count_stmt) or 0

    stmt = (
        select(Expense)
        .where(*filters)
        .order_by(Expense.expense_date.desc(), Expense.id.desc())
    )
    items = list(db.scalars(stmt.offset(skip).limit(limit)).all())

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.get("/summary", response_model=ExpenseSummary)
def expense_summary(
    db: Session = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> ExpenseSummary:
    return get_expense_summary(db, date_from=date_from, date_to=date_to)


@router.get("/trash", response_model=Page[ExpenseRead], dependencies=[Depends(require_admin)])
def list_deleted_expenses(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, min_length=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[ExpenseRead]:
    filters = [Expense.deleted_at.is_not(None)]
    if search:
        filters.append(Expense.title.ilike(f"%{search}%"))

    total = db.scalar(select(func.count(Expense.id)).where(*filters)) or 0
    stmt = (
        select(Expense)
        .where(*filters)
        .order_by(Expense.deleted_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = list(db.scalars(stmt).all())
    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Expense:
    expense = Expense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    record_audit(
        db,
        user=current_user,
        entity_type="expense",
        entity_id=expense.id,
        action=AuditAction.CREATE,
        summary=f"Xarajat qo'shildi: {expense.title} ({expense.amount})",
    )
    return expense


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(expense_id: int, db: Session = Depends(get_db)) -> Expense:
    return get_expense_or_404(db, expense_id)


@router.patch("/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Expense:
    expense = get_expense_or_404(db, expense_id)
    data = payload.model_dump(exclude_unset=True)
    before = {field: getattr(expense, field) for field in data}
    for field, value in data.items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    changes = diff_fields(before, data)
    if changes:
        record_audit(
            db,
            user=current_user,
            entity_type="expense",
            entity_id=expense.id,
            action=AuditAction.UPDATE,
            changes=changes,
            summary=f"Xarajat tahrirlandi: {expense.title}",
        )
    return expense


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    expense = get_expense_or_404(db, expense_id)
    expense.deleted_at = datetime.now(timezone.utc)
    db.commit()
    record_audit(
        db,
        user=current_user,
        entity_type="expense",
        entity_id=expense.id,
        action=AuditAction.DELETE,
        summary=f"Xarajat arxivga o'tkazildi: {expense.title} ({expense.amount})",
    )


@router.post(
    "/{expense_id}/restore",
    response_model=ExpenseRead,
    dependencies=[Depends(require_admin)],
)
def restore_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Expense:
    expense = db.get(Expense, expense_id)
    if expense is None or expense.deleted_at is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Xarajat topilmadi")
    expense.deleted_at = None
    db.commit()
    db.refresh(expense)
    record_audit(
        db,
        user=current_user,
        entity_type="expense",
        entity_id=expense.id,
        action=AuditAction.RESTORE,
        summary=f"Xarajat arxivdan tiklandi: {expense.title}",
    )
    return expense


@router.delete(
    "/{expense_id}/permanent",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def purge_expense_endpoint(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    purge_expense(db, expense_id, current_user)
