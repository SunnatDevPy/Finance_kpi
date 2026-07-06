from decimal import Decimal


def _create_income(client, auth_headers, **overrides):
    payload = {
        "category": "investment",
        "title": "Investordan mablag'",
        "amount": "5000000.00",
        "income_date": "2026-02-01",
        "note": "Ishga tushirish uchun",
    }
    payload.update(overrides)
    response = client.post("/api/v1/incomes", headers=auth_headers, json=payload)
    assert response.status_code == 201
    return response.json()


def test_create_and_list_income(client, auth_headers):
    created = _create_income(client, auth_headers)
    assert created["category"] == "investment"
    assert Decimal(created["amount"]) == Decimal("5000000.00")

    listing = client.get("/api/v1/incomes", headers=auth_headers)
    assert listing.status_code == 200
    data = listing.json()
    assert any(item["id"] == created["id"] for item in data["items"])


def test_update_income_records_audit_diff(client, auth_headers):
    created = _create_income(client, auth_headers)
    income_id = created["id"]

    update_resp = client.patch(
        f"/api/v1/incomes/{income_id}",
        headers=auth_headers,
        json={"amount": "6000000.00", "note": "Yangilangan"},
    )
    assert update_resp.status_code == 200
    assert Decimal(update_resp.json()["amount"]) == Decimal("6000000.00")

    log_resp = client.get(
        "/api/v1/audit/log",
        headers=auth_headers,
        params={"entity_type": "income", "entity_id": income_id},
    )
    actions = [item["action"] for item in log_resp.json()["items"]]
    assert "create" in actions
    assert "update" in actions


def test_delete_income_is_soft_delete_and_restorable(client, auth_headers):
    created = _create_income(client, auth_headers)
    income_id = created["id"]

    delete_resp = client.delete(f"/api/v1/incomes/{income_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    listing = client.get("/api/v1/incomes", headers=auth_headers)
    assert all(item["id"] != income_id for item in listing.json()["items"])

    get_resp = client.get(f"/api/v1/incomes/{income_id}", headers=auth_headers)
    assert get_resp.status_code == 404

    trash = client.get("/api/v1/incomes/trash", headers=auth_headers)
    assert any(item["id"] == income_id for item in trash.json())

    restore_resp = client.post(f"/api/v1/incomes/{income_id}/restore", headers=auth_headers)
    assert restore_resp.status_code == 200

    listing_after = client.get("/api/v1/incomes", headers=auth_headers)
    assert any(item["id"] == income_id for item in listing_after.json()["items"])


def test_income_summary_groups_by_category(client, auth_headers):
    _create_income(client, auth_headers, category="sale", amount="1000000.00")
    _create_income(client, auth_headers, category="loan", amount="500000.00", title="Bank krediti")
    _create_income(client, auth_headers, category="loan", amount="300000.00", title="Qo'shimcha kredit")

    summary = client.get("/api/v1/incomes/summary", headers=auth_headers)
    assert summary.status_code == 200
    data = summary.json()
    assert Decimal(data["total_income"]) >= Decimal("1800000.00")

    loan_row = next(row for row in data["by_category"] if row["category"] == "loan")
    assert Decimal(loan_row["total"]) == Decimal("800000.00")


def test_dashboard_includes_other_income_in_net_profit(client, auth_headers, sample_contract):
    payment_resp = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "2000000.00",
            "paid_at": "2026-03-01",
        },
    )
    assert payment_resp.status_code == 201

    _create_income(
        client,
        auth_headers,
        category="investment",
        amount="1000000.00",
        income_date="2026-03-10",
        title="Investitsiya",
    )

    dashboard = client.get(
        "/api/v1/dashboard",
        headers=auth_headers,
        params={"date_from": "2026-03-01", "date_to": "2026-03-31"},
    )
    assert dashboard.status_code == 200
    data = dashboard.json()
    assert Decimal(data["period_other_income"]) == Decimal("1000000.00")
    assert Decimal(data["net_profit"]) == Decimal(data["monthly_revenue"]) + Decimal(
        "1000000.00"
    ) - Decimal(data["period_expenses"])
