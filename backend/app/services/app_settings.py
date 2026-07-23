from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AppSetting

MONTHLY_PLAN_KEY = "monthly_plan"
YEARLY_PLAN_KEY_PREFIX = "yearly_plan_"


def yearly_plan_key(year: int) -> str:
    return f"{YEARLY_PLAN_KEY_PREFIX}{year}"

COMPANY_PROFILE_DEFAULTS: dict[str, str] = {
    "company_name": "World Textile Marketing Agency",
    "company_address": "",
    "company_phone": "",
    "company_inn": "",
    "company_bank_name": "",
    "company_bank_account": "",
    "company_mfo": "",
    "company_director": "",
}


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


def get_yearly_plan(db: Session, year: int) -> Decimal:
    row = db.get(AppSetting, yearly_plan_key(year))
    if row is None:
        return get_monthly_plan(db) * 12
    try:
        return Decimal(row.value)
    except InvalidOperation:
        return get_monthly_plan(db) * 12


def set_yearly_plan(db: Session, year: int, amount: Decimal) -> Decimal:
    key = yearly_plan_key(year)
    row = db.get(AppSetting, key)
    value = str(amount)
    if row is None:
        db.add(AppSetting(key=key, value=value))
    else:
        row.value = value
    db.commit()
    return amount


def get_company_profile(db: Session) -> dict[str, str]:
    rows = db.scalars(
        select(AppSetting).where(AppSetting.key.in_(COMPANY_PROFILE_DEFAULTS.keys()))
    ).all()
    saved = {row.key: row.value for row in rows}
    return {key: saved.get(key, default) for key, default in COMPANY_PROFILE_DEFAULTS.items()}


def set_company_profile(db: Session, data: dict[str, str]) -> dict[str, str]:
    for key, value in data.items():
        if key not in COMPANY_PROFILE_DEFAULTS:
            continue
        row = db.get(AppSetting, key)
        if row is None:
            db.add(AppSetting(key=key, value=value or ""))
        else:
            row.value = value or ""
    db.commit()
    return get_company_profile(db)
