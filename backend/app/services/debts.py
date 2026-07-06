from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Client, Contract
from app.schemas.debt import DebtClientItem, DebtContractItem, DebtsSummary


def get_debts_overview(db: Session, search: str | None = None) -> DebtsSummary:
    """Which companies owe us money (or were overpaid), broken down per contract."""
    stmt = (
        select(Client)
        .options(
            selectinload(Client.contracts).selectinload(Contract.line_items),
            selectinload(Client.contracts).selectinload(Contract.payments),
        )
        .where(Client.deleted_at.is_(None))
        .order_by(Client.company_name)
    )
    if search:
        stmt = stmt.where(Client.company_name.ilike(f"%{search}%"))
    clients = list(db.scalars(stmt).all())

    result: list[DebtClientItem] = []
    total_debt = Decimal("0")
    total_overpaid = Decimal("0")

    for client in clients:
        contract_items: list[DebtContractItem] = []
        client_total = Decimal("0")

        for contract in client.contracts:
            if contract.deleted_at is not None:
                continue
            debt = contract.debt_amount
            if debt == 0:
                continue
            contract_items.append(
                DebtContractItem(
                    contract_id=contract.id,
                    start_date=contract.start_date,
                    end_date=contract.end_date,
                    total_amount=contract.total_amount,
                    paid_amount=contract.paid_amount,
                    debt_amount=debt,
                    is_cancelled=contract.is_cancelled,
                )
            )
            client_total += debt

        if not contract_items:
            continue

        if client_total > 0:
            total_debt += client_total
        else:
            total_overpaid += -client_total

        contract_items.sort(key=lambda item: item.debt_amount, reverse=True)
        result.append(
            DebtClientItem(
                client_id=client.id,
                company_name=client.company_name,
                phone=client.phone,
                total_debt=client_total,
                contracts=contract_items,
            )
        )

    result.sort(key=lambda item: item.total_debt, reverse=True)

    return DebtsSummary(
        clients=result,
        total_debt=total_debt,
        total_overpaid=total_overpaid,
        debtor_count=sum(1 for item in result if item.total_debt > 0),
    )
