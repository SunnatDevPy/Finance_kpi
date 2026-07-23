from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.schemas.dashboard import ChartPoint, ClientRegionStatsItem, DashboardStats, TopClientLtvItem
from app.services.dashboard import (
    get_clients_by_region,
    get_dashboard_stats,
    get_revenue_trend,
    get_top_clients_by_ltv,
)

router = APIRouter(prefix="/dashboard", dependencies=[Depends(get_current_user)])


@router.get("", response_model=DashboardStats)
def dashboard(
    db: Session = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> DashboardStats:
    return get_dashboard_stats(db, date_from=date_from, date_to=date_to)


@router.get("/top-clients", response_model=list[TopClientLtvItem])
def top_clients_ltv(
    db: Session = Depends(get_db),
    limit: int = Query(default=10, ge=1, le=100),
) -> list[TopClientLtvItem]:
    """Top clients ranked by lifetime value (all-time total payments)."""
    return get_top_clients_by_ltv(db, limit=limit)


@router.get("/revenue-trend", response_model=list[ChartPoint])
def revenue_trend(
    db: Session = Depends(get_db),
    months: int = Query(default=12, ge=1, le=24),
) -> list[ChartPoint]:
    """Trailing N months of revenue, always anchored to today (ignores date filters)."""
    return get_revenue_trend(db, months=months)


@router.get("/clients-by-region", response_model=list[ClientRegionStatsItem])
def clients_by_region(db: Session = Depends(get_db)) -> list[ClientRegionStatsItem]:
    return get_clients_by_region(db)
