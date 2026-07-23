from datetime import date
from decimal import Decimal
from typing import Literal

FinancePeriod = Literal["full", "q1", "q2", "q3", "q4"]

TURNOVER_YEAR_START = 2020
TURNOVER_YEAR_END = 2035


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
