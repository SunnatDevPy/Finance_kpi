from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Client, Contract, ContractLineItem, ContractWorkflowStatus, Expense, Income, Payment

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

INCOME_CATEGORY_NAMES: dict[str, str] = {
    "sale": "Sotuv",
    "service": "Xizmat",
    "investment": "Investitsiya",
    "loan": "Kredit/qarz",
    "grant": "Grant",
    "refund": "Qaytarma",
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
    ids: list[int] | None = None,
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
    if ids:
        stmt = stmt.where(Contract.id.in_(ids))

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
    ids: list[int] | None = None,
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
    if ids:
        stmt = stmt.where(Payment.id.in_(ids))

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


def fetch_incomes_rows(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[list[str]]:
    stmt = select(Income).where(Income.deleted_at.is_(None)).order_by(Income.income_date.desc())
    if date_from is not None:
        stmt = stmt.where(Income.income_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Income.income_date <= date_to)

    incomes = list(db.scalars(stmt).all())
    return [
        [
            income.income_date.isoformat(),
            INCOME_CATEGORY_NAMES.get(income.category.value, income.category.value),
            income.title,
            _money(income.amount),
            income.note or "",
        ]
        for income in incomes
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
INCOME_HEADERS = ["Sana", "Kategoriya", "Nomi", "Summa", "Izoh"]

EXPORT_TITLES = {
    "clients": "Mijozlar",
    "contracts": "Kontraktlar",
    "payments": "To'lovlar",
    "debts": "Qarzdorlik",
    "expenses": "Xarajatlar",
    "incomes": "Kirimlar",
}

CLIENT_STATUS_LABELS = {
    "faol": "Faol",
    "nofaol": "Nofaol",
}

CONTRACT_STATUS_LABELS = {
    ContractWorkflowStatus.YANGI: "Yangi",
    ContractWorkflowStatus.DAVOM_ETMOQDA: "Davom etmoqda",
    ContractWorkflowStatus.TUGADI: "Tugadi",
    ContractWorkflowStatus.TOXTATILDI: "To'xtatildi",
}


def fetch_client_card_profile_rows(client: Client) -> list[list[str]]:
    return [
        ["Korxona nomi", client.company_name],
        ["Mas'ul shaxs", client.contact_person or ""],
        ["Telefon", client.phone or ""],
        ["Veb-sayt", client.website or ""],
        ["Mamlakat", client.country or ""],
        ["Shahar", client.city or ""],
        ["Faoliyat turi", client.activity_type or ""],
        ["Holat", CLIENT_STATUS_LABELS.get(client.status.value, client.status.value)],
        ["Izohlar", client.notes or ""],
    ]


def fetch_client_contracts_rows(db: Session, client_id: int) -> list[list[str]]:
    stmt = (
        select(Contract)
        .options(
            selectinload(Contract.line_items).selectinload(ContractLineItem.service_type),
            selectinload(Contract.payments),
        )
        .where(Contract.client_id == client_id, Contract.deleted_at.is_(None))
        .order_by(Contract.start_date.desc())
    )
    contracts = list(db.scalars(stmt).all())
    rows: list[list[str]] = []
    for contract in contracts:
        services = ", ".join(
            f"{item.service_type.name} ({_money(item.price)})"
            + (" [bekor]" if item.is_cancelled else "")
            for item in contract.line_items
        )
        rows.append(
            [
                contract.contract_number or "",
                CONTRACT_STATUS_LABELS.get(contract.status, contract.status.value),
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


def fetch_client_payments_rows(db: Session, client_id: int) -> list[list[str]]:
    stmt = (
        select(Payment)
        .join(Payment.contract)
        .where(
            Contract.client_id == client_id,
            Payment.deleted_at.is_(None),
            Contract.deleted_at.is_(None),
        )
        .order_by(Payment.paid_at.desc())
    )
    payments = list(db.scalars(stmt).all())
    return [
        [
            payment.paid_at.isoformat(),
            str(payment.contract_id),
            _money(payment.amount),
            payment.note or "",
        ]
        for payment in payments
    ]


CLIENT_CARD_CONTRACT_HEADERS = [
    "Shartnoma №",
    "Holat",
    "Boshlanish",
    "Tugash",
    "Jami",
    "To'langan",
    "Qarz",
    "Xizmatlar",
    "ЭСФ",
]
CLIENT_CARD_PAYMENT_HEADERS = ["Sana", "Shartnoma ID", "Summa", "Izoh"]
CLIENT_CARD_PROFILE_HEADERS = ["Maydon", "Qiymat"]
