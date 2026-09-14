from calendar import monthrange
from datetime import date
from decimal import Decimal

FinancePeriod = str

TURNOVER_YEAR_START = 2019
TURNOVER_YEAR_END = 2035

# Shartnoma to'lovlari moliyaga avtomatik tushadigan boshlanish sanasi (default).
# Haqiqiy qiymat Profil → Tizim sozlamalaridan o'qiladi.
DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_YEAR = 2026
DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_MONTH = 1
DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_DAY = 1
DEFAULT_FINANCE_AUTO_PAYMENTS_FROM = date(
    DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_YEAR,
    DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_MONTH,
    DEFAULT_FINANCE_AUTO_PAYMENTS_FROM_DAY,
)


def parse_months_from_period(period: str | None = None, months: str | None = None) -> list[int]:
    """Davr yoki oylar qatoridan oy raqamlari ro'yxatini (1..12) ajratib olish."""
    raw = months if (months is not None and months.strip()) else period
    if not raw or raw == "full":
        return list(range(1, 13))

    clean = raw.strip().lower()
    if clean == "q1":
        return [1, 2, 3]
    if clean == "q2":
        return [4, 5, 6]
    if clean == "q3":
        return [7, 8, 9]
    if clean == "q4":
        return [10, 11, 12]

    # "m1"..."m12" ko'rinishida
    if clean.startswith("m") and clean[1:].isdigit():
        val = int(clean[1:])
        if 1 <= val <= 12:
            return [val]

    # Vergul yoki bo'sh joy bilan ajratilgan sonlar, masalan "1,2,3,4" yoki "2"
    parsed_months = set()
    parts = clean.replace(";", ",").replace(" ", ",").split(",")
    for part in parts:
        part = part.strip()
        if part.isdigit():
            val = int(part)
            if 1 <= val <= 12:
                parsed_months.add(val)

    if parsed_months:
        return sorted(parsed_months)

    return list(range(1, 13))


def resolve_finance_period(year: int, period: FinancePeriod) -> tuple[date, date]:
    months = parse_months_from_period(period)
    min_m = min(months)
    max_m = max(months)
    last_day = monthrange(year, max_m)[1]
    return date(year, min_m, 1), date(year, max_m, last_day)


def get_contiguous_month_ranges(year: int, months: list[int]) -> list[tuple[date, date]]:
    """Tartiblangan oylarni ketma-ket (start_date, end_date) oraliqlarga ajratish.
    Masalan: 2026-yil va [1, 2, 3, 5] -> [(2026-01-01, 2026-03-31), (2026-05-01, 2026-05-31)].
    """
    if not months:
        months = list(range(1, 13))
    sorted_months = sorted(set(months))

    blocks: list[list[int]] = []
    current_block: list[int] = []
    for m in sorted_months:
        if not current_block or m == current_block[-1] + 1:
            current_block.append(m)
        else:
            blocks.append(current_block)
            current_block = [m]
    if current_block:
        blocks.append(current_block)

    ranges: list[tuple[date, date]] = []
    for block in blocks:
        start_month = block[0]
        end_month = block[-1]
        last_day = monthrange(year, end_month)[1]
        ranges.append((date(year, start_month, 1), date(year, end_month, last_day)))
    return ranges


def resolve_all_years_span(
    *,
    year_from: int = TURNOVER_YEAR_START,
    year_to: int = TURNOVER_YEAR_END,
    months: list[int] | None = None,
) -> tuple[date, date]:
    if not months:
        months = list(range(1, 13))
    min_m = min(months)
    max_m = max(months)
    last_day = monthrange(year_to, max_m)[1]
    return date(year_from, min_m, 1), date(year_to, max_m, last_day)


def payment_counting_start(
    period_start: date,
    period_end: date,
    auto_from: date,
) -> date | None:
    """Shartnoma to'lovlari hisobga olinadigan boshlang'ich sana yoki None."""
    if period_end < auto_from:
        return None
    return max(period_start, auto_from)


def ledger_includes_payments(
    date_from: date | None,
    date_to: date | None,
    auto_from: date,
) -> bool:
    if date_to is not None and date_to < auto_from:
        return False
    return True


def ledger_payment_date_from(date_from: date | None, auto_from: date) -> date:
    if date_from is None or date_from < auto_from:
        return auto_from
    return date_from
