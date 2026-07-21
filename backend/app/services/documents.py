"""Official per-contract documents: invoice (schyot-faktura) and act of
completed works (dalolatnoma) — both rendered as A4 PDFs with the
company's own letterhead details (see app_settings.get_company_profile).
"""

from datetime import date, datetime
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models import Contract
from app.services.pdf_fonts import ensure_unicode_fonts


def _money(value: Decimal | float | int) -> str:
    return f"{Decimal(value):,.2f}".replace(",", " ")


def _styles():
    font_regular, font_bold = ensure_unicode_fonts()
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "DocTitle", parent=base["Title"], fontName=font_bold, fontSize=16, spaceAfter=4
        ),
        "subtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base["Normal"],
            fontName=font_regular,
            fontSize=10,
            textColor=colors.HexColor("#475569"),
            alignment=1,
        ),
        "heading": ParagraphStyle(
            "DocHeading", parent=base["Normal"], fontName=font_bold, fontSize=10.5, spaceAfter=2
        ),
        "body": ParagraphStyle("DocBody", parent=base["Normal"], fontName=font_regular, fontSize=9.5, leading=13),
        "small": ParagraphStyle(
            "DocSmall",
            parent=base["Normal"],
            fontName=font_regular,
            fontSize=8.5,
            textColor=colors.HexColor("#64748b"),
        ),
    }, font_regular, font_bold


def _company_block(company: dict[str, str], styles: dict) -> Paragraph:
    lines = [f"<b>{company.get('company_name') or 'Kompaniya'}</b>"]
    if company.get("company_address"):
        lines.append(company["company_address"])
    if company.get("company_phone"):
        lines.append(f"Tel: {company['company_phone']}")
    if company.get("company_inn"):
        lines.append(f"STIR: {company['company_inn']}")
    if company.get("company_bank_name") or company.get("company_bank_account"):
        bank_line = "Bank: " + (company.get("company_bank_name") or "")
        if company.get("company_bank_account"):
            bank_line += f", h/r: {company['company_bank_account']}"
        lines.append(bank_line)
    if company.get("company_mfo"):
        lines.append(f"MFO: {company['company_mfo']}")
    return Paragraph("<br/>".join(lines), styles["body"])


def _client_block(contract: Contract, styles: dict) -> Paragraph:
    client = contract.client
    lines = [f"<b>{client.company_name}</b>"]
    if client.contact_person:
        lines.append(f"Mas'ul shaxs: {client.contact_person}")
    if client.phone:
        lines.append(f"Tel: {client.phone}")
    location = ", ".join(part for part in [client.city, client.country] if part)
    if location:
        lines.append(location)
    return Paragraph("<br/>".join(lines), styles["body"])


def _line_items_table(contract: Contract, font_regular: str, font_bold: str, styles: dict) -> Table:
    header = ["№", "Xizmat nomi", "Miqdori", "Narxi", "Summa"]
    rows: list[list] = [header]
    active_items = [item for item in contract.line_items if not item.is_cancelled]
    total = Decimal("0")
    for index, item in enumerate(active_items, start=1):
        total += item.price
        rows.append(
            [
                str(index),
                Paragraph(item.service_type.name, styles["body"]),
                "1",
                _money(item.price),
                _money(item.price),
            ]
        )
    rows.append(["", "", "", Paragraph("<b>Jami:</b>", styles["body"]), _money(total)])

    table = Table(rows, colWidths=[10 * mm, 80 * mm, 20 * mm, 30 * mm, 35 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), font_bold),
                ("FONTNAME", (0, 1), (-1, -1), font_regular),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -2), 0.5, colors.grey),
                ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor("#1e3a5f")),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f8fafc")]),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def _signature_block(company: dict[str, str], contract: Contract, styles: dict) -> Table:
    executor = company.get("company_director") or "___________________"
    client_signer = contract.client.contact_person or "___________________"
    data = [
        [Paragraph("<b>Ijrochi:</b>", styles["body"]), Paragraph("<b>Buyurtmachi:</b>", styles["body"])],
        [
            Paragraph(f"{company.get('company_name') or ''}", styles["body"]),
            Paragraph(f"{contract.client.company_name}", styles["body"]),
        ],
        [Spacer(1, 22), Spacer(1, 22)],
        [
            Paragraph(f"_______________ / {executor} /", styles["body"]),
            Paragraph(f"_______________ / {client_signer} /", styles["body"]),
        ],
    ]
    table = Table(data, colWidths=[85 * mm, 85 * mm])
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return table


def _build_document(
    contract: Contract,
    company: dict[str, str],
    *,
    doc_title: str,
    doc_number_prefix: str,
    intro_text: str,
) -> BytesIO:
    styles, font_regular, font_bold = _styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        title=doc_title,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    doc_number = contract.invoice_number or contract.contract_number or str(contract.id)
    today = date.today().strftime("%d.%m.%Y")

    elements = [
        Paragraph(doc_title, styles["title"]),
        Paragraph(f"№ {doc_number_prefix}{doc_number} &nbsp;&nbsp;|&nbsp;&nbsp; Sana: {today}", styles["subtitle"]),
        Spacer(1, 14),
        Table(
            [[_company_block(company, styles), _client_block(contract, styles)]],
            colWidths=[85 * mm, 85 * mm],
        ),
        Spacer(1, 10),
        Paragraph(intro_text, styles["body"]),
        Spacer(1, 10),
        _line_items_table(contract, font_regular, font_bold, styles),
        Spacer(1, 8),
        Paragraph(
            f"To'langan: {_money(contract.paid_amount)} &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"Qarz: {_money(contract.debt_amount)}",
            styles["small"],
        ),
        Spacer(1, 28),
        _signature_block(company, contract, styles),
        Spacer(1, 14),
        Paragraph(
            f"Hujjat tizim tomonidan avtomatik shakllantirilgan — {datetime.now().strftime('%d.%m.%Y %H:%M')}",
            styles["small"],
        ),
    ]

    doc.build(elements)
    buffer.seek(0)
    return buffer


def build_invoice_pdf(contract: Contract, company: dict[str, str]) -> BytesIO:
    period = f"{contract.start_date.strftime('%d.%m.%Y')} — {contract.end_date.strftime('%d.%m.%Y')}"
    intro = (
        f"Ushbu schyot-faktura {contract.contract_number or contract.id}-sonli shartnoma "
        f"({period}) asosida taqdim etiladi. Quyidagi xizmatlar bo'yicha to'lov amalga oshirilishi so'raladi:"
    )
    return _build_document(
        contract,
        company,
        doc_title="SCHYOT-FAKTURA",
        doc_number_prefix="",
        intro_text=intro,
    )


def build_act_pdf(contract: Contract, company: dict[str, str]) -> BytesIO:
    period = f"{contract.start_date.strftime('%d.%m.%Y')} — {contract.end_date.strftime('%d.%m.%Y')}"
    intro = (
        f"Ushbu dalolatnoma {contract.contract_number or contract.id}-sonli shartnoma ({period}) doirasida "
        "quyida keltirilgan xizmatlar to'liq va sifatli bajarilganligini, tomonlarning bir-biriga "
        "moliyaviy da'volari yo'qligini tasdiqlaydi:"
    )
    return _build_document(
        contract,
        company,
        doc_title="BAJARILGAN ISHLAR DALOLATNOMASI",
        doc_number_prefix="AKT-",
        intro_text=intro,
    )


_STATUS_LABELS = {
    "yangi": "Yangi",
    "davom_etmoqda": "Davom etmoqda",
    "tugadi": "Tugadi",
    "toxtatildi": "To'xtatildi",
}


def _contract_meta_table(contract: Contract, styles: dict, font_regular: str, font_bold: str) -> Table:
    period = f"{contract.start_date.strftime('%d.%m.%Y')} — {contract.end_date.strftime('%d.%m.%Y')}"
    status = _STATUS_LABELS.get(
        contract.status.value if hasattr(contract.status, "value") else str(contract.status),
        str(contract.status),
    )
    rows = [
        ["Shartnoma raqami", contract.contract_number or str(contract.id)],
        ["Muddat", period],
        ["Holat", status],
        ["Jami summa", _money(contract.total_amount)],
        ["To'langan", _money(contract.paid_amount)],
        ["Qarz", _money(contract.debt_amount)],
    ]
    if contract.invoice_number:
        rows.insert(1, ["ESF raqami", contract.invoice_number])

    table = Table(rows, colWidths=[45 * mm, 125 * mm])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), font_bold),
                ("FONTNAME", (1, 0), (1, -1), font_regular),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#475569")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def build_contract_pdf(contract: Contract, company: dict[str, str]) -> BytesIO:
    """Xizmat ko'rsatish shartnomasi — rasmiy PDF."""
    styles, font_regular, font_bold = _styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        title="Shartnoma",
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    doc_number = contract.contract_number or str(contract.id)
    today = date.today().strftime("%d.%m.%Y")
    executor = company.get("company_name") or "Ijrochi"
    client_name = contract.client.company_name

    intro = (
        f"<b>{executor}</b> (keyingi o'rinda — <b>Ijrochi</b>) va "
        f"<b>{client_name}</b> (keyingi o'rinda — <b>Buyurtmachi</b>) "
        "quyidagi shartlarga kelishdilar:"
    )

    elements = [
        Paragraph("XIZMAT KO'RSATISH SHARTNOMASI", styles["title"]),
        Paragraph(
            f"№ {doc_number} &nbsp;&nbsp;|&nbsp;&nbsp; Sana: {today}",
            styles["subtitle"],
        ),
        Spacer(1, 12),
        Table(
            [[_company_block(company, styles), _client_block(contract, styles)]],
            colWidths=[85 * mm, 85 * mm],
        ),
        Spacer(1, 12),
        Paragraph(intro, styles["body"]),
        Spacer(1, 10),
        _contract_meta_table(contract, styles, font_regular, font_bold),
        Spacer(1, 12),
        Paragraph("<b>1. Xizmatlar ro'yxati va narxlari</b>", styles["heading"]),
        Spacer(1, 6),
        _line_items_table(contract, font_regular, font_bold, styles),
        Spacer(1, 10),
        Paragraph(
            "<b>2. To'lov shartlari</b><br/>"
            "Buyurtmachi ushbu shartnomada ko'rsatilgan xizmatlar uchun to'lovlarni "
            "kelishilgan muddat va miqdorda amalga oshiradi.",
            styles["body"],
        ),
        Spacer(1, 8),
    ]

    if contract.notes:
        elements.extend(
            [
                Paragraph(
                    f"<b>3. Qo'shimcha shartlar</b><br/>{contract.notes}",
                    styles["body"],
                ),
                Spacer(1, 8),
            ]
        )

    elements.extend(
        [
            Paragraph(
                "Tomonlar ushbu shartnoma shartlariga rozilik bildiradilar va hujjat imzolangan "
                "kundan boshlab kuchga kiradi.",
                styles["body"],
            ),
            Spacer(1, 24),
            _signature_block(company, contract, styles),
            Spacer(1, 14),
            Paragraph(
                f"Hujjat tizim tomonidan avtomatik shakllantirilgan — {datetime.now().strftime('%d.%m.%Y %H:%M')}",
                styles["small"],
            ),
        ]
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer
