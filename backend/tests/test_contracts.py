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


def test_create_contract_preserves_alphanumeric_number(
    client, auth_headers, sample_client, sample_service_type
):
    response = client.post(
        "/api/v1/contracts",
        headers=auth_headers,
        json={
            "client_id": sample_client.id,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "contract_number": "No39-1",
            "line_items": [
                {"service_type_id": sample_service_type.id, "price": "1000000.00"},
            ],
        },
    )
    assert response.status_code == 201
    assert response.json()["contract_number"] == "No39-1"


def test_next_contract_number_increments_suffix_format(
    client, auth_headers, sample_client, sample_service_type
):
    for number in ("No39-1", "No39-2"):
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
    assert data["last_number"] == "No39-2"
    assert data["next_number"] == "No39-3"


def test_update_closed_contract_client_id(
    client, auth_headers, sample_contract, sample_client, db_session, sample_service_type
):
    from app.models import Client, ClientStatus

    other_client = Client(company_name="Beta Corp", status=ClientStatus.FAOL, city="Samarqand")
    db_session.add(other_client)
    db_session.commit()
    db_session.refresh(other_client)

    client.post(f"/api/v1/contracts/{sample_contract.id}/confirm", headers=auth_headers)
    complete = client.post(
        f"/api/v1/contracts/{sample_contract.id}/complete",
        headers=auth_headers,
    )
    assert complete.status_code == 200
    assert complete.json()["status"] == "tugadi"

    response = client.patch(
        f"/api/v1/contracts/{sample_contract.id}",
        headers=auth_headers,
        json={"client_id": other_client.id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["client_id"] == other_client.id
    assert data["status"] == "tugadi"


def test_update_closed_contract_line_items(
    client, auth_headers, sample_contract, sample_client, db_session, sample_service_type
):
    from app.models import ServiceType

    website_service = ServiceType(name="Veb sayt", is_active=True)
    db_session.add(website_service)
    db_session.commit()
    db_session.refresh(website_service)

    client.post(f"/api/v1/contracts/{sample_contract.id}/confirm", headers=auth_headers)
    client.post(f"/api/v1/contracts/{sample_contract.id}/complete", headers=auth_headers)

    line_item = sample_contract.line_items[0]
    response = client.patch(
        f"/api/v1/contracts/{sample_contract.id}",
        headers=auth_headers,
        json={
            "line_items": [
                {
                    "service_type_id": website_service.id,
                    "price": str(line_item.price),
                }
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "tugadi"
    assert len(data["line_items"]) == 1
    assert data["line_items"][0]["service_type_id"] == website_service.id
    assert data["line_items"][0]["service_type_name"] == "Veb sayt"


def test_update_closed_contract_without_line_items(
    client, auth_headers, sample_contract, sample_client, db_session
):
    from app.models import Client, ClientStatus

    other_client = Client(company_name="Gamma LLC", status=ClientStatus.FAOL, city="Buxoro")
    db_session.add(other_client)
    db_session.commit()
    db_session.refresh(other_client)

    client.post(f"/api/v1/contracts/{sample_contract.id}/confirm", headers=auth_headers)
    client.post(f"/api/v1/contracts/{sample_contract.id}/complete", headers=auth_headers)

    response = client.patch(
        f"/api/v1/contracts/{sample_contract.id}",
        headers=auth_headers,
        json={"client_id": other_client.id},
    )
    assert response.status_code == 200
    assert response.json()["client_id"] == other_client.id
    assert response.json()["status"] == "tugadi"
