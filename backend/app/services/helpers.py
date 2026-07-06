from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Client, Contract, ContractLineItem, Expense, Payment, ServiceType
from app.schemas.contract import ContractLineItemRead, ContractRead


def get_client_or_404(db: Session, client_id: int) -> Client:
    client = db.scalars(
        select(Client).where(Client.id == client_id, Client.deleted_at.is_(None))
    ).first()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mijoz topilmadi")
    return client


def get_service_type_or_404(db: Session, service_type_id: int) -> ServiceType:
    service_type = db.get(ServiceType, service_type_id)
    if service_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Xizmat turi topilmadi"
        )
    return service_type


def get_contract_or_404(db: Session, contract_id: int) -> Contract:
    stmt = (
        select(Contract)
        .options(
            selectinload(Contract.line_items).selectinload(ContractLineItem.service_type),
            selectinload(Contract.payments),
            selectinload(Contract.client),
        )
        .where(Contract.id == contract_id, Contract.deleted_at.is_(None))
    )
    contract = db.scalars(stmt).first()
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kontrakt topilmadi")
    return contract


def get_payment_or_404(db: Session, payment_id: int) -> Payment:
    payment = db.scalars(
        select(Payment).where(Payment.id == payment_id, Payment.deleted_at.is_(None))
    ).first()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="To'lov topilmadi")
    return payment


def get_expense_or_404(db: Session, expense_id: int) -> Expense:
    expense = db.scalars(
        select(Expense).where(Expense.id == expense_id, Expense.deleted_at.is_(None))
    ).first()
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Xarajat topilmadi")
    return expense


def get_line_item_or_404(db: Session, contract_id: int, line_item_id: int) -> ContractLineItem:
    line_item = db.get(ContractLineItem, line_item_id)
    if line_item is None or line_item.contract_id != contract_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Xizmat qatori topilmadi"
        )
    return line_item


def validate_line_items(db: Session, line_items: list) -> list[ServiceType]:
    if not line_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kamida bitta xizmat qo'shilishi kerak",
        )

    service_types: list[ServiceType] = []
    seen_ids: set[int] = set()
    for item in line_items:
        if item.service_type_id in seen_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bir xil xizmat turi takrorlanmasligi kerak",
            )
        seen_ids.add(item.service_type_id)

        service_type = get_service_type_or_404(db, item.service_type_id)
        if not service_type.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nofaol xizmat turi: {service_type.name}",
            )
        service_types.append(service_type)
    return service_types


def contract_to_read(contract: Contract) -> ContractRead:
    return ContractRead(
        id=contract.id,
        client_id=contract.client_id,
        start_date=contract.start_date,
        end_date=contract.end_date,
        notes=contract.notes,
        contract_number=contract.contract_number,
        invoice_number=contract.invoice_number,
        line_items=[
            ContractLineItemRead(
                id=item.id,
                service_type_id=item.service_type_id,
                service_type_name=item.service_type.name,
                price=item.price,
                is_cancelled=item.is_cancelled,
                cancelled_at=item.cancelled_at,
            )
            for item in contract.line_items
        ],
        total_amount=contract.total_amount,
        paid_amount=contract.paid_amount,
        debt_amount=contract.debt_amount,
        is_cancelled=contract.is_cancelled,
        created_at=contract.created_at,
        updated_at=contract.updated_at,
    )


def client_total_debt(contracts: list[Contract]) -> Decimal:
    return sum((contract.debt_amount for contract in contracts), Decimal("0"))
