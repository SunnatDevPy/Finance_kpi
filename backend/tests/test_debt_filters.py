def test_list_clients_has_debt_filter(client, auth_headers, sample_contract):
    debtors = client.get(
        "/api/v1/clients",
        headers=auth_headers,
        params={"has_debt": "true"},
    )
    assert debtors.status_code == 200
    assert debtors.json()["total"] == 1
    assert float(debtors.json()["items"][0]["total_debt"]) > 0

    paid = client.get(
        "/api/v1/clients",
        headers=auth_headers,
        params={"has_debt": "false"},
    )
    assert paid.status_code == 200
    assert paid.json()["total"] == 0


def test_list_contracts_has_debt_filter(client, auth_headers, sample_contract):
    with_debt = client.get(
        "/api/v1/contracts",
        headers=auth_headers,
        params={"has_debt": "true"},
    )
    assert with_debt.status_code == 200
    assert with_debt.json()["total"] == 1
    assert float(with_debt.json()["items"][0]["debt_amount"]) > 0

    without_debt = client.get(
        "/api/v1/contracts",
        headers=auth_headers,
        params={"has_debt": "false"},
    )
    assert without_debt.status_code == 200
    assert without_debt.json()["total"] == 0
