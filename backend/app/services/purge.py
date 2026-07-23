from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models import Client, Contract, Expense, Income, Payment, User
from app.services.audit import clear_audit_logs
from app.services.uploads import delete_client_logo

_ARCHIVED_ONLY_DETAIL = "Faqat arxivdagi yozuvlarni butunlay o'chirish mumkin"


def _require_archived(deleted_at) -> None:
    if deleted_at is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=_ARCHIVED_ONLY_DETAIL,
        )


def purge_client(db: Session, client_id: int, user: User) -> None:
    del user
    client = db.get(
        Client,
        client_id,
        options=[selectinload(Client.contracts).selectinload(Contract.payments)],
    )
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mijoz topilmadi")
    _require_archived(client.deleted_at)

    logo_path = client.logo_path
    entity_pairs: list[tuple[str, int]] = [("client", client_id)]
    for contract in client.contracts:
        entity_pairs.append(("contract", contract.id))
        for payment in contract.payments:
            entity_pairs.append(("payment", payment.id))

    clear_audit_logs(db, entity_pairs=entity_pairs)
    db.delete(client)
    db.commit()
    delete_client_logo(logo_path)


def purge_contract(db: Session, contract_id: int, user: User) -> None:
    del user
    contract = db.get(Contract, contract_id, options=[selectinload(Contract.payments)])
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kontrakt topilmadi")
    _require_archived(contract.deleted_at)

    entity_pairs: list[tuple[str, int]] = [("contract", contract_id)]
    entity_pairs.extend(("payment", payment.id) for payment in contract.payments)

    clear_audit_logs(db, entity_pairs=entity_pairs)
    db.delete(contract)
    db.commit()


def purge_payment(db: Session, payment_id: int, user: User) -> None:
    del user
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="To'lov topilmadi")
    _require_archived(payment.deleted_at)

    clear_audit_logs(db, entity_pairs=[("payment", payment_id)])
    db.delete(payment)
    db.commit()


def purge_expense(db: Session, expense_id: int, user: User) -> None:
    del user
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Xarajat topilmadi")
    _require_archived(expense.deleted_at)

    clear_audit_logs(db, entity_pairs=[("expense", expense_id)])
    db.delete(expense)
    db.commit()


def purge_income(db: Session, income_id: int, user: User) -> None:
    del user
    income = db.get(Income, income_id)
    if income is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kirim topilmadi")
    _require_archived(income.deleted_at)

    clear_audit_logs(db, entity_pairs=[("income", income_id)])
    db.delete(income)
    db.commit()
