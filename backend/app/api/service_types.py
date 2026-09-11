from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models import ServiceType
from app.schemas.service_type import (
    ServiceTypeCreate,
    ServiceTypeRead,
    ServiceTypeStatsRead,
    ServiceTypeUpdate,
)
from app.services.helpers import get_service_type_or_404
from app.services.service_type_stats import (
    get_service_type_stats,
    service_types_yearly_breakdown,
    usage_counts_by_service_type,
)

router = APIRouter(prefix="/service-types", dependencies=[Depends(get_current_user)])


def _enrich_service_types(
    db: Session,
    items: list[ServiceType],
    date_from: date | None = None,
    date_to: date | None = None,
    selected_year: int | None = None,
) -> list[ServiceTypeRead]:
    counts = usage_counts_by_service_type(db, date_from=date_from, date_to=date_to)
    yearly_breakdowns = service_types_yearly_breakdown(db)

    # Determine previous comparison period counts
    previous_counts: dict[int, tuple[int, Decimal]] = {}
    if selected_year is not None:
        prev_from = date(selected_year - 1, 1, 1)
        prev_to = date(selected_year - 1, 12, 31)
        previous_counts = usage_counts_by_service_type(db, date_from=prev_from, date_to=prev_to)
    elif date_from is not None and date_to is not None:
        duration_days = (date_to - date_from).days
        prev_to = date_from - timedelta(days=1)
        prev_from = prev_to - timedelta(days=duration_days)
        previous_counts = usage_counts_by_service_type(db, date_from=prev_from, date_to=prev_to)

    result: list[ServiceTypeRead] = []
    for item in items:
        usage_count, total_revenue = counts.get(item.id, (0, Decimal("0")))
        breakdown = yearly_breakdowns.get(item.id, [])

        prev_rev = Decimal("0")
        growth_rate: float | None = None

        if selected_year is not None or (date_from is not None and date_to is not None):
            _, prev_rev = previous_counts.get(item.id, (0, Decimal("0")))
            if prev_rev > 0:
                growth_rate = round(float((total_revenue - prev_rev) / prev_rev * 100), 1)
            elif total_revenue > 0:
                growth_rate = 100.0
            elif prev_rev == 0 and total_revenue == 0:
                growth_rate = None
        else:
            # All years selected: look at the most recent year in yearly_breakdown
            if len(breakdown) >= 2:
                latest = breakdown[-1]
                prev = breakdown[-2]
                prev_rev = prev.revenue
                growth_rate = latest.growth_rate
            elif len(breakdown) == 1:
                prev_rev = Decimal("0")
                growth_rate = None

        result.append(
            ServiceTypeRead(
                id=item.id,
                name=item.name,
                is_active=item.is_active,
                created_at=item.created_at,
                usage_count=usage_count,
                total_revenue=total_revenue,
                previous_revenue=prev_rev,
                growth_rate=growth_rate,
                yearly_breakdown=breakdown,
            )
        )
    return result


@router.get("", response_model=list[ServiceTypeRead])
def list_service_types(
    db: Session = Depends(get_db),
    active_only: bool = Query(default=False),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    year: int | None = Query(default=None, ge=2000, le=2100),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> list[ServiceTypeRead]:
    selected_year = year
    if year is not None:
        if date_from is None:
            date_from = date(year, 1, 1)
        if date_to is None:
            date_to = date(year, 12, 31)

    stmt = select(ServiceType).order_by(ServiceType.name)
    if active_only:
        stmt = stmt.where(ServiceType.is_active.is_(True))
    items = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return _enrich_service_types(
        db,
        items,
        date_from=date_from,
        date_to=date_to,
        selected_year=selected_year,
    )


@router.post(
    "",
    response_model=ServiceTypeRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_service_type(
    payload: ServiceTypeCreate, db: Session = Depends(get_db)
) -> ServiceType:
    existing = db.scalars(
        select(ServiceType).where(ServiceType.name == payload.name)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu nomdagi xizmat turi allaqachon mavjud",
        )

    service_type = ServiceType(**payload.model_dump())
    db.add(service_type)
    db.commit()
    db.refresh(service_type)
    return _enrich_service_types(db, [service_type])[0]


@router.get("/{service_type_id}/stats", response_model=ServiceTypeStatsRead)
def service_type_stats(
    service_type_id: int,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: Session = Depends(get_db),
) -> ServiceTypeStatsRead:
    if year is not None:
        if date_from is None:
            date_from = date(year, 1, 1)
        if date_to is None:
            date_to = date(year, 12, 31)
    return get_service_type_stats(db, service_type_id, date_from=date_from, date_to=date_to)


@router.get("/{service_type_id}", response_model=ServiceTypeRead)
def get_service_type(service_type_id: int, db: Session = Depends(get_db)) -> ServiceTypeRead:
    service_type = get_service_type_or_404(db, service_type_id)
    return _enrich_service_types(db, [service_type])[0]


@router.patch(
    "/{service_type_id}",
    response_model=ServiceTypeRead,
    dependencies=[Depends(require_admin)],
)
def update_service_type(
    service_type_id: int, payload: ServiceTypeUpdate, db: Session = Depends(get_db)
) -> ServiceType:
    service_type = get_service_type_or_404(db, service_type_id)
    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] != service_type.name:
        existing = db.scalars(
            select(ServiceType).where(ServiceType.name == data["name"])
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu nomdagi xizmat turi allaqachon mavjud",
            )

    for field, value in data.items():
        setattr(service_type, field, value)
    db.commit()
    db.refresh(service_type)
    return _enrich_service_types(db, [service_type])[0]


@router.delete(
    "/{service_type_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_service_type(service_type_id: int, db: Session = Depends(get_db)) -> None:
    service_type = get_service_type_or_404(db, service_type_id)
    if service_type.line_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kontraktlarda ishlatilgan xizmat turini o'chirib bo'lmaydi",
        )
    db.delete(service_type)
    db.commit()
