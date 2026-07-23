from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import AuditAction, Client, Contract, Expense, Income, Payment, User
from app.services.audit import record_audit
from app.services.uploads import delete_client_logo

_ARCHIVED_ONLY_DETAIL = "Faqat arxivdagi yozuvlarni butunlay o'chirish mumkin"


def _require_archived(deleted_at) -> None:
    if deleted_at is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=_ARCHIVED_ONLY_DETAIL,
        )


def purge_client(db: Session, client_id: int, user: User) -> None:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mijoz topilmadi")
    _require_archived(client.deleted_at)

    company_name = client.company_name
    entity_id = client.id
    logo_path = client.logo_path
    db.delete(client)
    db.commit()
    delete_client_logo(logo_path)
    record_audit(
        db,
        user=user,
        entity_type="client",
        entity_id=entity_id,
        action=AuditAction.DELETE,
        summary=f"Mijoz butunlay o'chirildi: {company_name}",
    )


def purge_contract(db: Session, contract_id: int, user: User) -> None:
    contract = db.get(Contract, contract_id)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kontrakt topilmadi")
    _require_archived(contract.deleted_at)

    entity_id = contract.id
    db.delete(contract)
    db.commit()
    record_audit(
        db,
        user=user,
        entity_type="contract",
        entity_id=entity_id,
        action=AuditAction.DELETE,
        summary=f"Shartnoma butunlay o'chirildi (#{entity_id})",
    )


def purge_payment(db: Session, payment_id: int, user: User) -> None:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="To'lov topilmadi")
    _require_archived(payment.deleted_at)

    entity_id = payment.id
    contract_id = payment.contract_id
    amount = payment.amount
    db.delete(payment)
    db.commit()
    record_audit(
        db,
        user=user,
        entity_type="payment",
        entity_id=entity_id,
        action=AuditAction.DELETE,
        summary=f"To'lov butunlay o'chirildi: {amount} (shartnoma #{contract_id})",
    )


def purge_expense(db: Session, expense_id: int, user: User) -> None:
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Xarajat topilmadi")
    _require_archived(expense.deleted_at)

    entity_id = expense.id
    title = expense.title
    db.delete(expense)
    db.commit()
    record_audit(
        db,
        user=user,
        entity_type="expense",
        entity_id=entity_id,
        action=AuditAction.DELETE,
        summary=f"Xarajat butunlay o'chirildi: {title}",
    )


def purge_income(db: Session, income_id: int, user: User) -> None:
    income = db.get(Income, income_id)
    if income is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kirim topilmadi")
    _require_archived(income.deleted_at)

    entity_id = income.id
    title = income.title
    db.delete(income)
    db.commit()
    record_audit(
        db,
        user=user,
        entity_type="income",
        entity_id=entity_id,
        action=AuditAction.DELETE,
        summary=f"Kirim butunlay o'chirildi: {title}",
    )
