from datetime import date
from decimal import Decimal
from calendar import monthrange

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
    FinanceTurnoverMonthlyTrendRead,
)
from app.services.expenses import get_expense_summary
from app.services.finance_period import (
    FinancePeriod,
    TURNOVER_YEAR_END,
    TURNOVER_YEAR_START,
    ledger_includes_payments,
    ledger_payment_date_from,
    payment_counting_start,
    resolve_all_years_span,
    resolve_finance_period,
)


def _compute_turnover_for_dates(
    db: Session,
    *,
    period_start: date,
    period_end: date,
) -> tuple[Decimal, Decimal, Decimal]:
    client_payments = Decimal("0")
    payment_from = payment_counting_start(period_start, period_end)
    if payment_from is not None:
        client_payments = db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .select_from(Payment)
            .join(Contract, Contract.id == Payment.contract_id)
            .where(
                Payment.paid_at >= payment_from,
                Payment.paid_at <= period_end,
                Payment.deleted_at.is_(None),
                Contract.deleted_at.is_(None),
            )
        ) or Decimal("0")

    manual_income = db.scalar(
        select(func.coalesce(func.sum(Income.amount), 0)).where(
            Income.income_date >= period_start,
            Income.income_date <= period_end,
            Income.deleted_at.is_(None),
        )
    ) or Decimal("0")

    total_revenue = manual_income + client_payments
    expense_summary = get_expense_summary(db, date_from=period_start, date_to=period_end)
    total_expense = expense_summary.total_expenses
    return total_revenue, total_expense, total_revenue - total_expense


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
    """Income (kirim) + Expense (chiqim) birlashgan ko'rinish.
    Shartnoma to'lovlari faqat FINANCE_AUTO_PAYMENTS_FROM sanasidan boshlab qo'shiladi."""

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

    if entry_type in (None, "payment") and ledger_includes_payments(date_from, date_to):
        payment_from = ledger_payment_date_from(date_from)
        filters = [
            Payment.deleted_at.is_(None),
            Contract.deleted_at.is_(None),
            Payment.paid_at >= payment_from,
        ]
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
    total_revenue, total_expense, net_balance = _compute_turnover_for_dates(
        db,
        period_start=period_start,
        period_end=period_end,
    )
    expense_summary = get_expense_summary(db, date_from=period_start, date_to=period_end)

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


def get_finance_turnover_all_years(
    db: Session,
    *,
    period: FinancePeriod = "full",
    year_from: int = TURNOVER_YEAR_START,
    year_to: int = TURNOVER_YEAR_END,
) -> FinanceTurnoverRead:
    total_revenue = Decimal("0")
    total_expense = Decimal("0")
    category_totals: dict[str, Decimal] = {}

    for year in range(year_from, year_to + 1):
        row = get_finance_turnover(db, year=year, period=period)
        total_revenue += row.total_revenue
        total_expense += row.total_expense
        for item in row.expenses_by_category:
            category_totals[item.category] = category_totals.get(item.category, Decimal("0")) + item.total

    date_from, date_to = resolve_all_years_span(year_from=year_from, year_to=year_to)
    expenses_by_category = [
        FinanceExpenseCategoryAmount(category=category, total=total)
        for category, total in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
    ]

    return FinanceTurnoverRead(
        year=0,
        period=period,
        date_from=date_from,
        date_to=date_to,
        total_revenue=total_revenue,
        total_expense=total_expense,
        net_balance=total_revenue - total_expense,
        expenses_by_category=expenses_by_category,
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


def get_finance_turnover_monthly_trend(
    db: Session,
    *,
    year: int,
) -> FinanceTurnoverMonthlyTrendRead:
    from app.schemas.finance import FinanceTurnoverMonthlyTrendPoint, FinanceTurnoverMonthlyTrendRead

    points = []
    for month in range(1, 13):
        last_day = monthrange(year, month)[1]
        period_start = date(year, month, 1)
        period_end = date(year, month, last_day)
        total_revenue, total_expense, net_balance = _compute_turnover_for_dates(
            db,
            period_start=period_start,
            period_end=period_end,
        )
        points.append(
            FinanceTurnoverMonthlyTrendPoint(
                month=month,
                total_revenue=total_revenue,
                total_expense=total_expense,
                net_balance=net_balance,
            )
        )

    return FinanceTurnoverMonthlyTrendRead(year=year, points=points)
