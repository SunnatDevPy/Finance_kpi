from datetime import date
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Contract, Expense, Income, Payment
from app.schemas.finance import (
    FinanceEntryType,
    FinanceExpenseCategoryAmount,
    FinanceLedgerItem,
    FinanceLedgerPage,
    FinanceTurnoverRead,
    FinanceTurnoverTrendRead,
)
from app.services.expenses import get_expense_summary
from app.services.finance_period import FinancePeriod, resolve_finance_period


def get_finance_ledger(
    db: Session,
    *,
    entry_type: FinanceEntryType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> FinanceLedgerPage:
    """Payment (shartnoma kirimi) + Income (boshqa kirim) + Expense (chiqim) — hammasi
    bitta xronologik ro'yxatga birlashtiriladi. Hajm katta bo'lmagani sababli (odatiy
    moliyaviy hisobot ko'lami) Python darajasida birlashtirish yetarli darajada tez."""

    items: list[FinanceLedgerItem] = []
    search_pattern = search.lower().strip() if search else None

    if entry_type in (None, "income"):
        filters = [Income.deleted_at.is_(None)]
        if date_from is not None:
            filters.append(Income.income_date >= date_from)
        if date_to is not None:
            filters.append(Income.income_date <= date_to)
        if search_pattern:
            pattern = f"%{search_pattern}%"
            filters.append(or_(Income.title.ilike(pattern), Income.note.ilike(pattern)))
        for row in db.scalars(select(Income).where(*filters)).all():
            items.append(
                FinanceLedgerItem(
                    type="income",
                    id=row.id,
                    date=row.income_date,
                    title=row.title,
                    category=row.category.value,
                    amount=row.amount,
                    note=row.note,
                )
            )

    if entry_type in (None, "payment"):
        filters = [Payment.deleted_at.is_(None), Contract.deleted_at.is_(None)]
        if date_from is not None:
            filters.append(Payment.paid_at >= date_from)
        if date_to is not None:
            filters.append(Payment.paid_at <= date_to)
        stmt = (
            select(Payment)
            .join(Contract, Contract.id == Payment.contract_id)
            .options(selectinload(Payment.contract).selectinload(Contract.client))
            .where(*filters)
        )
        for row in db.scalars(stmt).all():
            company_name = (
                row.contract.client.company_name
                if row.contract and row.contract.client
                else None
            )
            if search_pattern:
                haystack = f"{company_name or ''} {row.note or ''}".lower()
                if search_pattern not in haystack:
                    continue
            title = f"To'lov — {company_name}" if company_name else "To'lov"
            items.append(
                FinanceLedgerItem(
                    type="payment",
                    id=row.id,
                    date=row.paid_at,
                    title=title,
                    category=None,
                    amount=row.amount,
                    note=row.note,
                    client_id=row.contract.client_id if row.contract else None,
                    company_name=company_name,
                )
            )

    if entry_type in (None, "expense"):
        filters = [Expense.deleted_at.is_(None)]
        if date_from is not None:
            filters.append(Expense.expense_date >= date_from)
        if date_to is not None:
            filters.append(Expense.expense_date <= date_to)
        if search_pattern:
            pattern = f"%{search_pattern}%"
            filters.append(or_(Expense.title.ilike(pattern), Expense.note.ilike(pattern)))
        for row in db.scalars(select(Expense).where(*filters)).all():
            items.append(
                FinanceLedgerItem(
                    type="expense",
                    id=row.id,
                    date=row.expense_date,
                    title=row.title,
                    category=row.category.value,
                    amount=-row.amount,
                    note=row.note,
                )
            )

    items.sort(key=lambda item: (item.date, item.id), reverse=True)

    total_income = sum((item.amount for item in items if item.amount > 0), Decimal("0"))
    total_expense = sum((-item.amount for item in items if item.amount < 0), Decimal("0"))
    net_balance = total_income - total_expense

    total = len(items)
    page_items = items[skip : skip + limit]

    return FinanceLedgerPage(
        items=page_items,
        total=total,
        skip=skip,
        limit=limit,
        total_income=total_income,
        total_expense=total_expense,
        net_balance=net_balance,
    )


def get_finance_turnover(
    db: Session,
    *,
    year: int,
    period: FinancePeriod = "full",
) -> FinanceTurnoverRead:
    period_start, period_end = resolve_finance_period(year, period)

    total_revenue = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .select_from(Payment)
        .join(Contract, Contract.id == Payment.contract_id)
        .where(
            Payment.paid_at >= period_start,
            Payment.paid_at <= period_end,
            Payment.deleted_at.is_(None),
            Contract.deleted_at.is_(None),
        )
    ) or Decimal("0")

    expense_summary = get_expense_summary(
        db, date_from=period_start, date_to=period_end
    )
    total_expense = expense_summary.total_expenses
    net_balance = total_revenue - total_expense

    return FinanceTurnoverRead(
        year=year,
        period=period,
        date_from=period_start,
        date_to=period_end,
        total_revenue=total_revenue,
        total_expense=total_expense,
        net_balance=net_balance,
        expenses_by_category=[
            FinanceExpenseCategoryAmount(category=row.category.value, total=row.total)
            for row in expense_summary.by_category
        ],
    )


def get_finance_turnover_trend(
    db: Session,
    *,
    year_from: int,
    year_to: int,
) -> FinanceTurnoverTrendRead:
    from app.schemas.finance import FinanceTurnoverTrendPoint

    if year_to < year_from:
        year_from, year_to = year_to, year_from

    points = []
    for year in range(year_from, year_to + 1):
        turnover = get_finance_turnover(db, year=year, period="full")
        points.append(
            FinanceTurnoverTrendPoint(
                year=turnover.year,
                total_revenue=turnover.total_revenue,
                total_expense=turnover.total_expense,
                net_balance=turnover.net_balance,
            )
        )

    return FinanceTurnoverTrendRead(year_from=year_from, year_to=year_to, points=points)
