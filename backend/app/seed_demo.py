"""Populates the database with rich, realistic-looking demo data spanning 2020 to 2026.

Creates:
- 50 real-world style active clients + 5 archived clients in Arxiv/Trash.
- 280+ active contracts + 8 archived contracts in Arxiv/Trash.
- 700+ contract payments + 10 archived payments in Arxiv/Trash.
- 600+ operational expenses + 12 archived expenses in Arxiv/Trash.
- 20 realistic non-contract incomes + 5 archived incomes in Arxiv/Trash.
- Full Audit Log history (who changed what, deleted, created, updated with before/after changes).
- Login history and demo manager accounts.

Run command:
    docker compose exec api python -m app.seed_demo
"""

import json
import random
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    AuditAction,
    AuditLog,
    Client,
    ClientContact,
    ClientStatus,
    Contract,
    ContractLineItem,
    ContractWorkflowStatus,
    Expense,
    ExpenseCategory,
    Income,
    IncomeCategory,
    LoginHistory,
    Payment,
    ServiceType,
    User,
    UserRole,
)
from app.services.app_settings import (
    set_company_profile,
    set_finance_auto_payments_from,
    set_monthly_plan,
    set_yearly_plan,
)
from app.services.auth import hash_password

random.seed(2026)

TODAY = date.today()

CLIENTS: list[dict] = [
    {"company_name": "Toshkent To'qimachi AJ", "city": "Toshkent", "activity_type": "Paxta va trikotaj ishlab chiqarish", "website": "toqimachi.uz", "country": "O'zbekiston"},
    {"company_name": "Buxoro Cotton Textile MCHJ", "city": "Buxoro", "activity_type": "To'liq siklli paxta klasteri", "website": "buxorocotton.uz", "country": "O'zbekiston"},
    {"company_name": "Fergana Global Denim Group", "city": "Farg'ona", "activity_type": "Denim va jinsi kiyimlari ishlab chiqarish", "website": "ferganadenim.com", "country": "O'zbekiston"},
    {"company_name": "Namangan Silk & Wool XK", "city": "Namangan", "activity_type": "Ipak va jun gazlamalari", "website": "namangansilk.uz", "country": "O'zbekiston"},
    {"company_name": "Samarkand Eurotex JV", "city": "Samarqand", "activity_type": "Eksportbop trikotaj mahsulotlari", "website": "samarkand-eurotex.uz", "country": "O'zbekiston"},
    {"company_name": "Andijon Premium Jeans", "city": "Andijon", "activity_type": "Tayyor kiyim-kechak eksporti", "website": "andijon-jeans.uz", "country": "O'zbekiston"},
    {"company_name": "Navoiy Karvon Tola Klasteri", "city": "Navoiy", "activity_type": "Paxta tolasini qayta ishlash", "website": "karvon-tola.uz", "country": "O'zbekiston"},
    {"company_name": "Qarshi Nasaf Ip-Yigiruv MCHJ", "city": "Qarshi", "activity_type": "Ip yigirish va to'qish", "website": "nasaf-ip.uz", "country": "O'zbekiston"},
    {"company_name": "Termiz Jayhun Yigiruv Fabrikasi", "city": "Termiz", "activity_type": "Ip-kalava ishlab chiqarish", "website": "jayhun-textile.uz", "country": "O'zbekiston"},
    {"company_name": "Nukus Cotton Industry", "city": "Nukus", "activity_type": "Trikotaj va gazlama ishlab chiqarish", "website": "nukus-cotton.uz", "country": "O'zbekiston"},
    {"company_name": "Xorazm Ipak Lenta MCHJ", "city": "Urganch", "activity_type": "Ipak gazlama va lentachilik", "website": "xorazm-ipak.uz", "country": "O'zbekiston"},
    {"company_name": "Jizzax Matolari MCHJ", "city": "Jizzax", "activity_type": "Sanoat va uy matolari ishlab chiqarish", "website": "jizzax-mato.uz", "country": "O'zbekiston"},
    {"company_name": "Sirdaryo Agromarket Tekstil", "city": "Guliston", "activity_type": "Tekstil mahsulotlari eksporti", "website": "sirdaryo-tekstil.uz", "country": "O'zbekiston"},
    {"company_name": "Marg'ilon Xon Atlas Durdonasi", "city": "Marg'ilon", "activity_type": "Milliy xon atlas va adras ishlab chiqarish", "website": "xon-atlas.uz", "country": "O'zbekiston"},
    {"company_name": "Qo'qon Milliy Gazlamalari", "city": "Qo'qon", "activity_type": "Ipak va paxta gazlamalari", "website": "qoqon-gazlama.uz", "country": "O'zbekiston"},
    {"company_name": "Chirchiq Kimyo-Mato Klasteri", "city": "Chirchiq", "activity_type": "Sintetik va aralash matolar", "website": "chirchiq-mato.uz", "country": "O'zbekiston"},
    {"company_name": "Angren Maxsus Ishchi Kiyimlari", "city": "Angren", "activity_type": "Maxsus ish kiyimlari va formalar", "website": "angren-forma.uz", "country": "O'zbekiston"},
    {"company_name": "Bekobod Po'lat-Tekstil Servis", "city": "Bekobod", "activity_type": "Kiyim-kechak eksporti va savdo", "website": "bekobod-tekstil.uz", "country": "O'zbekiston"},
    {"company_name": "Zomin Shifo-Tekstil", "city": "Zomin", "activity_type": "Tibbiy bint va paxta mahsulotlari", "website": "zomin-tekstil.uz", "country": "O'zbekiston"},
    {"company_name": "Yangiyer Eko-Tola Klasteri", "city": "Yangiyer", "activity_type": "Eko-paxta tolasini qayta ishlash", "website": "yangiyer-tola.uz", "country": "O'zbekiston"},
    {"company_name": "Do'stlik Agro-Tekstil Majmuasi", "city": "Guliston", "activity_type": "To'qimachilik klasteri", "website": "dostlik-agro.uz", "country": "O'zbekiston"},
    {"company_name": "Oltinko'l Urganch Bo'yoqxonasi", "city": "Urganch", "activity_type": "Gazlama bo'yash va gul bosish", "website": "oltinkol-boyoq.uz", "country": "O'zbekiston"},
    {"company_name": "Kattaqo'rg'on Paxtakor MCHJ", "city": "Samarqand", "activity_type": "Ip yigirish va to'qimachilik", "website": "kattaqorgon-paxta.uz", "country": "O'zbekiston"},
    {"company_name": "Shahrisabz Kesh Suzana XK", "city": "Shahrisabz", "activity_type": "Milliy kashtachilik va tekstil", "website": "kesh-suzana.uz", "country": "O'zbekiston"},
    {"company_name": "Almaty QazTextile LLP", "city": "Almaty", "activity_type": "Kiyim-kechak eksport-import distribyutsiyasi", "website": "qaztextile.kz", "country": "Qozog'iston"},
    {"company_name": "Bishkek Moda Eksport MCHJ", "city": "Bishkek", "activity_type": "Tikuvchilik fabrikalari tarmog'i", "website": "bishkek-moda.kg", "country": "Qirg'iziston"},
    {"company_name": "Asaka Trikotaj Sanoat", "city": "Asaka", "activity_type": "Bolalar va kattalar trikotaji", "website": "asaka-trikotaj.uz", "country": "O'zbekiston"},
    {"company_name": "Denov Surxon Ip Klaster", "city": "Denov", "activity_type": "To'qimachilik va ip yigirish", "website": "surxon-ip.uz", "country": "O'zbekiston"},
    {"company_name": "Xiva Ichan Silk MCHJ", "city": "Xiva", "activity_type": "Milliy ipak mahsulotlari", "website": "xiva-silk.uz", "country": "O'zbekiston"},
    {"company_name": "Rishton Naqsh Gazlama", "city": "Rishton", "activity_type": "Gul bosilgan matolar ishlab chiqarish", "website": "rishton-mato.uz", "country": "O'zbekiston"},
    {"company_name": "Kogon Eko-Paxta AJ", "city": "Kogon", "activity_type": "Paxtani chuqur qayta ishlash", "website": "kogon-paxta.uz", "country": "O'zbekiston"},
    {"company_name": "Chust Do'ppilari va Trikotaj", "city": "Chust", "activity_type": "Trikotaj va milliy bosh kiyimlar", "website": "chust-tekstil.uz", "country": "O'zbekiston"},
    {"company_name": "Parkent Maxsus Kiyim MCHJ", "city": "Parkent", "activity_type": "Himoya kiyimlari va agromato", "website": "parkent-maxsus.uz", "country": "O'zbekiston"},
    {"company_name": "Zarafshon Oltin Ip Klasteri", "city": "Zarafshon", "activity_type": "Sanoat korxonalari uchun maxsus formalar", "website": "oltin-ip.uz", "country": "O'zbekiston"},
    {"company_name": "Koson Silk Production", "city": "Koson", "activity_type": "Ipak yigirish va to'qish", "website": "koson-silk.uz", "country": "O'zbekiston"},
    {"company_name": "To'rtko'l Paxta Tozalash AJ", "city": "To'rtko'l", "activity_type": "Paxta tolasi eksporti", "website": "tortkol-paxta.uz", "country": "O'zbekiston"},
    {"company_name": "Beruniy Yigiruv Klaster", "city": "Beruniy", "activity_type": "Ip yigirish va trikotaj mato", "website": "beruniy-ip.uz", "country": "O'zbekiston"},
    {"company_name": "Mingbuloq Baraka Trikotaj", "city": "Mingbuloq", "activity_type": "Erkaklar va ayollar trikotaji", "website": "baraka-trikotaj.uz", "country": "O'zbekiston"},
    {"company_name": "Pop Poplin Ishlab Chiqarish", "city": "Pop", "activity_type": "Poplin va paxta gazlamalari", "website": "pop-poplin.uz", "country": "O'zbekiston"},
    {"company_name": "Chimboy Sport Liboslari", "city": "Chimboy", "activity_type": "Sport formasi va kiyim-kechak", "website": "chimboy-sport.uz", "country": "O'zbekiston"},
    {"company_name": "Qorovulbozor Sanoat Gazlama", "city": "Qorovulbozor", "activity_type": "Brezent va sanoat qoplamalari", "website": "qorovulbozor-gazlama.uz", "country": "O'zbekiston"},
    {"company_name": "G'ijduvon Shoyi Fabrikasi", "city": "G'ijduvon", "activity_type": "Shoyi va ipak gazlamalar", "website": "gijduvon-shoyi.uz", "country": "O'zbekiston"},
    {"company_name": "Paxtakor Oq Oltin Klaster", "city": "Paxtakor", "activity_type": "Agro-tekstil to'liq sikl", "website": "paxtakor-klaster.uz", "country": "O'zbekiston"},
    {"company_name": "Bo'ka Denim Mills MCHJ", "city": "Bo'ka", "activity_type": "Denim matolari va jinsi shimlari", "website": "boka-denim.uz", "country": "O'zbekiston"},
    {"company_name": "Ohangaron Prom-Tekstil", "city": "Ohangaron", "activity_type": "Sanoat korxonalari uchun trikotaj", "website": "ohangaron-tekstil.uz", "country": "O'zbekiston"},
    {"company_name": "Yangiyo'l Liboslar Uyi", "city": "Yangiyo'l", "activity_type": "Zamonaviy ayollar liboslari", "website": "yangiyol-libos.uz", "country": "O'zbekiston"},
    {"company_name": "Piskent Ip-Kalava XK", "city": "Piskent", "activity_type": "Ip-kalava va mato to'qish", "website": "piskent-kalava.uz", "country": "O'zbekiston"},
    {"company_name": "Quva Pilla va Ipak Klasteri", "city": "Quva", "activity_type": "Pilla qayta ishlash va ipak gazlama", "website": "quva-pilla.uz", "country": "O'zbekiston"},
    {"company_name": "Shovot Oq Mato Fabrikasi", "city": "Shovot", "activity_type": "Oqlangan paxta matolari", "website": "shovot-mato.uz", "country": "O'zbekiston"},
    {"company_name": "Shumanay Qoraqalpoq Tekstil", "city": "Shumanay", "activity_type": "Tikuvchilik va trikotaj mahsulotlari", "website": "shumanay-tekstil.uz", "country": "O'zbekiston"},
]

TRASH_CLIENTS: list[dict] = [
    {"company_name": "Samarqand Ipakchilik Servis XK", "city": "Samarqand", "activity_type": "Ipakchilik va pillachilik", "website": "sam-ipak.uz", "days_ago": 180},
    {"company_name": "Andijon Qadimgi Trikotaj MCHJ", "city": "Andijon", "activity_type": "Trikotaj ishlab chiqarish", "website": "andijon-qadimgi.uz", "days_ago": 140},
    {"company_name": "Qashqadaryo Paxta Agro XK", "city": "Qarshi", "activity_type": "Paxta yetishtirish va tozalash", "website": "qash-paxta.uz", "days_ago": 90},
    {"company_name": "Farg'ona Gilamlari Servis MCHJ", "city": "Farg'ona", "activity_type": "Gilam va pol qoplamalari", "website": "fergana-carpet.uz", "days_ago": 45},
    {"company_name": "Toshkent Eski Tikuvchilik MCHJ", "city": "Toshkent", "activity_type": "Tikuvchilik sexi", "website": "tash-eski.uz", "days_ago": 15},
]

CONTACT_PERSONS = [
    "Azizbek Karimov (Direktor)", "Dilnoza Yusupova (Moliya direktori)", "Bahodir Rashidov (Bosh direktor)",
    "Nodira Tosheva (Marketing bo'limi boshlig'i)", "Sardorbek Ergashev (Tijorat direktori)", "Malika Nazarova (Eksport menejeri)",
    "Jamshidbek Yo'ldoshev (Bosh hisobchi)", "Gulnora Saidova (Loyiha rahbari)", "Otabek Mirzayev (Ishlab chiqarish direktori)",
    "Feruza Qodirova (Tashqi iqtisodiy aloqalar)", "Ravshan Abdullayev (Bosh muhandis)", "Zilola Xolmatova (Brend menejer)",
    "Ulug'bek Turg'unov (Menejer)", "Shahzoda Rahimova (PR menejer)", "Farrux Islomov (Savdo rahbari)", "Madina Yusupova (Direktor o'rinbosari)",
    "Botir Alimov (Boshqaruv raisi)", "Nilufar Hamidova (Kreativ direktor)", "Shavkat Rustamov (Bosh menejer)", "Dildora Fayzullayeva (Hisobchi)",
    "Jahongir Olimov (Ta'minot rahbari)", "Shahnoza Sobirova (Mijozlar bilan ishlash)", "Anvar Qosimov (Sifat nazorati rahbari)",
    "Kamola Mahmudova (Tijorat bo'limi)", "Rustam Zokirov (Marketing eksperti)", "Nargiza Shukurova (Loyiha koordinatori)",
]

SERVICE_BASE_PRICING: dict[str, tuple[int, int]] = {
    "Foto": (5_000_000, 14_000_000),
    "Video": (8_000_000, 24_000_000),
    "Sayt": (15_000_000, 45_000_000),
    "SMM": (6_000_000, 18_000_000),
    "Katalog": (6_000_000, 16_000_000),
    "Bozor tahlili": (8_000_000, 22_000_000),
    "Brendbuk": (10_000_000, 30_000_000),
    "Audit": (5_000_000, 14_000_000),
    "Dizayn": (4_000_000, 12_000_000),
    "Sayt tahriri": (3_000_000, 8_000_000),
}

EXPENSE_TITLES: dict[ExpenseCategory, list[str]] = {
    ExpenseCategory.SALARY: [
        "Xodimlar oylik maoshi (1-qism: avans)",
        "Xodimlar oylik maoshi (2-qism: yakuniy hisob)",
        "Loyiha topshirish va KPI bo'yicha mukofot pullari",
        "Yillik 13-oylik jamoaviy bonus to'lovi",
    ],
    ExpenseCategory.RENT: [
        "Bosh ofis va fotostudiya ijarasi to'lovi",
        "Kovorking va montaj xonasi oylik ijarasi",
        "Ko'rgazma stendlari va rekvizitlar ombori ijarasi",
    ],
    ExpenseCategory.MARKETING: [
        "Meta Ads (Instagram va Facebook) target reklama byudjeti",
        "Google Ads va YouTube qidiruv reklama kampaniyasi",
        "\"UzTextileExpo\" xalqaro ko'rgazmasi stendi va PR xarajatlari",
        "Sanoat blogerlari va ekspertlar bilan hamkorlik",
        "Agentlik veb-sayti SEO va kontent marketing xarajatlari",
    ],
    ExpenseCategory.UTILITIES: [
        "Kommunal to'lovlar (elektr energiyasi, isitish, suv)",
        "Yuqori tezlikdagi korporativ optik tolali internet",
        "Korporativ mobil aloqa va IP-telefoniya to'lovlari",
    ],
    ExpenseCategory.TRANSPORT: [
        "Viloyatlardagi tekstil korxonalariga xizmat safari (avia/poyezd chiptalari)",
        "Syeomka guruhi xizmat avtomashinalari yoqilg'i xarajatlari",
        "Toshkent shahri ichida mijozlar bilan uchrashuv va logistika xarajati",
    ],
    ExpenseCategory.OFFICE: [
        "Syeomka va ofis texnikasi (kameralar, xotira kartalari, monitorlar)",
        "Ofis qog'ozlari, shartnoma blankalari va kanselyariya mollari",
        "Xodimlar va mehmonlar uchun kofe, choy, suv va oshxona ehtiyojlari",
        "Ofis mebellari va qulaylik jihozlari xaridi",
    ],
    ExpenseCategory.TAX: [
        "Aylanmadan olinadigan soliq to'lovi (har chorakda)",
        "Jismoniy shaxslardan olinadigan daromad solig'i (JShODS)",
        "Yagona ijtimoiy to'lov (YaIT)",
    ],
    ExpenseCategory.BANK_FEE: [
        "Bank hisobvarag'iga xizmat ko'rsatish oylik to'lovi",
        "Xalqaro o'tkazmalar va konvertatsiya bank komissiyasi",
        "Kassa operatsiyalari va hisob-kitob komissiyasi",
    ],
    ExpenseCategory.OTHER: [
        "Yuridik konsalting va shartnomalarni huquqiy ekspertiza qilish",
        "Yillik mustaqil auditorlik tekshiruvi xizmati",
        "Dasturiy ta'minot litsenziyalari (Figma, Adobe Creative Cloud, Cloud Server)",
        "Xodimlar uchun marketing va dizayn master-klasslari to'lovi",
    ],
}

INCOME_EVENTS: list[dict] = [
    {"year": 2020, "month": 2, "category": IncomeCategory.INVESTMENT, "title": "Ta'sischilarning boshlang'ich ustav kapitali badali", "amount": 120_000_000, "note": "Kompaniyani ta'sis etish va asosiy vositalar xaridi uchun"},
    {"year": 2020, "month": 8, "category": IncomeCategory.SERVICE, "title": "Tekstil eksportchilari forumi uchun maxsus konsalting daromadi", "amount": 18_000_000, "note": "Yakka tartibdagi konsalting xizmati"},
    {"year": 2020, "month": 11, "category": IncomeCategory.OTHER, "title": "Valyuta kursi farqidan ijobiy daromad", "amount": 6_500_000, "note": "Eksport to'lovlari bo'yicha kurs farqi"},
    {"year": 2021, "month": 3, "category": IncomeCategory.LOAN, "title": "Zamonaviy kamera va yoritish uskunalarini xarid qilish uchun bank lizingi", "amount": 85_000_000, "note": "\"Ipoteka Bank\" ATB lizing mablag'i"},
    {"year": 2021, "month": 7, "category": IncomeCategory.GRANT, "title": "Innovatsion rivojlanish vazirligi startap granti", "amount": 45_000_000, "note": "Raqamli marketing platformasini rivojlantirish granti"},
    {"year": 2021, "month": 10, "category": IncomeCategory.SALE, "title": "Eski foto va yoritish uskunalarini yangilash doirasida sotish", "amount": 12_000_000, "note": "Texnikani yangilash hisobiga tushum"},
    {"year": 2022, "month": 4, "category": IncomeCategory.INVESTMENT, "title": "Strategik hamkor tomonidan A-bosqich sarmoyasi", "amount": 160_000_000, "note": "Xalqaro bozorlarga chiqish uchun qo'shimcha investitsiya"},
    {"year": 2022, "month": 9, "category": IncomeCategory.SERVICE, "title": "Markaziy Osiyo tekstil konferensiyasi brending konsaltingi", "amount": 28_000_000, "note": "Konferensiya tashkiliy qo'mitasi to'lovi"},
    {"year": 2022, "month": 12, "category": IncomeCategory.REFUND, "title": "Xorijiy xizmat yetkazib beruvchidan ortiqcha to'lov qaytishi", "amount": 8_400_000, "note": "Server va hosting xizmati bo'yicha depozit qaytishi"},
    {"year": 2023, "month": 3, "category": IncomeCategory.LOAN, "title": "Aylanma mablag'larni to'ldirish uchun tijorat banki krediti", "amount": 110_000_000, "note": "Yangi ofis va studiya ochilishi uchun kredit mablag'i"},
    {"year": 2023, "month": 6, "category": IncomeCategory.GRANT, "title": "Eksportni rag'batlantirish agentligi subsidiyasi", "amount": 60_000_000, "note": "Tekstil eksportchilariga marketing ko'rsatish subsidiyasi"},
    {"year": 2023, "month": 10, "category": IncomeCategory.SERVICE, "title": "Tekstil klasterlari rahbarlari uchun marketing master-klassi", "amount": 22_000_000, "note": "O'quv kursi va amaliy mashg'ulot to'lovi"},
    {"year": 2024, "month": 2, "category": IncomeCategory.INVESTMENT, "title": "Xususiy investor ulushi sarmoyasi", "amount": 190_000_000, "note": "Kompaniya filiali va yangi studiya jihozlari uchun"},
    {"year": 2024, "month": 5, "category": IncomeCategory.SALE, "title": "Ko'rgazma stendi konstruktsiyalari va dekoratsiyalarini realizatsiya qilish", "amount": 15_000_000, "note": "Ko'rgazma aktivlarini sotish"},
    {"year": 2024, "month": 9, "category": IncomeCategory.SERVICE, "title": "Xalqaro to'qimachilik federatsiyasi tahliliy hisoboti to'lovi", "amount": 35_000_000, "note": "Maxsus bozor tadqiqoti daromadi"},
    {"year": 2025, "month": 3, "category": IncomeCategory.GRANT, "title": "Raqamlashtirish va IT-eksport davlat granti", "amount": 75_000_000, "note": "Raqamli marketing eksportini kengaytirish"},
    {"year": 2025, "month": 8, "category": IncomeCategory.SERVICE, "title": "Yirik paxta klasteri uchun maxsus audit va konsalting", "amount": 30_000_000, "note": "Kengaytirilgan konsalting xizmati"},
    {"year": 2025, "month": 11, "category": IncomeCategory.REFUND, "title": "Sug'urta kompaniyasidan kompensatsiya to'lovi", "amount": 11_500_000, "note": "Xizmat safari texnika sug'urtasi bo'yicha to'lov"},
    {"year": 2026, "month": 2, "category": IncomeCategory.SALE, "title": "Eski kompyuter va montaj stantsiyalarini yangilash doirasida sotish", "amount": 24_000_000, "note": "Eski ofis server va texnikasini realizatsiya qilish"},
    {"year": 2026, "month": 5, "category": IncomeCategory.SERVICE, "title": "Buxoro tekstil forumi maxsus PR konsalting shartnomasi", "amount": 32_000_000, "note": "Forum PR xizmatlari daromadi"},
]


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


def _as_datetime(d: date, hour: int = 9, minute: int = 0) -> datetime:
    return datetime.combine(d, time(hour, minute), tzinfo=timezone.utc)


def _random_phone(city: str) -> str:
    codes = {
        "Toshkent": ["71", "90", "97", "99", "33", "77"],
        "Samarqand": ["66", "93", "97", "99"],
        "Buxoro": ["65", "93", "97", "91"],
        "Andijon": ["74", "90", "91", "93"],
        "Farg'ona": ["73", "90", "91", "94"],
        "Namangan": ["69", "90", "91", "94"],
        "Qarshi": ["75", "90", "91", "97"],
        "Termiz": ["76", "90", "91", "99"],
        "Nukus": ["61", "90", "91", "97"],
        "Urganch": ["62", "90", "91", "97"],
        "Jizzax": ["72", "90", "91", "94"],
        "Guliston": ["67", "90", "91", "97"],
        "Navoiy": ["79", "90", "91", "97"],
    }
    prefix_list = codes.get(city, ["90", "91", "93", "94", "97", "99"])
    prefix = random.choice(prefix_list)
    return f"+998 {prefix} {random.randint(100, 999)} {random.randint(10, 99)} {random.randint(10, 99)}"


def wipe_business_data(db: Session) -> None:
    db.query(Payment).delete()
    db.query(ContractLineItem).delete()
    db.query(Contract).delete()
    db.query(ClientContact).delete()
    db.query(Client).delete()
    db.query(Expense).delete()
    db.query(Income).delete()
    db.query(AuditLog).delete()
    db.query(LoginHistory).delete()
    db.commit()


def seed_clients(db: Session) -> list[Client]:
    clients: list[Client] = []

    for index, data in enumerate(CLIENTS):
        status = ClientStatus.NOFAOL if index in (17, 25, 33, 40, 48) else ClientStatus.FAOL
        primary_contact = CONTACT_PERSONS[index % len(CONTACT_PERSONS)]

        notes_options = [
            "Uzoq muddatli yirik to'qimachilik klasteri. Eksport mahsulotlari uchun doimiy brending va foto/video xizmatlari olinadi.",
            "Yillik shartnoma bo'yicha to'liq marketing autsorsingi. To'lovlar 50% avans va yakuniy dalolatnoma asosida amalga oshiriladi.",
            "Yangi ishlab chiqarish liniyasi ishga tushirilgan. SMM va eksport kataloglari yaratish bo'yicha hamkorlik.",
            "Rossiya, Turkiya va Yevropa bozoriga eksport qiluvchi korxona. Xalqaro ko'rgazmalar uchun materiallar tayyorlanadi.",
            "Doimiy va ishonchli buyurtmachi. To'lov intizomi yuqori, shartnoma muddatlari o'z vaqtida uzaytiriladi.",
        ]

        city = data.get("city", "Toshkent")
        phone_num = _random_phone(city) if data.get("country", "O'zbekiston") == "O'zbekiston" else "+7 727 345 67 89"

        client = Client(
            company_name=data["company_name"],
            city=city,
            country=data.get("country", "O'zbekiston"),
            activity_type=data["activity_type"],
            contact_person=primary_contact,
            phone=phone_num,
            website=data.get("website"),
            status=status,
            notes=notes_options[index % len(notes_options)],
            created_at=_as_datetime(TODAY, hour=10),
            updated_at=_as_datetime(TODAY, hour=10),
        )

        sec_name = CONTACT_PERSONS[(index + 7) % len(CONTACT_PERSONS)]
        client.contacts = [
            ClientContact(name=sec_name, phone=_random_phone(city), sort_order=1)
        ]
        if index % 2 == 0:
            third_name = CONTACT_PERSONS[(index + 13) % len(CONTACT_PERSONS)]
            client.contacts.append(
                ClientContact(name=third_name, phone=_random_phone(city), sort_order=2)
            )

        clients.append(client)

    db.add_all(clients)
    db.flush()
    return clients


def _pick_line_items(
    service_type_map: dict[str, ServiceType], duration_months: int, year: int
) -> list[ContractLineItem]:
    all_names = list(service_type_map.keys())

    package_type = random.choice(["full", "web_brand", "content", "analytics", "custom"])
    if package_type == "full":
        chosen_names = ["SMM", "Foto", "Video"]
    elif package_type == "web_brand":
        chosen_names = ["Sayt", "Brendbuk", "Katalog"]
    elif package_type == "content":
        chosen_names = ["Foto", "Video", "Dizayn"]
    elif package_type == "analytics":
        chosen_names = ["Bozor tahlili", "Audit", "SMM"]
    else:
        k = random.choice([2, 3])
        chosen_names = random.sample(all_names, k=k)

    year_factor = 1.0 + (year - 2020) * 0.13

    items = []
    for s_name in chosen_names:
        st = service_type_map.get(s_name)
        if not st:
            continue
        base_min, base_max = SERVICE_BASE_PRICING.get(s_name, (5_000_000, 15_000_000))
        if s_name in ("SMM", "Sayt tahriri"):
            months_factor = max(1, min(duration_months, 6)) * 0.75
        else:
            months_factor = 1.0

        raw_price = random.uniform(base_min, base_max) * year_factor * months_factor
        price = _round_amount(raw_price, 500_000)
        items.append(ContractLineItem(service_type_id=st.id, price=price))

    return items


def _build_payments(
    contract_num: str, total: Decimal, start: date, end: date, paid_ratio: float
) -> list[Payment]:
    window_end = min(end, TODAY)
    if window_end <= start:
        window_end = start
    window_days = max((window_end - start).days, 1)

    target = total * Decimal(str(round(paid_ratio, 3)))
    if target <= 0:
        return []

    if target >= Decimal("35000000"):
        shares = [0.40, 0.35, 0.25]
        notes = [
            f"№ {contract_num} shartnoma bo'yicha 40% boshlang'ich avans to'lovi",
            f"№ {contract_num} 2-bosqich oraliq materiallar qabul qilingandan so'ng to'lov",
            f"№ {contract_num} yakuniy dalolatnoma va hisob-faktura asosida to'liq hisob-kitob",
        ]
    else:
        shares = [0.50, 0.50]
        notes = [
            f"№ {contract_num} shartnoma bo'yicha 50% avans to'lovi",
            f"№ {contract_num} bajarilgan ishlar dalolatnomasi asosida yakuniy to'lov",
        ]

    payments: list[Payment] = []
    running_total = Decimal("0")
    offsets = sorted(random.randint(0, window_days) for _ in range(len(shares)))

    for index, (share, offset) in enumerate(zip(shares, offsets)):
        is_last = index == len(shares) - 1
        if is_last:
            amount = target - running_total
        else:
            amount = _round_amount(float(target) * share, 100_000)

        if amount <= 0:
            continue
        running_total += amount
        paid_at = min(start + timedelta(days=offset), window_end)
        payments.append(Payment(amount=amount, paid_at=paid_at, note=notes[index % len(notes)]))

    if payments and random.random() < 0.04:
        refund_amount = _round_amount(float(total) * random.uniform(0.02, 0.04), 100_000)
        if refund_amount > 0:
            refund_date = min(window_end, TODAY)
            payments.append(
                Payment(
                    amount=-refund_amount,
                    paid_at=refund_date,
                    note=f"№ {contract_num} ortiqcha to'lov summasi buyurtmachi hisobiga qaytarildi",
                )
            )

    return payments


def seed_contracts(db: Session, clients: list[Client], service_types: list[ServiceType]) -> None:
    seq = 1
    service_type_map = {st.name: st for st in service_types}

    cohorts = {
        2020: clients[0:12],
        2021: clients[12:20],
        2022: clients[20:28],
        2023: clients[28:35],
        2024: clients[35:41],
        2025: clients[41:46],
        2026: clients[46:50],
    }

    first_contract_start: dict[int, date] = {}
    active_client_pool: list[Client] = []

    for year in range(2020, 2027):
        new_cohort = cohorts.get(year, [])
        active_client_pool.extend(new_cohort)

        for new_client in new_cohort:
            start_month = random.randint(1, 12 if year < 2026 else TODAY.month)
            start_day = random.randint(1, 28)
            start_date = date(year, start_month, start_day)
            if start_date > TODAY:
                start_date = TODAY - timedelta(days=random.randint(5, 30))

            duration_months = random.choice([6, 9, 12])
            end_date = _add_months(start_date, duration_months)

            _create_single_contract(
                db, new_client, start_date, end_date, seq, service_type_map, year
            )
            first_contract_start.setdefault(new_client.id, start_date)
            seq += 1

        yearly_repeat_counts = {
            2020: 18,
            2021: 24,
            2022: 30,
            2023: 36,
            2024: 42,
            2025: 48,
            2026: 44,
        }
        repeat_count = yearly_repeat_counts.get(year, 28)

        for _ in range(repeat_count):
            client = random.choice(active_client_pool)
            start_month = random.randint(1, 12)
            start_day = random.randint(1, 28)
            start_date = date(year, start_month, start_day)

            if year == 2026 and start_date > TODAY and random.random() < 0.6:
                start_date = TODAY - timedelta(days=random.randint(1, 60))

            duration_months = random.choice([3, 6, 6, 9, 12, 12])
            end_date = _add_months(start_date, duration_months)

            _create_single_contract(
                db, client, start_date, end_date, seq, service_type_map, year
            )
            first_contract_start.setdefault(client.id, start_date)
            seq += 1

    faol_clients = [c for c in clients if c.status == ClientStatus.FAOL]
    for client in random.sample(faol_clients, k=min(6, len(faol_clients))):
        start_date = TODAY - timedelta(days=random.randint(150, 330))
        end_date = TODAY + timedelta(days=random.randint(4, 28))
        _create_single_contract(
            db, client, start_date, end_date, seq, service_type_map, 2026, paid_ratio_override=random.uniform(0.75, 0.95)
        )
        first_contract_start.setdefault(client.id, start_date)
        seq += 1

    db.flush()

    for client in clients:
        earliest = first_contract_start.get(client.id, TODAY)
        onboarded = earliest - timedelta(days=random.randint(5, 20))
        client.created_at = _as_datetime(onboarded, 9, 30)
        client.updated_at = _as_datetime(onboarded, 9, 30)


def _create_single_contract(
    db: Session,
    client: Client,
    start_date: date,
    end_date: date,
    seq: int,
    service_type_map: dict[str, ServiceType],
    year: int,
    paid_ratio_override: float | None = None,
) -> Contract:
    duration_months = max(1, round((end_date - start_date).days / 30))
    line_items = _pick_line_items(service_type_map, duration_months, year)

    is_cancelled_contract = random.random() < 0.015
    if is_cancelled_contract:
        for li in line_items:
            li.is_cancelled = True
            li.cancelled_at = _as_datetime(start_date + timedelta(days=14), 11)

    total = sum((item.price for item in line_items if not item.is_cancelled), Decimal("0"))
    contract_num = f"WTMA-{year}-{seq:04d}"
    invoice_num = f"INV-{year % 100}{seq:04d}" if random.random() < 0.90 else None

    if is_cancelled_contract:
        paid_ratio = 0.0
        status = ContractWorkflowStatus.TOXTATILDI
    elif paid_ratio_override is not None:
        paid_ratio = paid_ratio_override
        status = ContractWorkflowStatus.DAVOM_ETMOQDA
    elif end_date < TODAY:
        paid_ratio = random.uniform(0.75, 0.90) if random.random() < 0.08 else 1.0
        status = ContractWorkflowStatus.TUGADI
    elif start_date > TODAY:
        paid_ratio = 0.30 if random.random() < 0.35 else 0.0
        status = ContractWorkflowStatus.YANGI
    else:
        elapsed = (TODAY - start_date).days
        span = max((end_date - start_date).days, 1)
        progress = min(1.0, max(0.20, elapsed / span))
        paid_ratio = min(1.0, progress * random.uniform(0.85, 1.02))
        status = ContractWorkflowStatus.DAVOM_ETMOQDA

    payments = (
        _build_payments(contract_num, total, start_date, end_date, paid_ratio)
        if not is_cancelled_contract
        else []
    )

    notes_pool = [
        "Eksport bozorlari uchun marketing xizmatlari to'plami. Ishlar to'liq reja asosida olib borilmoqda.",
        "Katalog va veb-sayt tayyorlash shartnomasi. Foto va video materiallar tasdiqlangan.",
        "6 oylik to'liq SMM va target reklama yuritish xizmati. Oylik hisobotlar taqdim etiladi.",
        "Xalqaro tekstil ko'rgazmasi uchun brending va korporativ uslub ishlab chiqish.",
        "Yangi to'qimachilik liniyasi uchun promo-roliklar va katalog dizayni.",
    ]

    contract = Contract(
        client_id=client.id,
        start_date=start_date,
        end_date=end_date,
        contract_number=contract_num,
        invoice_number=invoice_num,
        status=status,
        notes=random.choice(notes_pool),
        created_at=_as_datetime(start_date - timedelta(days=random.randint(1, 7)), 11),
        updated_at=_as_datetime(start_date, 16),
        line_items=line_items,
        payments=payments,
    )
    db.add(contract)
    return contract


def seed_expenses(db: Session) -> None:
    start_year = 2020
    end_year = 2026

    for year in range(start_year, end_year + 1):
        year_idx = year - start_year
        salary_base = 10_000_000 + year_idx * 9_000_000
        rent_base = 3_000_000 + year_idx * 2_200_000

        for month in range(1, 13):
            month_date = date(year, month, 1)
            is_future = month_date > TODAY

            def pick_day(day_max: int = 28) -> date:
                return date(year, month, random.randint(1, min(day_max, 28)))

            if is_future:
                db.add(
                    Expense(
                        category=ExpenseCategory.RENT,
                        title=EXPENSE_TITLES[ExpenseCategory.RENT][0],
                        amount=_round_amount(rent_base),
                        expense_date=pick_day(5),
                        note="Rejalashtirilgan ofis ijarasi to'lovi",
                        created_at=_as_datetime(pick_day(5)),
                    )
                )
                db.add(
                    Expense(
                        category=ExpenseCategory.SALARY,
                        title=EXPENSE_TITLES[ExpenseCategory.SALARY][0],
                        amount=_round_amount(salary_base * 0.6),
                        expense_date=pick_day(10),
                        note="Rejalashtirilgan oylik maosh to'lovi",
                        created_at=_as_datetime(pick_day(10)),
                    )
                )
                continue

            db.add(
                Expense(
                    category=ExpenseCategory.SALARY,
                    title="Xodimlar oylik maoshi (2-qism: oylik)",
                    amount=_round_amount(salary_base * random.uniform(0.55, 0.65)),
                    expense_date=pick_day(10),
                    created_at=_as_datetime(pick_day(10)),
                )
            )
            db.add(
                Expense(
                    category=ExpenseCategory.SALARY,
                    title="Xodimlar oylik maoshi (1-qism: avans)",
                    amount=_round_amount(salary_base * random.uniform(0.35, 0.45)),
                    expense_date=pick_day(25),
                    created_at=_as_datetime(pick_day(25)),
                )
            )

            db.add(
                Expense(
                    category=ExpenseCategory.RENT,
                    title=EXPENSE_TITLES[ExpenseCategory.RENT][0],
                    amount=_round_amount(rent_base * random.uniform(0.98, 1.02)),
                    expense_date=pick_day(5),
                    created_at=_as_datetime(pick_day(5)),
                )
            )

            db.add(
                Expense(
                    category=ExpenseCategory.UTILITIES,
                    title="Kommunal to'lovlar va yuqori tezlikdagi internet",
                    amount=_round_amount((500_000 + year_idx * 180_000) * random.uniform(0.85, 1.2)),
                    expense_date=pick_day(15),
                    created_at=_as_datetime(pick_day(15)),
                )
            )

            db.add(
                Expense(
                    category=ExpenseCategory.BANK_FEE,
                    title="Bank hisob-kitob va kassa xizmat haqi",
                    amount=_round_amount((120_000 + year_idx * 45_000) * random.uniform(0.9, 1.15)),
                    expense_date=pick_day(28),
                    created_at=_as_datetime(pick_day(28)),
                )
            )

            db.add(
                Expense(
                    category=ExpenseCategory.MARKETING,
                    title="Meta Ads va Google Ads reklama byudjeti",
                    amount=_round_amount((1_500_000 + year_idx * 600_000) * random.uniform(0.8, 1.25)),
                    expense_date=pick_day(20),
                    created_at=_as_datetime(pick_day(20)),
                )
            )

            if month in (4, 9):
                db.add(
                    Expense(
                        category=ExpenseCategory.MARKETING,
                        title="\"UzTextileExpo\" xalqaro ko'rgazmasi stendi va PR xarajatlari",
                        amount=_round_amount(8_000_000 + year_idx * 1_800_000),
                        expense_date=pick_day(18),
                        note="Xalqaro ko'rgazma ishtiroki to'lovi",
                        created_at=_as_datetime(pick_day(18)),
                    )
                )

            if random.random() < 0.70:
                db.add(
                    Expense(
                        category=ExpenseCategory.TRANSPORT,
                        title=random.choice(EXPENSE_TITLES[ExpenseCategory.TRANSPORT]),
                        amount=_round_amount((600_000 + year_idx * 300_000) * random.uniform(0.8, 1.2)),
                        expense_date=pick_day(16),
                        created_at=_as_datetime(pick_day(16)),
                    )
                )

            db.add(
                Expense(
                    category=ExpenseCategory.OTHER,
                    title="Dasturiy ta'minot obunalari (Figma, Adobe Creative Cloud, Cloud Server)",
                    amount=_round_amount((600_000 + year_idx * 200_000) * random.uniform(0.95, 1.1)),
                    expense_date=pick_day(8),
                    created_at=_as_datetime(pick_day(8)),
                )
            )

            if month in (1, 4, 7, 10):
                db.add(
                    Expense(
                        category=ExpenseCategory.TAX,
                        title="Aylanmadan olinadigan soliq va daromad solig'i to'lovi",
                        amount=_round_amount((3_000_000 + year_idx * 1_400_000) * random.uniform(0.9, 1.1)),
                        expense_date=pick_day(22),
                        created_at=_as_datetime(pick_day(22)),
                    )
                )


def seed_incomes(db: Session) -> None:
    for event in INCOME_EVENTS:
        year = event["year"]
        month = event["month"]
        day = random.randint(5, 25)
        income_date = date(year, month, day)

        if income_date > TODAY:
            continue

        income = Income(
            category=event["category"],
            title=event["title"],
            amount=Decimal(str(event["amount"])),
            income_date=income_date,
            note=event["note"],
            created_at=_as_datetime(income_date, 14),
            updated_at=_as_datetime(income_date, 14),
        )
        db.add(income)


def seed_trash_data(
    db: Session,
    clients: list[Client],
    service_types: list[ServiceType],
    users: list[User],
) -> None:
    """Creates soft-deleted (archived) clients, contracts, payments, expenses, and incomes for Arxiv tab."""
    service_type_map = {st.name: st for st in service_types}

    # 1. Trashed Clients (5 ta)
    trashed_clients: list[Client] = []
    for tc in TRASH_CLIENTS:
        del_date = TODAY - timedelta(days=tc["days_ago"])
        c = Client(
            company_name=tc["company_name"],
            city=tc["city"],
            country="O'zbekiston",
            activity_type=tc["activity_type"],
            contact_person=random.choice(CONTACT_PERSONS),
            phone=_random_phone(tc["city"]),
            website=tc["website"],
            status=ClientStatus.NOFAOL,
            notes="Korxona faoliyatini vaqtincha to'xtatganligi sababli arxivga o'tkazilgan.",
            created_at=_as_datetime(del_date - timedelta(days=200)),
            updated_at=_as_datetime(del_date),
            deleted_at=_as_datetime(del_date, 16, 30),
        )
        trashed_clients.append(c)
    db.add_all(trashed_clients)
    db.flush()

    # 2. Trashed Contracts (8 ta)
    for i, c in enumerate(trashed_clients + clients[:3]):
        del_date = TODAY - timedelta(days=random.randint(10, 120))
        start_date = del_date - timedelta(days=60)
        end_date = start_date + timedelta(days=180)
        contract_num = f"WTMA-2025-ARCH{i+1:02d}"

        line_items = [
            ContractLineItem(
                service_type_id=service_types[i % len(service_types)].id,
                price=Decimal("15000000.00"),
            )
        ]
        contract = Contract(
            client_id=c.id,
            start_date=start_date,
            end_date=end_date,
            contract_number=contract_num,
            invoice_number=f"INV-ARCH{i+1:02d}",
            status=ContractWorkflowStatus.TOXTATILDI,
            notes="Bekor qilingan va arxivga chiqarilgan shartnoma.",
            created_at=_as_datetime(start_date),
            updated_at=_as_datetime(del_date),
            deleted_at=_as_datetime(del_date, 15),
            line_items=line_items,
        )
        db.add(contract)
        db.flush()

        # 3. Trashed Payments (10 ta)
        if i < 5:
            payment = Payment(
                contract_id=contract.id,
                amount=Decimal("7500000.00"),
                paid_at=start_date + timedelta(days=5),
                note="Noto'g'ri hisob raqamga o'tkazilgan to'lov (o'chirilgan)",
                created_at=_as_datetime(start_date + timedelta(days=5)),
                deleted_at=_as_datetime(del_date, 14),
            )
            db.add(payment)

    # 4. Trashed Expenses (10 ta)
    trash_expense_titles = [
        "Texnik xato tufayli dublikat bo'lgan ofis ijarasi",
        "Bekor qilingan xizmat safari avia chiptasi to'lovi",
        "Qaytarilgan reklama kampaniyasi avans to'lovi",
        "Xato kiritilgan printer va kartrij xarajati",
        "Bekor qilingan dasturiy ta'minot obunasi",
    ]
    for i, title in enumerate(trash_expense_titles * 2):
        del_date = TODAY - timedelta(days=random.randint(5, 100))
        db.add(
            Expense(
                category=random.choice(list(ExpenseCategory)),
                title=title,
                amount=Decimal(f"{random.randint(1, 15) * 1_000_000}.00"),
                expense_date=del_date.date() if isinstance(del_date, datetime) else del_date,
                note="Texnik xatolik sababli arxivlangan xarajat",
                created_at=_as_datetime(del_date - timedelta(days=2)),
                deleted_at=_as_datetime(del_date, 11),
            )
        )

    # 5. Trashed Incomes (5 ta)
    trash_income_titles = [
        "Qabul qilinmagan xorijiy grant arizasi dastlabki mablag'i",
        "Bekor qilingan seminar tashkiliy to'lovi",
        "Dublikat sifatida kiritilgan konsalting tushumi",
        "Texnik xatolik bilan yozilgan investitsiya badali",
        "Qaytarib olingan homiylik yordami",
    ]
    for i, title in enumerate(trash_income_titles):
        del_date = TODAY - timedelta(days=random.randint(10, 90))
        db.add(
            Income(
                category=random.choice(list(IncomeCategory)),
                title=title,
                amount=Decimal(f"{random.randint(10, 40) * 1_000_000}.00"),
                income_date=del_date.date() if isinstance(del_date, datetime) else del_date,
                note="Arxivlangan kirim yozuvi",
                created_at=_as_datetime(del_date - timedelta(days=5)),
                deleted_at=_as_datetime(del_date, 17),
            )
        )


def seed_audit_logs(db: Session, users: list[User]) -> None:
    """Creates realistic audit log history entries from 2020 to 2026 showing who changed what and when."""
    audit_scenarios = [
        {
            "entity_type": "contract",
            "action": AuditAction.CREATE,
            "summary_fmt": "Yangi shartnoma ro'yxatdan o'tkazildi (ID: #{id})",
            "changes": {"status": ["yangi", "davom_etmoqda"], "contract_number": [None, "WTMA-2024-0042"]},
        },
        {
            "entity_type": "contract",
            "action": AuditAction.UPDATE,
            "summary_fmt": "Shartnoma holati o'zgartirildi (ID: #{id})",
            "changes": {"status": ["davom_etmoqda", "tugadi"]},
        },
        {
            "entity_type": "contract",
            "action": AuditAction.UPDATE,
            "summary_fmt": "Shartnoma muddati uzaytirildi (ID: #{id})",
            "changes": {"end_date": ["2025-06-30", "2025-12-31"]},
        },
        {
            "entity_type": "contract",
            "action": AuditAction.DELETE,
            "summary_fmt": "Shartnoma arxivga o'tkazildi (ID: #{id})",
            "changes": {"deleted_at": [None, "2026-06-15T15:00:00Z"]},
        },
        {
            "entity_type": "payment",
            "action": AuditAction.CREATE,
            "summary_fmt": "Shartnoma bo'yicha bank o'tkazmasi to'lovi qabul qilindi (ID: #{id})",
            "changes": {"amount": [None, "25000000.00"], "note": [None, "50% avans to'lovi"]},
        },
        {
            "entity_type": "payment",
            "action": AuditAction.UPDATE,
            "summary_fmt": "To'lov summasi aniqlashtirildi (ID: #{id})",
            "changes": {"amount": ["18000000.00", "22000000.00"], "note": ["Avans", "Kengaytirilgan avans to'lovi"]},
        },
        {
            "entity_type": "payment",
            "action": AuditAction.DELETE,
            "summary_fmt": "Dublikat to'lov arxivga o'chirildi (ID: #{id})",
            "changes": {"deleted_at": [None, "2026-07-10T14:00:00Z"]},
        },
        {
            "entity_type": "client",
            "action": AuditAction.CREATE,
            "summary_fmt": "Yangi mijoz profili yaratildi (ID: #{id})",
            "changes": {"status": [None, "faol"], "country": [None, "O'zbekiston"]},
        },
        {
            "entity_type": "client",
            "action": AuditAction.UPDATE,
            "summary_fmt": "Mijoz kontakt telefoni yangilandi (ID: #{id})",
            "changes": {"phone": ["+998 71 200 11 22", "+998 90 910 20 30"]},
        },
        {
            "entity_type": "client",
            "action": AuditAction.DELETE,
            "summary_fmt": "Faoliyati to'xtatilgan mijoz arxivga o'tkazildi (ID: #{id})",
            "changes": {"deleted_at": [None, "2026-08-01T16:30:00Z"]},
        },
        {
            "entity_type": "expense",
            "action": AuditAction.CREATE,
            "summary_fmt": "Oylik operatsion xarajat to'lovi tasdiqlandi (ID: #{id})",
            "changes": {"category": [None, "rent"], "amount": [None, "12000000.00"]},
        },
        {
            "entity_type": "expense",
            "action": AuditAction.UPDATE,
            "summary_fmt": "Marketing byudjeti xarajati yangilandi (ID: #{id})",
            "changes": {"amount": ["4500000.00", "6000000.00"]},
        },
        {
            "entity_type": "expense",
            "action": AuditAction.DELETE,
            "summary_fmt": "Bekor qilingan xarajat arxivga o'tkazildi (ID: #{id})",
            "changes": {"deleted_at": [None, "2026-08-05T11:00:00Z"]},
        },
        {
            "entity_type": "income",
            "action": AuditAction.CREATE,
            "summary_fmt": "Bank hisobiga maxsus tushum qayd etildi (ID: #{id})",
            "changes": {"category": [None, "grant"], "amount": [None, "60000000.00"]},
        },
        {
            "entity_type": "user",
            "action": AuditAction.CREATE,
            "summary_fmt": "Yangi xodim profili ro'yxatdan o'tkazildi (ID: #{id})",
            "changes": {"role": [None, "menejer"]},
        },
    ]

    for year in range(2020, 2027):
        count = random.randint(15, 24)
        for _ in range(count):
            month = random.randint(1, 12 if year < 2026 else TODAY.month)
            day = random.randint(1, 28)
            log_date = date(year, month, day)
            if log_date > TODAY:
                continue

            scenario = random.choice(audit_scenarios)
            user = random.choice(users)
            entity_id = random.randint(1, 300)

            changes_dict = {k: list(v) for k, v in scenario["changes"].items()}

            log = AuditLog(
                entity_type=scenario["entity_type"],
                entity_id=entity_id,
                action=scenario["action"],
                summary=scenario["summary_fmt"].format(id=entity_id),
                changes=json.dumps(changes_dict, ensure_ascii=False),
                user_id=user.id,
                username=user.full_name,
                created_at=_as_datetime(log_date, random.randint(9, 18), random.randint(0, 59)),
            )
            db.add(log)


def seed_login_history(db: Session, users: list[User]) -> None:
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    ]
    ips = ["195.158.12.45", "213.230.77.10", "84.54.80.12", "94.158.62.90", "178.218.200.5"]

    for year in range(2020, 2027):
        count = random.randint(12, 20)
        for _ in range(count):
            month = random.randint(1, 12 if year < 2026 else TODAY.month)
            day = random.randint(1, 28)
            log_date = date(year, month, day)
            if log_date > TODAY:
                continue

            user = random.choice(users)
            db.add(
                LoginHistory(
                    user_id=user.id,
                    username=user.username,
                    full_name=user.full_name,
                    ip_address=random.choice(ips),
                    user_agent=random.choice(user_agents),
                    logged_in_at=_as_datetime(log_date, random.randint(8, 20), random.randint(0, 59)),
                )
            )


def seed_extra_users(db: Session) -> list[User]:
    demo_users = [
        ("admin", "Administrator", UserRole.ADMIN),
        ("d.yusupova", "Dilnoza Yusupova", UserRole.MENEJER),
        ("s.ergashev", "Sardor Ergashev", UserRole.MENEJER),
        ("m.nazarova", "Malika Nazarova", UserRole.MENEJER),
        ("j.yoldashev", "Jamshid Yo'ldoshev", UserRole.MENEJER),
        ("o.mirzayev", "Otabek Mirzayev", UserRole.MENEJER),
    ]
    all_users: list[User] = []
    for username, full_name, role in demo_users:
        existing = db.scalars(select(User).where(User.username == username)).first()
        if existing:
            all_users.append(existing)
        else:
            pwd = "admin123" if username == "admin" else "Demo12345!"
            u = User(
                username=username,
                full_name=full_name,
                password_hash=hash_password(pwd),
                role=role,
                is_active=True,
            )
            db.add(u)
            db.flush()
            all_users.append(u)
    return all_users


def seed_settings(db: Session) -> None:
    set_finance_auto_payments_from(db, year=2020, month=1, day=1)

    yearly_plans = {
        2020: Decimal("400000000"),
        2021: Decimal("600000000"),
        2022: Decimal("900000000"),
        2023: Decimal("1300000000"),
        2024: Decimal("1800000000"),
        2025: Decimal("2400000000"),
        2026: Decimal("2800000000"),
    }
    for yr, plan in yearly_plans.items():
        set_yearly_plan(db, yr, plan)

    set_monthly_plan(db, Decimal("220000000"))
    set_company_profile(
        db,
        {
            "company_name": "World Textile Marketing Agency",
            "company_address": "Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi, 12-uy",
            "company_phone": "+998 71 200 30 40",
            "company_inn": "302456789",
            "company_bank_name": '"Ipoteka Bank" ATB Chilonzor filiali',
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

        print("1/9. Eski biznes ma'lumotlari tozalanmoqda...")
        wipe_business_data(db)

        print("2/9. Foydalanuvchilar va menejerlar tekshirilmoqda...")
        users = seed_extra_users(db)

        print("3/9. 50 ta haqiqiy mijoz korxonalari yaratilmoqda...")
        clients = seed_clients(db)

        print("4/9. 2020-2026 yillar bo'yicha shartnomalar va to'lovlar yaratilmoqda...")
        seed_contracts(db, clients, service_types)

        print("5/9. 2020-2026 yillar bo'yicha operatsion xarajatlar yaratilmoqda...")
        seed_expenses(db)

        print("6/9. 2020-2026 yillar bo'yicha boshqa daromadlar (incomes) yaratilmoqda...")
        seed_incomes(db)

        print("7/9. Arxiv (Trash) uchun ma'lumotlar yaratilmoqda...")
        seed_trash_data(db, clients, service_types, users)

        print("8/9. O'zgarishlar tarixi (Audit log) va Kirish tarixi yaratilmoqda...")
        seed_audit_logs(db, users)
        seed_login_history(db, users)

        db.commit()

        print("9/9. Oylik reja, yillik rejalar va kompaniya profili sozlanmoqda...")
        seed_settings(db)

        active_clients = db.query(Client).filter(Client.deleted_at.is_(None)).count()
        trashed_clients = db.query(Client).filter(Client.deleted_at.is_not(None)).count()
        active_contracts = db.query(Contract).filter(Contract.deleted_at.is_(None)).count()
        trashed_contracts = db.query(Contract).filter(Contract.deleted_at.is_not(None)).count()
        active_payments = db.query(Payment).filter(Payment.deleted_at.is_(None)).count()
        trashed_payments = db.query(Payment).filter(Payment.deleted_at.is_not(None)).count()
        active_expenses = db.query(Expense).filter(Expense.deleted_at.is_(None)).count()
        trashed_expenses = db.query(Expense).filter(Expense.deleted_at.is_not(None)).count()
        active_incomes = db.query(Income).filter(Income.deleted_at.is_(None)).count()
        trashed_incomes = db.query(Income).filter(Income.deleted_at.is_not(None)).count()

        audit_count = db.query(AuditLog).count()
        login_count = db.query(LoginHistory).count()

        print("\n=======================================================")
        print(" MUVAFFAQIShATLI YAKUNLANDI (ARXIV VA AUDIT BILAN)")
        print("=======================================================")
        print(f" • Faol mijozlar:              {active_clients} ta | Arxivda: {trashed_clients} ta")
        print(f" • Faol shartnomalar:          {active_contracts} ta | Arxivda: {trashed_contracts} ta")
        print(f" • Faol to'lovlar:             {active_payments} ta | Arxivda: {trashed_payments} ta")
        print(f" • Faol xarajatlar:            {active_expenses} ta | Arxivda: {trashed_expenses} ta")
        print(f" • Faol boshqa kirimlar:       {active_incomes} ta | Arxivda: {trashed_incomes} ta")
        print(f" • Audit qaydlari (Tarix):     {audit_count} ta")
        print(f" • Kirish tarixi (Logins):     {login_count} ta")
        print("=======================================================\n")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed_demo()
