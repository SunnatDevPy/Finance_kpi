from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import AuditAction, Client, ClientStatus, Contract, ContractLineItem, User
from app.schemas.client import ClientCardRead, ClientCreate, ClientRead, ClientUpdate
from app.schemas.client_import import ClientImportResult
from app.schemas.pagination import Page
from app.services.audit import diff_fields, record_audit
from app.services.client_import import build_client_import_template, import_clients_from_xlsx
from app.services.export_data import (
    CLIENT_CARD_CONTRACT_HEADERS,
    CLIENT_CARD_PAYMENT_HEADERS,
    CLIENT_CARD_PROFILE_HEADERS,
    fetch_client_card_profile_rows,
    fetch_client_contracts_rows,
    fetch_client_payments_rows,
)
from app.services.export_files import build_client_card_xlsx
from app.services.debt_queries import (
    DebtFilter,
    client_ids_with_debt_filter,
    client_ids_without_positive_debt,
)
from app.services.helpers import (
    client_cancelled_amount,
    client_total_amount,
    client_total_debt,
    client_total_paid,
    contract_to_read,
    get_client_or_404,
)
from app.services.uploads import ALLOWED_LOGO_CONTENT_TYPES, MAX_LOGO_BYTES, delete_client_logo, save_client_logo

router = APIRouter(prefix="/clients", dependencies=[Depends(get_current_user)])


def _load_client_card(db: Session, client_id: int) -> Client:
    stmt = (
        select(Client)
        .options(
            selectinload(Client.contracts)
            .selectinload(Contract.line_items)
            .selectinload(ContractLineItem.service_type),
            selectinload(Client.contracts).selectinload(Contract.payments),
        )
        .where(Client.id == client_id, Client.deleted_at.is_(None))
    )
    client = db.scalars(stmt).first()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mijoz topilmadi")
    return client


@router.get("", response_model=Page[ClientRead])
def list_clients(
    db: Session = Depends(get_db),
    status_filter: ClientStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, min_length=1),
    city: str | None = Query(default=None, min_length=1),
    debt_filter: DebtFilter | None = Query(default=None),
    has_debt: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[ClientRead]:
    filters = [Client.deleted_at.is_(None)]
    if status_filter is not None:
        filters.append(Client.status == status_filter)
    if city:
        filters.append(Client.city == city)
    if debt_filter is not None:
        filters.append(Client.id.in_(client_ids_with_debt_filter(debt_filter)))
    elif has_debt is not None:
        if has_debt:
            filters.append(Client.id.in_(client_ids_with_debt_filter("debtors")))
        else:
            filters.append(Client.id.in_(client_ids_without_positive_debt()))
    if search:
        pattern = f"%{search}%"
        filters.append(
            or_(
                Client.company_name.ilike(pattern),
                Client.contact_person.ilike(pattern),
                Client.phone.ilike(pattern),
                Client.city.ilike(pattern),
            )
        )

    count_stmt = select(func.count(Client.id)).where(*filters)
    total = db.scalar(count_stmt) or 0

    stmt = (
        select(Client)
        .options(
            selectinload(Client.contracts).selectinload(Contract.line_items),
            selectinload(Client.contracts).selectinload(Contract.payments),
        )
        .where(*filters)
        .order_by(Client.company_name)
    )
    clients = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    items = []
    for client in clients:
        active_contracts = [c for c in client.contracts if c.deleted_at is None]
        items.append(
            ClientRead(
                **ClientRead.model_validate(client).model_dump(
                    exclude={"total_amount", "total_paid", "total_debt"}
                ),
                total_amount=client_total_amount(active_contracts),
                total_paid=client_total_paid(active_contracts),
                total_debt=client_total_debt(active_contracts),
            )
        )

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.get("/cities", response_model=list[str])
def list_client_cities(db: Session = Depends(get_db)) -> list[str]:
    stmt = (
        select(Client.city)
        .where(
            Client.deleted_at.is_(None),
            Client.city.is_not(None),
            Client.city != "",
        )
        .distinct()
        .order_by(Client.city)
    )
    return list(db.scalars(stmt).all())


@router.get("/trash", response_model=Page[ClientRead], dependencies=[Depends(require_admin)])
def list_deleted_clients(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, min_length=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[ClientRead]:
    filters = [Client.deleted_at.is_not(None)]
    if search:
        pattern = f"%{search}%"
        filters.append(or_(Client.company_name.ilike(pattern), Client.phone.ilike(pattern)))

    total = db.scalar(select(func.count(Client.id)).where(*filters)) or 0
    stmt = (
        select(Client)
        .where(*filters)
        .order_by(Client.deleted_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = list(db.scalars(stmt).all())
    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Client:
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    record_audit(
        db,
        user=current_user,
        entity_type="client",
        entity_id=client.id,
        action=AuditAction.CREATE,
        summary=f"Mijoz yaratildi: {client.company_name}",
    )
    return client


@router.get("/import-template")
def download_import_template() -> StreamingResponse:
    buffer = build_client_import_template()
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="mijozlar_shabloni.xlsx"'},
    )


@router.post("/import", response_model=ClientImportResult)
async def import_clients(
    file: UploadFile = File(...), db: Session = Depends(get_db)
) -> ClientImportResult:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat .xlsx formatidagi fayl qabul qilinadi",
        )
    content = await file.read()
    try:
        return import_clients_from_xlsx(db, content)
    except Exception as exc:  # noqa: BLE001 - surface parse errors to the client
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Faylni o'qib bo'lmadi: {exc}",
        ) from exc


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)) -> Client:
    return get_client_or_404(db, client_id)


@router.get("/{client_id}/card", response_model=ClientCardRead)
def get_client_card(client_id: int, db: Session = Depends(get_db)) -> ClientCardRead:
    client = _load_client_card(db, client_id)
    active_contracts = [c for c in client.contracts if c.deleted_at is None]
    contracts = [contract_to_read(contract) for contract in active_contracts]
    return ClientCardRead(
        **ClientRead.model_validate(client).model_dump(
            exclude={"total_amount", "total_paid", "total_debt"}
        ),
        contracts=contracts,
        total_amount=client_total_amount(active_contracts),
        total_paid=client_total_paid(active_contracts),
        total_debt=client_total_debt(active_contracts),
        cancelled_amount=client_cancelled_amount(active_contracts),
    )


@router.get("/{client_id}/export")
def export_client_card(client_id: int, db: Session = Depends(get_db)) -> StreamingResponse:
    client = get_client_or_404(db, client_id)
    profile_rows = fetch_client_card_profile_rows(client)
    contract_rows = fetch_client_contracts_rows(db, client_id)
    payment_rows = fetch_client_payments_rows(db, client_id)
    if not profile_rows and not contract_rows and not payment_rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eksport qilish uchun ma'lumot topilmadi",
        )

    buffer = build_client_card_xlsx(
        client.company_name,
        [
            ("Mijoz", CLIENT_CARD_PROFILE_HEADERS, profile_rows),
            ("Shartnomalar", CLIENT_CARD_CONTRACT_HEADERS, contract_rows),
            ("To'lovlar", CLIENT_CARD_PAYMENT_HEADERS, payment_rows),
        ],
    )
    safe_name = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in client.company_name)
    filename = f"mijoz_{safe_name or client_id}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Client:
    client = get_client_or_404(db, client_id)
    before = {
        field: getattr(client, field) for field in payload.model_dump(exclude_unset=True)
    }
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    changes = diff_fields(before, data)
    if changes:
        record_audit(
            db,
            user=current_user,
            entity_type="client",
            entity_id=client.id,
            action=AuditAction.UPDATE,
            changes=changes,
            summary=f"Mijoz tahrirlandi: {client.company_name}",
        )
    return client


@router.post("/{client_id}/logo", response_model=ClientRead)
async def upload_client_logo(
    client_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Client:
    client = get_client_or_404(db, client_id)
    if file.content_type not in ALLOWED_LOGO_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat rasm fayllari qabul qilinadi (PNG, JPEG, WEBP, SVG)",
        )
    content = await file.read()
    if len(content) > MAX_LOGO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fayl hajmi 5 MB dan oshmasligi kerak",
        )
    old_logo_path = client.logo_path
    filename = save_client_logo(client_id, file.content_type, content)
    client.logo_path = filename
    db.commit()
    db.refresh(client)
    delete_client_logo(old_logo_path)
    record_audit(
        db,
        user=current_user,
        entity_type="client",
        entity_id=client.id,
        action=AuditAction.UPDATE,
        summary=f"Mijoz logotipi yangilandi: {client.company_name}",
    )
    return client


@router.delete("/{client_id}/logo", response_model=ClientRead)
def remove_client_logo(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Client:
    client = get_client_or_404(db, client_id)
    old_logo_path = client.logo_path
    client.logo_path = None
    db.commit()
    db.refresh(client)
    delete_client_logo(old_logo_path)
    record_audit(
        db,
        user=current_user,
        entity_type="client",
        entity_id=client.id,
        action=AuditAction.UPDATE,
        summary=f"Mijoz logotipi olib tashlandi: {client.company_name}",
    )
    return client


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    client = get_client_or_404(db, client_id)
    now = datetime.now(timezone.utc)
    client.deleted_at = now
    for contract in client.contracts:
        if contract.deleted_at is None:
            contract.deleted_at = now
    db.commit()
    record_audit(
        db,
        user=current_user,
        entity_type="client",
        entity_id=client.id,
        action=AuditAction.DELETE,
        summary=f"Mijoz arxivga o'tkazildi: {client.company_name}",
    )


@router.post(
    "/{client_id}/restore",
    response_model=ClientRead,
    dependencies=[Depends(require_admin)],
)
def restore_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Client:
    client = db.get(Client, client_id)
    if client is None or client.deleted_at is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mijoz topilmadi")
    restored_at = client.deleted_at
    client.deleted_at = None
    for contract in client.contracts:
        if contract.deleted_at == restored_at:
            contract.deleted_at = None
    db.commit()
    db.refresh(client)
    record_audit(
        db,
        user=current_user,
        entity_type="client",
        entity_id=client.id,
        action=AuditAction.RESTORE,
        summary=f"Mijoz arxivdan tiklandi: {client.company_name}",
    )
    return client
