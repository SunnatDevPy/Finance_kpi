import re

_SUFFIX_RE = re.compile(r"^(.+)-(\d+)$")
_ALPHA_NUM_RE = re.compile(r"^(.+?)(\d+)$")


def increment_contract_number(raw: str) -> str | None:
    """Return the next number in the same format as *raw*, or ``None`` if unknown."""
    stripped = raw.strip()
    if not stripped:
        return None

    if stripped.isdigit():
        return str(int(stripped) + 1)

    suffix_match = _SUFFIX_RE.match(stripped)
    if suffix_match:
        prefix, suffix = suffix_match.group(1), int(suffix_match.group(2))
        return f"{prefix}-{suffix + 1}"

    alpha_match = _ALPHA_NUM_RE.match(stripped)
    if alpha_match:
        prefix, digits = alpha_match.group(1), alpha_match.group(2)
        return f"{prefix}{digits}-1"

    return None


def suggest_next_contract_number(numbers: list[str]) -> tuple[str | None, str]:
    """Suggest the next contract number for a client.

    *numbers* should be ordered from most recent contract to oldest (``id DESC``).
    Pure-digit sequences keep the existing max+1 behaviour (``1,2,5`` → ``6``).
    Formatted numbers such as ``No39-1`` are preserved and incremented in place.
    """
    cleaned = [number.strip() for number in numbers if number and number.strip()]
    if not cleaned:
        return None, "1"

    if all(number.isdigit() for number in cleaned):
        max_num = max(int(number) for number in cleaned)
        return str(max_num), str(max_num + 1)

    most_recent = cleaned[0]
    next_from_recent = increment_contract_number(most_recent)
    if next_from_recent:
        return most_recent, next_from_recent

    digit_only = [number for number in cleaned if number.isdigit()]
    if digit_only:
        max_num = max(int(number) for number in digit_only)
        return str(max_num), str(max_num + 1)

    return most_recent, "1"
