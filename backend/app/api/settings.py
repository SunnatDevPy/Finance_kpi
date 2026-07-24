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
    get_finance_auto_payments_from_year,
    get_monthly_plan,
    set_company_profile,
    set_finance_auto_payments_from_year,
    set_monthly_plan,
)

router = APIRouter(prefix="/settings", dependencies=[Depends(get_current_user)])


def _settings_read(db: Session) -> SettingsRead:
    return SettingsRead(
        monthly_plan=get_monthly_plan(db),
        company=CompanyProfile(**get_company_profile(db)),
        finance_auto_payments_from_year=get_finance_auto_payments_from_year(db),
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
    set_finance_auto_payments_from_year(db, payload.finance_auto_payments_from_year)
    return _settings_read(db)
