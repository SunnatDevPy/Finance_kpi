from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Client, Contract, ContractLineItem, Expense, Payment

EXPENSE_CATEGORY_NAMES: dict[str, str] = {
    "salary": "Ish haqi",
    "rent": "Ijara",
    "marketing": "Marketing",
    "utilities": "Kommunal",
    "transport": "Transport",
    "office": "Ofis xarajatlari",
    "tax": "Soliq",
    "bank_fee": "Bank xizmati",
    "other": "Boshqa",
}


def _money(value: Decimal | float | int) -> str:
    return f"{Decimal(value):,.2f}".replace(",", " ")


def fetch_clients_rows(db: Session) -> list[list[str]]:
    clients = list(
        db.scalars(
            select(Client)
            .where(Client.deleted_at.is_(None))
            .order_by(Client.company_name)
        ).all()
    )
    return [
        [
            client.company_name,
            client.contact_person or "",
            client.phone or "",
            client.city or "",
            client.status.value,
        ]
        for client in clients
    ]


def fetch_contracts_rows(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[list[str]]:
    stmt = (
        select(Contract)
        .options(
            selectinload(Contract.client),
            selectinload(Contract.line_items).selectinload(ContractLineItem.service_type),
            selectinload(Contract.payments),
        )
        .where(Contract.deleted_at.is_(None))
        .order_by(Contract.end_date.desc())
    )
    if date_from is not None:
        stmt = stmt.where(Contract.end_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Contract.end_date <= date_to)

    contracts = list(db.scalars(stmt).all())
    rows: list[list[str]] = []
    for contract in contracts:
        services = ", ".join(
            f"{item.service_type.name} (bekor qilingan)" if item.is_cancelled else item.service_type.name
            for item in contract.line_items
        )
        rows.append(
            [
                contract.client.company_name,
                contract.contract_number or "",
                contract.start_date.isoformat(),
                contract.end_date.isoformat(),
                _money(contract.total_amount),
                _money(contract.paid_amount),
                _money(contract.debt_amount),
                services,
                contract.invoice_number or "",
            ]
        )
    return rows


def fetch_payments_rows(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[list[str]]:
    stmt = (
        select(Payment)
        .options(selectinload(Payment.contract).selectinload(Contract.client))
        .join(Payment.contract)
        .where(Payment.deleted_at.is_(None), Contract.deleted_at.is_(None))
        .order_by(Payment.paid_at.desc())
    )
    if date_from is not None:
        stmt = stmt.where(Payment.paid_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Payment.paid_at <= date_to)

    payments = list(db.scalars(stmt).all())
    return [
        [
            payment.paid_at.isoformat(),
            str(payment.contract_id),
            payment.contract.client.company_name,
            _money(payment.amount),
            payment.note or "",
        ]
        for payment in payments
    ]


def fetch_debts_rows(db: Session) -> list[list[str]]:
    stmt = (
        select(Client)
        .options(
            selectinload(Client.contracts).selectinload(Contract.line_items),
            selectinload(Client.contracts).selectinload(Contract.payments),
        )
        .where(Client.deleted_at.is_(None))
        .order_by(Client.company_name)
    )
    clients = list(db.scalars(stmt).all())
    rows: list[list[str]] = []
    for client in clients:
        active_contracts = [c for c in client.contracts if c.deleted_at is None]
        total_debt = sum((c.debt_amount for c in active_contracts), Decimal("0"))
        if total_debt <= 0:
            continue
        rows.append(
            [
                client.company_name,
                client.contact_person or "",
                client.phone or "",
                _money(total_debt),
            ]
        )
    return rows


def fetch_expenses_rows(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[list[str]]:
    stmt = select(Expense).where(Expense.deleted_at.is_(None)).order_by(Expense.expense_date.desc())
    if date_from is not None:
        stmt = stmt.where(Expense.expense_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Expense.expense_date <= date_to)

    expenses = list(db.scalars(stmt).all())
    return [
        [
            expense.expense_date.isoformat(),
            EXPENSE_CATEGORY_NAMES.get(expense.category.value, expense.category.value),
            expense.title,
            _money(expense.amount),
            expense.note or "",
        ]
        for expense in expenses
    ]


CLIENT_HEADERS = ["Korxona", "Mas'ul", "Telefon", "Shahar", "Holat"]
CONTRACT_HEADERS = [
    "Mijoz",
    "Shartnoma №",
    "Boshlanish",
    "Tugash",
    "Jami",
    "To'langan",
    "Qarz",
    "Xizmatlar",
    "ЭСФ",
]
PAYMENT_HEADERS = ["Sana", "Kontrakt ID", "Mijoz", "Summa", "Izoh"]
DEBT_HEADERS = ["Korxona", "Mas'ul", "Telefon", "Qarz"]
EXPENSE_HEADERS = ["Sana", "Kategoriya", "Nomi", "Summa", "Izoh"]

EXPORT_TITLES = {
    "clients": "Mijozlar",
    "contracts": "Kontraktlar",
    "payments": "To'lovlar",
    "debts": "Qarzdorlik",
    "expenses": "Xarajatlar",
}
