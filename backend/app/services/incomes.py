from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Income
from app.schemas.income import IncomeCategoryTotal, IncomeSummary


def get_income_summary(
    db: Session,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> IncomeSummary:
    filters = [Income.deleted_at.is_(None)]
    if date_from is not None:
        filters.append(Income.income_date >= date_from)
    if date_to is not None:
        filters.append(Income.income_date <= date_to)

    total = db.scalar(
        select(func.coalesce(func.sum(Income.amount), 0)).where(*filters)
    ) or Decimal("0")

    rows = db.execute(
        select(Income.category, func.coalesce(func.sum(Income.amount), 0))
        .where(*filters)
        .group_by(Income.category)
        .order_by(func.coalesce(func.sum(Income.amount), 0).desc())
    ).all()

    return IncomeSummary(
        total_income=total,
        by_category=[IncomeCategoryTotal(category=row[0], total=row[1]) for row in rows],
        period_start=date_from,
        period_end=date_to,
    )


def total_income_in_range(
    db: Session, *, date_from: date | None = None, date_to: date | None = None
) -> Decimal:
    filters = [Income.deleted_at.is_(None)]
    if date_from is not None:
        filters.append(Income.income_date >= date_from)
    if date_to is not None:
        filters.append(Income.income_date <= date_to)
    return db.scalar(
        select(func.coalesce(func.sum(Income.amount), 0)).where(*filters)
    ) or Decimal("0")
