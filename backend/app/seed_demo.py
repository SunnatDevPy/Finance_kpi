"""Populates the database with rich, realistic-looking demo data.

Use this to prepare the panel for a client-facing demo: it replaces any
existing clients/contracts/payments/expenses/audit history with a coherent,
14-month story (steady client growth, a seasonal dip, a handful of contracts
expiring soon, healthy but varied profit margins) so every Dashboard chart
has something meaningful to show.

Run it AFTER the base seed (service types + admin user must already exist):

    docker compose exec api python -m app.seed_demo

Safe to re-run — it always wipes previous demo/business data first (service
types, users and app settings keys are left untouched).
"""

import random
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    AuditLog,
    Client,
    ClientStatus,
    Contract,
    ContractLineItem,
    Expense,
    ExpenseCategory,
    Payment,
    ServiceType,
    User,
    UserRole,
)
from app.services.app_settings import set_company_profile, set_monthly_plan
from app.services.auth import hash_password

random.seed(2026)

TODAY = date.today()

CLIENTS: list[dict] = [
    {"company_name": "Tashkent Tekstil Kombinati", "city": "Toshkent", "activity_type": "To'qimachilik ishlab chiqarish"},
    {"company_name": "Andijon Ipak Yo'li", "city": "Andijon", "activity_type": "Ipak gazlama ishlab chiqarish"},
    {"company_name": "Farg'ona Denim Group", "city": "Farg'ona", "activity_type": "Denim ishlab chiqarish"},
    {"company_name": "Namangan Trikotaj Uyi", "city": "Namangan", "activity_type": "Trikotaj ishlab chiqarish"},
    {"company_name": "Buxoro Atlas Karvon", "city": "Buxoro", "activity_type": "Atlas va ipak gazlama"},
    {"company_name": "Samarqand Zarnigor Tekstil", "city": "Samarqand", "activity_type": "To'qimachilik ishlab chiqarish"},
    {"company_name": "Navoiy Paxta Tola", "city": "Navoiy", "activity_type": "Paxta qayta ishlash"},
    {"company_name": "Qarshi Ipakchi Servis", "city": "Qarshi", "activity_type": "Ip yigirish"},
    {"company_name": "Termiz Yigiruv Fabrikasi", "city": "Termiz", "activity_type": "Ip yigirish"},
    {"company_name": "Nukus Ko'lanka Tekstil", "city": "Nukus", "activity_type": "Trikotaj ishlab chiqarish"},
    {"company_name": "Urganch Xorazm Gazlama", "city": "Urganch", "activity_type": "Gazlama bo'yash va tugatish"},
    {"company_name": "Jizzax Yangi Ip", "city": "Jizzax", "activity_type": "Ip yigirish"},
    {"company_name": "Guliston Sirdaryo Trikotaj", "city": "Guliston", "activity_type": "Trikotaj ishlab chiqarish"},
    {"company_name": "Marg'ilon Atlas Merosi", "city": "Marg'ilon", "activity_type": "Atlas va ipak gazlama"},
    {"company_name": "Qo'qon Ipak Naqshi", "city": "Qo'qon", "activity_type": "Ipak gazlama ishlab chiqarish"},
    {"company_name": "Chirchiq Denim Factory", "city": "Chirchiq", "activity_type": "Denim ishlab chiqarish"},
    {"company_name": "Angren Junlik Kombinat", "city": "Angren", "activity_type": "Yung qayta ishlash"},
    {"company_name": "Bekobod Tekstil Eksport", "city": "Bekobod", "activity_type": "Kiyim-kechak eksporti"},
    {"company_name": "Zomin Yungli Gazlama", "city": "Zomin", "activity_type": "Yung qayta ishlash"},
    {"company_name": "Yangiyer Paxta Servis", "city": "Yangiyer", "activity_type": "Paxta qayta ishlash"},
    {"company_name": "Do'stlik Tekstil Klaster", "city": "Guliston", "activity_type": "To'qimachilik ishlab chiqarish"},
    {"company_name": "Oltinko'l Tekstil Group", "city": "Urganch", "activity_type": "Gazlama bo'yash va tugatish"},
    {"company_name": "Kattaqo'rg'on Ip Yigiruv", "city": "Samarqand", "activity_type": "Ip yigirish"},
    {"company_name": "Shahrisabz Ipak Naqsh", "city": "Qashqadaryo", "activity_type": "Atlas va ipak gazlama"},
    {"company_name": "Almaty Tekstil Import", "city": "Almaty", "country": "Qozog'iston", "activity_type": "Kiyim-kechak eksporti"},
    {"company_name": "Bishkek Fashion House", "city": "Bishkek", "country": "Qirg'iziston", "activity_type": "Kiyim-kechak eksporti"},
]

CONTACT_PERSONS = [
    "Aziz Karimov", "Dilnoza Yusupova", "Bahodir Rashidov", "Nodira Tosheva",
    "Sardor Ergashev", "Malika Nazarova", "Jamshid Yoldashev", "Gulnora Saidova",
    "Otabek Mirzayev", "Feruza Qodirova", "Ravshan Abdullayev", "Zilola Xolmatova",
    "Ulug'bek Turgunov", "Shahzoda Rahimova", "Farrux Islomov", "Madina Yusupova",
]

SERVICE_PRICE_RANGE = (3_000_000, 18_000_000)

EXPENSE_TITLES: dict[ExpenseCategory, list[str]] = {
    ExpenseCategory.SALARY: ["Xodimlar oylik ish haqi", "Jamoaviy bonus va mukofotlar"],
    ExpenseCategory.RENT: ["Ofis ijarasi"],
    ExpenseCategory.MARKETING: [
        "Instagram va Facebook reklama byudjeti",
        "Google Ads kampaniyasi",
        "Blogerlar bilan hamkorlik",
        "Ko'rgazma va tadbir tashkiloti",
    ],
    ExpenseCategory.UTILITIES: ["Kommunal to'lovlar", "Internet va aloqa xizmati"],
    ExpenseCategory.TRANSPORT: ["Xizmat safari xarajati", "Yoqilg'i xarajati"],
    ExpenseCategory.OFFICE: ["Ofis jihozlari", "Kanselyariya buyumlari"],
    ExpenseCategory.TAX: ["Foyda solig'i", "Ijtimoiy soliq to'lovi"],
    ExpenseCategory.BANK_FEE: ["Bank xizmat haqi", "Inkassatsiya xizmati"],
    ExpenseCategory.OTHER: ["Yuridik xizmatlar", "Boshqa operatsion xarajatlar"],
}


def _shift_month(value: date, offset: int) -> date:
    month_index = value.month - 1 + offset
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def _add_months(value: date, months: int) -> date:
    shifted = _shift_month(value, months)
    day = min(value.day, 28)
    return date(shifted.year, shifted.month, day)


def _round_amount(value: float, step: int = 100_000) -> Decimal:
    return Decimal(int(round(value / step) * step))


def _as_datetime(d: date, hour: int = 9) -> datetime:
    return datetime.combine(d, time(hour, 0), tzinfo=timezone.utc)


def _random_phone() -> str:
    prefix = random.choice(["90", "91", "93", "94", "97", "98", "99", "33"])
    return f"+998 {prefix} {random.randint(100, 999)} {random.randint(10, 99)} {random.randint(10, 99)}"


def wipe_business_data(db: Session) -> None:
    db.query(Payment).delete()
    db.query(ContractLineItem).delete()
    db.query(Contract).delete()
    db.query(Client).delete()
    db.query(Expense).delete()
    db.query(AuditLog).delete()
    db.commit()


def seed_clients(db: Session) -> list[Client]:
    clients: list[Client] = []
    for index, data in enumerate(CLIENTS):
        status = ClientStatus.NOFAOL if index % 9 == 8 else ClientStatus.FAOL
        client = Client(
            company_name=data["company_name"],
            city=data["city"],
            country=data.get("country", "O'zbekiston"),
            activity_type=data["activity_type"],
            contact_person=CONTACT_PERSONS[index % len(CONTACT_PERSONS)],
            phone=_random_phone(),
            status=status,
        )
        clients.append(client)
    db.add_all(clients)
    db.flush()
    return clients


def _pick_line_items(service_types: list[ServiceType], duration_months: int) -> list[ContractLineItem]:
    count = random.choice([1, 1, 2, 2, 3])
    chosen = random.sample(service_types, k=min(count, len(service_types)))
    scale = max(0.6, duration_months / 6)
    items = []
    for service_type in chosen:
        base = random.uniform(*SERVICE_PRICE_RANGE) * scale
        items.append(ContractLineItem(service_type_id=service_type.id, price=_round_amount(base)))
    return items


def _build_payments(total: Decimal, start: date, end: date, paid_ratio: float) -> list[Payment]:
    window_end = min(end, TODAY)
    if window_end <= start:
        window_end = start
    window_days = max((window_end - start).days, 1)

    target = total * Decimal(str(round(paid_ratio, 3)))
    if target <= 0:
        return []

    installments = random.choice([1, 1, 2, 2, 3, 4])
    shares = [random.uniform(0.6, 1.4) for _ in range(installments)]
    share_sum = sum(shares)
    payments: list[Payment] = []
    running_total = Decimal("0")
    offsets = sorted(random.randint(0, window_days) for _ in range(installments))

    for index, (share, offset) in enumerate(zip(shares, offsets)):
        is_last = index == installments - 1
        if is_last:
            amount = target - running_total
        else:
            amount = _round_amount(float(target) * (share / share_sum))
        if amount <= 0:
            continue
        running_total += amount
        paid_at = min(start + timedelta(days=offset), window_end)
        payments.append(Payment(amount=amount, paid_at=paid_at, note=None))

    # Occasional small refund — exercises the "qaytarish" payment type and
    # produces a realistic "ortiqcha to'lov" edge case for the demo.
    if payments and random.random() < 0.08:
        refund_amount = _round_amount(float(total) * random.uniform(0.02, 0.06))
        refund_date = min(window_end, TODAY)
        payments.append(
            Payment(amount=-refund_amount, paid_at=refund_date, note="Ortiqcha to'lov qaytarildi")
        )

    return payments


def seed_contracts(db: Session, clients: list[Client], service_types: list[ServiceType]) -> None:
    # More/bigger contracts land in recent months than in old ones — a
    # believable growth curve — with a deliberate seasonal dip mid-way.
    contracts_per_month = [2, 2, 3, 2, 3, 3, 2, 2, 3, 4, 4, 4, 5, 3]
    months = len(contracts_per_month)
    anchor_month = date(TODAY.year, TODAY.month, 1)

    client_pool = clients * 2
    random.shuffle(client_pool)
    pool_index = 0

    seq = 1
    for month_offset, count in enumerate(contracts_per_month):
        month_date = _shift_month(anchor_month, -(months - 1 - month_offset))
        for _ in range(count):
            client = client_pool[pool_index % len(client_pool)]
            pool_index += 1

            start_date = month_date + timedelta(days=random.randint(0, 26))
            if start_date > TODAY:
                start_date = TODAY - timedelta(days=random.randint(1, 10))
            duration_months = random.choice([6, 6, 9, 12])
            end_date = _add_months(start_date, duration_months)

            _create_contract(db, client, start_date, end_date, seq, service_types)
            seq += 1

    # A handful of long-running contracts expiring soon — populates the
    # "Muddati tugayotgan shartnomalar" widget with something to show.
    faol_clients = [c for c in clients if c.status == ClientStatus.FAOL]
    for client in random.sample(faol_clients, k=min(5, len(faol_clients))):
        start_date = TODAY - timedelta(days=random.randint(150, 330))
        end_date = TODAY + timedelta(days=random.randint(5, 28))
        _create_contract(db, client, start_date, end_date, seq, service_types, paid_ratio_override=random.uniform(0.68, 0.92))
        seq += 1

    db.flush()

    # Client onboarding date follows their first contract for a coherent
    # "client growth" chart.
    first_contract_start: dict[int, date] = {}
    for contract in db.scalars(select(Contract).order_by(Contract.start_date)).all():
        first_contract_start.setdefault(contract.client_id, contract.start_date)
    for client in clients:
        anchor = first_contract_start.get(client.id, TODAY)
        onboarded = anchor - timedelta(days=random.randint(3, 18))
        client.created_at = _as_datetime(onboarded)


def _create_contract(
    db: Session,
    client: Client,
    start_date: date,
    end_date: date,
    seq: int,
    service_types: list[ServiceType],
    paid_ratio_override: float | None = None,
) -> Contract:
    duration_months = max(1, round((end_date - start_date).days / 30))
    line_items = _pick_line_items(service_types, duration_months)
    total = sum((item.price for item in line_items), Decimal("0"))

    if paid_ratio_override is not None:
        paid_ratio = paid_ratio_override
    elif end_date < TODAY:
        paid_ratio = random.uniform(0.55, 0.8) if random.random() < 0.15 else random.uniform(0.88, 1.0)
    else:
        elapsed = (TODAY - start_date).days
        span = max((end_date - start_date).days, 1)
        progress = min(1.0, max(0.15, elapsed / span))
        paid_ratio = min(1.0, progress * random.uniform(0.85, 1.1))

    contract = Contract(
        client_id=client.id,
        start_date=start_date,
        end_date=end_date,
        contract_number=f"WTMA-{start_date.year}-{seq:04d}",
        invoice_number=f"INV-{seq:05d}" if random.random() < 0.7 else None,
        line_items=line_items,
        payments=_build_payments(total, start_date, end_date, paid_ratio),
    )
    db.add(contract)
    return contract


def seed_expenses(db: Session) -> None:
    months = 14
    anchor_month = date(TODAY.year, TODAY.month, 1)

    for month_offset in range(months):
        month_date = _shift_month(anchor_month, -(months - 1 - month_offset))
        day_cap = 27

        def pick_date() -> date:
            return date(month_date.year, month_date.month, random.randint(1, day_cap))

        # Fixed costs grow modestly over time, in step with the agency's growth.
        growth = 1 + (month_offset / months) * 0.6

        db.add(
            Expense(
                category=ExpenseCategory.SALARY,
                title=random.choice(EXPENSE_TITLES[ExpenseCategory.SALARY]),
                amount=_round_amount(random.uniform(9_000_000, 13_000_000) * growth),
                expense_date=pick_date(),
            )
        )
        db.add(
            Expense(
                category=ExpenseCategory.RENT,
                title=EXPENSE_TITLES[ExpenseCategory.RENT][0],
                amount=_round_amount(random.uniform(2_800_000, 4_200_000)),
                expense_date=pick_date(),
            )
        )
        db.add(
            Expense(
                category=ExpenseCategory.UTILITIES,
                title=random.choice(EXPENSE_TITLES[ExpenseCategory.UTILITIES]),
                amount=_round_amount(random.uniform(400_000, 900_000)),
                expense_date=pick_date(),
            )
        )
        db.add(
            Expense(
                category=ExpenseCategory.BANK_FEE,
                title=random.choice(EXPENSE_TITLES[ExpenseCategory.BANK_FEE]),
                amount=_round_amount(random.uniform(100_000, 280_000)),
                expense_date=pick_date(),
            )
        )
        if random.random() < 0.7:
            db.add(
                Expense(
                    category=ExpenseCategory.MARKETING,
                    title=random.choice(EXPENSE_TITLES[ExpenseCategory.MARKETING]),
                    amount=_round_amount(random.uniform(800_000, 3_200_000) * growth),
                    expense_date=pick_date(),
                )
            )
        if random.random() < 0.5:
            db.add(
                Expense(
                    category=ExpenseCategory.TRANSPORT,
                    title=random.choice(EXPENSE_TITLES[ExpenseCategory.TRANSPORT]),
                    amount=_round_amount(random.uniform(250_000, 1_000_000)),
                    expense_date=pick_date(),
                )
            )
        if random.random() < 0.4:
            db.add(
                Expense(
                    category=ExpenseCategory.OFFICE,
                    title=random.choice(EXPENSE_TITLES[ExpenseCategory.OFFICE]),
                    amount=_round_amount(random.uniform(200_000, 900_000)),
                    expense_date=pick_date(),
                )
            )
        if month_offset % 3 == 0:
            db.add(
                Expense(
                    category=ExpenseCategory.TAX,
                    title=random.choice(EXPENSE_TITLES[ExpenseCategory.TAX]),
                    amount=_round_amount(random.uniform(2_500_000, 5_500_000)),
                    expense_date=pick_date(),
                )
            )
        if random.random() < 0.3:
            db.add(
                Expense(
                    category=ExpenseCategory.OTHER,
                    title=random.choice(EXPENSE_TITLES[ExpenseCategory.OTHER]),
                    amount=_round_amount(random.uniform(150_000, 700_000)),
                    expense_date=pick_date(),
                )
            )


def seed_extra_users(db: Session) -> None:
    demo_users = [
        ("d.yusupova", "Dilnoza Yusupova", UserRole.MENEJER),
        ("s.ergashev", "Sardor Ergashev", UserRole.MENEJER),
        ("m.nazarova", "Malika Nazarova", UserRole.MENEJER),
    ]
    existing = set(db.scalars(select(User.username)).all())
    for username, full_name, role in demo_users:
        if username in existing:
            continue
        db.add(
            User(
                username=username,
                full_name=full_name,
                password_hash=hash_password("Demo12345!"),
                role=role,
                is_active=True,
            )
        )


def seed_settings(db: Session) -> None:
    set_monthly_plan(db, Decimal("60000000"))
    set_company_profile(
        db,
        {
            "company_name": "World Textile Marketing Agency",
            "company_address": "Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi, 12-uy",
            "company_phone": "+998 71 200 30 40",
            "company_inn": "302456789",
            "company_bank_name": "\"Ipoteka Bank\" ATB Chilonzor filiali",
            "company_bank_account": "20208000123456789012",
            "company_mfo": "01055",
            "company_director": "Aziz Karimov",
        },
    )


def run_seed_demo() -> None:
    db = SessionLocal()
    try:
        service_types = list(db.scalars(select(ServiceType)).all())
        if not service_types:
            raise RuntimeError("Avval `python -m app.seed` ishga tushiring (xizmat turlari topilmadi)")

        print("Eski mijoz/shartnoma/to'lov/xarajat/audit ma'lumotlari tozalanmoqda...")
        wipe_business_data(db)

        print("Mijozlar yaratilmoqda...")
        clients = seed_clients(db)

        print("Shartnomalar va to'lovlar yaratilmoqda...")
        seed_contracts(db, clients, service_types)

        print("Xarajatlar yaratilmoqda...")
        seed_expenses(db)

        print("Qo'shimcha xodimlar (menejerlar) yaratilmoqda...")
        seed_extra_users(db)

        db.commit()

        print("Oylik reja va kompaniya profili sozlanmoqda...")
        seed_settings(db)

        print(
            f"Tayyor: {len(clients)} mijoz, "
            f"{db.query(Contract).count()} shartnoma, "
            f"{db.query(Payment).count()} to'lov, {db.query(Expense).count()} xarajat."
        )
    finally:
        db.close()


if __name__ == "__main__":
    run_seed_demo()
