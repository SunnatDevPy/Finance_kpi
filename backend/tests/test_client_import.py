from io import BytesIO

from openpyxl import Workbook


def _build_xlsx(rows: list[list]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(
        [
            "Korxona nomi*",
            "Mas'ul shaxs",
            "Telefon",
            "Veb-sayt",
            "Davlat",
            "Shahar",
            "Faoliyat turi",
            "Holat",
        ]
    )
    for row in rows:
        ws.append(row)
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.read()


def test_download_import_template(client, auth_headers):
    response = client.get("/api/v1/clients/import-template", headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/vnd.openxmlformats")


def test_import_clients_creates_rows(client, auth_headers):
    content = _build_xlsx(
        [
            ["Yangi Korxona MChJ", "Vali Aliyev", "+998901234567", "", "O'zbekiston", "Toshkent", "IT", "faol"],
            ["Ikkinchi Korxona", "", "", "", "", "", "", "nofaol"],
        ]
    )
    response = client.post(
        "/api/v1/clients/import",
        headers=auth_headers,
        files={"file": ("mijozlar.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["created"] == 2
    assert data["duplicates"] == []
    assert data["errors"] == []

    listed = client.get("/api/v1/clients", headers=auth_headers, params={"limit": 50}).json()
    names = {item["company_name"] for item in listed["items"]}
    assert "Yangi Korxona MChJ" in names
    assert "Ikkinchi Korxona" in names


def test_import_clients_reports_duplicates_and_errors(client, auth_headers, sample_client):
    content = _build_xlsx(
        [
            [sample_client.company_name, "", "", "", "", "", "", "faol"],
            ["", "", "", "", "", "", "", "faol"],
            ["Noto'g'ri Holat MChJ", "", "", "", "", "", "", "noma'lum"],
        ]
    )
    response = client.post(
        "/api/v1/clients/import",
        headers=auth_headers,
        files={"file": ("mijozlar.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["created"] == 0
    assert len(data["duplicates"]) == 1
    assert data["duplicates"][0]["company_name"] == sample_client.company_name
    assert len(data["errors"]) == 2


def test_import_clients_rejects_non_xlsx(client, auth_headers):
    response = client.post(
        "/api/v1/clients/import",
        headers=auth_headers,
        files={"file": ("mijozlar.csv", b"a,b,c", "text/csv")},
    )
    assert response.status_code == 400
