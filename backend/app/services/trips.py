from datetime import date, datetime, timezone
from decimal import Decimal
from io import BytesIO
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import extract, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Client, Trip, TripFactory, User
from app.schemas.trip import (
    B2BMeetingMonthlyStats,
    ExecutorMeetingStat,
    RegionMeetingStat,
    RegionTripsSummary,
    TripCreate,
    TripFactoryCreate,
    TripStatsSummary,
    TripUpdate,
)
from app.services.export_files import build_pdf, build_xlsx


def get_trip_or_404(db: Session, trip_id: int) -> Trip:
    trip = db.scalars(
        select(Trip)
        .options(
            selectinload(Trip.factories).selectinload(TripFactory.client),
            selectinload(Trip.user),
            selectinload(Trip.client),
        )
        .where(Trip.id == trip_id, Trip.deleted_at.is_(None))
    ).first()
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="B2B uchrashuv topilmadi")
    return trip


def get_b2b_monthly_stats(
    db: Session,
    year: int | None = None,
    month: int | None = None,
    country: str | None = None,
    region: str | None = None,
) -> B2BMeetingMonthlyStats:
    filters = [Trip.deleted_at.is_(None)]
    if year is not None:
        filters.append(extract("year", Trip.start_date) == year)
    if month is not None:
        filters.append(extract("month", Trip.start_date) == month)
    if country is not None and country.strip() and country != "all":
        filters.append(Trip.country.ilike(f"%{country.strip()}%"))
    if region is not None and region.strip() and region != "all":
        filters.append(Trip.region.ilike(f"%{region.strip()}%"))

    meetings = list(
        db.scalars(
            select(Trip)
            .options(selectinload(Trip.factories))
            .where(*filters)
        ).all()
    )

    total_meetings = len(meetings)
    zoom_meetings = 0
    live_meetings = 0
    total_deal_potential = Decimal("0")
    unique_companies_set: set[str] = set()
    executors_map: dict[str, dict[str, Any]] = {}
    regions_map: dict[str, dict[str, Any]] = {}
    status_counts: dict[str, int] = {
        "in_progress": 0,
        "negotiation": 0,
        "won": 0,
        "cancelled": 0,
    }

    for m in meetings:
        fmt = (m.meeting_format or "live").lower()
        if fmt == "zoom":
            zoom_meetings += 1
        else:
            live_meetings += 1

        pot = m.deal_potential if m.deal_potential is not None else Decimal("0")
        total_deal_potential += pot

        # Determine company name
        c_name = (m.company_name or "").strip()
        if not c_name and m.factories:
            c_name = m.factories[0].factory_name.strip()
        if c_name:
            unique_companies_set.add(c_name.lower())

        st = m.status or "in_progress"
        status_counts[st] = status_counts.get(st, 0) + 1

        # Executor breakdown
        emp = (m.employee_name or "").strip() or "Noma'lum"
        if emp not in executors_map:
            executors_map[emp] = {
                "employee_name": emp,
                "meetings_count": 0,
                "zoom_count": 0,
                "live_count": 0,
                "deal_potential": Decimal("0"),
            }
        executors_map[emp]["meetings_count"] += 1
        if fmt == "zoom":
            executors_map[emp]["zoom_count"] += 1
        else:
            executors_map[emp]["live_count"] += 1
        executors_map[emp]["deal_potential"] += pot

        # Region breakdown
        reg = (m.region or "").strip() or "Boshqa"
        if reg not in regions_map:
            regions_map[reg] = {
                "region": reg,
                "meetings_count": 0,
                "zoom_count": 0,
                "live_count": 0,
                "deal_potential": Decimal("0"),
            }
        regions_map[reg]["meetings_count"] += 1
        if fmt == "zoom":
            regions_map[reg]["zoom_count"] += 1
        else:
            regions_map[reg]["live_count"] += 1
        regions_map[reg]["deal_potential"] += pot

    by_executor = [
        ExecutorMeetingStat(**item)
        for item in sorted(executors_map.values(), key=lambda x: (-x["meetings_count"], -x["deal_potential"]))
    ]
    by_region = [
        RegionMeetingStat(**item)
        for item in sorted(regions_map.values(), key=lambda x: (-x["meetings_count"], -x["deal_potential"]))
    ]

    return B2BMeetingMonthlyStats(
        year=year,
        month=month,
        total_meetings=total_meetings,
        zoom_meetings=zoom_meetings,
        live_meetings=live_meetings,
        unique_companies=len(unique_companies_set),
        total_deal_potential=total_deal_potential,
        by_executor=by_executor,
        by_region=by_region,
        by_status=status_counts,
    )


def get_trip_stats_summary(
    db: Session, year: int | None = None, country: str | None = None
) -> TripStatsSummary:
    trip_filters = [Trip.deleted_at.is_(None)]
    if year is not None:
        trip_filters.append(extract("year", Trip.start_date) == year)
    if country is not None and country.strip() and country != "all":
        trip_filters.append(Trip.country.ilike(f"%{country.strip()}%"))

    total_trips = db.scalar(
        select(func.count(Trip.id)).where(*trip_filters)
    ) or 0

    total_regions = db.scalar(
        select(func.count(func.distinct(Trip.region))).where(*trip_filters)
    ) or 0

    total_factories = db.scalar(
        select(func.count(func.distinct(func.coalesce(TripFactory.factory_name, Trip.company_name))))
        .select_from(Trip)
        .outerjoin(TripFactory, Trip.id == TripFactory.trip_id)
        .where(*trip_filters)
    ) or 0

    total_employees = db.scalar(
        select(func.count(func.distinct(Trip.employee_name))).where(*trip_filters)
    ) or 0

    return TripStatsSummary(
        year=year,
        total_trips=total_trips,
        total_regions=total_regions,
        total_factories=total_factories,
        total_employees=total_employees,
    )


def get_trips_by_region_summary(
    db: Session, year: int | None = None, country: str | None = None
) -> list[RegionTripsSummary]:
    trip_filters = [Trip.deleted_at.is_(None)]
    if year is not None:
        trip_filters.append(extract("year", Trip.start_date) == year)
    if country is not None and country.strip() and country != "all":
        trip_filters.append(Trip.country.ilike(f"%{country.strip()}%"))

    trips = list(
        db.scalars(
            select(Trip)
            .options(
                selectinload(Trip.factories),
                selectinload(Trip.user),
            )
            .where(*trip_filters)
            .order_by(Trip.start_date.desc())
        ).all()
    )

    region_map: dict[str, dict[str, Any]] = {}
    for trip in trips:
        reg = trip.region.strip()
        if not reg:
            continue
        if reg not in region_map:
            region_map[reg] = {
                "region": reg,
                "country": trip.country or "O'zbekiston",
                "trips_count": 0,
                "factories": set(),
                "employees": set(),
                "results": [],
                "last_trip_date": trip.start_date,
            }
        region_map[reg]["trips_count"] += 1
        if trip.employee_name:
            region_map[reg]["employees"].add(trip.employee_name.strip())
        if trip.company_name:
            region_map[reg]["factories"].add(trip.company_name.strip())
        for f in trip.factories:
            if f.factory_name:
                region_map[reg]["factories"].add(f.factory_name.strip())
        result_text = (trip.results or trip.purpose or "").strip()
        if result_text and result_text not in region_map[reg]["results"]:
            region_map[reg]["results"].append(result_text)
        if trip.start_date and (
            region_map[reg]["last_trip_date"] is None
            or trip.start_date > region_map[reg]["last_trip_date"]
        ):
            region_map[reg]["last_trip_date"] = trip.start_date

    results = [
        RegionTripsSummary(
            region=data["region"],
            country=data["country"],
            trips_count=data["trips_count"],
            factories_count=len(data["factories"]),
            factories=sorted(list(data["factories"])),
            employees=sorted(list(data["employees"])),
            results=data["results"],
            last_trip_date=data["last_trip_date"],
        )
        for data in region_map.values()
    ]
    results.sort(key=lambda x: (-x.trips_count, x.region))
    return results


def _resolve_factory_client_id(db: Session, factory_name: str, client_id: int | None) -> int | None:
    if client_id is not None:
        return client_id
    clean_name = factory_name.strip()
    if not clean_name:
        return None
    client = db.scalars(
        select(Client).where(
            Client.deleted_at.is_(None),
            Client.company_name.ilike(clean_name),
        )
    ).first()
    return client.id if client else None


def create_trip(db: Session, payload: TripCreate, current_user: User | None = None) -> Trip:
    factories_data = payload.factories
    trip_dict = payload.model_dump(exclude={"factories"})

    if trip_dict.get("end_date") is None:
        trip_dict["end_date"] = trip_dict.get("start_date")

    company_name = (trip_dict.get("company_name") or "").strip()
    client_id = trip_dict.get("client_id")
    if company_name and client_id is None:
        client_id = _resolve_factory_client_id(db, company_name, None)
        trip_dict["client_id"] = client_id
    elif not company_name and factories_data:
        company_name = factories_data[0].factory_name.strip()
        trip_dict["company_name"] = company_name
        if client_id is None:
            client_id = _resolve_factory_client_id(db, company_name, factories_data[0].client_id)
            trip_dict["client_id"] = client_id

    trip = Trip(**trip_dict)
    if trip.user_id is None and current_user:
        trip.user_id = current_user.id

    if factories_data:
        for f in factories_data:
            cid = _resolve_factory_client_id(db, f.factory_name, f.client_id)
            trip.factories.append(
                TripFactory(
                    factory_name=f.factory_name.strip(),
                    client_id=cid,
                    deal_potential=f.deal_potential or Decimal("0"),
                    notes=f.notes,
                )
            )
    elif company_name:
        trip.factories.append(
            TripFactory(
                factory_name=company_name,
                client_id=client_id,
                notes=trip.results or trip.purpose,
            )
        )

    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def update_trip(db: Session, trip: Trip, payload: TripUpdate, current_user: User | None = None) -> Trip:
    update_data = payload.model_dump(exclude_unset=True)
    factories_data = update_data.pop("factories", None)

    if "start_date" in update_data and "end_date" not in update_data and trip.end_date is None:
        update_data["end_date"] = update_data["start_date"]

    for field, value in update_data.items():
        setattr(trip, field, value)

    if trip.company_name and trip.client_id is None:
        trip.client_id = _resolve_factory_client_id(db, trip.company_name, None)

    if factories_data is not None:
        trip.factories.clear()
        for f_dict in factories_data:
            factory_name = f_dict.get("factory_name", "").strip()
            if not factory_name:
                continue
            cid = _resolve_factory_client_id(db, factory_name, f_dict.get("client_id"))
            trip.factories.append(
                TripFactory(
                    factory_name=factory_name,
                    client_id=cid,
                    deal_potential=f_dict.get("deal_potential", Decimal("0")) or Decimal("0"),
                    notes=f_dict.get("notes"),
                )
            )
    elif trip.company_name and not trip.factories:
        trip.factories.append(
            TripFactory(
                factory_name=trip.company_name,
                client_id=trip.client_id,
                notes=trip.results or trip.purpose,
            )
        )
    elif trip.company_name and len(trip.factories) == 1:
        trip.factories[0].factory_name = trip.company_name
        trip.factories[0].client_id = trip.client_id

    db.commit()
    db.refresh(trip)
    return trip


def delete_trip(db: Session, trip: Trip) -> None:
    trip.deleted_at = datetime.now(timezone.utc)
    db.commit()


STATUS_LABELS = {
    "in_progress": "Jarayonda",
    "negotiation": "Muzokaralar",
    "won": "Kelishildi",
    "cancelled": "Bekor qilindi",
}

B2B_EXPORT_HEADERS = [
    "№",
    "Sana",
    "Format",
    "Kompaniya / Fabrika",
    "Hudud / Lokatsiya",
    "Muhokama qilingan xizmatlar",
    "Mas'ul ijrochi",
    "Uchrashuv natijasi",
    "Keyingi qadam",
    "Holat",
    "Summa (so'm)",
]


def export_trips_xlsx(trips: list[Trip], year: int | None = None) -> BytesIO:
    title = f"{year}-yil B2B uchrashuvlar" if year else "B2B uchrashuvlar ro'yxati"
    rows = []
    for idx, t in enumerate(trips, start=1):
        comp = t.company_name or (t.factories[0].factory_name if t.factories else t.title)
        fmt = "Zoom" if (t.meeting_format or "").lower() == "zoom" else "Jonli uchrashuv"
        st = STATUS_LABELS.get(t.status or "in_progress", t.status or "Jarayonda")
        pot = f"{float(t.deal_potential):,.0f}".replace(",", " ") if t.deal_potential else "0"
        rows.append([
            f"{idx:03d}",
            t.start_date.strftime("%d.%m.%Y"),
            fmt,
            comp,
            t.region,
            t.services_discussed or "—",
            t.employee_name,
            t.results or t.purpose or "—",
            t.next_step or "—",
            st,
            pot,
        ])
    return build_xlsx(title, B2B_EXPORT_HEADERS, rows)


def export_trips_pdf(trips: list[Trip], year: int | None = None) -> BytesIO:
    title = f"{year}-yil B2B uchrashuvlar" if year else "B2B uchrashuvlar"
    rows = []
    for idx, t in enumerate(trips, start=1):
        comp = t.company_name or (t.factories[0].factory_name if t.factories else t.title)
        fmt = "Zoom" if (t.meeting_format or "").lower() == "zoom" else "Jonli"
        st = STATUS_LABELS.get(t.status or "in_progress", t.status or "Jarayonda")
        pot = f"{float(t.deal_potential):,.0f}".replace(",", " ") if t.deal_potential else "0"
        rows.append([
            f"{idx:03d}",
            t.start_date.strftime("%d.%m.%Y"),
            fmt,
            comp,
            t.region,
            t.services_discussed or "—",
            t.employee_name,
            t.results or t.purpose or "—",
            t.next_step or "—",
            st,
            pot,
        ])
    return build_pdf(title, B2B_EXPORT_HEADERS, rows)
