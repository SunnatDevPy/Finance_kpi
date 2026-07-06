from decimal import Decimal


def _create_client(client, auth_headers, name="Soft Delete LLC"):
    response = client.post(
        "/api/v1/clients",
        headers=auth_headers,
        json={"company_name": name, "status": "faol"},
    )
    assert response.status_code == 201
    return response.json()


def test_delete_client_is_soft_delete(client, auth_headers):
    created = _create_client(client, auth_headers)
    client_id = created["id"]

    delete_resp = client.delete(f"/api/v1/clients/{client_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    listing = client.get("/api/v1/clients", headers=auth_headers)
    assert all(item["id"] != client_id for item in listing.json()["items"])

    get_resp = client.get(f"/api/v1/clients/{client_id}", headers=auth_headers)
    assert get_resp.status_code == 404

    trash = client.get("/api/v1/clients/trash", headers=auth_headers)
    assert trash.status_code == 200
    assert any(item["id"] == client_id for item in trash.json())


def test_restore_client_brings_it_back(client, auth_headers):
    created = _create_client(client, auth_headers)
    client_id = created["id"]
    client.delete(f"/api/v1/clients/{client_id}", headers=auth_headers)

    restore_resp = client.post(f"/api/v1/clients/{client_id}/restore", headers=auth_headers)
    assert restore_resp.status_code == 200
    assert restore_resp.json()["id"] == client_id

    listing = client.get("/api/v1/clients", headers=auth_headers)
    assert any(item["id"] == client_id for item in listing.json()["items"])

    trash = client.get("/api/v1/clients/trash", headers=auth_headers)
    assert all(item["id"] != client_id for item in trash.json())


def test_delete_client_cascades_soft_delete_to_contracts(
    client, auth_headers, sample_client, sample_service_type
):
    contract_resp = client.post(
        "/api/v1/contracts",
        headers=auth_headers,
        json={
            "client_id": sample_client.id,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "line_items": [
                {"service_type_id": sample_service_type.id, "price": "1000000.00"}
            ],
        },
    )
    assert contract_resp.status_code == 201
    contract_id = contract_resp.json()["id"]

    client.delete(f"/api/v1/clients/{sample_client.id}", headers=auth_headers)

    contract_get = client.get(f"/api/v1/contracts/{contract_id}", headers=auth_headers)
    assert contract_get.status_code == 404


def test_deleted_contract_excluded_from_debts_and_dashboard(
    client, auth_headers, sample_client, sample_service_type
):
    contract_resp = client.post(
        "/api/v1/contracts",
        headers=auth_headers,
        json={
            "client_id": sample_client.id,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "line_items": [
                {"service_type_id": sample_service_type.id, "price": "5000000.00"}
            ],
        },
    )
    contract_id = contract_resp.json()["id"]

    before = client.get("/api/v1/debts", headers=auth_headers).json()
    assert before["total_debt"] == "5000000.00" or Decimal(before["total_debt"]) == Decimal(
        "5000000.00"
    )

    delete_resp = client.delete(f"/api/v1/contracts/{contract_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    after = client.get("/api/v1/debts", headers=auth_headers).json()
    assert Decimal(after["total_debt"]) == Decimal("0")

    trash = client.get("/api/v1/contracts/trash", headers=auth_headers)
    assert any(item["id"] == contract_id for item in trash.json())

    restore_resp = client.post(f"/api/v1/contracts/{contract_id}/restore", headers=auth_headers)
    assert restore_resp.status_code == 200

    restored = client.get("/api/v1/debts", headers=auth_headers).json()
    assert Decimal(restored["total_debt"]) == Decimal("5000000.00")


def test_deleted_payment_excluded_from_totals(client, auth_headers, sample_contract):
    payment_resp = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "200000.00",
            "paid_at": "2026-02-01",
        },
    )
    assert payment_resp.status_code == 201
    payment_id = payment_resp.json()["id"]

    contract_before = client.get(
        f"/api/v1/contracts/{sample_contract.id}", headers=auth_headers
    ).json()
    assert Decimal(contract_before["paid_amount"]) == Decimal("200000.00")

    delete_resp = client.delete(f"/api/v1/payments/{payment_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    listing = client.get("/api/v1/payments", headers=auth_headers).json()
    assert all(item["id"] != payment_id for item in listing["items"])

    contract_after = client.get(
        f"/api/v1/contracts/{sample_contract.id}", headers=auth_headers
    ).json()
    assert Decimal(contract_after["paid_amount"]) == Decimal("0")

    trash = client.get("/api/v1/payments/trash", headers=auth_headers)
    assert any(item["id"] == payment_id for item in trash.json())

    restore_resp = client.post(f"/api/v1/payments/{payment_id}/restore", headers=auth_headers)
    assert restore_resp.status_code == 200

    contract_restored = client.get(
        f"/api/v1/contracts/{sample_contract.id}", headers=auth_headers
    ).json()
    assert Decimal(contract_restored["paid_amount"]) == Decimal("200000.00")


def test_audit_log_records_create_update_delete(client, auth_headers):
    created = _create_client(client, auth_headers, name="Audit Trail LLC")
    client_id = created["id"]

    client.patch(
        f"/api/v1/clients/{client_id}",
        headers=auth_headers,
        json={"company_name": "Audit Trail Updated LLC"},
    )
    client.delete(f"/api/v1/clients/{client_id}", headers=auth_headers)

    log_resp = client.get(
        "/api/v1/audit/log",
        headers=auth_headers,
        params={"entity_type": "client", "entity_id": client_id},
    )
    assert log_resp.status_code == 200
    data = log_resp.json()
    actions = [item["action"] for item in data["items"]]
    assert "create" in actions
    assert "update" in actions
    assert "delete" in actions
    assert data["total"] == 3
