from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.database import get_db
from app.models import Client, ClientStatus, Contract, ContractLineItem
from app.schemas.client import ClientCardRead, ClientCreate, ClientRead, ClientUpdate
from app.schemas.client_import import ClientImportResult
from app.schemas.pagination import Page
from app.services.client_import import build_client_import_template, import_clients_from_xlsx
from app.services.helpers import client_total_debt, contract_to_read, get_client_or_404

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
        .where(Client.id == client_id)
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
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[ClientRead]:
    filters = []
    if status_filter is not None:
        filters.append(Client.status == status_filter)
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

    count_stmt = select(func.count(Client.id))
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = db.scalar(count_stmt) or 0

    stmt = select(Client).order_by(Client.company_name)
    if filters:
        stmt = stmt.where(*filters)
    items = list(db.scalars(stmt.offset(skip).limit(limit)).all())

    return Page(items=items, total=total, skip=skip, limit=limit)


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)) -> Client:
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
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
    contracts = [contract_to_read(contract) for contract in client.contracts]
    return ClientCardRead(
        **ClientRead.model_validate(client).model_dump(),
        contracts=contracts,
        total_debt=client_total_debt(client.contracts),
    )


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int, payload: ClientUpdate, db: Session = Depends(get_db)
) -> Client:
    client = get_client_or_404(db, client_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int, db: Session = Depends(get_db)) -> None:
    client = get_client_or_404(db, client_id)
    db.delete(client)
    db.commit()
