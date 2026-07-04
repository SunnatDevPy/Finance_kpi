def test_debts_empty_when_fully_paid(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "1000000.00", "paid_at": "2026-02-01"},
    )
    response = client.get("/api/v1/debts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["clients"] == []
    assert float(data["total_debt"]) == 0.0
    assert float(data["total_overpaid"]) == 0.0
    assert data["debtor_count"] == 0


def test_debts_lists_outstanding_contract(client, auth_headers, sample_contract, sample_client):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "300000.00", "paid_at": "2026-02-01"},
    )
    response = client.get("/api/v1/debts", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["debtor_count"] == 1
    assert float(data["total_debt"]) == 700_000.0
    entry = data["clients"][0]
    assert entry["client_id"] == sample_client.id
    assert float(entry["total_debt"]) == 700_000.0
    assert len(entry["contracts"]) == 1
    assert entry["contracts"][0]["contract_id"] == sample_contract.id


def test_debts_shows_overpayment(client, auth_headers, sample_contract):
    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "1200000.00", "paid_at": "2026-02-01"},
    )
    response = client.get("/api/v1/debts", headers=auth_headers)
    data = response.json()
    assert data["debtor_count"] == 0
    assert float(data["total_overpaid"]) == 200_000.0
    assert float(data["clients"][0]["total_debt"]) == -200_000.0


def test_debts_search_filters_by_company(client, auth_headers, sample_contract):
    response = client.get("/api/v1/debts", headers=auth_headers, params={"search": "Nonexistent"})
    assert response.status_code == 200
    assert response.json()["clients"] == []
