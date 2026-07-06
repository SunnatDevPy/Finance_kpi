from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import AuditAction, Client, Contract, Payment, User
from app.schemas.pagination import Page
from app.schemas.payment import PaymentCreate, PaymentListRead, PaymentRead
from app.services.audit import record_audit
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
    filters = [Payment.deleted_at.is_(None), Contract.deleted_at.is_(None)]
    if contract_id is not None:
        filters.append(Payment.contract_id == contract_id)
    if date_from is not None:
        filters.append(Payment.paid_at >= date_from)
    if date_to is not None:
        filters.append(Payment.paid_at <= date_to)
    if search:
        pattern = f"%{search}%"
        filters.append(Client.company_name.ilike(pattern))

    count_stmt = (
        select(func.count(Payment.id))
        .join(Payment.contract)
        .join(Contract.client)
        .where(*filters)
    )
    total = db.scalar(count_stmt) or 0

    stmt = (
        select(Payment)
        .options(selectinload(Payment.contract).selectinload(Contract.client))
        .join(Payment.contract)
        .join(Contract.client)
        .where(*filters)
        .order_by(Payment.paid_at.desc(), Payment.id.desc())
    )

    payments = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return Page(
        items=[_payment_to_list_read(payment) for payment in payments],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/trash", response_model=list[PaymentRead], dependencies=[Depends(require_admin)])
def list_deleted_payments(db: Session = Depends(get_db)) -> list[Payment]:
    stmt = (
        select(Payment)
        .where(Payment.deleted_at.is_not(None))
        .order_by(Payment.deleted_at.desc())
        .limit(200)
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Payment:
    get_contract_or_404(db, payload.contract_id)
    payment = Payment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    record_audit(
        db,
        user=current_user,
        entity_type="payment",
        entity_id=payment.id,
        action=AuditAction.CREATE,
        summary=f"To'lov qo'shildi: {payment.amount} (shartnoma #{payment.contract_id})",
    )
    return payment


@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(payment_id: int, db: Session = Depends(get_db)) -> Payment:
    return get_payment_or_404(db, payment_id)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    payment = get_payment_or_404(db, payment_id)
    payment.deleted_at = datetime.now(timezone.utc)
    db.commit()
    record_audit(
        db,
        user=current_user,
        entity_type="payment",
        entity_id=payment.id,
        action=AuditAction.DELETE,
        summary=f"To'lov arxivga o'tkazildi: {payment.amount} (shartnoma #{payment.contract_id})",
    )


@router.post(
    "/{payment_id}/restore",
    response_model=PaymentRead,
    dependencies=[Depends(require_admin)],
)
def restore_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Payment:
    payment = db.get(Payment, payment_id)
    if payment is None or payment.deleted_at is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="To'lov topilmadi")
    payment.deleted_at = None
    db.commit()
    db.refresh(payment)
    record_audit(
        db,
        user=current_user,
        entity_type="payment",
        entity_id=payment.id,
        action=AuditAction.RESTORE,
        summary=f"To'lov arxivdan tiklandi: {payment.amount} (shartnoma #{payment.contract_id})",
    )
    return payment
