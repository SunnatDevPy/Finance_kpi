from decimal import Decimal
from io import BytesIO

from openpyxl import Workbook


def test_finance_ledger_manual_income_expense_before_2027(
    client, auth_headers, sample_contract
):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "2000000.00", "paid_at": "2026-04-01"},
    )
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "investment",
            "title": "Investitsiya",
            "amount": "1000000.00",
            "income_date": "2026-04-02",
        },
    )
    client.post(
        "/api/v1/expenses",
        headers=auth_headers,
        json={
            "category": "rent",
            "title": "Ofis ijarasi",
            "amount": "500000.00",
            "expense_date": "2026-04-03",
        },
    )

    resp = client.get(
        "/api/v1/finance/ledger",
        headers=auth_headers,
        params={"date_from": "2026-04-01", "date_to": "2026-04-30"},
    )
    assert resp.status_code == 200
    data = resp.json()
    types = {item["type"] for item in data["items"]}
    assert types == {"income", "expense"}
    assert Decimal(data["total_income"]) == Decimal("1000000.00")
    assert Decimal(data["total_expense"]) == Decimal("500000.00")
    assert Decimal(data["net_balance"]) == Decimal("500000.00")


def test_finance_ledger_includes_payments_from_2027(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "2000000.00", "paid_at": "2027-04-01"},
    )
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "Qo'lda kirim",
            "amount": "1000000.00",
            "income_date": "2027-04-02",
        },
    )

    resp = client.get(
        "/api/v1/finance/ledger",
        headers=auth_headers,
        params={"date_from": "2027-04-01", "date_to": "2027-04-30"},
    )
    assert resp.status_code == 200
    data = resp.json()
    types = {item["type"] for item in data["items"]}
    assert types == {"payment", "income"}
    assert Decimal(data["total_income"]) == Decimal("3000000.00")


def test_finance_ledger_filters_by_type(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "Sotuv",
            "amount": "700000.00",
            "income_date": "2026-05-01",
        },
    )
    client.post(
        "/api/v1/expenses",
        headers=auth_headers,
        json={
            "category": "office",
            "title": "Kanselyariya",
            "amount": "200000.00",
            "expense_date": "2026-05-02",
        },
    )

    resp = client.get("/api/v1/finance/ledger", headers=auth_headers, params={"type": "income"})
    assert resp.status_code == 200
    data = resp.json()
    assert all(item["type"] == "income" for item in data["items"])


def _build_finance_xlsx(rows: list[list], headers=None) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(headers or ["Sana", "Turi", "Nomi", "Summa", "Kategoriya", "Izoh"])
    for row in rows:
        ws.append(row)
    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def test_finance_import_template_downloads(client, auth_headers):
    resp = client.get("/api/v1/finance/import-template", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/vnd.openxmlformats")


def test_finance_import_creates_income_and_expense(client, auth_headers):
    content = _build_finance_xlsx(
        [
            ["23.01.2026", "Kirim", "Mijozdan naqd", "5000000", "Sotuv", "Eski hisobot"],
            ["24.01.2026", "Chiqim", "Ofis ijarasi", "3000000", "Ijara", ""],
            ["25.01.2026", "Kirim", "", "", "", ""],  # bo'sh summa -> xato
        ]
    )
    resp = client.post(
        "/api/v1/finance/import",
        headers=auth_headers,
        files={
            "file": (
                "tarix.xlsx",
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["created_income"] == 1
    assert data["created_expense"] == 1
    assert len(data["errors"]) == 1

    ledger = client.get(
        "/api/v1/finance/ledger",
        headers=auth_headers,
        params={"date_from": "2026-01-01", "date_to": "2026-01-31"},
    )
    assert ledger.status_code == 200
    ledger_data = ledger.json()
    assert Decimal(ledger_data["total_income"]) == Decimal("5000000.00")
    assert Decimal(ledger_data["total_expense"]) == Decimal("3000000.00")


def test_finance_import_infers_type_from_negative_amount(client, auth_headers):
    content = _build_finance_xlsx(
        [
            ["01.02.2026", "", "Naqd tushum", "2000000", "", ""],
            ["02.02.2026", "", "Xarajat", "-1500000", "", ""],
        ]
    )
    resp = client.post(
        "/api/v1/finance/import",
        headers=auth_headers,
        files={
            "file": (
                "tarix2.xlsx",
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["created_income"] == 1
    assert data["created_expense"] == 1


def test_finance_import_rejects_missing_required_columns(client, auth_headers):
    content = _build_finance_xlsx([["Test", "1000"]], headers=["Nomi", "Boshqa"])
    resp = client.post(
        "/api/v1/finance/import",
        headers=auth_headers,
        files={
            "file": (
                "bad.xlsx",
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert resp.status_code == 400
