from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import Integer, case, extract, func, select
from sqlalchemy.orm import Session

from app.models import Client, Contract, ContractLineItem, ServiceType
from app.schemas.service_type import (
    ServiceTypeClientUsage,
    ServiceTypeStatsRead,
    ServiceTypeYearPoint,
)
from app.services.helpers import get_service_type_or_404


def get_service_type_stats(
    db: Session,
    service_type_id: int,
    date_from: date | None = None,
    date_to: date | None = None,
) -> ServiceTypeStatsRead:
    service_type = get_service_type_or_404(db, service_type_id)

    agg_stmt = (
        select(
            func.count(ContractLineItem.id),
            func.count(ContractLineItem.id).filter(ContractLineItem.is_cancelled.is_(False)),
            func.count(ContractLineItem.id).filter(ContractLineItem.is_cancelled.is_(True)),
            func.coalesce(
                func.sum(
                    case(
                        (ContractLineItem.is_cancelled.is_(False), ContractLineItem.price),
                        else_=0,
                    )
                ),
                0,
            ),
            func.count(func.distinct(ContractLineItem.contract_id)),
            func.count(func.distinct(Contract.client_id)),
            func.max(Contract.start_date),
        )
        .select_from(ContractLineItem)
        .join(Contract, Contract.id == ContractLineItem.contract_id)
        .where(
            ContractLineItem.service_type_id == service_type_id,
            Contract.deleted_at.is_(None),
        )
    )
    if date_from is not None:
        agg_stmt = agg_stmt.where(Contract.start_date >= date_from)
    if date_to is not None:
        agg_stmt = agg_stmt.where(Contract.start_date <= date_to)

    aggregates = db.execute(agg_stmt).one()

    usage_count, active_usage, cancelled_count, total_revenue, contracts_count, clients_count, last_used = aggregates

    client_stmt = (
        select(
            Client.id,
            Client.company_name,
            func.count(ContractLineItem.id),
            func.coalesce(
                func.sum(
                    case(
                        (ContractLineItem.is_cancelled.is_(False), ContractLineItem.price),
                        else_=0,
                    )
                ),
                0,
            ),
        )
        .select_from(ContractLineItem)
        .join(Contract, Contract.id == ContractLineItem.contract_id)
        .join(Client, Client.id == Contract.client_id)
        .where(
            ContractLineItem.service_type_id == service_type_id,
            ContractLineItem.is_cancelled.is_(False),
            Contract.deleted_at.is_(None),
            Client.deleted_at.is_(None),
        )
    )
    if date_from is not None:
        client_stmt = client_stmt.where(Contract.start_date >= date_from)
    if date_to is not None:
        client_stmt = client_stmt.where(Contract.start_date <= date_to)

    client_rows = db.execute(
        client_stmt.group_by(Client.id, Client.company_name).order_by(
            func.coalesce(
                func.sum(
                    case(
                        (ContractLineItem.is_cancelled.is_(False), ContractLineItem.price),
                        else_=0,
                    )
                ),
                0,
            ).desc()
        )
    ).all()

    top_clients = [
        ServiceTypeClientUsage(
            client_id=row[0],
            company_name=row[1],
            usage_count=row[2],
            total_amount=row[3],
        )
        for row in client_rows
    ]

    return ServiceTypeStatsRead(
        service_type_id=service_type.id,
        name=service_type.name,
        is_active=service_type.is_active,
        created_at=service_type.created_at,
        usage_count=usage_count or 0,
        active_usage_count=active_usage or 0,
        cancelled_count=cancelled_count or 0,
        total_revenue=total_revenue or Decimal("0"),
        contracts_count=contracts_count or 0,
        clients_count=clients_count or 0,
        last_used_at=last_used,
        top_clients=top_clients,
    )


def usage_counts_by_service_type(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict[int, tuple[int, Decimal]]:
    stmt = (
        select(
            ContractLineItem.service_type_id,
            func.count(ContractLineItem.id).filter(ContractLineItem.is_cancelled.is_(False)),
            func.coalesce(
                func.sum(
                    case(
                        (ContractLineItem.is_cancelled.is_(False), ContractLineItem.price),
                        else_=0,
                    )
                ),
                0,
            ),
        )
        .select_from(ContractLineItem)
        .join(Contract, Contract.id == ContractLineItem.contract_id)
        .where(ContractLineItem.is_cancelled.is_(False), Contract.deleted_at.is_(None))
    )
    if date_from is not None:
        stmt = stmt.where(Contract.start_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Contract.start_date <= date_to)

    rows = db.execute(stmt.group_by(ContractLineItem.service_type_id)).all()
    return {row[0]: (row[1], Decimal(row[2])) for row in rows}


def service_types_yearly_breakdown(db: Session) -> dict[int, list[ServiceTypeYearPoint]]:
    """Calculates yearly usage count, revenue, and growth rate for every service type across all years."""
    stmt = (
        select(
            ContractLineItem.service_type_id,
            func.cast(extract("year", Contract.start_date), Integer).label("yr"),
            func.count(ContractLineItem.id).filter(ContractLineItem.is_cancelled.is_(False)),
            func.coalesce(
                func.sum(
                    case(
                        (ContractLineItem.is_cancelled.is_(False), ContractLineItem.price),
                        else_=0,
                    )
                ),
                0,
            ),
        )
        .select_from(ContractLineItem)
        .join(Contract, Contract.id == ContractLineItem.contract_id)
        .where(ContractLineItem.is_cancelled.is_(False), Contract.deleted_at.is_(None))
        .group_by(ContractLineItem.service_type_id, extract("year", Contract.start_date))
        .order_by(ContractLineItem.service_type_id, extract("year", Contract.start_date))
    )
    rows = db.execute(stmt).all()

    st_years: dict[int, dict[int, tuple[int, Decimal]]] = {}
    for st_id, yr, count, rev in rows:
        if yr is None:
            continue
        st_years.setdefault(st_id, {})[int(yr)] = (count or 0, Decimal(rev or 0))

    result: dict[int, list[ServiceTypeYearPoint]] = {}
    for st_id, yr_map in st_years.items():
        sorted_years = sorted(yr_map.keys())
        points: list[ServiceTypeYearPoint] = []
        prev_rev: Decimal | None = None
        for yr in sorted_years:
            count, rev = yr_map[yr]
            growth: float | None = None
            if prev_rev is not None:
                if prev_rev > 0:
                    growth = round(float((rev - prev_rev) / prev_rev * 100), 1)
                elif rev > 0:
                    growth = 100.0
                else:
                    growth = 0.0
            points.append(
                ServiceTypeYearPoint(
                    year=yr,
                    revenue=rev,
                    usage_count=count,
                    growth_rate=growth,
                )
            )
            prev_rev = rev
        result[st_id] = points
    return result
