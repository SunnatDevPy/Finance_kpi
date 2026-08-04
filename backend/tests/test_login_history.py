def test_login_history_pagination(client, auth_headers):
    client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )

    response = client.get(
        "/api/v1/audit/login-history",
        headers=auth_headers,
        params={"skip": 0, "limit": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["skip"] == 0
    assert data["limit"] == 1
    assert len(data["items"]) <= 1
    assert data["total"] >= 1
