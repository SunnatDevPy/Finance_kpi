from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Expense
from app.schemas.expense import ExpenseCategoryTotal, ExpenseSummary


def get_expense_summary(
    db: Session,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> ExpenseSummary:
    filters = [Expense.deleted_at.is_(None)]
    if date_from is not None:
        filters.append(Expense.expense_date >= date_from)
    if date_to is not None:
        filters.append(Expense.expense_date <= date_to)

    total = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(*filters)
    ) or Decimal("0")

    rows = db.execute(
        select(Expense.category, func.coalesce(func.sum(Expense.amount), 0))
        .where(*filters)
        .group_by(Expense.category)
        .order_by(func.coalesce(func.sum(Expense.amount), 0).desc())
    ).all()

    return ExpenseSummary(
        total_expenses=total,
        by_category=[ExpenseCategoryTotal(category=row[0], total=row[1]) for row in rows],
        period_start=date_from,
        period_end=date_to,
    )


def total_expenses_in_range(
    db: Session, *, date_from: date | None = None, date_to: date | None = None
) -> Decimal:
    filters = [Expense.deleted_at.is_(None)]
    if date_from is not None:
        filters.append(Expense.expense_date >= date_from)
    if date_to is not None:
        filters.append(Expense.expense_date <= date_to)
    return db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(*filters)
    ) or Decimal("0")
