def test_create_payment(client, auth_headers, sample_contract):
    response = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "500000.00",
            "paid_at": "2026-03-15",
            "note": "Test payment",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["contract_id"] == sample_contract.id
    assert float(data["amount"]) == 500_000.0


def test_create_payment_auto_completes_contract_when_fully_paid(client, auth_headers, sample_contract):
    client.post(f"/api/v1/contracts/{sample_contract.id}/confirm", headers=auth_headers)
    response = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "1000000.00",
            "paid_at": "2026-03-15",
            "note": "Full payment",
        },
    )
    assert response.status_code == 201

    contract = client.get(f"/api/v1/contracts/{sample_contract.id}", headers=auth_headers).json()
    assert contract["status"] == "tugadi"
    assert float(contract["debt_amount"]) == 0.0


def test_list_payments(client, auth_headers, sample_contract):
    create = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "100000.00",
            "paid_at": "2026-02-01",
        },
    )
    assert create.status_code == 201

    response = client.get("/api/v1/payments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["company_name"] == "Acme LLC"


def test_update_payment(client, auth_headers, sample_contract):
    create = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "100000.00",
            "paid_at": "2026-02-01",
            "note": "Old note",
        },
    )
    payment_id = create.json()["id"]

    response = client.patch(
        f"/api/v1/payments/{payment_id}",
        headers=auth_headers,
        json={"amount": "250000.00", "note": "Fixed amount"},
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["amount"]) == 250_000.0
    assert data["note"] == "Fixed amount"

    audit = client.get(
        "/api/v1/audit/log",
        headers=auth_headers,
        params={"entity_type": "payment", "entity_id": payment_id},
    )
    assert audit.status_code == 200
    update_entry = next(item for item in audit.json()["items"] if item["action"] == "update")
    assert "amount" in update_entry["changes"]


def test_delete_payment(client, auth_headers, sample_contract):
    create = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "contract_id": sample_contract.id,
            "amount": "100000.00",
            "paid_at": "2026-02-01",
        },
    )
    payment_id = create.json()["id"]

    delete = client.delete(f"/api/v1/payments/{payment_id}", headers=auth_headers)
    assert delete.status_code == 204

    listing = client.get("/api/v1/payments", headers=auth_headers)
    assert listing.json()["total"] == 0
