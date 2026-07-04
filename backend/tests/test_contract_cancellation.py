def _create_two_service_contract(client, auth_headers, sample_client, sample_service_type):
    second_service = client.post(
        "/api/v1/service-types",
        headers=auth_headers,
        json={"name": "Video", "is_active": True},
    ).json()

    contract = client.post(
        "/api/v1/contracts",
        headers=auth_headers,
        json={
            "client_id": sample_client.id,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "line_items": [
                {"service_type_id": sample_service_type.id, "price": "1000000.00"},
                {"service_type_id": second_service["id"], "price": "500000.00"},
            ],
        },
    ).json()
    return contract


def test_cancel_line_item_reduces_total(client, auth_headers, sample_client, sample_service_type):
    contract = _create_two_service_contract(client, auth_headers, sample_client, sample_service_type)
    assert float(contract["total_amount"]) == 1_500_000.0

    video_item = next(item for item in contract["line_items"] if item["service_type_name"] == "Video")

    response = client.patch(
        f"/api/v1/contracts/{contract['id']}/line-items/{video_item['id']}/cancel",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["total_amount"]) == 1_000_000.0
    cancelled = next(item for item in data["line_items"] if item["id"] == video_item["id"])
    assert cancelled["is_cancelled"] is True
    assert cancelled["cancelled_at"] is not None
    assert data["is_cancelled"] is False


def test_cancel_line_item_with_prior_payment_creates_overpayment(
    client, auth_headers, sample_client, sample_service_type
):
    contract = _create_two_service_contract(client, auth_headers, sample_client, sample_service_type)
    video_item = next(item for item in contract["line_items"] if item["service_type_name"] == "Video")

    client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": contract["id"], "amount": "1500000.00", "paid_at": "2026-02-01"},
    )

    response = client.patch(
        f"/api/v1/contracts/{contract['id']}/line-items/{video_item['id']}/cancel",
        headers=auth_headers,
    )
    data = response.json()
    assert float(data["total_amount"]) == 1_000_000.0
    assert float(data["paid_amount"]) == 1_500_000.0
    assert float(data["debt_amount"]) == -500_000.0

    refund = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": contract["id"], "amount": "-500000.00", "paid_at": "2026-02-02", "note": "Qaytarish"},
    )
    assert refund.status_code == 201

    contract_after = client.get(f"/api/v1/contracts/{contract['id']}", headers=auth_headers).json()
    assert float(contract_after["debt_amount"]) == 0.0


def test_reactivate_line_item(client, auth_headers, sample_client, sample_service_type):
    contract = _create_two_service_contract(client, auth_headers, sample_client, sample_service_type)
    video_item = next(item for item in contract["line_items"] if item["service_type_name"] == "Video")

    client.patch(
        f"/api/v1/contracts/{contract['id']}/line-items/{video_item['id']}/cancel",
        headers=auth_headers,
    )
    response = client.patch(
        f"/api/v1/contracts/{contract['id']}/line-items/{video_item['id']}/reactivate",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["total_amount"]) == 1_500_000.0
    reactivated = next(item for item in data["line_items"] if item["id"] == video_item["id"])
    assert reactivated["is_cancelled"] is False
    assert reactivated["cancelled_at"] is None


def test_cancel_all_line_items_marks_contract_cancelled(
    client, auth_headers, sample_client, sample_service_type
):
    contract = _create_two_service_contract(client, auth_headers, sample_client, sample_service_type)

    response = client.post(
        f"/api/v1/contracts/{contract['id']}/cancel-all",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_cancelled"] is True
    assert float(data["total_amount"]) == 0.0
    assert all(item["is_cancelled"] for item in data["line_items"])


def test_zero_amount_payment_rejected(client, auth_headers, sample_contract):
    response = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={"contract_id": sample_contract.id, "amount": "0.00", "paid_at": "2026-02-01"},
    )
    assert response.status_code == 422
