from datetime import date
from decimal import Decimal

from app.models import Client, Contract, ContractLineItem


def test_service_type_stats_returns_all_top_clients(
    client, auth_headers, db_session, sample_service_type
):
    for index in range(12):
        company = Client(company_name=f"Client {index:02d}", status="faol")
        db_session.add(company)
        db_session.flush()

        contract = Contract(
            client_id=company.id,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
        )
        contract.line_items = [
            ContractLineItem(
                service_type_id=sample_service_type.id,
                price=Decimal(str(100_000 + index)),
            )
        ]
        db_session.add(contract)

    db_session.commit()

    response = client.get(
        f"/api/v1/service-types/{sample_service_type.id}/stats",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["clients_count"] == 12
    assert len(data["top_clients"]) == 12
