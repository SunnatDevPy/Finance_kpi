from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.orm import InstrumentedAttribute
from sqlalchemy.sql.elements import ColumnElement

from app.models import Client, Contract, ContractLineItem, Payment

SortOrder = Literal["asc", "desc"]

ContractSortBy = Literal["client", "period", "total", "paid", "debt", "invoice", "state"]
PaymentSortBy = Literal["date", "client", "contract", "amount", "note"]
FinanceLedgerSortBy = Literal["date", "type", "category", "amount", "note"]


def contract_amount_expressions() -> tuple[Any, Any, Any]:
    total_amount = (
        select(func.coalesce(func.sum(ContractLineItem.price), 0))
        .where(
            ContractLineItem.contract_id == Contract.id,
            ContractLineItem.is_cancelled.is_(False),
        )
        .correlate(Contract)
        .scalar_subquery()
    )
    paid_amount = (
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(
            Payment.contract_id == Contract.id,
            Payment.deleted_at.is_(None),
        )
        .correlate(Contract)
        .scalar_subquery()
    )
    return total_amount, paid_amount, total_amount - paid_amount


def contract_list_order_by(
    sort_by: ContractSortBy | None,
    sort_order: SortOrder,
) -> list[ColumnElement[Any] | InstrumentedAttribute[Any]]:
    total_amount, paid_amount, debt_amount = contract_amount_expressions()
    field = sort_by or "period"
    descending = sort_order == "desc"

    def dir_for(column: ColumnElement[Any] | InstrumentedAttribute[Any]):
        return column.desc() if descending else column.asc()

    if field == "client":
        return [dir_for(Client.company_name), Contract.id.desc()]
    if field == "total":
        return [dir_for(total_amount), Contract.id.desc()]
    if field == "paid":
        return [dir_for(paid_amount), Contract.id.desc()]
    if field == "debt":
        return [dir_for(debt_amount), Contract.id.desc()]
    if field == "invoice":
        column = Contract.invoice_number
        return [
            column.desc().nulls_last() if descending else column.asc().nulls_last(),
            Contract.id.desc(),
        ]
    if field == "state":
        return [dir_for(Contract.status), Contract.id.desc()]
    return [dir_for(Contract.start_date), Contract.id.desc()]


def payment_list_order_by(
    sort_by: PaymentSortBy | None,
    sort_order: SortOrder,
) -> list[ColumnElement[Any] | InstrumentedAttribute[Any]]:
    field = sort_by or "date"
    descending = sort_order == "desc"

    def dir_for(column: ColumnElement[Any] | InstrumentedAttribute[Any]):
        return column.desc() if descending else column.asc()

    if field == "client":
        return [dir_for(Client.company_name), Payment.id.desc()]
    if field == "contract":
        column = Contract.contract_number
        return [
            column.desc().nulls_last() if descending else column.asc().nulls_last(),
            Payment.id.desc(),
        ]
    if field == "amount":
        return [dir_for(Payment.amount), Payment.id.desc()]
    if field == "note":
        column = Payment.note
        return [
            column.desc().nulls_last() if descending else column.asc().nulls_last(),
            Payment.id.desc(),
        ]
    return [dir_for(Payment.paid_at), Payment.id.desc()]


def sort_finance_ledger_items(
    items: list[Any],
    *,
    sort_by: FinanceLedgerSortBy | None,
    sort_order: SortOrder,
) -> None:
    field = sort_by or "date"
    reverse = sort_order == "desc"

    def key_for(item: Any):
        if field == "type":
            return item.type
        if field == "category":
            return item.category or ""
        if field == "amount":
            return item.amount
        if field == "note":
            return item.note or item.title or ""
        return (item.date, item.id)

    items.sort(key=key_for, reverse=reverse)
