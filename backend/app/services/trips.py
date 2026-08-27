from datetime import date, datetime, timezone
from decimal import Decimal
from io import BytesIO
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import extract, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Client, Trip, TripFactory, User
from app.schemas.trip import (
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
        )
        .where(Trip.id == trip_id, Trip.deleted_at.is_(None))
    ).first()
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safar topilmadi")
    return trip


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
        select(func.count(func.distinct(TripFactory.factory_name)))
        .join(Trip, Trip.id == TripFactory.trip_id)
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
                "last_trip_date": trip.start_date,
            }
        region_map[reg]["trips_count"] += 1
        if trip.employee_name:
            region_map[reg]["employees"].add(trip.employee_name.strip())
        for f in trip.factories:
            if f.factory_name:
                region_map[reg]["factories"].add(f.factory_name.strip())
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
    
    trip = Trip(**trip_dict)
    if trip.user_id is None and current_user:
        trip.user_id = current_user.id
    
    for f in factories_data:
        cid = _resolve_factory_client_id(db, f.factory_name, f.client_id)
        trip.factories.append(
            TripFactory(
                factory_name=f.factory_name.strip(),
                client_id=cid,
                notes=f.notes,
            )
        )
    
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def update_trip(db: Session, trip: Trip, payload: TripUpdate, current_user: User | None = None) -> Trip:
    update_data = payload.model_dump(exclude_unset=True)
    factories_data = update_data.pop("factories", None)

    for field, value in update_data.items():
        setattr(trip, field, value)

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
                    notes=f_dict.get("notes"),
                )
            )

    db.commit()
    db.refresh(trip)
    return trip


def delete_trip(db: Session, trip: Trip) -> None:
    trip.deleted_at = datetime.now(timezone.utc)
    db.commit()


TRIP_EXPORT_HEADERS = [
    "Safar mavzusi",
    "Viloyat",
    "Boshlanish",
    "Tugash",
    "Mas'ul xodim",
    "Tashrif etilgan fabrikalar",
    "Maqsad / Natija",
]


def export_trips_xlsx(trips: list[Trip], year: int | None = None) -> BytesIO:
    title = f"{year}-yil xizmat safarlari" if year else "Xizmat safarlari ro'yxati"
    rows = []
    for t in trips:
        factories_str = ", ".join([f.factory_name for f in t.factories])
        dates_str = f"{t.start_date.strftime('%d.%m.%Y')} — {t.end_date.strftime('%d.%m.%Y')}"
        notes = (t.purpose or "") + (f" | {t.results}" if t.results else "")
        rows.append([
            t.title,
            t.region,
            t.start_date.strftime("%d.%m.%Y"),
            t.end_date.strftime("%d.%m.%Y"),
            t.employee_name,
            factories_str,
            notes,
        ])
    return build_xlsx(title, TRIP_EXPORT_HEADERS, rows)


def export_trips_pdf(trips: list[Trip], year: int | None = None) -> BytesIO:
    title = f"{year}-yil xizmat safarlari" if year else "Xizmat safarlari"
    rows = []
    for t in trips:
        factories_str = ", ".join([f.factory_name for f in t.factories])
        rows.append([
            t.title,
            t.region,
            t.start_date.strftime("%d.%m.%Y"),
            t.end_date.strftime("%d.%m.%Y"),
            t.employee_name,
            factories_str,
            t.purpose or "",
        ])
    return build_pdf(title, TRIP_EXPORT_HEADERS, rows)
