from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.services.export_data import (
    CLIENT_HEADERS,
    CONTRACT_HEADERS,
    DEBT_HEADERS,
    EXPENSE_HEADERS,
    INCOME_HEADERS,
    PAYMENT_HEADERS,
    EXPORT_TITLES,
    fetch_clients_rows,
    fetch_contracts_rows,
    fetch_debts_rows,
    fetch_expenses_rows,
    fetch_incomes_rows,
    fetch_payments_rows,
)
from app.services.export_files import export_resource_file

router = APIRouter(prefix="/export", dependencies=[Depends(get_current_user)])

ResourceType = Literal["clients", "contracts", "payments", "debts", "expenses", "incomes"]
FileFormat = Literal["xlsx", "pdf"]


@router.get("/{resource}")
def export_data(
    resource: ResourceType,
    file_format: FileFormat = Query(alias="format"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    ids: str | None = Query(default=None, description="Vergul bilan ajratilgan ID'lar — bulk eksport uchun"),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    if date_from is not None and date_to is not None and date_to < date_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas",
        )

    id_list: list[int] | None = None
    if ids:
        try:
            id_list = [int(part) for part in ids.split(",") if part.strip()]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ids parametri noto'g'ri formatda",
            )

    if resource == "clients":
        rows = fetch_clients_rows(db)
        headers = CLIENT_HEADERS
    elif resource == "contracts":
        rows = fetch_contracts_rows(db, date_from=date_from, date_to=date_to, ids=id_list)
        headers = CONTRACT_HEADERS
    elif resource == "payments":
        rows = fetch_payments_rows(db, date_from=date_from, date_to=date_to, ids=id_list)
        headers = PAYMENT_HEADERS
    elif resource == "expenses":
        rows = fetch_expenses_rows(db, date_from=date_from, date_to=date_to)
        headers = EXPENSE_HEADERS
    elif resource == "incomes":
        rows = fetch_incomes_rows(db, date_from=date_from, date_to=date_to)
        headers = INCOME_HEADERS
    else:
        rows = fetch_debts_rows(db)
        headers = DEBT_HEADERS

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eksport qilish uchun ma'lumot topilmadi",
        )

    buffer, filename, media_type = export_resource_file(resource, file_format, headers, rows)
    title = EXPORT_TITLES[resource]
    ext = "xlsx" if file_format == "xlsx" else "pdf"
    if date_from or date_to:
        suffix = f"_{date_from or 'start'}_{date_to or 'end'}"
        filename = f"{resource}{suffix}.{ext}"

    return StreamingResponse(
        buffer,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
