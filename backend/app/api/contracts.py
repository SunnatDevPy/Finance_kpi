from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.database import get_db
from app.models import Client, Contract, ContractLineItem
from app.schemas.contract import ContractCreate, ContractRead, ContractUpdate
from app.schemas.contract_import import ContractImportResult
from app.schemas.pagination import Page
from app.services.contract_import import build_contract_import_template, import_contracts_from_xlsx
from app.services.helpers import (
    contract_to_read,
    get_client_or_404,
    get_contract_or_404,
    get_line_item_or_404,
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
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[ContractRead]:
    filters = []
    join_client = False
    if client_id is not None:
        filters.append(Contract.client_id == client_id)
    if search:
        join_client = True
        pattern = f"%{search}%"
        filters.append(Client.company_name.ilike(pattern))

    count_stmt = select(func.count(Contract.id))
    if join_client:
        count_stmt = count_stmt.join(Contract.client)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = db.scalar(count_stmt) or 0

    stmt = _contracts_query().order_by(Contract.start_date.desc())
    if join_client:
        stmt = stmt.join(Contract.client)
    if filters:
        stmt = stmt.where(*filters)
    contracts = list(db.scalars(stmt.offset(skip).limit(limit)).all())

    return Page(
        items=[contract_to_read(contract) for contract in contracts],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
def create_contract(payload: ContractCreate, db: Session = Depends(get_db)) -> ContractRead:
    get_client_or_404(db, payload.client_id)
    validate_line_items(db, payload.line_items)

    contract = Contract(
        client_id=payload.client_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        notes=payload.notes,
        contract_number=payload.contract_number,
        invoice_number=payload.invoice_number,
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


@router.post("/{contract_id}/duplicate", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
def duplicate_contract(contract_id: int, db: Session = Depends(get_db)) -> ContractRead:
    source = get_contract_or_404(db, contract_id)
    duration = source.end_date - source.start_date
    new_start = date.today()
    new_end = new_start + duration

    contract = Contract(
        client_id=source.client_id,
        start_date=new_start,
        end_date=new_end,
        notes=source.notes,
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
    return contract_to_read(get_contract_or_404(db, contract.id))


@router.get("/{contract_id}", response_model=ContractRead)
def get_contract(contract_id: int, db: Session = Depends(get_db)) -> ContractRead:
    return contract_to_read(get_contract_or_404(db, contract_id))


@router.patch("/{contract_id}", response_model=ContractRead)
def update_contract(
    contract_id: int, payload: ContractUpdate, db: Session = Depends(get_db)
) -> ContractRead:
    contract = get_contract_or_404(db, contract_id)

    start_date = payload.start_date if payload.start_date is not None else contract.start_date
    end_date = payload.end_date if payload.end_date is not None else contract.end_date
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas",
        )

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

    db.commit()
    return contract_to_read(get_contract_or_404(db, contract.id))


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(contract_id: int, db: Session = Depends(get_db)) -> None:
    contract = get_contract_or_404(db, contract_id)
    db.delete(contract)
    db.commit()


@router.patch(
    "/{contract_id}/line-items/{line_item_id}/cancel", response_model=ContractRead
)
def cancel_line_item(
    contract_id: int, line_item_id: int, db: Session = Depends(get_db)
) -> ContractRead:
    line_item = get_line_item_or_404(db, contract_id, line_item_id)
    if not line_item.is_cancelled:
        line_item.is_cancelled = True
        line_item.cancelled_at = datetime.now(timezone.utc)
        db.commit()
    return contract_to_read(get_contract_or_404(db, contract_id))


@router.patch(
    "/{contract_id}/line-items/{line_item_id}/reactivate", response_model=ContractRead
)
def reactivate_line_item(
    contract_id: int, line_item_id: int, db: Session = Depends(get_db)
) -> ContractRead:
    line_item = get_line_item_or_404(db, contract_id, line_item_id)
    if line_item.is_cancelled:
        line_item.is_cancelled = False
        line_item.cancelled_at = None
        db.commit()
    return contract_to_read(get_contract_or_404(db, contract_id))


@router.post("/{contract_id}/cancel-all", response_model=ContractRead)
def cancel_all_line_items(contract_id: int, db: Session = Depends(get_db)) -> ContractRead:
    """Cancel every remaining active line item — treats the whole contract as void."""
    contract = get_contract_or_404(db, contract_id)
    now = datetime.now(timezone.utc)
    for item in contract.line_items:
        if not item.is_cancelled:
            item.is_cancelled = True
            item.cancelled_at = now
    db.commit()
    return contract_to_read(get_contract_or_404(db, contract_id))
