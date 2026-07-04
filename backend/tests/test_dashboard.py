def test_dashboard_stats(client, auth_headers, app_settings, sample_contract):
    response = client.get("/api/v1/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_debt" in data
    assert "monthly_revenue" in data
    assert "clients" in data
    assert data["total_contracts"] == 1
    assert "charts" in data


def test_dashboard_stats_with_date_range(client, auth_headers, app_settings, sample_contract):
    response = client.get(
        "/api/v1/dashboard",
        headers=auth_headers,
        params={"date_from": "2026-01-01", "date_to": "2026-12-31"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["period_start"] == "2026-01-01"
    assert data["period_end"] == "2026-12-31"


def test_top_clients_ltv(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "500000.00",
            "paid_at": "2026-03-15",
        },
    )

    response = client.get(
        "/api/v1/dashboard/top-clients",
        headers=auth_headers,
        params={"limit": 10},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["client_id"] == sample_contract.client_id
    assert float(data[0]["total_paid"]) == 500_000.0
    assert data[0]["contracts_count"] == 1
    assert data[0]["share_pct"] == 100.0


def test_top_clients_ltv_limit_validation(client, auth_headers, sample_contract):
    response = client.get(
        "/api/v1/dashboard/top-clients",
        headers=auth_headers,
        params={"limit": 0},
    )
    assert response.status_code == 422


def test_top_clients_ltv_empty_when_no_payments(client, auth_headers, sample_contract):
    response = client.get("/api/v1/dashboard/top-clients", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_revenue_trend_default_12_months(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "500000.00", "paid_at": "2026-03-15"},
    )
    response = client.get("/api/v1/dashboard/revenue-trend", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 12
    assert sum(float(point["value"]) for point in data) == 500_000.0


def test_revenue_trend_6_months(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "500000.00", "paid_at": "2026-03-15"},
    )
    response = client.get(
        "/api/v1/dashboard/revenue-trend", headers=auth_headers, params={"months": 6}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    assert sum(float(point["value"]) for point in data) == 500_000.0


def test_revenue_trend_validates_months_range(client, auth_headers):
    response = client.get(
        "/api/v1/dashboard/revenue-trend", headers=auth_headers, params={"months": 0}
    )
    assert response.status_code == 422
