from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.schemas.settings import MonthlyPlanUpdate, SettingsRead
from app.services.app_settings import get_monthly_plan, set_monthly_plan

router = APIRouter(prefix="/settings", dependencies=[Depends(get_current_user)])


@router.get("", response_model=SettingsRead)
def read_settings(db: Session = Depends(get_db)) -> SettingsRead:
    return SettingsRead(monthly_plan=get_monthly_plan(db))


@router.patch("/monthly-plan", response_model=SettingsRead)
def update_monthly_plan(
    payload: MonthlyPlanUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
) -> SettingsRead:
    monthly_plan = set_monthly_plan(db, payload.monthly_plan)
    return SettingsRead(monthly_plan=monthly_plan)
