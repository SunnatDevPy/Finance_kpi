from datetime import date
from io import BytesIO

from sqlalchemy.orm import Session

from app.services.dashboard import (
    get_clients_by_region,
    get_revenue_by_service,
    get_top_clients_by_ltv,
    get_top_clients_ranked,
)
from app.services.export_data import _money
from app.services.export_files import build_pdf

DASHBOARD_EXPORT_TITLES = {
    "services": "Xizmat turlari bo'yicha",
    "regions": "Hudud bo'yicha mijozlar",
    "top_clients": "Top mijozlar jadvali",
    "top_clients_ltv": "Eng ko'p to'lov qilgan korxonalar (LTV)",
}


def _pdf_response(export_type: str, headers: list[str], rows: list[list[str]]) -> tuple[BytesIO, str, str]:
    title = DASHBOARD_EXPORT_TITLES[export_type]
    buffer = build_pdf(title, headers, rows)
    filename = f"dashboard_{export_type}.pdf"
    return buffer, filename, "application/pdf"


def export_services_pdf(db: Session) -> tuple[BytesIO, str, str]:
    rows_data = get_revenue_by_service(db)
    rows = [[name, _money(amount)] for name, amount in rows_data]
    return _pdf_response("services", ["Xizmat", "Summa"], rows)


def export_regions_pdf(db: Session) -> tuple[BytesIO, str, str]:
    items = get_clients_by_region(db)
    rows = [
        [
            item.city,
            item.country,
            str(item.clients_count),
            _money(item.total_amount),
            _money(item.total_paid),
            _money(item.total_debt),
        ]
        for item in items
    ]
    return _pdf_response(
        "regions",
        ["Viloyat", "Davlat", "Mijozlar", "Summa", "Tushum", "Qarz"],
        rows,
    )


def export_top_clients_ranked_pdf(
    db: Session,
    *,
    limit: int = 100,
    order: str = "desc",
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[BytesIO, str, str]:
    clients = get_top_clients_ranked(
        db,
        limit=limit,
        order=order,  # type: ignore[arg-type]
        date_from=date_from,
        date_to=date_to,
    )
    rows = []
    for index, client in enumerate(clients, start=1):
        paid = client.total_paid
        debt = client.total_debt
        ratio = round((paid / max(paid + debt, 1)) * 100)
        rows.append(
            [
                str(index),
                client.company_name,
                _money(paid),
                _money(debt),
                f"{ratio}%",
            ]
        )
    return _pdf_response(
        "top_clients",
        ["#", "Korxona", "To'langan", "Qarz", "To'lov ulushi"],
        rows,
    )


def export_top_clients_ltv_pdf(
    db: Session,
    *,
    limit: int = 100,
    order: str = "desc",
) -> tuple[BytesIO, str, str]:
    clients = get_top_clients_by_ltv(db, limit=limit, order=order)  # type: ignore[arg-type]
    rows = []
    for index, client in enumerate(clients, start=1):
        rows.append(
            [
                str(index),
                client.company_name,
                _money(client.total_paid),
                str(client.contracts_count),
                f"{client.share_pct:.1f}%",
            ]
        )
    return _pdf_response(
        "top_clients_ltv",
        ["#", "Korxona", "LTV (to'langan)", "Shartnomalar", "Ulush"],
        rows,
    )
