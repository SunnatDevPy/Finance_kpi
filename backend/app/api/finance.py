from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.schemas.finance import (
    FinanceEntryType,
    FinanceLedgerPage,
    FinanceTurnoverPlanUpdate,
    FinanceTurnoverRead,
    FinanceTurnoverTrendRead,
)
from app.schemas.finance_import import FinanceImportResult
from app.services.app_settings import set_yearly_plan
from app.services.finance import get_finance_ledger, get_finance_turnover, get_finance_turnover_trend
from app.services.finance_import import build_finance_import_template, import_finance_from_xlsx

router = APIRouter(prefix="/finance", dependencies=[Depends(get_current_user)])


@router.get("/ledger", response_model=FinanceLedgerPage)
def finance_ledger(
    db: Session = Depends(get_db),
    type: FinanceEntryType | None = Query(default=None, alias="type"),
    search: str | None = Query(default=None, min_length=1),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> FinanceLedgerPage:
    return get_finance_ledger(
        db,
        entry_type=type,
        date_from=date_from,
        date_to=date_to,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.get("/turnover", response_model=FinanceTurnoverRead)
def finance_turnover(
    db: Session = Depends(get_db),
    year: int = Query(default=date.today().year, ge=2000, le=2100),
) -> FinanceTurnoverRead:
    return get_finance_turnover(db, year=year)


@router.get("/turnover-trend", response_model=FinanceTurnoverTrendRead)
def finance_turnover_trend(
    db: Session = Depends(get_db),
    year_from: int = Query(default=2020, ge=2000, le=2100),
    year_to: int = Query(default=2026, ge=2000, le=2100),
) -> FinanceTurnoverTrendRead:
    return get_finance_turnover_trend(db, year_from=year_from, year_to=year_to)


@router.patch("/turnover-plan", response_model=FinanceTurnoverRead)
def update_finance_turnover_plan(
    payload: FinanceTurnoverPlanUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
) -> FinanceTurnoverRead:
    set_yearly_plan(db, payload.year, payload.yearly_plan)
    return get_finance_turnover(db, year=payload.year)


@router.get("/import-template")
def download_finance_import_template() -> StreamingResponse:
    buffer = build_finance_import_template()
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="moliya_tarixi_shabloni.xlsx"'},
    )


@router.post("/import", response_model=FinanceImportResult)
async def import_finance(
    file: UploadFile = File(...), db: Session = Depends(get_db)
) -> FinanceImportResult:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat .xlsx yoki .xlsm formatidagi fayl yuklashingiz mumkin",
        )
    content = await file.read()
    try:
        return import_finance_from_xlsx(db, content)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Faylni o'qib bo'lmadi: {exc}"
        )
