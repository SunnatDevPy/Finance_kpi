from datetime import date
from decimal import Decimal

import pytest


def _freeze_dashboard_today(monkeypatch, frozen: date) -> None:
    class FakeDate(date):
        def __new__(cls, *args, **kwargs):
            return date.__new__(date, *args, **kwargs)

        @classmethod
        def today(cls):
            return frozen

    monkeypatch.setattr("app.services.dashboard.date", FakeDate)


def test_dashboard_stats(client, auth_headers, app_settings, sample_contract):
    response = client.get("/api/v1/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_debt" in data
    assert "monthly_revenue" in data
    assert "cancelled_amount" in data
    assert "period_cancelled_amount" in data
    assert "cancelled_contracts_count" in data
    assert "contracts" in data
    assert data["contracts"]["total"] == 1
    assert "clients" in data
    assert data["total_contracts"] == 1
    assert "charts" in data
    assert "yearly_revenue" in data
    assert "yearly_debt" in data
    assert data["year_start"] == f"{date.today().year:04d}-01-01"
    assert data["year_end"] == f"{date.today().year:04d}-12-31"


def test_dashboard_yearly_revenue_and_debt(
    client, auth_headers, app_settings, sample_contract, monkeypatch
):
    _freeze_dashboard_today(monkeypatch, date(2026, 8, 14))
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "300000.00",
            "paid_at": "2026-08-14",
        },
    )

    response = client.get("/api/v1/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["year_start"] == "2026-01-01"
    assert data["year_end"] == "2026-12-31"
    assert Decimal(data["yearly_revenue"]) == Decimal("300000.00")
    assert Decimal(data["yearly_debt"]) == Decimal("700000.00")


@pytest.mark.parametrize(
    ("today", "period_start", "period_end"),
    [
        (date(2026, 8, 14), "2026-08-01", "2026-08-31"),
        (date(2026, 2, 10), "2026-02-01", "2026-02-28"),
        (date(2028, 2, 10), "2028-02-01", "2028-02-29"),
        (date(2026, 4, 10), "2026-04-01", "2026-04-30"),
        (date(2026, 1, 5), "2026-01-01", "2026-01-31"),
    ],
)
def test_dashboard_default_period_is_current_calendar_month(
    client,
    auth_headers,
    app_settings,
    sample_contract,
    monkeypatch,
    today,
    period_start,
    period_end,
):
    _freeze_dashboard_today(monkeypatch, today)

    response = client.get("/api/v1/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["period_start"] == period_start
    assert data["period_end"] == period_end


@pytest.mark.parametrize(
    ("date_from", "date_to", "period_start", "period_end"),
    [
        ("2026-07-15", "2026-08-14", "2026-07-01", "2026-08-31"),
        ("2026-02-01", "2026-02-10", "2026-02-01", "2026-02-28"),
        ("2026-04-05", "2026-04-20", "2026-04-01", "2026-04-30"),
        ("2028-02-03", "2028-02-14", "2028-02-01", "2028-02-29"),
        ("2026-01-01", "2026-12-31", "2026-01-01", "2026-12-31"),
    ],
)
def test_dashboard_filter_period_snaps_to_calendar_month_bounds(
    client,
    auth_headers,
    app_settings,
    sample_contract,
    date_from,
    date_to,
    period_start,
    period_end,
):
    response = client.get(
        "/api/v1/dashboard",
        headers=auth_headers,
        params={"date_from": date_from, "date_to": date_to},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["period_start"] == period_start
    assert data["period_end"] == period_end


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


def test_top_clients_ranked_with_limit_and_order(client, auth_headers, sample_contract):
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
        "/api/v1/dashboard/top-clients-ranked",
        headers=auth_headers,
        params={"limit": 20, "order": "desc"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["client_id"] == sample_contract.client_id
    assert float(data[0]["total_paid"]) == 500_000.0

    asc_response = client.get(
        "/api/v1/dashboard/top-clients-ranked",
        headers=auth_headers,
        params={"limit": 10, "order": "asc"},
    )
    assert asc_response.status_code == 200
    assert asc_response.json()[0]["client_id"] == sample_contract.client_id


def test_top_clients_ltv_order_asc(client, auth_headers, sample_contract):
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
        params={"limit": 10, "order": "asc"},
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_revenue_trend_default_12_months(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "Qo'lda tushum",
            "amount": "500000.00",
            "income_date": "2026-03-15",
        },
    )
    response = client.get("/api/v1/dashboard/revenue-trend", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 12
    assert sum(float(point["value"]) for point in data) == 500_000.0


def test_revenue_trend_6_months(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "Qo'lda tushum",
            "amount": "500000.00",
            "income_date": "2026-03-15",
        },
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


def test_dashboard_manual_income_before_auto_payments_year(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "5000000.00", "paid_at": "2025-06-01"},
    )
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "sale",
            "title": "Qo'lda kirim",
            "amount": "1200000.00",
            "income_date": "2025-06-10",
        },
    )
    client.post(
        "/api/v1/expenses",
        headers=auth_headers,
        json={
            "category": "rent",
            "title": "Ijara",
            "amount": "200000.00",
            "expense_date": "2025-06-15",
        },
    )

    response = client.get(
        "/api/v1/dashboard",
        headers=auth_headers,
        params={"date_from": "2025-06-01", "date_to": "2025-06-30"},
    )
    assert response.status_code == 200
    data = response.json()
    assert Decimal(data["monthly_revenue"]) == Decimal("1200000.00")
    assert Decimal(data["total_revenue"]) == Decimal("1200000.00")
    assert Decimal(data["period_expenses"]) == Decimal("200000.00")
    assert Decimal(data["net_profit"]) == Decimal("1000000.00")


def test_dashboard_includes_payments_from_auto_year(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "3000000.00", "paid_at": "2027-04-01"},
    )
    client.post(
        "/api/v1/incomes",
        headers=auth_headers,
        json={
            "category": "investment",
            "title": "Investitsiya",
            "amount": "500000.00",
            "income_date": "2027-04-05",
        },
    )

    response = client.get(
        "/api/v1/dashboard",
        headers=auth_headers,
        params={"date_from": "2027-04-01", "date_to": "2027-04-30"},
    )
    assert response.status_code == 200
    data = response.json()
    assert Decimal(data["monthly_revenue"]) == Decimal("3500000.00")
    assert Decimal(data["net_profit"]) == Decimal("3500000.00")


def test_dashboard_includes_august_2026_contract_payments(
    client, auth_headers, sample_contract
):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "8000000.00",
            "paid_at": "2026-08-14",
        },
    )

    response = client.get(
        "/api/v1/dashboard",
        headers=auth_headers,
        params={"date_from": "2026-08-01", "date_to": "2026-08-31"},
    )
    assert response.status_code == 200
    data = response.json()
    assert Decimal(data["monthly_revenue"]) == Decimal("8000000.00")


def test_clients_by_region(client, auth_headers, sample_contract):
    response = client.get("/api/v1/dashboard/clients-by-region", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["city"] == "Toshkent"
    assert data[0]["clients_count"] == 1
    assert float(data[0]["total_amount"]) == 1_000_000.0


def test_dashboard_export_services_pdf(client, auth_headers, sample_contract):
    response = client.get("/api/v1/dashboard/export/services", headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


def test_dashboard_export_regions_pdf(client, auth_headers, sample_client):
    response = client.get("/api/v1/dashboard/export/regions", headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


def test_dashboard_export_top_clients_ranked_pdf(client, auth_headers, sample_contract):
    response = client.get(
        "/api/v1/dashboard/export/top-clients-ranked",
        headers=auth_headers,
        params={"limit": 10, "order": "desc"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


def test_dashboard_export_top_clients_ltv_pdf(client, auth_headers, sample_contract):
    response = client.get(
        "/api/v1/dashboard/export/top-clients-ltv",
        headers=auth_headers,
        params={"limit": 10, "order": "desc"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


def test_contracts_by_client(client, auth_headers, sample_contract):
    response = client.get("/api/v1/dashboard/contracts-by-client", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["contracts_count"] == 1
    assert float(data[0]["total_amount"]) == 1_000_000.0

    filtered = client.get(
        "/api/v1/dashboard/contracts-by-client",
        headers=auth_headers,
        params={"date_from": "2020-01-01", "date_to": "2020-12-31"},
    )
    assert filtered.status_code == 200
    assert filtered.json() == []


def test_contracts_by_client_export_pdf(client, auth_headers, sample_contract):
    response = client.get(
        "/api/v1/dashboard/contracts-by-client/export",
        headers=auth_headers,
        params={"format": "pdf"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
