from datetime import date
from decimal import Decimal
from typing import Literal

FinancePeriod = Literal["full", "q1", "q2", "q3", "q4"]

TURNOVER_YEAR_START = 2019
TURNOVER_YEAR_END = 2035

# Shartnoma to'lovlari moliyaga avtomatik tushadigan boshlanish sanasi.
# Undan oldin faqat qo'lda kiritilgan kirim/chiqim (Income/Expense).
FINANCE_AUTO_PAYMENTS_FROM = date(2027, 1, 1)


def resolve_finance_period(year: int, period: FinancePeriod) -> tuple[date, date]:
    if period == "q1":
        return date(year, 1, 1), date(year, 3, 31)
    if period == "q2":
        return date(year, 4, 1), date(year, 6, 30)
    if period == "q3":
        return date(year, 7, 1), date(year, 9, 30)
    if period == "q4":
        return date(year, 10, 1), date(year, 12, 31)
    return date(year, 1, 1), date(year, 12, 31)


def resolve_all_years_span(
    *,
    year_from: int = TURNOVER_YEAR_START,
    year_to: int = TURNOVER_YEAR_END,
) -> tuple[date, date]:
    return date(year_from, 1, 1), date(year_to, 12, 31)


def payment_counting_start(period_start: date, period_end: date) -> date | None:
    """Shartnoma to'lovlari hisobga olinadigan boshlang'ich sana yoki None."""
    if period_end < FINANCE_AUTO_PAYMENTS_FROM:
        return None
    return max(period_start, FINANCE_AUTO_PAYMENTS_FROM)


def ledger_includes_payments(
    date_from: date | None,
    date_to: date | None,
) -> bool:
    if date_to is not None and date_to < FINANCE_AUTO_PAYMENTS_FROM:
        return False
    return True


def ledger_payment_date_from(date_from: date | None) -> date:
    if date_from is None or date_from < FINANCE_AUTO_PAYMENTS_FROM:
        return FINANCE_AUTO_PAYMENTS_FROM
    return date_from
