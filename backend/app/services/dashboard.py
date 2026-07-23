from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import case, extract, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Client,
    ClientStatus,
    Contract,
    ContractLineItem,
    ContractWorkflowStatus,
    Expense,
    ExpenseCategory,
    Income,
    Payment,
    ServiceType,
)
from app.schemas.dashboard import (
    ChartPoint,
    ClientCountStats,
    ClientRegionStatsItem,
    ContractWorkflowStats,
    DashboardCharts,
    DashboardStats,
    NamedAmount,
    RevenuePlanPoint,
    TopClientItem,
    TopClientLtvItem,
)

from app.services.app_settings import get_monthly_plan
from app.services.cancelled_stats import sum_cancelled_line_items
from app.services.helpers import client_total_amount, client_total_paid

MONTH_LABELS = [
    "Yan",
    "Fev",
    "Mar",
    "Apr",
    "May",
    "Iyn",
    "Iyl",
    "Avg",
    "Sen",
    "Okt",
    "Noy",
    "Dek",
]
CHART_MONTHS = 12

EXPENSE_CATEGORY_LABELS: dict[ExpenseCategory, str] = {
    ExpenseCategory.SALARY: "Ish haqi",
    ExpenseCategory.RENT: "Ijara",
    ExpenseCategory.MARKETING: "Marketing",
    ExpenseCategory.UTILITIES: "Kommunal",
    ExpenseCategory.TRANSPORT: "Transport",
    ExpenseCategory.OFFICE: "Ofis xarajatlari",
    ExpenseCategory.TAX: "Soliq",
    ExpenseCategory.BANK_FEE: "Bank xizmati",
    ExpenseCategory.OTHER: "Boshqa",
}


def _month_start(value: date) -> date:
    return date(value.year, value.month, 1)


def _shift_month(value: date, offset: int) -> date:
    month_index = value.month - 1 + offset
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def _month_end(value: date) -> date:
    return date(value.year, value.month, monthrange(value.year, value.month)[1])


def _month_label(value: date) -> str:
    return MONTH_LABELS[value.month - 1]


def _month_key(value: date) -> str:
    return f"{value.year:04d}-{value.month:02d}"


def _chart_months(anchor: date, months: int = CHART_MONTHS) -> list[date]:
    current = _month_start(anchor)
    start = _shift_month(current, -(months - 1))
    return [_shift_month(start, index) for index in range(months)]


def _growth_pct(current: Decimal, previous: Decimal) -> float | None:
    if previous <= 0:
        return None if current <= 0 else 100.0
    return float(((current - previous) / previous) * 100)


def _months_in_range(start: date, end: date, max_months: int = 24) -> list[date]:
    month_start = _month_start(start)
    end_month = _month_start(end)
    months: list[date] = []
    cursor = month_start
    while cursor <= end_month and len(months) < max_months:
        months.append(cursor)
        cursor = _shift_month(cursor, 1)
    if not months:
        months = [month_start]
    return months


def _resolve_period(
    date_from: date | None,
    date_to: date | None,
) -> tuple[date, date, list[date], bool]:
    today = date.today()
    if date_from is None and date_to is None:
        period_start = today - timedelta(days=30)
        period_end = today
        return period_start, period_end, _chart_months(today), False

    period_end = date_to or today
    period_start = date_from or (period_end - timedelta(days=30))
    if period_start > period_end:
        period_start, period_end = period_end, period_start
    return period_start, period_end, _months_in_range(period_start, period_end), True


def get_revenue_trend(db: Session, months: int = 12) -> list[ChartPoint]:
    """Trailing N months of revenue, always anchored to today (ignores dashboard date filter)."""
    month_list = _chart_months(date.today(), months)
    start = month_list[0]
    end = _month_end(month_list[-1])

    payment_by_month = {
        f"{int(year):04d}-{int(month):02d}": amount
        for year, month, amount in db.execute(
            select(
                extract("year", Payment.paid_at),
                extract("month", Payment.paid_at),
                func.coalesce(func.sum(Payment.amount), 0),
            )
            .select_from(Payment)
            .join(Contract, Contract.id == Payment.contract_id)
            .where(
                Payment.paid_at >= start,
                Payment.paid_at <= end,
                Payment.deleted_at.is_(None),
                Contract.deleted_at.is_(None),
            )
            .group_by(extract("year", Payment.paid_at), extract("month", Payment.paid_at))
        ).all()
    }

    return [
        ChartPoint(
            month=_month_key(month_date),
            label=_month_label(month_date),
            value=payment_by_month.get(_month_key(month_date), Decimal("0")),
        )
        for month_date in month_list
    ]


def get_dashboard_stats(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> DashboardStats:
    today = date.today()
    monthly_plan = get_monthly_plan(db)
    period_start, period_end, months, has_custom_range = _resolve_period(date_from, date_to)
    range_start = months[0]
    range_end = _month_end(months[-1])
    chart_start = period_start if has_custom_range else range_start
    chart_end = period_end if has_custom_range else range_end

    total_contract_amount = db.scalar(
        select(func.coalesce(func.sum(ContractLineItem.price), 0))
        .select_from(ContractLineItem)
        .join(Contract, Contract.id == ContractLineItem.contract_id)
        .where(
            ContractLineItem.is_cancelled.is_(False),
            Contract.deleted_at.is_(None),
        )
    ) or Decimal("0")

    total_paid = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .select_from(Payment)
        .join(Contract, Contract.id == Payment.contract_id)
        .where(Payment.deleted_at.is_(None), Contract.deleted_at.is_(None))
    ) or Decimal("0")
    total_debt = total_contract_amount - total_paid

    period_revenue = db.scalar(
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

    duration_days = (period_end - period_start).days + 1
    prev_period_end = period_start - timedelta(days=1)
    prev_period_start = prev_period_end - timedelta(days=duration_days - 1)
    prev_period_revenue = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .select_from(Payment)
        .join(Contract, Contract.id == Payment.contract_id)
        .where(
            Payment.paid_at >= prev_period_start,
            Payment.paid_at <= prev_period_end,
            Payment.deleted_at.is_(None),
            Contract.deleted_at.is_(None),
        )
    ) or Decimal("0")
    revenue_growth_pct = _growth_pct(period_revenue, prev_period_revenue)

    total_expenses = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.deleted_at.is_(None))
    ) or Decimal("0")

    period_expenses = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.deleted_at.is_(None),
            Expense.expense_date >= period_start,
            Expense.expense_date <= period_end,
        )
    ) or Decimal("0")

    total_other_income = db.scalar(
        select(func.coalesce(func.sum(Income.amount), 0)).where(Income.deleted_at.is_(None))
    ) or Decimal("0")

    period_other_income = db.scalar(
        select(func.coalesce(func.sum(Income.amount), 0)).where(
            Income.deleted_at.is_(None),
            Income.income_date >= period_start,
            Income.income_date <= period_end,
        )
    ) or Decimal("0")

    net_profit = (
        (period_revenue + period_other_income if has_custom_range else total_paid + total_other_income)
        - (period_expenses if has_custom_range else total_expenses)
    )
    profit_base = (
        period_revenue + period_other_income if has_custom_range else total_paid + total_other_income
    )
    profit_margin_pct = float((net_profit / profit_base) * 100) if profit_base > 0 else None

    expenses_by_category_rows = db.execute(
        select(Expense.category, func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.deleted_at.is_(None))
        .group_by(Expense.category)
        .order_by(func.coalesce(func.sum(Expense.amount), 0).desc())
    ).all()

    expenses_by_month = {
        f"{int(year):04d}-{int(month):02d}": amount
        for year, month, amount in db.execute(
            select(
                extract("year", Expense.expense_date),
                extract("month", Expense.expense_date),
                func.coalesce(func.sum(Expense.amount), 0),
            )
            .where(
                Expense.expense_date >= chart_start,
                Expense.expense_date <= chart_end,
                Expense.deleted_at.is_(None),
            )
            .group_by(extract("year", Expense.expense_date), extract("month", Expense.expense_date))
        ).all()
    }

    displayed_paid = (
        period_revenue
        if has_custom_range
        else total_paid
    )

    collection_rate = (
        float((total_paid / total_contract_amount) * 100)
        if total_contract_amount > 0
        else 0.0
    )

    cancelled_amount = sum_cancelled_line_items(db)
    period_cancelled_amount = sum_cancelled_line_items(
        db,
        period_start=period_start,
        period_end=period_end,
    )
    cancelled_contracts_count = db.scalar(
        select(func.count(Contract.id)).where(
            Contract.deleted_at.is_(None),
            Contract.status == ContractWorkflowStatus.TOXTATILDI,
        )
    ) or 0

    total_contracts = db.scalar(
        select(func.count(Contract.id)).where(Contract.deleted_at.is_(None))
    ) or 0
    active_contracts = db.scalar(
        select(func.count(Contract.id)).where(
            Contract.start_date <= today,
            Contract.end_date >= today,
            Contract.deleted_at.is_(None),
        )
    ) or 0

    client_counts = db.execute(
        select(
            func.count(Client.id),
            func.count(case((Client.status == ClientStatus.FAOL, 1))),
            func.count(case((Client.status == ClientStatus.NOFAOL, 1))),
        ).where(Client.deleted_at.is_(None))
    ).one()

    contract_status_rows = db.execute(
        select(Contract.status, func.count(Contract.id))
        .where(Contract.deleted_at.is_(None))
        .group_by(Contract.status)
    ).all()
    contract_status_counts = {status: 0 for status in ContractWorkflowStatus}
    for status, count in contract_status_rows:
        contract_status_counts[status] = count
    contracts_stats = ContractWorkflowStats(
        total=sum(contract_status_counts.values()),
        yangi=contract_status_counts[ContractWorkflowStatus.YANGI],
        davom_etmoqda=contract_status_counts[ContractWorkflowStatus.DAVOM_ETMOQDA],
        tugadi=contract_status_counts[ContractWorkflowStatus.TUGADI],
        toxtatildi=contract_status_counts[ContractWorkflowStatus.TOXTATILDI],
    )

    payment_by_month = {
        f"{int(year):04d}-{int(month):02d}": amount
        for year, month, amount in db.execute(
            select(
                extract("year", Payment.paid_at),
                extract("month", Payment.paid_at),
                func.coalesce(func.sum(Payment.amount), 0),
            )
            .select_from(Payment)
            .join(Contract, Contract.id == Payment.contract_id)
            .where(
                Payment.paid_at >= chart_start,
                Payment.paid_at <= chart_end,
                Payment.deleted_at.is_(None),
                Contract.deleted_at.is_(None),
            )
            .group_by(extract("year", Payment.paid_at), extract("month", Payment.paid_at))
        ).all()
    }

    clients_stmt = (
        select(
            extract("year", func.date(Client.created_at)),
            extract("month", func.date(Client.created_at)),
            func.count(Client.id),
        )
        .where(
            func.date(Client.created_at) >= chart_start,
            Client.deleted_at.is_(None),
        )
    )
    if has_custom_range:
        clients_stmt = clients_stmt.where(func.date(Client.created_at) <= chart_end)
    clients_by_month = {
        f"{int(year):04d}-{int(month):02d}": count
        for year, month, count in db.execute(
            clients_stmt.group_by(
                extract("year", func.date(Client.created_at)),
                extract("month", func.date(Client.created_at)),
            )
        ).all()
    }

    contracts_by_month = {
        f"{int(year):04d}-{int(month):02d}": count
        for year, month, count in db.execute(
            select(
                extract("year", Contract.start_date),
                extract("month", Contract.start_date),
                func.count(Contract.id),
            )
            .where(
                Contract.start_date >= chart_start,
                Contract.start_date <= chart_end,
                Contract.deleted_at.is_(None),
            )
            .group_by(extract("year", Contract.start_date), extract("month", Contract.start_date))
        ).all()
    }

    revenue_by_service_rows = db.execute(
        select(ServiceType.name, func.coalesce(func.sum(ContractLineItem.price), 0))
        .join(ContractLineItem, ContractLineItem.service_type_id == ServiceType.id)
        .join(Contract, Contract.id == ContractLineItem.contract_id)
        .where(
            ContractLineItem.is_cancelled.is_(False),
            Contract.deleted_at.is_(None),
        )
        .group_by(ServiceType.name)
        .order_by(func.coalesce(func.sum(ContractLineItem.price), 0).desc())
    ).all()

    contract_totals = (
        select(
            Contract.client_id.label("client_id"),
            func.coalesce(func.sum(ContractLineItem.price), 0).label("contract_total"),
        )
        .join(ContractLineItem, ContractLineItem.contract_id == Contract.id)
        .where(
            ContractLineItem.is_cancelled.is_(False),
            Contract.deleted_at.is_(None),
        )
        .group_by(Contract.client_id)
        .subquery()
    )

    payment_totals_stmt = (
        select(
            Contract.client_id.label("client_id"),
            func.coalesce(func.sum(Payment.amount), 0).label("paid_total"),
        )
        .join(Payment, Payment.contract_id == Contract.id)
        .where(Contract.deleted_at.is_(None), Payment.deleted_at.is_(None))
    )
    if has_custom_range:
        payment_totals_stmt = payment_totals_stmt.where(
            Payment.paid_at >= period_start,
            Payment.paid_at <= period_end,
        )
    payment_totals = payment_totals_stmt.group_by(Contract.client_id).subquery()

    top_rows = db.execute(
        select(
            Client.id,
            Client.company_name,
            func.coalesce(payment_totals.c.paid_total, 0),
            func.coalesce(contract_totals.c.contract_total, 0)
            - func.coalesce(payment_totals.c.paid_total, 0),
        )
        .where(Client.deleted_at.is_(None))
        .outerjoin(contract_totals, contract_totals.c.client_id == Client.id)
        .outerjoin(payment_totals, payment_totals.c.client_id == Client.id)
        .order_by(func.coalesce(payment_totals.c.paid_total, 0).desc())
        .limit(8)
    ).all()

    top_clients = [
        TopClientItem(
            client_id=row[0],
            company_name=row[1],
            total_paid=row[2],
            total_debt=row[3],
        )
        for row in top_rows
        if row[2] > 0 or row[3] > 0
    ]

    cumulative_by_month = {}
    for month_date in months:
        cumulative_filters = [
            func.date(Client.created_at) <= _month_end(month_date),
            Client.deleted_at.is_(None),
        ]
        if has_custom_range:
            cumulative_filters.append(func.date(Client.created_at) >= period_start)
        cumulative_by_month[_month_key(month_date)] = (
            db.scalar(select(func.count(Client.id)).where(*cumulative_filters)) or 0
        )

    monthly_revenue_points: list[ChartPoint] = []
    revenue_vs_plan_points: list[RevenuePlanPoint] = []
    client_growth_points: list[ChartPoint] = []
    cumulative_client_points: list[ChartPoint] = []
    contract_points: list[ChartPoint] = []
    profit_points: list[ChartPoint] = []

    previous_revenue = Decimal("0")

    for month_date in months:
        key = _month_key(month_date)
        revenue = payment_by_month.get(key, Decimal("0"))
        new_clients = clients_by_month.get(key, 0)
        cumulative_clients = cumulative_by_month[key]
        contracts_count = contracts_by_month.get(key, 0)
        month_expenses = expenses_by_month.get(key, Decimal("0"))
        profit_points.append(
            ChartPoint(month=key, label=_month_label(month_date), value=revenue - month_expenses)
        )

        monthly_revenue_points.append(
            ChartPoint(month=key, label=_month_label(month_date), value=revenue)
        )
        revenue_vs_plan_points.append(
            RevenuePlanPoint(
                month=key,
                label=_month_label(month_date),
                revenue=revenue,
                plan=monthly_plan,
                growth_pct=_growth_pct(revenue, previous_revenue),
            )
        )
        client_growth_points.append(
            ChartPoint(month=key, label=_month_label(month_date), value=Decimal(new_clients))
        )
        cumulative_client_points.append(
            ChartPoint(
                month=key,
                label=_month_label(month_date),
                value=Decimal(cumulative_clients),
            )
        )
        contract_points.append(
            ChartPoint(
                month=key,
                label=_month_label(month_date),
                value=Decimal(contracts_count),
            )
        )
        previous_revenue = revenue

    charts = DashboardCharts(
        monthly_revenue=monthly_revenue_points,
        revenue_vs_plan=revenue_vs_plan_points,
        client_growth=client_growth_points,
        cumulative_clients=cumulative_client_points,
        contracts_by_month=contract_points,
        revenue_by_service=[
            NamedAmount(name=row[0], amount=row[1]) for row in revenue_by_service_rows if row[1] > 0
        ],
        debt_vs_paid=[
            NamedAmount(name="To'langan", amount=total_paid),
            NamedAmount(name="Qarzdorlik", amount=total_debt if total_debt > 0 else Decimal("0")),
            NamedAmount(name="Bekor qilingan", amount=cancelled_amount),
        ],
        expenses_by_category=[
            NamedAmount(name=EXPENSE_CATEGORY_LABELS.get(row[0], str(row[0])), amount=row[1])
            for row in expenses_by_category_rows
            if row[1] > 0
        ],
        profit_by_month=profit_points,
    )

    return DashboardStats(
        total_debt=total_debt,
        total_paid=displayed_paid,
        monthly_revenue=period_revenue,
        monthly_plan=monthly_plan,
        revenue_growth_pct=revenue_growth_pct,
        collection_rate=collection_rate,
        total_contracts=total_contracts,
        active_contracts=active_contracts,
        cancelled_amount=cancelled_amount,
        period_cancelled_amount=period_cancelled_amount,
        cancelled_contracts_count=cancelled_contracts_count,
        clients=ClientCountStats(
            total=client_counts[0],
            faol=client_counts[1],
            nofaol=client_counts[2],
        ),
        contracts=contracts_stats,
        top_clients=top_clients,
        charts=charts,
        period_start=period_start,
        period_end=period_end,
        period_expenses=period_expenses if has_custom_range else total_expenses,
        total_expenses=total_expenses,
        period_other_income=period_other_income if has_custom_range else total_other_income,
        total_other_income=total_other_income,
        net_profit=net_profit,
        profit_margin_pct=profit_margin_pct,
    )


def get_top_clients_by_ltv(db: Session, limit: int = 10) -> list[TopClientLtvItem]:
    """Rank clients by lifetime value (all-time total payments), ignoring any date filter."""
    ltv_totals = (
        select(
            Contract.client_id.label("client_id"),
            func.coalesce(func.sum(Payment.amount), 0).label("paid_total"),
            func.count(func.distinct(Contract.id)).label("contracts_count"),
        )
        .join(Payment, Payment.contract_id == Contract.id)
        .where(Contract.deleted_at.is_(None), Payment.deleted_at.is_(None))
        .group_by(Contract.client_id)
        .subquery()
    )

    rows = db.execute(
        select(
            Client.id,
            Client.company_name,
            ltv_totals.c.paid_total,
            ltv_totals.c.contracts_count,
        )
        .join(ltv_totals, ltv_totals.c.client_id == Client.id)
        .where(Client.deleted_at.is_(None))
        .order_by(ltv_totals.c.paid_total.desc())
        .limit(limit)
    ).all()

    total_ltv = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .select_from(Payment)
        .join(Contract, Contract.id == Payment.contract_id)
        .where(Payment.deleted_at.is_(None), Contract.deleted_at.is_(None))
    ) or Decimal("0")

    return [
        TopClientLtvItem(
            client_id=row[0],
            company_name=row[1],
            total_paid=row[2],
            contracts_count=row[3],
            share_pct=float((row[2] / total_ltv) * 100) if total_ltv > 0 else 0.0,
        )
        for row in rows
    ]


def get_clients_by_region(db: Session) -> list[ClientRegionStatsItem]:
    clients = list(
        db.scalars(
            select(Client)
            .options(
                selectinload(Client.contracts).selectinload(Contract.line_items),
                selectinload(Client.contracts).selectinload(Contract.payments),
            )
            .where(Client.deleted_at.is_(None))
        ).all()
    )

    buckets: dict[tuple[str, str], dict[str, Decimal | int]] = {}
    for client in clients:
        city = (client.city or "").strip()
        if not city:
            continue
        country = (client.country or "O'zbekiston").strip()
        key = (country, city)
        if key not in buckets:
            buckets[key] = {
                "clients_count": 0,
                "total_amount": Decimal("0"),
                "total_paid": Decimal("0"),
            }
        active_contracts = [contract for contract in client.contracts if contract.deleted_at is None]
        buckets[key]["clients_count"] = int(buckets[key]["clients_count"]) + 1
        buckets[key]["total_amount"] = Decimal(buckets[key]["total_amount"]) + client_total_amount(
            active_contracts
        )
        buckets[key]["total_paid"] = Decimal(buckets[key]["total_paid"]) + client_total_paid(
            active_contracts
        )

    items = [
        ClientRegionStatsItem(
            country=country,
            city=city,
            clients_count=int(data["clients_count"]),
            total_amount=Decimal(data["total_amount"]),
            total_paid=Decimal(data["total_paid"]),
            total_debt=Decimal(data["total_amount"]) - Decimal(data["total_paid"]),
        )
        for (country, city), data in buckets.items()
    ]
    items.sort(key=lambda item: (-item.clients_count, item.city))
    return items
