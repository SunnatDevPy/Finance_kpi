from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import extract, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.database import get_db
from app.models import Trip, TripFactory, User
from app.schemas.pagination import Page
from app.schemas.trip import (
    RegionTripsSummary,
    TripCreate,
    TripRead,
    TripStatsSummary,
    TripUpdate,
)
from app.services.trips import (
    create_trip,
    delete_trip,
    export_trips_pdf,
    export_trips_xlsx,
    get_trip_or_404,
    get_trip_stats_summary,
    get_trips_by_region_summary,
    update_trip,
)

router = APIRouter(prefix="/trips", dependencies=[Depends(get_current_user)])


@router.get("", response_model=Page[TripRead])
def list_trips(
    db: Session = Depends(get_db),
    year: int | None = Query(default=None),
    country: str | None = Query(default=None),
    region: str | None = Query(default=None),
    user_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[TripRead]:
    filters = [Trip.deleted_at.is_(None)]
    if year is not None:
        filters.append(extract("year", Trip.start_date) == year)
    if country is not None and country.strip() and country != "all":
        filters.append(Trip.country.ilike(f"%{country.strip()}%"))
    if region is not None and region.strip() and region != "all":
        filters.append(Trip.region.ilike(f"%{region.strip()}%"))
    if user_id is not None:
        filters.append(Trip.user_id == user_id)
    if date_from is not None:
        filters.append(Trip.start_date >= date_from)
    if date_to is not None:
        filters.append(Trip.start_date <= date_to)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        # Search in title, region, country, employee_name, purpose, or factory_name
        sub_factory = select(TripFactory.trip_id).where(TripFactory.factory_name.ilike(pattern))
        filters.append(
            or_(
                Trip.title.ilike(pattern),
                Trip.region.ilike(pattern),
                Trip.country.ilike(pattern),
                Trip.employee_name.ilike(pattern),
                Trip.purpose.ilike(pattern),
                Trip.id.in_(sub_factory),
            )
        )

    count_stmt = select(func.count(Trip.id)).where(*filters)
    total = db.scalar(count_stmt) or 0

    stmt = (
        select(Trip)
        .options(
            selectinload(Trip.factories).selectinload(TripFactory.client),
            selectinload(Trip.user),
        )
        .where(*filters)
        .order_by(Trip.start_date.desc(), Trip.id.desc())
    )
    items = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return Page(items=items, total=total, skip=skip, limit=limit)


@router.get("/summary", response_model=TripStatsSummary)
def trip_summary(
    db: Session = Depends(get_db),
    year: int | None = Query(default=None),
    country: str | None = Query(default=None),
) -> TripStatsSummary:
    """Returns aggregated KPI numbers for trips across all years or a given year and country."""
    return get_trip_stats_summary(db, year=year, country=country)


@router.get("/by-region", response_model=list[RegionTripsSummary])
def trips_by_region(
    db: Session = Depends(get_db),
    year: int | None = Query(default=None),
    country: str | None = Query(default=None),
) -> list[RegionTripsSummary]:
    """Returns region-aggregated trip statistics."""
    return get_trips_by_region_summary(db, year=year, country=country)


@router.get("/export")
def export_trips(
    db: Session = Depends(get_db),
    file_format: Literal["xlsx", "pdf"] = Query(alias="format"),
    year: int | None = Query(default=None),
    country: str | None = Query(default=None),
    region: str | None = Query(default=None),
) -> StreamingResponse:
    filters = [Trip.deleted_at.is_(None)]
    if year is not None:
        filters.append(extract("year", Trip.start_date) == year)
    if country is not None and country.strip() and country != "all":
        filters.append(Trip.country.ilike(f"%{country.strip()}%"))
    if region is not None and region.strip() and region != "all":
        filters.append(Trip.region.ilike(f"%{region.strip()}%"))

    stmt = (
        select(Trip)
        .options(
            selectinload(Trip.factories),
            selectinload(Trip.user),
        )
        .where(*filters)
        .order_by(Trip.start_date.desc())
    )
    trips = list(db.scalars(stmt).all())

    if file_format == "xlsx":
        buffer = export_trips_xlsx(trips, year=year)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"safarlar_{year or 'barchasi'}.xlsx"
    else:
        buffer = export_trips_pdf(trips, year=year)
        media_type = "application/pdf"
        filename = f"safarlar_{year or 'barchasi'}.pdf"

    return StreamingResponse(
        buffer,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{trip_id}", response_model=TripRead)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
) -> Trip:
    return get_trip_or_404(db, trip_id=trip_id)


@router.post("", response_model=TripRead, status_code=status.HTTP_201_CREATED)
def create_trip_endpoint(
    payload: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Trip:
    return create_trip(db, payload=payload, current_user=current_user)


@router.put("/{trip_id}", response_model=TripRead)
def update_trip_endpoint(
    trip_id: int,
    payload: TripUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Trip:
    trip = get_trip_or_404(db, trip_id=trip_id)
    return update_trip(db, trip=trip, payload=payload, current_user=current_user)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip_endpoint(
    trip_id: int,
    db: Session = Depends(get_db),
) -> Response:
    trip = get_trip_or_404(db, trip_id=trip_id)
    delete_trip(db, trip=trip)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
