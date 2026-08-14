from calendar import monthrange
from datetime import date
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AppSetting
from app.services.finance_period import (
    DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_DAY,
    DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_MONTH,
    DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_YEAR,
    TURNOVER_YEAR_END,
    TURNOVER_YEAR_START,
)

MONTHLY_PLAN_KEY = "monthly_plan"
YEARLY_PLAN_KEY_PREFIX = "yearly_plan_"
FINANCE_AUTO_PAYMENTS_FROM_YEAR_KEY = "finance_auto_payments_from_year"
FINANCE_AUTO_PAYMENTS_FROM_MONTH_KEY = "finance_auto_payments_from_month"
FINANCE_AUTO_PAYMENTS_FROM_DAY_KEY = "finance_auto_payments_from_day"


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


def _get_int_setting(
    db: Session,
    key: str,
    default: int,
    min_value: int,
    max_value: int,
) -> int:
    row = db.get(AppSetting, key)
    if row is None:
        return default
    try:
        value = int(row.value)
    except (TypeError, ValueError):
        return default
    if value < min_value or value > max_value:
        return default
    return value


def _set_setting(db: Session, key: str, value: str) -> None:
    row = db.get(AppSetting, key)
    if row is None:
        db.add(AppSetting(key=key, value=value))
    else:
        row.value = value


def get_finance_auto_payments_from_year(db: Session) -> int:
    return _get_int_setting(
        db,
        FINANCE_AUTO_PAYMENTS_FROM_YEAR_KEY,
        DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_YEAR,
        TURNOVER_YEAR_START,
        TURNOVER_YEAR_END,
    )


def get_finance_auto_payments_from_month(db: Session) -> int:
    return _get_int_setting(
        db,
        FINANCE_AUTO_PAYMENTS_FROM_MONTH_KEY,
        DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_MONTH,
        1,
        12,
    )


def get_finance_auto_payments_from_day(db: Session) -> int:
    return _get_int_setting(
        db,
        FINANCE_AUTO_PAYMENTS_FROM_DAY_KEY,
        DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_DAY,
        1,
        31,
    )


def get_finance_auto_payments_from(db: Session) -> date:
    year = get_finance_auto_payments_from_year(db)
    month = get_finance_auto_payments_from_month(db)
    day = get_finance_auto_payments_from_day(db)
    last_day = monthrange(year, month)[1]
    return date(year, month, min(day, last_day))


def set_finance_auto_payments_from(
    db: Session,
    year: int,
    month: int = DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_MONTH,
    day: int = DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_DAY,
) -> date:
    if year < TURNOVER_YEAR_START or year > TURNOVER_YEAR_END:
        raise ValueError(
            f"Year must be between {TURNOVER_YEAR_START} and {TURNOVER_YEAR_END}"
        )
    try:
        result = date(year, month, day)
    except ValueError as exc:
        raise ValueError("Noto'g'ri sana") from exc
    _set_setting(db, FINANCE_AUTO_PAYMENTS_FROM_YEAR_KEY, str(year))
    _set_setting(db, FINANCE_AUTO_PAYMENTS_FROM_MONTH_KEY, str(month))
    _set_setting(db, FINANCE_AUTO_PAYMENTS_FROM_DAY_KEY, str(day))
    db.commit()
    return result


def set_finance_auto_payments_from_year(db: Session, year: int) -> int:
    current = get_finance_auto_payments_from(db)
    set_finance_auto_payments_from(db, year, current.month, current.day)
    return year
