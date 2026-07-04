from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.database import get_db
from app.models import Client, Contract, Payment
from app.schemas.pagination import Page
from app.schemas.payment import PaymentCreate, PaymentListRead, PaymentRead
from app.services.helpers import get_contract_or_404, get_payment_or_404

router = APIRouter(prefix="/payments", dependencies=[Depends(get_current_user)])


def _payment_to_list_read(payment: Payment) -> PaymentListRead:
    return PaymentListRead(
        id=payment.id,
        contract_id=payment.contract_id,
        amount=payment.amount,
        paid_at=payment.paid_at,
        note=payment.note,
        created_at=payment.created_at,
        company_name=payment.contract.client.company_name,
        client_id=payment.contract.client_id,
    )


@router.get("", response_model=Page[PaymentListRead])
def list_payments(
    db: Session = Depends(get_db),
    contract_id: int | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[PaymentListRead]:
    filters = []
    join_client = False
    if contract_id is not None:
        filters.append(Payment.contract_id == contract_id)
    if date_from is not None:
        filters.append(Payment.paid_at >= date_from)
    if date_to is not None:
        filters.append(Payment.paid_at <= date_to)
    if search:
        join_client = True
        pattern = f"%{search}%"
        filters.append(Client.company_name.ilike(pattern))

    count_stmt = select(func.count(Payment.id))
    if join_client:
        count_stmt = count_stmt.join(Payment.contract).join(Contract.client)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = db.scalar(count_stmt) or 0

    stmt = (
        select(Payment)
        .options(selectinload(Payment.contract).selectinload(Contract.client))
        .order_by(Payment.paid_at.desc(), Payment.id.desc())
    )
    if join_client:
        stmt = stmt.join(Payment.contract).join(Contract.client)
    if filters:
        stmt = stmt.where(*filters)

    payments = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return Page(
        items=[_payment_to_list_read(payment) for payment in payments],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)) -> Payment:
    get_contract_or_404(db, payload.contract_id)
    payment = Payment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(payment_id: int, db: Session = Depends(get_db)) -> Payment:
    return get_payment_or_404(db, payment_id)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(payment_id: int, db: Session = Depends(get_db)) -> None:
    payment = get_payment_or_404(db, payment_id)
    db.delete(payment)
    db.commit()
