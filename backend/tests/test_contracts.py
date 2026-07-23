from datetime import date


def test_create_contract(client, auth_headers, sample_client, sample_service_type):
    response = client.post(
        "/api/v1/contracts",
        headers=auth_headers,
        json={
            "client_id": sample_client.id,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "line_items": [
                {"service_type_id": sample_service_type.id, "price": "2500000.00"},
            ],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["client_id"] == sample_client.id
    assert data["status"] == "yangi"
    assert len(data["line_items"]) == 1
    assert float(data["total_amount"]) == 2_500_000.0


def test_list_contracts(client, auth_headers, sample_contract):
    response = client.get("/api/v1/contracts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == sample_contract.id


def test_list_contracts_service_type_filter(
    client, auth_headers, sample_client, sample_service_type, db_session
):
    from decimal import Decimal

    from app.models import Contract, ContractLineItem, ServiceType

    other_service = ServiceType(name="Video", is_active=True)
    db_session.add(other_service)
    db_session.commit()
    db_session.refresh(other_service)

    marketing_contract = Contract(
        client_id=sample_client.id,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
    )
    marketing_contract.line_items = [
        ContractLineItem(
            service_type_id=sample_service_type.id,
            price=Decimal("1000000.00"),
        )
    ]
    video_contract = Contract(
        client_id=sample_client.id,
        start_date=date(2026, 2, 1),
        end_date=date(2026, 12, 31),
    )
    video_contract.line_items = [
        ContractLineItem(
            service_type_id=other_service.id,
            price=Decimal("500000.00"),
        )
    ]
    db_session.add_all([marketing_contract, video_contract])
    db_session.commit()

    all_response = client.get("/api/v1/contracts", headers=auth_headers)
    assert all_response.status_code == 200
    assert all_response.json()["total"] == 2

    filtered = client.get(
        "/api/v1/contracts",
        headers=auth_headers,
        params={"service_type_id": sample_service_type.id},
    )
    assert filtered.status_code == 200
    data = filtered.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == marketing_contract.id


def test_next_contract_number_for_new_client(client, auth_headers, sample_client):
    response = client.get(
        "/api/v1/contracts/next-number",
        headers=auth_headers,
        params={"client_id": sample_client.id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["last_number"] is None
    assert data["next_number"] == "1"


def test_next_contract_number_increments_per_client(
    client, auth_headers, sample_client, sample_service_type
):
    for number in ("1", "2", "5"):
        client.post(
            "/api/v1/contracts",
            headers=auth_headers,
            json={
                "client_id": sample_client.id,
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
                "contract_number": number,
                "line_items": [
                    {"service_type_id": sample_service_type.id, "price": "1000000.00"},
                ],
            },
        )

    response = client.get(
        "/api/v1/contracts/next-number",
        headers=auth_headers,
        params={"client_id": sample_client.id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["last_number"] == "5"
    assert data["next_number"] == "6"
