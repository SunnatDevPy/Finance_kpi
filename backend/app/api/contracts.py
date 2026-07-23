from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import AuditAction, Client, Contract, ContractLineItem, ContractWorkflowStatus, User
from app.schemas.audit import AuditLogPage, AuditLogRead
from app.schemas.contract import (
    ContractCreate,
    ContractLineItemUpdate,
    ContractNextNumber,
    ContractRead,
    ContractUpdate,
)
from app.schemas.contract_import import ContractImportResult
from app.schemas.pagination import Page
from app.services.app_settings import get_company_profile
from app.services.audit import diff_fields, list_audit_logs, record_audit
from app.services.contract_import import build_contract_import_template, import_contracts_from_xlsx
from app.services.contract_status import (
    ContractStatusError,
    complete_contract,
    confirm_contract,
    settle_contract_debt_on_completion,
    sync_status_after_cancellation,
    sync_status_after_reactivation,
)
from app.services.debt_queries import (
    DebtFilter,
    contract_ids_with_debt_filter,
    contract_ids_without_positive_debt,
)
from app.services.documents import build_act_pdf, build_contract_pdf, build_invoice_pdf
from app.services.helpers import (
    contract_to_read,
    get_client_or_404,
    get_contract_or_404,
    get_line_item_or_404,
    get_service_type_or_404,
    validate_line_items,
)

router = APIRouter(prefix="/contracts", dependencies=[Depends(get_current_user)])


def _contracts_query():
    return select(Contract).options(
        selectinload(Contract.line_items).selectinload(ContractLineItem.service_type),
        selectinload(Contract.payments),
    )


@router.get("", response_model=Page[ContractRead])
def list_contracts(
    db: Session = Depends(get_db),
    client_id: int | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    status: ContractWorkflowStatus | None = Query(default=None),
    service_type_id: int | None = Query(default=None),
    debt_filter: DebtFilter | None = Query(default=None),
    has_debt: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[ContractRead]:
    filters = [Contract.deleted_at.is_(None)]
    join_client = False
    if client_id is not None:
        filters.append(Contract.client_id == client_id)
    if status is not None:
        filters.append(Contract.status == status)
    if service_type_id is not None:
        filters.append(
            Contract.id.in_(
                select(ContractLineItem.contract_id).where(
                    ContractLineItem.service_type_id == service_type_id
                )
            )
        )
    if debt_filter is not None:
        filters.append(Contract.id.in_(contract_ids_with_debt_filter(debt_filter)))
    elif has_debt is not None:
        if has_debt:
            filters.append(Contract.id.in_(contract_ids_with_debt_filter("debtors")))
        else:
            filters.append(Contract.id.in_(contract_ids_without_positive_debt()))
    if search:
        join_client = True
        pattern = f"%{search}%"
        filters.append(
            or_(
                Client.company_name.ilike(pattern),
                Contract.contract_number.ilike(pattern),
                Contract.invoice_number.ilike(pattern),
            )
        )
    if date_from is not None:
        filters.append(Contract.end_date >= date_from)
    if date_to is not None:
        filters.append(Contract.end_date <= date_to)

    count_stmt = select(func.count(Contract.id)).where(*filters)
    if join_client:
        count_stmt = count_stmt.join(Contract.client)
    total = db.scalar(count_stmt) or 0

    stmt = _contracts_query().where(*filters).order_by(Contract.start_date.desc())
    if join_client:
        stmt = stmt.join(Contract.client)
    contracts = list(db.scalars(stmt.offset(skip).limit(limit)).all())

    return Page(
        items=[contract_to_read(contract) for contract in contracts],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/trash", response_model=Page[ContractRead], dependencies=[Depends(require_admin)]
)
def list_deleted_contracts(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, min_length=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[ContractRead]:
    filters = [Contract.deleted_at.is_not(None)]
    join_client = False
    if search:
        join_client = True
        pattern = f"%{search}%"
        filters.append(
            or_(
                Client.company_name.ilike(pattern),
                Contract.contract_number.ilike(pattern),
                Contract.invoice_number.ilike(pattern),
            )
        )

    count_stmt = select(func.count(Contract.id)).where(*filters)
    stmt = _contracts_query().where(*filters).order_by(Contract.deleted_at.desc())
    if join_client:
        count_stmt = count_stmt.join(Contract.client)
        stmt = stmt.join(Contract.client)

    total = db.scalar(count_stmt) or 0
    contracts = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return Page(
        items=[contract_to_read(contract) for contract in contracts],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
def create_contract(
    payload: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    get_client_or_404(db, payload.client_id)
    validate_line_items(db, payload.line_items)

    contract = Contract(
        client_id=payload.client_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        notes=payload.notes,
        contract_number=payload.contract_number,
        invoice_number=payload.invoice_number,
        status=payload.status,
        line_items=[
            ContractLineItem(
                service_type_id=item.service_type_id,
                price=item.price,
            )
            for item in payload.line_items
        ],
    )
    db.add(contract)
    db.commit()
    total = sum((item.price for item in contract.line_items), Decimal("0"))
    record_audit(
        db,
        user=current_user,
        entity_type="contract",
        entity_id=contract.id,
        action=AuditAction.CREATE,
        summary=f"Shartnoma yaratildi (#{contract.id}), summa: {total}",
    )
    return contract_to_read(get_contract_or_404(db, contract.id))


@router.get("/import-template")
def download_import_template() -> StreamingResponse:
    buffer = build_contract_import_template()
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=shartnomalar_shabloni.xlsx"},
    )


@router.post("/import", response_model=ContractImportResult)
async def import_contracts(
    file: UploadFile, db: Session = Depends(get_db)
) -> ContractImportResult:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat .xlsx yoki .xlsm formatidagi fayl qabul qilinadi",
        )
    content = await file.read()
    try:
        return import_contracts_from_xlsx(db, content)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Faylni o'qib bo'lmadi: {exc}",
        ) from exc


def _next_contract_number_for_client(db: Session, client_id: int) -> ContractNextNumber:
    get_client_or_404(db, client_id)
    numbers = db.scalars(
        select(Contract.contract_number).where(
            Contract.client_id == client_id,
            Contract.deleted_at.is_(None),
            Contract.contract_number.is_not(None),
        )
    ).all()

    max_num = 0
    last_number: str | None = None
    for raw in numbers:
        if not raw:
            continue
        stripped = raw.strip()
        if not stripped.isdigit():
            continue
        value = int(stripped)
        if value > max_num:
            max_num = value
            last_number = stripped

    return ContractNextNumber(
        last_number=last_number,
        next_number=str(max_num + 1) if max_num > 0 else "1",
    )


@router.get("/next-number", response_model=ContractNextNumber)
def next_contract_number(
    client_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
) -> ContractNextNumber:
    return _next_contract_number_for_client(db, client_id)


@router.post("/{contract_id}/duplicate", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
def duplicate_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    source = get_contract_or_404(db, contract_id)
    new_date = date.today()
    next_number = _next_contract_number_for_client(db, source.client_id).next_number

    contract = Contract(
        client_id=source.client_id,
        start_date=new_date,
        end_date=new_date,
        notes=source.notes,
        contract_number=next_number,
        status=ContractWorkflowStatus.YANGI,
        line_items=[
            ContractLineItem(
                service_type_id=item.service_type_id,
                price=item.price,
            )
            for item in source.line_items
        ],
    )
    db.add(contract)
    db.commit()
    record_audit(
        db,
        user=current_user,
        entity_type="contract",
        entity_id=contract.id,
        action=AuditAction.CREATE,
        summary=f"Shartnoma #{source.id} dan nusxalandi (yangi #{contract.id})",
    )
    return contract_to_read(get_contract_or_404(db, contract.id))


@router.get("/{contract_id}", response_model=ContractRead)
def get_contract(contract_id: int, db: Session = Depends(get_db)) -> ContractRead:
    return contract_to_read(get_contract_or_404(db, contract_id))


@router.get("/{contract_id}/documents/{document_type}")
def download_contract_document(
    contract_id: int,
    document_type: Literal["invoice", "act", "contract"],
    db: Session = Depends(get_db),
) -> StreamingResponse:
    contract = get_contract_or_404(db, contract_id)
    company = get_company_profile(db)

    if document_type == "invoice":
        buffer = build_invoice_pdf(contract, company)
        filename = f"schyot-faktura_{contract.contract_number or contract.id}.pdf"
    elif document_type == "act":
        buffer = build_act_pdf(contract, company)
        filename = f"akt_{contract.contract_number or contract.id}.pdf"
    else:
        buffer = build_contract_pdf(contract, company)
        filename = f"shartnoma_{contract.contract_number or contract.id}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/{contract_id}", response_model=ContractRead)
def update_contract(
    contract_id: int,
    payload: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    contract = get_contract_or_404(db, contract_id)

    start_date = payload.start_date if payload.start_date is not None else contract.start_date
    end_date = payload.end_date if payload.end_date is not None else contract.end_date
    if payload.start_date is not None and payload.end_date is None:
        end_date = payload.start_date
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sana noto'g'ri",
        )

    before = {
        "start_date": contract.start_date,
        "end_date": contract.end_date,
        "notes": contract.notes,
        "contract_number": contract.contract_number,
        "invoice_number": contract.invoice_number,
        "status": contract.status.value,
        "total_amount": contract.total_amount,
    }

    if payload.line_items is not None:
        validate_line_items(db, payload.line_items)
        contract.line_items.clear()
        for item in payload.line_items:
            contract.line_items.append(
                ContractLineItem(
                    service_type_id=item.service_type_id,
                    price=item.price,
                )
            )

    if payload.start_date is not None:
        contract.start_date = payload.start_date
    if payload.end_date is not None:
        contract.end_date = payload.end_date
    if payload.notes is not None:
        contract.notes = payload.notes
    if payload.contract_number is not None:
        contract.contract_number = payload.contract_number or None
    if payload.invoice_number is not None:
        contract.invoice_number = payload.invoice_number or None
    previous_status = contract.status
    if payload.status is not None:
        contract.status = payload.status

    if (
        payload.status == ContractWorkflowStatus.TUGADI
        and previous_status != ContractWorkflowStatus.TUGADI
    ):
        settle_contract_debt_on_completion(contract)

    db.commit()
    db.refresh(contract)

    after = {
        "start_date": contract.start_date,
        "end_date": contract.end_date,
        "notes": contract.notes,
        "contract_number": contract.contract_number,
        "invoice_number": contract.invoice_number,
        "status": contract.status.value,
        "total_amount": contract.total_amount,
    }
    changes = diff_fields(before, after)
    if changes:
        record_audit(
            db,
            user=current_user,
            entity_type="contract",
            entity_id=contract.id,
            action=AuditAction.UPDATE,
            changes=changes,
            summary=f"Shartnoma tahrirlandi (#{contract.id})",
        )
    return contract_to_read(get_contract_or_404(db, contract.id))


@router.delete(
    "/{contract_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    contract = get_contract_or_404(db, contract_id)
    contract.deleted_at = datetime.now(timezone.utc)
    db.commit()
    record_audit(
        db,
        user=current_user,
        entity_type="contract",
        entity_id=contract.id,
        action=AuditAction.DELETE,
        summary=f"Shartnoma arxivga o'tkazildi (#{contract.id})",
    )


@router.post(
    "/{contract_id}/restore",
    response_model=ContractRead,
    dependencies=[Depends(require_admin)],
)
def restore_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    contract = db.get(Contract, contract_id)
    if contract is None or contract.deleted_at is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kontrakt topilmadi")
    contract.deleted_at = None
    db.commit()
    record_audit(
        db,
        user=current_user,
        entity_type="contract",
        entity_id=contract.id,
        action=AuditAction.RESTORE,
        summary=f"Shartnoma arxivdan tiklandi (#{contract.id})",
    )
    return contract_to_read(get_contract_or_404(db, contract.id))


@router.get("/{contract_id}/history", response_model=AuditLogPage)
def get_contract_history(
    contract_id: int,
    db: Session = Depends(get_db),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> AuditLogPage:
    get_contract_or_404(db, contract_id)
    items, total = list_audit_logs(
        db,
        entity_type="contract",
        entity_id=contract_id,
        skip=skip,
        limit=limit,
    )
    return AuditLogPage(
        items=[AuditLogRead.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


def _active_line_item_count(contract: Contract) -> int:
    return sum(1 for item in contract.line_items if not item.is_cancelled)


@router.patch(
    "/{contract_id}/line-items/{line_item_id}",
    response_model=ContractRead,
)
def update_line_item(
    contract_id: int,
    line_item_id: int,
    payload: ContractLineItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    contract = get_contract_or_404(db, contract_id)
    line_item = get_line_item_or_404(db, contract_id, line_item_id)
    if line_item.is_cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bekor qilingan xizmatni o'zgartirib bo'lmaydi",
        )

    service_type = get_service_type_or_404(db, payload.service_type_id)
    if not service_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nofaol xizmat turi: {service_type.name}",
        )

    for other in contract.line_items:
        if (
            other.id != line_item.id
            and not other.is_cancelled
            and other.service_type_id == payload.service_type_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu xizmat turi shartnomada allaqachon mavjud",
            )

    old_price = line_item.price
    old_service = line_item.service_type.name
    old_service_id = line_item.service_type_id

    if old_price == payload.price and old_service_id == payload.service_type_id:
        return contract_to_read(contract)

    line_item.service_type_id = payload.service_type_id
    line_item.price = payload.price
    contract.updated_at = datetime.now(timezone.utc)
    db.commit()

    changes: dict[str, tuple] = {}
    if old_price != payload.price:
        changes["price"] = (old_price, payload.price)
    if old_service_id != payload.service_type_id:
        changes["service_type"] = (old_service, service_type.name)

    summary_parts = []
    if old_service_id != payload.service_type_id:
        summary_parts.append(f"xizmat: {old_service} → {service_type.name}")
    if old_price != payload.price:
        summary_parts.append(f"narx: {old_price} → {payload.price}")

    record_audit(
        db,
        user=current_user,
        entity_type="contract",
        entity_id=contract_id,
        action=AuditAction.UPDATE,
        changes=changes or None,
        summary=f"Xizmat tahrirlandi ({', '.join(summary_parts)})",
    )
    return contract_to_read(get_contract_or_404(db, contract_id))


@router.patch(
    "/{contract_id}/line-items/{line_item_id}/cancel", response_model=ContractRead
)
def cancel_line_item(
    contract_id: int,
    line_item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    contract = get_contract_or_404(db, contract_id)
    if _active_line_item_count(contract) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shartnomada bitta xizmat qolganda uni bekor qilib bo'lmaydi",
        )
    line_item = get_line_item_or_404(db, contract_id, line_item_id)
    if not line_item.is_cancelled:
        line_item.is_cancelled = True
        line_item.cancelled_at = datetime.now(timezone.utc)
        sync_status_after_cancellation(contract)
        db.commit()
        record_audit(
            db,
            user=current_user,
            entity_type="contract",
            entity_id=contract_id,
            action=AuditAction.UPDATE,
            summary=f"Xizmat bekor qilindi ({line_item.service_type.name}, {line_item.price})",
        )
    return contract_to_read(get_contract_or_404(db, contract_id))


@router.patch(
    "/{contract_id}/line-items/{line_item_id}/reactivate", response_model=ContractRead
)
def reactivate_line_item(
    contract_id: int,
    line_item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    contract = get_contract_or_404(db, contract_id)
    line_item = get_line_item_or_404(db, contract_id, line_item_id)
    if line_item.is_cancelled:
        line_item.is_cancelled = False
        line_item.cancelled_at = None
        sync_status_after_reactivation(contract)
        db.commit()
        record_audit(
            db,
            user=current_user,
            entity_type="contract",
            entity_id=contract_id,
            action=AuditAction.UPDATE,
            summary=f"Xizmat qayta faollashtirildi ({line_item.service_type.name}, {line_item.price})",
        )
    return contract_to_read(get_contract_or_404(db, contract_id))


@router.post("/{contract_id}/cancel-all", response_model=ContractRead)
def cancel_all_line_items(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    """Cancel every remaining active line item — treats the whole contract as void."""
    contract = get_contract_or_404(db, contract_id)
    now = datetime.now(timezone.utc)
    cancelled_any = False
    for item in contract.line_items:
        if not item.is_cancelled:
            item.is_cancelled = True
            item.cancelled_at = now
            cancelled_any = True
    sync_status_after_cancellation(contract)
    db.commit()
    if cancelled_any:
        record_audit(
            db,
            user=current_user,
            entity_type="contract",
            entity_id=contract_id,
            action=AuditAction.UPDATE,
            summary=f"Shartnoma to'liq bekor qilindi (#{contract_id})",
        )
    return contract_to_read(get_contract_or_404(db, contract_id))


@router.post("/{contract_id}/confirm", response_model=ContractRead)
def confirm_contract_endpoint(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    contract = get_contract_or_404(db, contract_id)
    try:
        confirm_contract(contract)
    except ContractStatusError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.detail) from exc
    db.commit()
    record_audit(
        db,
        user=current_user,
        entity_type="contract",
        entity_id=contract_id,
        action=AuditAction.UPDATE,
        summary=f"Shartnoma tasdiqlandi (#{contract_id})",
    )
    return contract_to_read(get_contract_or_404(db, contract_id))


@router.post("/{contract_id}/complete", response_model=ContractRead)
def complete_contract_endpoint(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContractRead:
    contract = get_contract_or_404(db, contract_id)
    try:
        complete_contract(contract)
    except ContractStatusError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.detail) from exc
    db.commit()
    record_audit(
        db,
        user=current_user,
        entity_type="contract",
        entity_id=contract_id,
        action=AuditAction.UPDATE,
        summary=f"Shartnoma yakunlandi (#{contract_id})",
    )
    return contract_to_read(get_contract_or_404(db, contract_id))
