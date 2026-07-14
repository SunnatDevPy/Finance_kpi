"""SQL helpers for filtering clients and contracts by outstanding debt."""

from sqlalchemy import func, select

from app.models import Client, Contract, ContractLineItem, Payment


def _contract_line_total_subquery():
    return (
        select(
            ContractLineItem.contract_id.label("contract_id"),
            func.coalesce(func.sum(ContractLineItem.price), 0).label("line_total"),
        )
        .where(ContractLineItem.is_cancelled.is_(False))
        .group_by(ContractLineItem.contract_id)
        .subquery("line_totals")
    )


def _contract_payment_total_subquery():
    return (
        select(
            Payment.contract_id.label("contract_id"),
            func.coalesce(func.sum(Payment.amount), 0).label("paid_total"),
        )
        .where(Payment.deleted_at.is_(None))
        .group_by(Payment.contract_id)
        .subquery("payment_totals")
    )


def _contract_debt_subquery():
    line_totals = _contract_line_total_subquery()
    payment_totals = _contract_payment_total_subquery()
    debt = func.coalesce(line_totals.c.line_total, 0) - func.coalesce(
        payment_totals.c.paid_total, 0
    )
    return (
        select(
            Contract.id.label("contract_id"),
            Contract.client_id.label("client_id"),
            debt.label("debt"),
        )
        .where(Contract.deleted_at.is_(None))
        .outerjoin(line_totals, Contract.id == line_totals.c.contract_id)
        .outerjoin(payment_totals, Contract.id == payment_totals.c.contract_id)
        .subquery("contract_debts")
    )


def contract_ids_with_debt_filter(has_debt: bool):
    contract_debts = _contract_debt_subquery()
    stmt = select(contract_debts.c.contract_id)
    if has_debt:
        stmt = stmt.where(contract_debts.c.debt > 0)
    else:
        stmt = stmt.where(contract_debts.c.debt <= 0)
    return stmt


def client_ids_with_debt_filter(has_debt: bool):
    contract_debts = _contract_debt_subquery()
    debtor_ids = (
        select(contract_debts.c.client_id)
        .group_by(contract_debts.c.client_id)
        .having(func.sum(contract_debts.c.debt) > 0)
    )
    if has_debt:
        return debtor_ids
    return select(Client.id).where(~Client.id.in_(debtor_ids))
