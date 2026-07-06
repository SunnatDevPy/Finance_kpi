def test_download_invoice_pdf(client, auth_headers, sample_contract):
    response = client.get(
        f"/api/v1/contracts/{sample_contract.id}/documents/invoice",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 500


def test_download_act_pdf(client, auth_headers, sample_contract):
    response = client.get(
        f"/api/v1/contracts/{sample_contract.id}/documents/act",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_download_document_unknown_type_rejected(client, auth_headers, sample_contract):
    response = client.get(
        f"/api/v1/contracts/{sample_contract.id}/documents/unknown",
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_download_document_for_missing_contract_404(client, auth_headers):
    response = client.get(
        "/api/v1/contracts/999999/documents/invoice",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_company_profile_defaults_and_update(client, auth_headers):
    initial = client.get("/api/v1/settings", headers=auth_headers)
    assert initial.status_code == 200
    assert initial.json()["company"]["company_name"] == "World Textile Marketing Agency"

    update = client.patch(
        "/api/v1/settings/company-profile",
        headers=auth_headers,
        json={
            "company_name": "WTMA Group",
            "company_inn": "123456789",
            "company_bank_name": "Ipoteka Bank",
        },
    )
    assert update.status_code == 200
    company = update.json()["company"]
    assert company["company_name"] == "WTMA Group"
    assert company["company_inn"] == "123456789"
    assert company["company_bank_name"] == "Ipoteka Bank"

    invoice = client.get(
        f"/api/v1/settings",
        headers=auth_headers,
    )
    assert invoice.json()["company"]["company_name"] == "WTMA Group"
