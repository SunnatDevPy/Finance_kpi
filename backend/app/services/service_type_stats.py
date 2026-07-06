from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Client, Contract, ContractLineItem, ServiceType
from app.schemas.service_type import ServiceTypeClientUsage, ServiceTypeStatsRead
from app.services.helpers import get_service_type_or_404


def get_service_type_stats(db: Session, service_type_id: int) -> ServiceTypeStatsRead:
    service_type = get_service_type_or_404(db, service_type_id)

    aggregates = db.execute(
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
    ).one()

    usage_count, active_usage, cancelled_count, total_revenue, contracts_count, clients_count, last_used = aggregates

    client_rows = db.execute(
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
        .group_by(Client.id, Client.company_name)
        .order_by(
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
        .limit(10)
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


def usage_counts_by_service_type(db: Session) -> dict[int, tuple[int, Decimal]]:
    rows = db.execute(
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
        .group_by(ContractLineItem.service_type_id)
    ).all()
    return {row[0]: (row[1], row[2]) for row in rows}
