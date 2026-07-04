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
    assert len(data["line_items"]) == 1
    assert float(data["total_amount"]) == 2_500_000.0


def test_list_contracts(client, auth_headers, sample_contract):
    response = client.get("/api/v1/contracts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == sample_contract.id
