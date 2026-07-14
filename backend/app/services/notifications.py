from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Contract, ContractLineItem
from app.schemas.notification import ExpiringContractRead, OverdueDebtRead


def get_expiring_contracts(db: Session, days: int = 30) -> list[ExpiringContractRead]:
    today = date.today()
    cutoff = today + timedelta(days=days)

    stmt = (
        select(Contract)
        .options(
            selectinload(Contract.client),
            selectinload(Contract.line_items).selectinload(ContractLineItem.service_type),
            selectinload(Contract.payments),
        )
        .where(
            Contract.end_date >= today,
            Contract.end_date <= cutoff,
            Contract.deleted_at.is_(None),
        )
        .order_by(Contract.end_date.asc())
    )

    contracts = list(db.scalars(stmt).all())
    return [
        ExpiringContractRead(
            contract_id=contract.id,
            client_id=contract.client_id,
            company_name=contract.client.company_name,
            end_date=contract.end_date,
            days_left=(contract.end_date - today).days,
            total_amount=contract.total_amount,
            debt_amount=contract.debt_amount,
        )
        for contract in contracts
    ]


def get_overdue_debts(db: Session, min_days_overdue: int = 0) -> list[OverdueDebtRead]:
    """Contracts whose end date already passed but still carry outstanding debt."""
    today = date.today()
    cutoff = today - timedelta(days=min_days_overdue)

    stmt = (
        select(Contract)
        .options(
            selectinload(Contract.client),
            selectinload(Contract.line_items).selectinload(ContractLineItem.service_type),
            selectinload(Contract.payments),
        )
        .where(Contract.end_date <= cutoff, Contract.deleted_at.is_(None))
        .order_by(Contract.end_date.asc())
    )

    contracts = list(db.scalars(stmt).all())
    results = [
        OverdueDebtRead(
            contract_id=contract.id,
            client_id=contract.client_id,
            company_name=contract.client.company_name,
            end_date=contract.end_date,
            days_overdue=(today - contract.end_date).days,
            debt_amount=contract.debt_amount,
        )
        for contract in contracts
        if contract.debt_amount > 0
    ]
    results.sort(key=lambda item: item.debt_amount, reverse=True)
    return results
