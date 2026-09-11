from datetime import date
from decimal import Decimal

from app.models import Client, Contract, ContractLineItem, ServiceType


def test_service_types_list_with_year_filter(
    client, auth_headers, db_session, sample_service_type
):
    # Service type in 2024
    company1 = Client(company_name="Company 2024", status="faol")
    db_session.add(company1)
    db_session.flush()

    c2024 = Contract(
        client_id=company1.id,
        start_date=date(2024, 5, 10),
        end_date=date(2024, 11, 10),
    )
    c2024.line_items = [
        ContractLineItem(service_type_id=sample_service_type.id, price=Decimal("5000000"))
    ]
    db_session.add(c2024)

    # Service type in 2026
    company2 = Client(company_name="Company 2026", status="faol")
    db_session.add(company2)
    db_session.flush()

    c2026 = Contract(
        client_id=company2.id,
        start_date=date(2026, 3, 15),
        end_date=date(2026, 9, 15),
    )
    c2026.line_items = [
        ContractLineItem(service_type_id=sample_service_type.id, price=Decimal("12000000"))
    ]
    db_session.add(c2026)
    db_session.commit()

    # Filter year 2024
    resp_2024 = client.get("/api/v1/service-types?year=2024", headers=auth_headers)
    assert resp_2024.status_code == 200
    item_2024 = next(x for x in resp_2024.json() if x["id"] == sample_service_type.id)
    assert item_2024["usage_count"] == 1
    assert Decimal(str(item_2024["total_revenue"])) == Decimal("5000000")

    # Filter year 2026
    resp_2026 = client.get("/api/v1/service-types?year=2026", headers=auth_headers)
    assert resp_2026.status_code == 200
    item_2026 = next(x for x in resp_2026.json() if x["id"] == sample_service_type.id)
    assert item_2026["usage_count"] == 1
    assert Decimal(str(item_2026["total_revenue"])) == Decimal("12000000")

    # Filter year 2025 (no contracts)
    resp_2025 = client.get("/api/v1/service-types?year=2025", headers=auth_headers)
    assert resp_2025.status_code == 200
    item_2025 = next(x for x in resp_2025.json() if x["id"] == sample_service_type.id)
    assert item_2025["usage_count"] == 0
    assert Decimal(str(item_2025["total_revenue"])) == Decimal("0")

    # Filter date range
    resp_range = client.get(
        "/api/v1/service-types?date_from=2024-01-01&date_to=2024-12-31",
        headers=auth_headers,
    )
    assert resp_range.status_code == 200
    item_range = next(x for x in resp_range.json() if x["id"] == sample_service_type.id)
    assert item_range["usage_count"] == 1
    assert Decimal(str(item_range["total_revenue"])) == Decimal("5000000")


def test_service_type_stats_with_date_filter(
    client, auth_headers, db_session, sample_service_type
):
    company = Client(company_name="Stats Client", status="faol")
    db_session.add(company)
    db_session.flush()

    c1 = Contract(client_id=company.id, start_date=date(2025, 4, 1), end_date=date(2025, 6, 30))
    c1.line_items = [ContractLineItem(service_type_id=sample_service_type.id, price=Decimal("3000000"))]
    db_session.add(c1)

    c2 = Contract(client_id=company.id, start_date=date(2026, 4, 1), end_date=date(2026, 6, 30))
    c2.line_items = [ContractLineItem(service_type_id=sample_service_type.id, price=Decimal("7000000"))]
    db_session.add(c2)
    db_session.commit()

    resp = client.get(
        f"/api/v1/service-types/{sample_service_type.id}/stats?year=2025",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["usage_count"] == 1
    assert Decimal(str(data["total_revenue"])) == Decimal("3000000")


def test_service_type_growth_rate_and_breakdown(
    client, auth_headers, db_session, sample_service_type
):
    company = Client(company_name="Growth Client", status="faol")
    db_session.add(company)
    db_session.flush()

    # Year 2025: 10_000_000
    c2025 = Contract(client_id=company.id, start_date=date(2025, 1, 15), end_date=date(2025, 6, 15))
    c2025.line_items = [ContractLineItem(service_type_id=sample_service_type.id, price=Decimal("10000000"))]
    db_session.add(c2025)

    # Year 2026: 15_000_000 (+50% growth)
    c2026 = Contract(client_id=company.id, start_date=date(2026, 1, 15), end_date=date(2026, 6, 15))
    c2026.line_items = [ContractLineItem(service_type_id=sample_service_type.id, price=Decimal("15000000"))]
    db_session.add(c2026)
    db_session.commit()

    resp = client.get("/api/v1/service-types?year=2026", headers=auth_headers)
    assert resp.status_code == 200
    item = next(x for x in resp.json() if x["id"] == sample_service_type.id)
    assert Decimal(str(item["total_revenue"])) == Decimal("15000000")
    assert Decimal(str(item["previous_revenue"])) == Decimal("10000000")
    assert item["growth_rate"] == 50.0

    # Verify yearly_breakdown has points for 2025 and 2026
    breakdown_years = {p["year"]: p for p in item["yearly_breakdown"]}
    assert 2025 in breakdown_years
    assert 2026 in breakdown_years
    assert Decimal(str(breakdown_years[2025]["revenue"])) == Decimal("10000000")
    assert Decimal(str(breakdown_years[2026]["revenue"])) == Decimal("15000000")
    assert breakdown_years[2026]["growth_rate"] == 50.0
