"""SQL helpers for filtering clients and contracts by outstanding debt."""

from typing import Literal

from sqlalchemy import func, select

from app.models import Client, Contract, ContractLineItem, Payment

DebtFilter = Literal["debtors", "no_debt", "overpaid"]


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


def _client_debt_totals_subquery():
    contract_debts = _contract_debt_subquery()
    return (
        select(
            contract_debts.c.client_id.label("client_id"),
            func.sum(contract_debts.c.debt).label("total_debt"),
        )
        .group_by(contract_debts.c.client_id)
        .subquery("client_debt_totals")
    )


def contract_ids_with_debt_filter(debt_filter: DebtFilter):
    contract_debts = _contract_debt_subquery()
    stmt = select(contract_debts.c.contract_id)
    if debt_filter == "debtors":
        return stmt.where(contract_debts.c.debt > 0)
    if debt_filter == "overpaid":
        return stmt.where(contract_debts.c.debt < 0)
    return stmt.where(contract_debts.c.debt == 0)


def contract_ids_without_positive_debt():
    """Legacy `has_debt=false` — zero balance and overpaid contracts."""
    contract_debts = _contract_debt_subquery()
    return select(contract_debts.c.contract_id).where(contract_debts.c.debt <= 0)


def client_ids_with_debt_filter(debt_filter: DebtFilter):
    client_totals = _client_debt_totals_subquery()
    if debt_filter == "debtors":
        return select(client_totals.c.client_id).where(client_totals.c.total_debt > 0)
    if debt_filter == "overpaid":
        return select(client_totals.c.client_id).where(client_totals.c.total_debt < 0)
    debtors = select(client_totals.c.client_id).where(client_totals.c.total_debt > 0)
    overpaid = select(client_totals.c.client_id).where(client_totals.c.total_debt < 0)
    return select(Client.id).where(~Client.id.in_(debtors), ~Client.id.in_(overpaid))


def client_ids_without_positive_debt():
    """Legacy `has_debt=false` — clients with no outstanding debt (incl. overpaid)."""
    client_totals = _client_debt_totals_subquery()
    debtors = select(client_totals.c.client_id).where(client_totals.c.total_debt > 0)
    return select(Client.id).where(~Client.id.in_(debtors))
