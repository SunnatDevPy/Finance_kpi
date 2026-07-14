from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Contract, ContractLineItem


def sum_cancelled_line_items(
    db: Session,
    *,
    period_start: date | None = None,
    period_end: date | None = None,
) -> Decimal:
    stmt = (
        select(func.coalesce(func.sum(ContractLineItem.price), 0))
        .select_from(ContractLineItem)
        .join(Contract, Contract.id == ContractLineItem.contract_id)
        .where(
            ContractLineItem.is_cancelled.is_(True),
            Contract.deleted_at.is_(None),
        )
    )
    if period_start is not None:
        stmt = stmt.where(func.date(ContractLineItem.cancelled_at) >= period_start)
    if period_end is not None:
        stmt = stmt.where(func.date(ContractLineItem.cancelled_at) <= period_end)
    return db.scalar(stmt) or Decimal("0")


def contracts_cancelled_amount(contracts: list[Contract]) -> Decimal:
    total = Decimal("0")
    for contract in contracts:
        if contract.deleted_at is not None:
            continue
        for item in contract.line_items:
            if item.is_cancelled:
                total += item.price
    return total
