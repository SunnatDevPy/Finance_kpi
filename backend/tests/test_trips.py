from datetime import date
from decimal import Decimal

from app.models import Client, ClientStatus, Trip, TripFactory


def test_create_and_list_trips(client, auth_headers, db_session):
    # Create client first
    c = Client(company_name="Namangan Silk & Wool", city="Namangan", status=ClientStatus.FAOL)
    db_session.add(c)
    db_session.commit()

    payload = {
        "title": "Namangan to'qimachilik korxonalariga xizmat safari",
        "region": "Namangan viloyati",
        "country": "O'zbekiston",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "employee_name": "Dilnoza Yusupova",
        "purpose": "Yangi marketing shartnomalari bo'yicha uchrashuv",
        "results": "3 ta korxona bilan kelishuvga erishildi",
        "factories": [
            {"factory_name": "Namangan Silk & Wool", "client_id": c.id, "notes": "Muvaffaqiyatli"},
            {"factory_name": "Mingbuloq Baraka Trikotaj", "notes": "Yangi fabrika"},
            {"factory_name": "Pop Poplin Ishlab Chiqarish", "notes": "Taqdimot qilindi"},
        ],
    }

    res = client.post("/api/v1/trips", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == payload["title"]
    assert data["region"] == "Namangan viloyati"
    assert data["employee_name"] == "Dilnoza Yusupova"
    assert len(data["factories"]) == 3
    assert data["factories"][0]["client_id"] == c.id

    # List trips
    list_res = client.get("/api/v1/trips", headers=auth_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert len(list_data["items"]) == 1

    # Filter by year 2026
    res_2026 = client.get("/api/v1/trips", headers=auth_headers, params={"year": 2026})
    assert res_2026.json()["total"] == 1

    # Filter by year 2025
    res_2025 = client.get("/api/v1/trips", headers=auth_headers, params={"year": 2025})
    assert res_2025.json()["total"] == 0

    # Filter by region
    res_reg = client.get("/api/v1/trips", headers=auth_headers, params={"region": "Namangan"})
    assert res_reg.json()["total"] == 1


def test_trips_summary_and_region_breakdown(client, auth_headers, db_session):
    # Add trips across different regions for 2026
    client.post(
        "/api/v1/trips",
        json={
            "title": "Namangan safari",
            "region": "Namangan viloyati",
            "start_date": "2026-02-01",
            "end_date": "2026-02-03",
            "employee_name": "Sardor Ergashev",
            "factories": [
                {"factory_name": "Namangan Silk"},
                {"factory_name": "Pop Poplin"},
            ],
        },
        headers=auth_headers,
    )
    client.post(
        "/api/v1/trips",
        json={
            "title": "Farg'ona safari",
            "region": "Farg'ona viloyati",
            "start_date": "2026-04-15",
            "end_date": "2026-04-18",
            "employee_name": "Dilnoza Yusupova",
            "results": "3 ta fabrika bilan muzokara o'tkazildi",
            "factories": [
                {"factory_name": "Fergana Denim"},
                {"factory_name": "Marg'ilon Atlas"},
                {"factory_name": "Qo'qon Gazlama"},
            ],
        },
        headers=auth_headers,
    )

    # Summary
    summary_res = client.get("/api/v1/trips/summary", headers=auth_headers, params={"year": 2026})
    assert summary_res.status_code == 200
    s_data = summary_res.json()
    assert s_data["year"] == 2026
    assert s_data["total_trips"] == 2
    assert s_data["total_regions"] == 2
    assert s_data["total_factories"] == 5
    assert s_data["total_employees"] == 2

    # By region
    region_res = client.get("/api/v1/trips/by-region", headers=auth_headers, params={"year": 2026})
    assert region_res.status_code == 200
    r_data = region_res.json()
    assert len(r_data) == 2
    fergana = next(r for r in r_data if "Farg'ona" in r["region"])
    assert fergana["trips_count"] == 1
    assert fergana["factories_count"] == 3
    assert "Fergana Denim" in fergana["factories"]
    assert "Dilnoza Yusupova" in fergana["employees"]
    assert "3 ta fabrika bilan muzokara o'tkazildi" in fergana["results"]


def test_update_and_delete_trip(client, auth_headers):
    create_res = client.post(
        "/api/v1/trips",
        json={
            "title": "Andijon safari",
            "region": "Andijon viloyati",
            "start_date": "2026-05-10",
            "end_date": "2026-05-12",
            "employee_name": "Otabek Mirzayev",
            "factories": [{"factory_name": "Andijon Jeans"}],
        },
        headers=auth_headers,
    )
    trip_id = create_res.json()["id"]

    # Update
    update_res = client.put(
        f"/api/v1/trips/{trip_id}",
        json={
            "title": "Andijon kengaytirilgan safari",
            "factories": [
                {"factory_name": "Andijon Jeans"},
                {"factory_name": "Asaka Trikotaj"},
            ],
        },
        headers=auth_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Andijon kengaytirilgan safari"
    assert len(update_res.json()["factories"]) == 2

    # Delete
    del_res = client.delete(f"/api/v1/trips/{trip_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Verify not in list
    list_res = client.get("/api/v1/trips", headers=auth_headers)
    assert list_res.json()["total"] == 0


def test_export_trips(client, auth_headers):
    client.post(
        "/api/v1/trips",
        json={
            "title": "Samarqand safari",
            "region": "Samarqand viloyati",
            "start_date": "2026-06-01",
            "end_date": "2026-06-03",
            "employee_name": "Malika Nazarova",
            "factories": [{"factory_name": "Samarkand Eurotex"}],
        },
        headers=auth_headers,
    )

    xlsx_res = client.get("/api/v1/trips/export?format=xlsx&year=2026", headers=auth_headers)
    assert xlsx_res.status_code == 200
    assert "spreadsheetml" in xlsx_res.headers["content-type"]

    pdf_res = client.get("/api/v1/trips/export?format=pdf&year=2026", headers=auth_headers)
    assert pdf_res.status_code == 200
    assert "pdf" in pdf_res.headers["content-type"]


def test_foreign_trips_and_all_years_summary(client, auth_headers):
    # Add trip to Kazakhstan
    client.post(
        "/api/v1/trips",
        json={
            "title": "Almaty to'qimachilik safari",
            "region": "Almaty shahri",
            "country": "Qozog'iston",
            "start_date": "2025-10-10",
            "end_date": "2025-10-15",
            "employee_name": "Sardor Ergashev",
            "factories": [{"factory_name": "Almaty QazTextile"}],
        },
        headers=auth_headers,
    )
    # Add trip to Russia
    client.post(
        "/api/v1/trips",
        json={
            "title": "Moskva tekstil ko'rgazmasi",
            "region": "Moskva shahri",
            "country": "Rossiya",
            "start_date": "2026-04-10",
            "end_date": "2026-04-14",
            "employee_name": "Jamshid Yo'ldoshev",
            "factories": [{"factory_name": "Moskva Tekstil Alyans"}],
        },
        headers=auth_headers,
    )

    # Summary without year (all years)
    summary_all = client.get("/api/v1/trips/summary", headers=auth_headers)
    assert summary_all.status_code == 200
    s_data = summary_all.json()
    assert s_data["total_trips"] >= 2
    assert s_data["total_regions"] >= 2

    # By region without year (all years)
    regions_all = client.get("/api/v1/trips/by-region", headers=auth_headers)
    assert regions_all.status_code == 200
    r_list = regions_all.json()
    kz_region = next(r for r in r_list if r["region"] == "Almaty shahri")
    assert kz_region["country"] == "Qozog'iston"
    assert kz_region["trips_count"] == 1
    assert "Almaty QazTextile" in kz_region["factories"]


def test_b2b_meeting_creation_and_monthly_stats(client, auth_headers):
    # 1. Create Zoom meeting
    res1 = client.post(
        "/api/v1/trips",
        json={
            "title": "X Textile (Zoom)",
            "meeting_format": "zoom",
            "company_name": "X Textile",
            "region": "Toshkent shahri",
            "country": "O'zbekiston",
            "start_date": "2026-08-05",
            "end_date": "2026-08-05",
            "employee_name": "Shamsiddin",
            "services_discussed": "Brending, sayt",
            "results": "Xizmatlarga qiziqish bildirdi",
            "next_step": "Taklif tayyorlash",
            "status": "in_progress",
            "deal_potential": "30000000",
        },
        headers=auth_headers,
    )
    assert res1.status_code == 201
    d1 = res1.json()
    assert d1["meeting_format"] == "zoom"
    assert d1["company_name"] == "X Textile"
    assert float(d1["deal_potential"]) == 30000000

    # 2. Create Live meeting
    res2 = client.post(
        "/api/v1/trips",
        json={
            "title": "ABC Textile (Jonli)",
            "meeting_format": "live",
            "company_name": "ABC Textile",
            "region": "Andijon viloyati",
            "country": "O'zbekiston",
            "start_date": "2026-08-08",
            "end_date": "2026-08-08",
            "employee_name": "Menejer 1",
            "services_discussed": "Marketing",
            "results": "Shartlar muhokamasi",
            "next_step": "Qayta uchrashuv",
            "status": "negotiation",
            "deal_potential": "15000000",
        },
        headers=auth_headers,
    )
    assert res2.status_code == 201

    # 3. Create another Zoom meeting
    res3 = client.post(
        "/api/v1/trips",
        json={
            "title": "Textile Group (Zoom)",
            "meeting_format": "zoom",
            "company_name": "Textile Group",
            "region": "Farg'ona viloyati",
            "country": "O'zbekiston",
            "start_date": "2026-08-15",
            "end_date": "2026-08-15",
            "employee_name": "Shamsiddin",
            "services_discussed": "To'liq paket",
            "results": "KP yuborildi",
            "next_step": "Javob kutish",
            "status": "in_progress",
            "deal_potential": "50000000",
        },
        headers=auth_headers,
    )
    assert res3.status_code == 201

    # Test monthly stats for August 2026
    m_stats_res = client.get(
        "/api/v1/trips/monthly-stats",
        params={"year": 2026, "month": 8},
        headers=auth_headers,
    )
    assert m_stats_res.status_code == 200
    m_stats = m_stats_res.json()
    assert m_stats["total_meetings"] == 3
    assert m_stats["zoom_meetings"] == 2
    assert m_stats["live_meetings"] == 1
    assert m_stats["unique_companies"] == 3
    assert float(m_stats["total_deal_potential"]) == 95000000

    # Check executor stats
    executors = m_stats["by_executor"]
    assert len(executors) == 2
    shamsiddin_stat = next(e for e in executors if e["employee_name"] == "Shamsiddin")
    assert shamsiddin_stat["meetings_count"] == 2
    assert shamsiddin_stat["zoom_count"] == 2
    assert float(shamsiddin_stat["deal_potential"]) == 80000000

    # Filter meetings by meeting_format=zoom
    zoom_res = client.get(
        "/api/v1/trips",
        params={"year": 2026, "month": 8, "meeting_format": "zoom"},
        headers=auth_headers,
    )
    assert zoom_res.status_code == 200
    assert zoom_res.json()["total"] == 2

    # Filter meetings by status=negotiation
    neg_res = client.get(
        "/api/v1/trips",
        params={"year": 2026, "month": 8, "status": "negotiation"},
        headers=auth_headers,
    )
    assert neg_res.status_code == 200
    assert neg_res.json()["total"] == 1
    assert neg_res.json()["items"][0]["company_name"] == "ABC Textile"

