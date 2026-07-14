def test_list_clients_debt_filter(client, auth_headers, sample_contract):
    debtors = client.get(
        "/api/v1/clients",
        headers=auth_headers,
        params={"debt_filter": "debtors"},
    )
    assert debtors.status_code == 200
    assert debtors.json()["total"] == 1
    assert float(debtors.json()["items"][0]["total_debt"]) > 0

    no_debt = client.get(
        "/api/v1/clients",
        headers=auth_headers,
        params={"debt_filter": "no_debt"},
    )
    assert no_debt.status_code == 200
    assert no_debt.json()["total"] == 0

    overpaid = client.get(
        "/api/v1/clients",
        headers=auth_headers,
        params={"debt_filter": "overpaid"},
    )
    assert overpaid.status_code == 200
    assert overpaid.json()["total"] == 0

    legacy = client.get(
        "/api/v1/clients",
        headers=auth_headers,
        params={"has_debt": "true"},
    )
    assert legacy.status_code == 200
    assert legacy.json()["total"] == 1


def test_list_contracts_debt_filter(client, auth_headers, sample_contract):
    with_debt = client.get(
        "/api/v1/contracts",
        headers=auth_headers,
        params={"debt_filter": "debtors"},
    )
    assert with_debt.status_code == 200
    assert with_debt.json()["total"] == 1
    assert float(with_debt.json()["items"][0]["debt_amount"]) > 0

    no_debt = client.get(
        "/api/v1/contracts",
        headers=auth_headers,
        params={"debt_filter": "no_debt"},
    )
    assert no_debt.status_code == 200
    assert no_debt.json()["total"] == 0

    overpaid = client.get(
        "/api/v1/contracts",
        headers=auth_headers,
        params={"debt_filter": "overpaid"},
    )
    assert overpaid.status_code == 200
    assert overpaid.json()["total"] == 0
