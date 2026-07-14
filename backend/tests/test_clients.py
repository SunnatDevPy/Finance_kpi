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
            "city": "Toshkent",
            "status": "faol",
        },
    )
    assert create.status_code == 201
    created = create.json()
    assert created["company_name"] == "Test Corp"
    assert created["logo_url"] is None

    listing = client.get("/api/v1/clients", headers=auth_headers)
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    assert listing.json()["items"][0]["company_name"] == "Test Corp"

    cities = client.get("/api/v1/clients/cities", headers=auth_headers)
    assert cities.status_code == 200
    assert "Toshkent" in cities.json()

    filtered = client.get(
        "/api/v1/clients",
        headers=auth_headers,
        params={"city": "Toshkent"},
    )
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1

    empty = client.get(
        "/api/v1/clients",
        headers=auth_headers,
        params={"city": "Samarqand"},
    )
    assert empty.status_code == 200
    assert empty.json()["total"] == 0


_PNG_1X1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a4944415478da6360000002000105f01ee20000000049454e44ae42"
    "6082"
)


def test_upload_and_delete_client_logo(client, auth_headers, sample_client):
    upload = client.post(
        f"/api/v1/clients/{sample_client.id}/logo",
        headers=auth_headers,
        files={"file": ("logo.png", _PNG_1X1, "image/png")},
    )
    assert upload.status_code == 200
    data = upload.json()
    assert data["logo_url"] is not None
    assert data["logo_url"].startswith("/api/v1/uploads/client_logos/")

    fetched = client.get(f"/api/v1/clients/{sample_client.id}", headers=auth_headers)
    assert fetched.json()["logo_url"] == data["logo_url"]

    deleted = client.delete(f"/api/v1/clients/{sample_client.id}/logo", headers=auth_headers)
    assert deleted.status_code == 200
    assert deleted.json()["logo_url"] is None


def test_upload_client_logo_rejects_non_image(client, auth_headers, sample_client):
    response = client.post(
        f"/api/v1/clients/{sample_client.id}/logo",
        headers=auth_headers,
        files={"file": ("logo.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 400


def test_upload_client_logo_for_missing_client_404(client, auth_headers):
    response = client.post(
        "/api/v1/clients/999999/logo",
        headers=auth_headers,
        files={"file": ("logo.png", _PNG_1X1, "image/png")},
    )
    assert response.status_code == 404
