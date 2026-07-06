from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.schemas.settings import (
    CompanyProfile,
    CompanyProfileUpdate,
    MonthlyPlanUpdate,
    SettingsRead,
)
from app.services.app_settings import (
    get_company_profile,
    get_monthly_plan,
    set_company_profile,
    set_monthly_plan,
)

router = APIRouter(prefix="/settings", dependencies=[Depends(get_current_user)])


@router.get("", response_model=SettingsRead)
def read_settings(db: Session = Depends(get_db)) -> SettingsRead:
    return SettingsRead(
        monthly_plan=get_monthly_plan(db),
        company=CompanyProfile(**get_company_profile(db)),
    )


@router.patch("/monthly-plan", response_model=SettingsRead)
def update_monthly_plan(
    payload: MonthlyPlanUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
) -> SettingsRead:
    monthly_plan = set_monthly_plan(db, payload.monthly_plan)
    return SettingsRead(monthly_plan=monthly_plan, company=CompanyProfile(**get_company_profile(db)))


@router.patch("/company-profile", response_model=SettingsRead)
def update_company_profile(
    payload: CompanyProfileUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
) -> SettingsRead:
    data = payload.model_dump(exclude_unset=True)
    company = set_company_profile(db, data)
    return SettingsRead(monthly_plan=get_monthly_plan(db), company=CompanyProfile(**company))
