from decimal import Decimal, InvalidOperation

from sqlalchemy.orm import Session

from app.config import settings
from app.models import AppSetting

MONTHLY_PLAN_KEY = "monthly_plan"


def get_monthly_plan(db: Session) -> Decimal:
    row = db.get(AppSetting, MONTHLY_PLAN_KEY)
    if row is None:
        return settings.monthly_plan
    try:
        return Decimal(row.value)
    except InvalidOperation:
        return settings.monthly_plan


def set_monthly_plan(db: Session, amount: Decimal) -> Decimal:
    row = db.get(AppSetting, MONTHLY_PLAN_KEY)
    value = str(amount)
    if row is None:
        db.add(AppSetting(key=MONTHLY_PLAN_KEY, value=value))
    else:
        row.value = value
    db.commit()
    return amount
