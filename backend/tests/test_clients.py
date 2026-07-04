def test_list_clients_empty(client, auth_headers):
    response = client.get("/api/v1/clients", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_create_and_list_client(client, auth_headers):
    create = client.post(
        "/api/v1/clients",
        headers=auth_headers,
        json={
            "company_name": "Test Corp",
            "contact_person": "Ali",
            "phone": "+998901234567",
            "status": "faol",
        },
    )
    assert create.status_code == 201
    created = create.json()
    assert created["company_name"] == "Test Corp"

    listing = client.get("/api/v1/clients", headers=auth_headers)
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    assert listing.json()["items"][0]["company_name"] == "Test Corp"
