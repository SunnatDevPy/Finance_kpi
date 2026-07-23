from decimal import Decimal


def test_finance_turnover_summary(client, auth_headers, sample_contract):
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
    assert Decimal(data["total_revenue"]) == Decimal("2000000.00")
    assert Decimal(data["total_expense"]) == Decimal("500000.00")
    assert Decimal(data["net_balance"]) == Decimal("1500000.00")
    assert len(data["expenses_by_category"]) == 1
    assert data["expenses_by_category"][0]["category"] == "rent"


def test_finance_turnover_period_filter(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "1000000.00", "paid_at": "2026-02-01"},
    )
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "2000000.00", "paid_at": "2026-05-01"},
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


def test_finance_turnover_trend(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "1000000.00", "paid_at": "2026-03-01"},
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
