from datetime import date
from decimal import Decimal

from app.services.finance_period import FINANCE_AUTO_PAYMENTS_FROM


def test_finance_turnover_summary_manual_only_before_2027(client, auth_headers, sample_contract):
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

    resp = client.get("/api/v1/finance/turnover", headers=auth_headers, params={"year": 2026})
    assert resp.status_code == 200
    data = resp.json()
    assert data["year"] == 2026
    assert data["period"] == "full"
    assert Decimal(data["total_revenue"]) == Decimal("1000000.00")
    assert Decimal(data["total_expense"]) == Decimal("500000.00")
    assert Decimal(data["net_balance"]) == Decimal("500000.00")


def test_finance_turnover_period_filter_income_only(client, auth_headers):
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "Q1 sotuv",
            "amount": "1000000.00",
            "income_date": "2026-02-01",
        },
    )
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "Q2 sotuv",
            "amount": "2000000.00",
            "income_date": "2026-05-01",
        },
    )

    q1 = client.get(
        "/api/v1/finance/turnover",
        headers=auth_headers,
        params={"year": 2026, "period": "q1"},
    )
    assert q1.status_code == 200
    assert Decimal(q1.json()["total_revenue"]) == Decimal("1000000.00")

    q2 = client.get(
        "/api/v1/finance/turnover",
        headers=auth_headers,
        params={"year": 2026, "period": "q2"},
    )
    assert q2.status_code == 200
    assert Decimal(q2.json()["total_revenue"]) == Decimal("2000000.00")


def test_finance_turnover_all_years_manual_income(client, auth_headers):
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "2025",
            "amount": "1000000.00",
            "income_date": "2025-03-01",
        },
    )
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "2026",
            "amount": "2000000.00",
            "income_date": "2026-05-01",
        },
    )

    resp = client.get(
        "/api/v1/finance/turnover",
        headers=auth_headers,
        params={"year": "all"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["year"] == 0
    assert Decimal(data["total_revenue"]) == Decimal("3000000.00")


def test_finance_turnover_includes_payments_from_2027(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "3000000.00", "paid_at": "2027-03-01"},
    )
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "Qo'lda kirim",
            "amount": "500000.00",
            "income_date": "2027-04-01",
        },
    )

    resp = client.get("/api/v1/finance/turnover", headers=auth_headers, params={"year": 2027})
    assert resp.status_code == 200
    assert Decimal(resp.json()["total_revenue"]) == Decimal("3500000.00")


def test_finance_turnover_plan_update(client, auth_headers):
    resp = client.patch(
        "/api/v1/finance/turnover-plan",
        headers=auth_headers,
        json={"year": 2026, "yearly_plan": "120000000.00"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["year"] == 2026
    assert "total_revenue" in data


def test_finance_turnover_monthly_trend(client, auth_headers):
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "Mart kirim",
            "amount": "1000000.00",
            "income_date": "2026-03-15",
        },
    )
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "May kirim",
            "amount": "2000000.00",
            "income_date": "2026-05-10",
        },
    )
    client.post(
        "/api/v1/expenses",
        headers=auth_headers,
        json={
            "category": "rent",
            "title": "Mart ijara",
            "amount": "300000.00",
            "expense_date": "2026-03-20",
        },
    )

    resp = client.get(
        "/api/v1/finance/turnover-monthly-trend",
        headers=auth_headers,
        params={"year": 2026},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["year"] == 2026
    assert len(data["points"]) == 12
    march = next(item for item in data["points"] if item["month"] == 3)
    may = next(item for item in data["points"] if item["month"] == 5)
    january = next(item for item in data["points"] if item["month"] == 1)
    assert Decimal(january["total_revenue"]) == Decimal("0")
    assert Decimal(march["total_revenue"]) == Decimal("1000000.00")
    assert Decimal(march["total_expense"]) == Decimal("300000.00")
    assert Decimal(may["total_revenue"]) == Decimal("2000000.00")


def test_finance_turnover_trend(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "2026 kirim",
            "amount": "1000000.00",
            "income_date": "2026-03-01",
        },
    )

    resp = client.get(
        "/api/v1/finance/turnover-trend",
        headers=auth_headers,
        params={"year_from": 2020, "year_to": 2026},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["year_from"] == 2020
    assert data["year_to"] == 2026
    assert len(data["points"]) == 7
    point_2026 = next(item for item in data["points"] if item["year"] == 2026)
    assert Decimal(point_2026["total_revenue"]) == Decimal("1000000.00")


def test_finance_auto_payments_cutover_date():
    assert FINANCE_AUTO_PAYMENTS_FROM == date(2027, 1, 1)
