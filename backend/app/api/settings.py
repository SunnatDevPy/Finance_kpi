from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.schemas.settings import (
    CompanyProfile,
    CompanyProfileUpdate,
    FinanceAutoPaymentsYearUpdate,
    MonthlyPlanUpdate,
    SettingsRead,
)
from app.services.app_settings import (
    get_company_profile,
    get_finance_auto_payments_from,
    get_monthly_plan,
    set_company_profile,
    set_finance_auto_payments_from,
    set_monthly_plan,
)

router = APIRouter(prefix="/settings", dependencies=[Depends(get_current_user)])


def _settings_read(db: Session) -> SettingsRead:
    auto_from = get_finance_auto_payments_from(db)
    return SettingsRead(
        monthly_plan=get_monthly_plan(db),
        company=CompanyProfile(**get_company_profile(db)),
        finance_auto_payments_from_year=auto_from.year,
        finance_auto_payments_from_month=auto_from.month,
        finance_auto_payments_from_day=auto_from.day,
    )


@router.get("", response_model=SettingsRead)
def read_settings(db: Session = Depends(get_db)) -> SettingsRead:
    return _settings_read(db)


@router.patch("/monthly-plan", response_model=SettingsRead)
def update_monthly_plan(
    payload: MonthlyPlanUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
) -> SettingsRead:
    set_monthly_plan(db, payload.monthly_plan)
    return _settings_read(db)


@router.patch("/company-profile", response_model=SettingsRead)
def update_company_profile(
    payload: CompanyProfileUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
) -> SettingsRead:
    data = payload.model_dump(exclude_unset=True)
    set_company_profile(db, data)
    return _settings_read(db)


@router.patch("/finance-auto-payments-year", response_model=SettingsRead)
def update_finance_auto_payments_year(
    payload: FinanceAutoPaymentsYearUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
) -> SettingsRead:
    set_finance_auto_payments_from(
        db,
        payload.finance_auto_payments_from_year,
        payload.finance_auto_payments_from_month,
        payload.finance_auto_payments_from_day,
    )
    return _settings_read(db)
